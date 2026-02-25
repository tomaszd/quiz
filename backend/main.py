import io
import json
import os
from datetime import datetime, timedelta
from typing import Optional

import httpx
import pdfplumber
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from openai import OpenAI
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY", "")
GOOGLE_CLIENT_ID    = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL        = os.getenv("FRONTEND_URL", "http://localhost:3000")
SECRET_KEY          = os.getenv("SECRET_KEY", "change-me")
ALGORITHM           = "HS256"
TOKEN_EXPIRE_DAYS   = 7

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Quiz Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if not credentials:
        return None
    try:
        payload  = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id  = int(payload.get("sub", 0))
        return db.query(models.User).filter(models.User.id == user_id).first()
    except (JWTError, ValueError):
        return None


def require_user(user: Optional[models.User] = Depends(get_current_user)) -> models.User:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------
GOOGLE_AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL    = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@app.get("/auth/google", tags=["auth"])
def google_login() -> RedirectResponse:
    """Redirect user to Google login page."""
    params = "&".join([
        f"client_id={GOOGLE_CLIENT_ID}",
        f"redirect_uri={GOOGLE_REDIRECT_URI}",
        "response_type=code",
        "scope=openid%20email%20profile",
        "access_type=offline",
    ])
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")


@app.get("/auth/google/callback", tags=["auth"])
async def google_callback(code: str, db: Session = Depends(get_db)) -> RedirectResponse:
    """Handle Google OAuth callback, create/update user, return JWT via redirect."""
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        token_data = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        info = userinfo_resp.json()

    user = db.query(models.User).filter(models.User.google_id == info["sub"]).first()
    if not user:
        user = models.User(
            email=info["email"],
            name=info.get("name", ""),
            google_id=info["sub"],
            avatar_url=info.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.id)
    # Redirect back to frontend with JWT in query param
    return RedirectResponse(f"{FRONTEND_URL}?token={token}")


@app.get("/auth/me", response_model=schemas.UserOut, tags=["auth"])
def get_me(user: models.User = Depends(require_user)) -> models.User:
    """Return current logged-in user info."""
    return user

# ---------------------------------------------------------------------------
# LLM question generation
# ---------------------------------------------------------------------------
QUIZ_PROMPT = """Jesteś ekspertem od tworzenia quizów edukacyjnych.
Na podstawie poniższego tematu/tekstu wygeneruj {n} pytania quizowe.

ZASADY:
- Każde pytanie musi mieć dokładnie 4 odpowiedzi
- Tylko jedna odpowiedź jest poprawna
- Pytania testują ROZUMIENIE, nie zapamiętywanie słów kluczowych
- Dołącz krótkie wyjaśnienie dlaczego odpowiedź jest poprawna
- Pytania i odpowiedzi po polsku

TEMAT/TEKST:
{content}

Odpowiedz WYŁĄCZNIE w formacie JSON (bez markdown, bez ```):
[
  {{
    "question": "Treść pytania?",
    "answers": ["Odpowiedź A", "Odpowiedź B", "Odpowiedź C", "Odpowiedź D"],
    "correct": 0,
    "explanation": "Krótkie wyjaśnienie"
  }}
]"""


def _call_llm(content: str, n: int) -> list[dict]:
    if not openai_client:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    prompt = QUIZ_PROMPT.format(n=n, content=content[:10_000])
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    raw = response.choices[0].message.content.strip()
    # Strip markdown fences if model added them anyway
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {exc}") from exc


def _save_questions(
    questions_data: list[dict],
    category: str,
    source: str,
    user_id: Optional[int],
    db: Session,
) -> list[models.Question]:
    created = []
    for q in questions_data:
        row = models.Question(
            question=q["question"],
            answers=q["answers"],
            correct=q["correct"],
            explanation=q.get("explanation", ""),
            category=category,
            source=source[:200],
            user_id=user_id,
        )
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return created

# ---------------------------------------------------------------------------
# Generate endpoints
# ---------------------------------------------------------------------------

@app.post("/api/generate/topic", response_model=list[schemas.QuestionOut], tags=["generate"])
def generate_from_topic(
    body: schemas.GenerateFromTopic,
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(get_current_user),
) -> list[models.Question]:
    """Generate quiz questions from a text topic using OpenAI."""
    data = _call_llm(body.topic, body.count)
    return _save_questions(
        data,
        category=body.category or "AI Generated",
        source=body.topic[:200],
        user_id=user.id if user else None,
        db=db,
    )


@app.post("/api/generate/pdf", response_model=list[schemas.QuestionOut], tags=["generate"])
async def generate_from_pdf(
    file: UploadFile = File(...),
    count: int = Query(default=10, ge=1, le=30),
    category: str = Query(default="PDF"),
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(get_current_user),
) -> list[models.Question]:
    """Upload a PDF file and generate quiz questions from its content."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages[:30]:          # limit to first 30 pages
            text += page.extract_text() or ""

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    data = _call_llm(text, count)
    return _save_questions(
        data,
        category=category,
        source=file.filename or "upload.pdf",
        user_id=user.id if user else None,
        db=db,
    )

# ---------------------------------------------------------------------------
# Questions CRUD
# ---------------------------------------------------------------------------

@app.get("/api/questions", response_model=list[schemas.QuestionOut], tags=["questions"])
def list_questions(
    skip:     int = Query(default=0, ge=0),
    limit:    int = Query(default=50, ge=1, le=200),
    category: Optional[str] = None,
    source:   Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[models.Question]:
    """List all questions stored in the database."""
    query = db.query(models.Question)
    if category:
        query = query.filter(models.Question.category == category)
    if source:
        query = query.filter(models.Question.source.ilike(f"%{source}%"))
    return query.order_by(models.Question.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/questions/{question_id}", response_model=schemas.QuestionOut, tags=["questions"])
def get_question(question_id: int, db: Session = Depends(get_db)) -> models.Question:
    """Get a single question by ID."""
    row = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    return row


@app.delete("/api/questions/{question_id}", tags=["questions"])
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_user),
) -> dict:
    """Delete a question (requires login)."""
    row = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(row)
    db.commit()
    return {"ok": True, "deleted_id": question_id}


@app.get("/api/categories", tags=["questions"])
def list_categories(db: Session = Depends(get_db)) -> list[str]:
    """Return distinct categories present in the database."""
    rows = db.query(models.Question.category).distinct().all()
    return sorted({r[0] for r in rows if r[0]})

# ---------------------------------------------------------------------------
# Admin UI (simple HTML page)
# ---------------------------------------------------------------------------

@app.get("/admin", response_class=HTMLResponse, include_in_schema=False)
def admin_page() -> str:
    with open(os.path.join(os.path.dirname(__file__), "admin.html")) as f:
        return f.read()


@app.get("/", tags=["root"])
def root() -> dict:
    return {
        "service": "Quiz Generator API",
        "docs":    "/docs",
        "admin":   "/admin",
    }
