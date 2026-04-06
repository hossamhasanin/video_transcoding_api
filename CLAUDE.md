# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Distributed video transcoding API with a FastAPI backend, React frontend, and Celery workers for transcoding (FFmpeg) and subtitle generation (WhisperX). Designed for multi-node deployment: a control plane (API + DB + frontend) and remote worker nodes connected via Tailscale VPN.

## Commands

### Local Development

```bash
# Start infrastructure (PostgreSQL, Redis, FastAPI)
docker compose up -d

# Apply migrations
docker compose exec api alembic upgrade head

# Frontend dev server
cd frontend && npm run dev
```

### Backend

```bash
# Run backend locally (hot-reload, infra in Docker)
docker compose up -d db redis
cd backend && source .venv/bin/activate
pip install -r requirements-api.txt
uvicorn app.main:app --reload --port 8000

# Lint & format
cd backend
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics
black --check --diff .

# Migrations
docker compose exec api alembic revision --autogenerate -m "description"
docker compose exec api alembic downgrade -1
```

### Frontend

```bash
cd frontend
npm ci
npm run dev          # dev server on :5173
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
```

## Architecture

### Backend (`backend/`)

- **Framework**: FastAPI + Uvicorn, Python 3.13+
- **ORM**: SQLAlchemy with Alembic migrations
- **Task Queue**: Celery with Redis broker
- **Auth**: JWT (python-jose) for user endpoints, API keys (X-API-Key header) for job endpoints
- **Storage**: Cloudflare R2 / S3-compatible via boto3
- **Config**: Pydantic Settings loading from environment variables (`backend/app/core/config.py`)

Key layout:
- `app/api/endpoints/` — route handlers: `auth.py`, `jobs.py`, `keys.py`, `usage.py`
- `app/api/dependencies.py` — dependency injection (DB sessions, auth, rate limiting)
- `app/core/` — config, database, security, storage
- `app/models/` — SQLAlchemy ORM models (User, ApiKey, Job)
- `app/schemas/` — Pydantic request/response schemas
- `app/worker/tasks.py` — Celery tasks (transcode, subtitle generation)
- `requirements-api.txt`, `requirements-worker.txt`, `requirements-ml.txt` — separate dependency sets per service

### Frontend (`frontend/`)

- **React 19** + TypeScript (strict mode) + Vite
- **State**: Zustand with localStorage persistence (`store/authStore.ts`)
- **HTTP**: Axios with interceptors for auto token refresh (`api.ts`)
- **Styling**: Tailwind CSS v4 — utility classes only, custom tokens in `@theme {}` block in `index.css`
- **Routing**: React Router v6 — auth pages, dashboard (`/`), settings (`/settings`)

### Deployment (Docker Compose)

Four images: `Dockerfile.api`, `Dockerfile.worker`, `Dockerfile.ml`, `frontend/Dockerfile`
- `docker-compose.yml` — local development
- `docker-compose.control.yml` — production control plane (Traefik + API + frontend + DB + Redis)
- `docker-compose.worker.yml` — transcode worker nodes
- `docker-compose.ml.yml` — ML/subtitle worker nodes

### Job Processing Flow

1. Client POSTs job with API key → validated, record created (status: `pending`)
2. Celery task queued in Redis
3. Worker downloads source video, transcodes via FFmpeg (MP4/HLS)
4. Optional: extract audio → queue ML task for WhisperX subtitles
5. Upload result to R2/S3, update job to `completed`
6. Optional: webhook callback with HMAC signature

## Code Style

- **Backend**: Black formatter (88 char line length), Flake8 linting
- **Frontend**: ESLint + React rules, TypeScript strict mode
- **Styling**: Tailwind v4 utility classes only — no inline style props, no separate CSS class rules. Custom tokens via `bg-brand`, `text-danger`, etc. Arbitrary values (`text-[15px]`) acceptable for one-offs not in token set.
- **Components**: All React components typed with explicit return types

## Environment Files

Three gitignored `.env` files:
- **Root `.env`** — Docker Compose (DB/Redis credentials, JWT secrets, CORS origins)
- **`backend/.env`** — FastAPI when running locally (points to `localhost:5432` / `localhost:6379`)
- **`frontend/.env`** — `VITE_API_URL=http://localhost:8000/api/v1`

## CI

GitHub Actions on push to `main`/`develop` and PRs to `main`:
1. Backend: Flake8 + Black check + import smoke test
2. Frontend: ESLint + production build
3. Docker: build all 4 images (API, Worker, ML, Frontend)

## Local Limitations

Workers, ML processing, file storage (R2/S3), email delivery, and webhooks require external services and are not testable locally. Jobs will remain in `pending` status without workers.
