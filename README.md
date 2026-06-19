# Weathering With You

> A personal outfit & mood diary that streams AI clothing suggestions tied to live weather.

---

## What it does

You log a diary entry for the day — your city, your mood, and optionally what you're already wearing. The app fetches live weather from OpenWeatherMap, then streams a personalised outfit recommendation from a Groq LLM token-by-token. An optional reference photo from Unsplash appears alongside the suggestion. Over time the AI learns from your diary history ("last time it was this cold and you were tired, you wore the wool coat and felt warm — same call today?").

Every entry is saved: you can browse past entries in a reverse-chronological feed, edit your reflection after the fact, and compare what the AI suggested versus what you actually wore.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite (`localhost:5173`) |
| Streaming | SSE via `fetch` + `ReadableStream` (not `EventSource` — cannot send `Authorization` headers) |
| Backend | FastAPI — Python 3 (`localhost:8000`) |
| Database | SQLite + SQLAlchemy (ORM) + Alembic (migrations) |
| Auth | JWT — `python-jose` + `passlib`; roles: `admin` and `user` |
| LLM (primary) | Groq (`llama-3.1-8b-instant`) |
| LLM (benchmarking) | OpenRouter (swap by changing one env var) |
| External APIs | OpenWeatherMap (weather data) + Unsplash (outfit photo, optional) |

---

## Architecture at a glance

```
Browser (React + Vite)
  │
  │  /api/* → proxy → localhost:8000
  │
FastAPI
  ├── routes/auth.py        → JWT register / login
  ├── routes/entries.py     → diary CRUD + SSE suggestion stream
  └── routes/admin.py       → admin-only entry list
       │
       ├── services/external/weather.py   → OpenWeatherMap (TTL-cached 10 min)
       ├── services/external/unsplash.py  → Unsplash photo (best-effort)
       ├── services/prompts.py            → builds [system, user] message list
       ├── services/suggestion_service.py → orchestrates stream + DB persistence
       └── app/llm/                       → provider abstraction (Groq / OpenRouter)
            │
            └── SQLite via SQLAlchemy (entries + entry_messages + users)
```

Key architectural decisions:

- **Weather captured at entry creation, never re-fetched** — `entries.weather_json` is canonical; regenerations are deterministic (ADR-Diary-2).
- **SSE via `fetch` + `ReadableStream`** — `EventSource` cannot send `Authorization` headers; query-param JWT is unsafe (ADR-4).
- **LLM provider behind a Protocol** — swap Groq ↔ OpenRouter by changing one env var; required for benchmarking (ADR-2).
- **Ownership errors return 404, never 403** — prevents ID enumeration (ADR-Diary-1).
- **History injection capped at 5 entries** — injected as one-liners into the system prompt; no RAG (ADR-Diary-3).

See [`docs/architecture.md`](docs/architecture.md) for the full diagram and ADR list.

---

## Setup (cold clone)

### Required tooling

- Python 3.11+
- Node 20+ and `npm`

### API keys

