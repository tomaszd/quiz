# 🧠 Quiz App

Aplikacja do quizów z panelem admina do generowania pytań przez AI (OpenAI GPT-4o-mini).

## Struktura projektu

```
quiz/
├── index.html          ← Frontend quizu (statyczna strona)
├── quiz.js             ← Logika quizu
├── style.css           ← Style
├── questions.js        ← 250 pytań (5 kategorii)
└── backend/            ← Serwis FastAPI (Python)
    ├── main.py
    ├── database.py
    ├── models.py
    ├── schemas.py
    ├── admin.html
    ├── requirements.txt
    └── .env.example
```

---

## 🖥️ Uruchomienie lokalne (krok po kroku)

### 1. Wymagania wstępne

```bash
# Sprawdź czy masz Python 3.10+
python3 --version

# Sprawdź czy PostgreSQL działa
pg_isready
```

Jeśli nie masz PostgreSQL:
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

### 2. Utwórz bazę danych

```bash
sudo -u postgres createdb quizdb
sudo -u postgres psql -c "CREATE USER quizuser WITH PASSWORD 'quizpass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE quizdb TO quizuser;"
```

---

### 3. Skonfiguruj projekt

```bash
# Wejdź do katalogu backendu
cd backend

# Utwórz wirtualne środowisko Python
python3 -m venv venv

# Aktywuj środowisko
source venv/bin/activate        # Linux/Mac
# lub: venv\Scripts\activate    # Windows

# Zainstaluj zależności
pip install -r requirements.txt
```

---

### 4. Ustaw zmienne środowiskowe

```bash
# Skopiuj przykładowy plik konfiguracyjny
cp .env.example .env

# Otwórz i uzupełnij plik .env
nano .env
```

Wypełnij poniższe wartości w pliku `.env`:

```env
# Klucz Groq (darmowy!) — pobierz z https://console.groq.com → API Keys
GROQ_API_KEY=gsk-...

# Baza danych (jeśli używasz lokalnego PostgreSQL jak wyżej)
DATABASE_URL=postgresql://quizuser:quizpass@localhost:5432/quizdb

# Google OAuth — pobierz z https://console.cloud.google.com
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Po zalogowaniu przez Google, przekieruj tutaj
FRONTEND_URL=http://localhost:8000/admin

# Losowy sekret do JWT — wygeneruj np.: openssl rand -hex 32
SECRET_KEY=wygenerowany-losowy-klucz
```

---

### 5. Uruchom serwer

```bash
# Upewnij się że jesteś w katalogu backend/ z aktywnym venv
cd backend
source venv/bin/activate

uvicorn main:app --reload --port 8000
```

Serwer startuje automatycznie i tworzy tabele w bazie przy pierwszym uruchomieniu.

---

### 6. Otwórz w przeglądarce

| Adres | Opis |
|-------|------|
| `http://localhost:8000/admin` | Panel admina — generuj pytania, przeglądaj bazę |
| `http://localhost:8000/docs` | Swagger UI — testuj API ręcznie |
| `http://localhost:8000/api/questions` | JSON z pytaniami z bazy |
| `file:///ścieżka/do/index.html` | Frontend quizu (otwórz bezpośrednio) |

---

## 🔑 Konfiguracja Google OAuth (logowanie przez Google)

1. Wejdź na [console.cloud.google.com](https://console.cloud.google.com)
2. Utwórz nowy projekt (lub wybierz istniejący)
3. Wejdź w **APIs & Services** → **Credentials**
4. Kliknij **Create Credentials** → **OAuth 2.0 Client ID**
5. Wybierz typ: **Web application**
6. W sekcji **Authorized redirect URIs** dodaj:
   ```
   http://localhost:8000/auth/google/callback
   ```
   (dla produkcji dodaj też: `https://twoja-domena.com/auth/google/callback`)
7. Skopiuj **Client ID** i **Client Secret** do pliku `.env`

> ⚠️ Bez konfiguracji Google OAuth aplikacja działa normalnie —
> logowanie przez Google jest opcjonalne. Generowanie pytań i przeglądanie bazy
> działa bez logowania.

---

## 🌐 Deployment na Railway.app (darmowy hosting)

Railway oferuje darmowy tier z PostgreSQL w chmurze.

### Krok 1 — Konto i projekt

1. Wejdź na [railway.app](https://railway.app) i zaloguj przez GitHub
2. Kliknij **New Project** → **Deploy from GitHub repo**
3. Wybierz repozytorium `quiz`

### Krok 2 — Dodaj bazę danych

1. W projekcie kliknij **+ New** → **Database** → **Add PostgreSQL**
2. Railway automatycznie ustawi zmienną `DATABASE_URL`

### Krok 3 — Skonfiguruj serwis

1. W zakładce swojego serwisu przejdź do **Settings**
2. Ustaw **Root Directory**: `backend`
3. Ustaw **Start Command**:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### Krok 4 — Dodaj zmienne środowiskowe

W zakładce **Variables** dodaj:

```
OPENAI_API_KEY        = sk-...
GOOGLE_CLIENT_ID      = xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET  = GOCSPX-...
GOOGLE_REDIRECT_URI   = https://twoja-app.up.railway.app/auth/google/callback
FRONTEND_URL          = https://twoja-app.up.railway.app/admin
SECRET_KEY            = wygenerowany-losowy-klucz
```

> `DATABASE_URL` jest ustawiane automatycznie przez Railway.

### Krok 5 — Deploy

Railway automatycznie robi deploy po każdym `git push` do `main`. 🎉

---

## 📡 Endpointy API

### Generowanie pytań

```
POST /api/generate/topic
```
```json
{
  "topic": "Fotosynteza u roślin",
  "count": 10,
  "category": "Biologia"
}
```

```
POST /api/generate/pdf
```
Multipart form data: plik PDF + parametry `count` i `category`.

### Pytania w bazie

```
GET  /api/questions              ← lista pytań (opcjonalne ?category=&source=)
GET  /api/questions/{id}         ← pojedyncze pytanie
DELETE /api/questions/{id}       ← usuń pytanie (wymaga logowania)
GET  /api/categories             ← lista kategorii w bazie
```

### Autoryzacja

```
GET /auth/google                 ← przekierowanie do Google
GET /auth/google/callback        ← callback po zalogowaniu
GET /auth/me                     ← dane zalogowanego użytkownika
```

---

## 🔄 Codzienne uruchamianie (skrót)

```bash
cd ~/PROJECTS/quiz/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

---

## 🛠️ Rozwiązywanie problemów

**Problem: `psycopg2` nie może się połączyć z bazą**
```bash
# Sprawdź czy PostgreSQL działa
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Problem: `ModuleNotFoundError`**
```bash
# Upewnij się że masz aktywne venv
source venv/bin/activate
pip install -r requirements.txt
```

**Problem: OpenAI zwraca błąd 401**
```bash
# Sprawdź czy klucz jest poprawnie ustawiony
cat .env | grep OPENAI
```

**Problem: Google OAuth nie działa lokalnie**
- Upewnij się że w Google Console dodałeś `http://localhost:8000/auth/google/callback` jako dozwolony redirect URI
