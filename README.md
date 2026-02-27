# 🧠 Quiz App

Aplikacja quizowa z panelem admina do generowania pytań przez AI (Groq — darmowe!).

## Struktura projektu

```
quiz/
├── index.html          ← Frontend quizu (statyczna strona HTML)
├── quiz.js             ← Logika quizu
├── style.css           ← Style
├── questions.js        ← 250 gotowych pytań w 5 kategoriach
└── backend/            ← Serwis API (Python / FastAPI)
    ├── main.py         ← Wszystkie endpointy
    ├── database.py     ← Połączenie z PostgreSQL
    ├── models.py       ← Tabele bazy danych
    ├── schemas.py      ← Walidacja danych
    ├── admin.html      ← Panel admina
    ├── requirements.txt
    └── .env.example    ← Przykładowy plik konfiguracyjny
```

---

## 🚀 Uruchomienie lokalne

### Wymagania

- Python 3.10+
- PostgreSQL

---

### Krok 1 — Sklonuj repozytorium

```bash
git clone https://github.com/tomaszd/quiz.git
cd quiz
```

---

### Krok 2 — Zainstaluj PostgreSQL (jeśli nie masz)

```bash
# Ubuntu / Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

### Krok 3 — Utwórz bazę danych

```bash
sudo -u postgres createdb quizdb
sudo -u postgres psql -c "CREATE USER quizuser WITH PASSWORD 'quizpass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE quizdb TO quizuser;"
```

---

### Krok 4 — Utwórz środowisko Python i zainstaluj zależności

```bash
cd backend

python3 -m venv venv
source venv/bin/activate        # Linux / Mac
# lub: venv\Scripts\activate    # Windows

pip install -r requirements.txt
```

---

### Krok 5 — Skonfiguruj plik .env

```bash
cp .env.example .env
nano .env
```

Wypełnij plik `.env`:

```env
# ✅ WYMAGANE — klucz Groq AI (darmowy)
# Pobierz na: https://console.groq.com → API Keys → Create API Key
GROQ_API_KEY=gsk_...

# ✅ WYMAGANE — baza danych
DATABASE_URL=postgresql://quizuser:quizpass@localhost:5432/quizdb

# ✅ WYMAGANE — losowy sekret do tokenów JWT
# Wygeneruj: openssl rand -hex 32
SECRET_KEY=wpisz-tutaj-losowy-ciag-znakow

# ⬜ OPCJONALNE — logowanie przez Google
# Pobierz z: https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:8000/admin
```

---

### Krok 6 — Uruchom serwer

```bash
# Upewnij się że jesteś w katalogu backend/ z aktywnym venv
uvicorn main:app --reload --port 8000
```

Przy pierwszym uruchomieniu tabele w bazie danych tworzą się automatycznie.

---

### Krok 7 — Otwórz w przeglądarce

| Adres | Co tam jest |
|-------|-------------|
| `http://localhost:8000/admin` | 🖥️ Panel admina — generuj pytania z AI, przeglądaj bazę |
| `http://localhost:8000/docs` | 📖 Swagger UI — interaktywna dokumentacja API |
| `http://localhost:8000/api/questions` | 📋 JSON z pytaniami z bazy |
| Otwórz `index.html` w przeglądarce | 🧠 Frontend quizu |

---

## 🔄 Skrót — codzienne uruchamianie

Po pierwszej konfiguracji wystarczą tylko 3 komendy:

```bash
cd ~/quiz/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

---

## 🔑 Jak zdobyć darmowy klucz Groq API

1. Wejdź na **[console.groq.com](https://console.groq.com)**
2. Zaloguj się przez GitHub lub Google
3. Kliknij **API Keys** → **Create API Key**
4. Skopiuj klucz (zaczyna się od `gsk_...`)
5. Wklej do `.env` jako wartość `GROQ_API_KEY`

**Limity darmowego konta:**

| Model | Requesty/dzień | Wystarczy na |
|-------|---------------|--------------|
| llama-3.3-70b-versatile | 1 000 | ~100 quizów/dzień |
| llama-3.1-8b-instant | 14 400 | praktycznie bez limitu |

---

## 🔑 Konfiguracja Google OAuth (opcjonalne)

Logowanie przez Google jest opcjonalne — aplikacja działa bez niego.

Jeśli chcesz je włączyć:

1. Wejdź na **[console.cloud.google.com](https://console.cloud.google.com)**
2. Utwórz projekt → **APIs & Services** → **Credentials**
3. Kliknij **Create Credentials** → **OAuth 2.0 Client ID**
4. Typ: **Web application**
5. **Authorized redirect URIs** dodaj:
   ```
   http://localhost:8000/auth/google/callback
   ```
6. Skopiuj **Client ID** i **Client Secret** do `.env`

---

## 🌐 Deployment na Railway.app (darmowy hosting w chmurze)

1. Wejdź na **[railway.app](https://railway.app)** → zaloguj przez GitHub
2. **New Project** → **Deploy from GitHub repo** → wybierz `quiz`
3. **+ New** → **Database** → **Add PostgreSQL** (Railway ustawi `DATABASE_URL` automatycznie)
4. W ustawieniach serwisu ustaw:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. W zakładce **Variables** dodaj:
   ```
   GROQ_API_KEY       = gsk_...
   SECRET_KEY         = losowy-klucz
   GOOGLE_CLIENT_ID   = (opcjonalne)
   GOOGLE_CLIENT_SECRET = (opcjonalne)
   GOOGLE_REDIRECT_URI = https://twoja-app.up.railway.app/auth/google/callback
   FRONTEND_URL        = https://twoja-app.up.railway.app/admin
   ```
6. Railway automatycznie robi deploy po każdym `git push` ✅

---

## 📡 Endpointy API

```
POST   /api/generate/topic     ← generuj pytania z podanego tematu
POST   /api/generate/pdf       ← generuj pytania z wgranego PDF
GET    /api/questions           ← lista pytań z bazy (?category= ?source=)
GET    /api/questions/{id}      ← pojedyncze pytanie
DELETE /api/questions/{id}      ← usuń pytanie (wymaga zalogowania)
GET    /api/categories          ← lista kategorii w bazie
GET    /auth/google             ← logowanie przez Google
GET    /auth/me                 ← dane zalogowanego użytkownika
```

---

## 🛠️ Rozwiązywanie problemów

**`psycopg2` nie może połączyć się z bazą**
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**`ModuleNotFoundError`**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Groq zwraca błąd 401**
```bash
# Sprawdź czy klucz jest w .env
grep GROQ_API_KEY .env
```

**Google OAuth nie działa**
- Sprawdź czy `http://localhost:8000/auth/google/callback` jest dodany w Google Console jako dozwolony redirect URI