| Key | Required? | Where to get it |
|---|---|---|
| `OPENWEATHER_API_KEY` | **Yes** | [openweathermap.org](https://openweathermap.org) → sign up → API keys (free tier, activates in ~10 min) |
| `GROQ_API_KEY` | **Yes** | [console.groq.com](https://console.groq.com) → API keys (free) |
| `OPENROUTER_API_KEY` | No (benchmarking only) | [openrouter.ai](https://openrouter.ai) → keys |
| `UNSPLASH_ACCESS_KEY` | No | [unsplash.com/developers](https://unsplash.com/developers) → new app (free, 50 req/hr) |

### Backend

```bash
cd backend
cp .env.example .env          # then fill in OPENWEATHER_API_KEY and GROQ_API_KEY
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
# → http://localhost:8000
# → API docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Visit `http://localhost:5173`.

### Seed admin credentials

```
Email:    admin@example.com
Password: admin1234
```

Override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars.

---

## Demo walkthrough

1. **Log in** at `http://localhost:5173` with the seed admin credentials → land on `/diary`.
2. **Create an entry** — click "New Entry", fill `city: Paris`, `mood: tired`, leave outfit blank → click "Create entry".
3. **Watch the stream** — you are redirected to `/diary/:id`. The weather card renders within ~1s (temp, condition, humidity, wind). The AI suggestion streams token-by-token into the suggestion panel, typically completing in 2–5s.
4. **Save a reflection** — scroll to "How it felt", type `felt warm enough`, click Save → "Saved ✓" appears.
5. **Browse the feed** — navigate to `/diary`. Your entry appears with city, mood, weather chip, and a preview of the AI suggestion.
6. **Admin view** — navigate to `/admin` (visible in the nav for admin users). See a table of all users' entries across the system.

---

## API endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account | Public |
| `POST` | `/api/auth/login` | Issue a JWT | Public |
| `GET` | `/api/users/me` | Current authenticated user | User |
| `POST` | `/api/entries` | Create a diary entry (fetches weather + photo) | User |
| `GET` | `/api/entries` | List own entries (newest first, paginated) | User |
| `GET` | `/api/entries/{id}` | Full entry with message history | User |
| `PATCH` | `/api/entries/{id}` | Update `outfit_worn` / `reflection` | User |
| `DELETE` | `/api/entries/{id}` | Delete entry + messages | User |
| `POST` | `/api/entries/{id}/suggest/stream` | SSE: stream AI outfit suggestion | User |
| `GET` | `/api/admin/entries` | All users' entries (paginated) | Admin |

---

## Pages

| Path | Page | Purpose |
|---|---|---|
| `/login` | LoginPage | Sign in |
| `/signup` | SignupPage | Create account |
| `/diary` | DiaryPage | Reverse-chronological entry feed |
| `/diary/new` | NewEntryPage | Create a new diary entry |
| `/diary/:id` | EntryDetailPage | Entry detail + AI suggestion stream + reflection editor |
| `/admin` | AdminPage | Admin-only view of all entries |

---

## LLM provider benchmarking

The app ships with a swappable LLM provider abstraction (`backend/app/llm/`). Switching providers requires changing one env var:

```bash
LLM_PROVIDER=groq         # default
LLM_PROVIDER=openrouter   # alternative
```

### Running the benchmark

```bash
cd semester-project          # repo root
python scripts/benchmark.py  # requires both API keys in backend/.env
```

Results are written to `scripts/benchmark-results.csv`. See [`scripts/README.md`](scripts/README.md) for details.

### Results (3 runs each, same fixed prompt — Paris, 12°C overcast, mood: tired)

| Provider | Model | Runs | Median TTFT | Median Total | Avg output |
|---|---|---|---|---|---|
| Groq | `llama-3.1-8b-instant` | 3 | 161 ms | 337 ms | 411 chars |
| OpenRouter | *(key not configured)* | — | — | — | — |

**Analysis:** Groq's custom inference hardware delivers consistently fast first-token latency (78–241ms across runs, median 161ms) with total generation under 340ms for a ~400-char outfit suggestion. The variance between runs (78ms–241ms TTFT) reflects Groq's free-tier queue depth rather than model quality. Full OpenRouter comparison pending — add `OPENROUTER_API_KEY` to `.env` and re-run `scripts/benchmark.py` to extend the table.

---

## Security model

- **JWT authentication** (HS256, 60-minute expiry). Bearer token in `Authorization` header — never in query params.
- **Bcrypt password hashing** via `passlib` (`bcrypt<4.1` pinned for passlib 1.7.4 compatibility).
- **Role-based access control** — `admin` and `user` roles. Admin endpoints protected by `require_admin` dependency.
- **Ownership enforcement** — any request for an entry not owned by the caller returns `404 Not Found` (never `403`) to prevent ID enumeration.
- **Server-side API keys** — OpenWeatherMap, Unsplash, Groq, and OpenRouter keys are loaded exclusively via `app/config.py::Settings`. Never exposed as `VITE_*` env vars.
- **No secrets in the repo** — `.env` is gitignored; only `.env.example` (blank values) is committed.

---

## Data stored

All data lives in a local SQLite file (`backend/data/app.db`):

- `users` — email (lowercased), bcrypt password hash, role, created_at
- `entries` — city, mood, entry date, weather snapshot (JSON), outfit text, reflection, photo URL, LLM model used
- `entry_messages` — LLM transcript rows (system / user / assistant) per entry, with metadata JSON

No analytics, no telemetry, no external data storage. The database file is local to the machine running the backend.

---

## Project organisation

This project was built milestone-by-milestone following a structured plan:

- [`.claude/PLAN.md`](.claude/PLAN.md) — canonical architecture, data model, API surface, ADRs, milestone roadmap
- [`.claude/M3-plan.md`](.claude/M3-plan.md) through [`M7-plan.md`](.claude/M7-plan.md) — per-milestone implementation plans used to brief worker agents

Each milestone plan specifies: acceptance criteria, file-level changes, function signatures, test matrices, execution order, and gotchas. This approach kept scope contained and made handoffs between backend and frontend work unambiguous.

**What worked well:** writing the SSE event shape and ADRs before implementation meant zero renegotiation between the backend stream emitter and the frontend consumer. The frozen wire format (ADR-11) was the single best decision — it let M5 (backend) and M6 (frontend) be planned independently.

**What we'd do differently:** the SQLite rename migration in M3 (renaming `conversations` → `entries`) was underscoped initially — SQLite's lack of native `ALTER TABLE RENAME COLUMN` support required batch migration mode and manual revision editing that we hadn't budgeted for. Starting from the correct schema name would have saved ~1h.

---

## Repo layout

```
semester-project/
├── README.md
├── docs/
│   ├── Project-03.pdf
│   ├── llm-alternatives.pdf
│   └── screenshots/
├── scripts/
│   ├── benchmark.py           # LLM provider benchmark
│   ├── benchmark-results.csv  # reference output
│   └── README.md
├── backend/                   # FastAPI — Python 3
│   ├── .env.example
│   ├── requirements.txt
│   ├── alembic/               # DB migrations
│   └── app/
│       ├── api/routes/        # auth, entries, admin
│       ├── llm/               # provider abstraction (Groq + OpenRouter)
│       ├── models/            # SQLAlchemy ORM
│       ├── schemas/           # Pydantic request/response models
│       ├── services/          # business logic + external API clients
│       └── db/                # engine, session, seed
└── frontend/                  # React 19 + TypeScript + Vite
    └── src/
        ├── api/               # apiFetch wrapper + entries + SSE parser
        ├── auth/              # AuthContext + RequireAuth
        ├── components/        # NavBar, EntryCard, WeatherCard, SuggestionPanel, …
        ├── hooks/             # useSuggestionStream
        ├── pages/             # Diary, NewEntry, EntryDetail, Admin, Login, Signup
        └── types/             # shared TypeScript types
```

---

*EPITA S4 semester project — not licensed for external use.*
