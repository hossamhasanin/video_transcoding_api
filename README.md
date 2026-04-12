<div align="center">

<br/>

<!-- Logo -->
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
</svg>

<br/>

# TranscodeFlow

**API-First Video Transcoding Platform**

Transform any video into delivery-ready formats with a single API call.

[Getting Started](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Deployment](#-deployment)

<br/>

<!-- Badges -->
<img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19"/>
<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>
<img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Celery-5.3+-37814A?style=flat-square&logo=celery&logoColor=white" alt="Celery"/>
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>

<br/>

</div>

---

## Why TranscodeFlow?

Building video infrastructure is painful. You juggle FFmpeg flags, manage async job queues, handle multi-rendition outputs, and still need subtitles. TranscodeFlow wraps all of that behind a clean REST API so you can stop reinventing the wheel and ship your product.

- **One endpoint** — submit a source URL, get back a transcoded video
- **Multi-node** — designed for horizontal scaling across distributed worker nodes
- **Real-time** — live progress via Server-Sent Events, not polling
- **Subtitles included** — WhisperX auto-generates WebVTT captions

---

## Features

| Category | What you get |
|---|---|
| **Multi-format Transcoding** | MP4 and HLS adaptive streaming with multi-rendition support — 360p to 4K |
| **Social Media Presets** | One-click optimization for TikTok (9:16), YouTube (16:9), Instagram (1:1) |
| **Automatic Subtitles** | WhisperX-powered speech recognition with language detection and WebVTT output |
| **Real-time Progress** | Live updates via Server-Sent Events with ETA calculations |
| **Webhooks** | HMAC-signed notifications with automatic retries and delivery logging |
| **API Key Management** | Generate, scope, and revoke keys with full lifecycle control |
| **Interactive Dashboard** | React dashboard with job monitoring, API playground, and settings |
| **API Documentation** | Built-in docs page with endpoint reference, guides, and code examples |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for frontend development)

### 1. Clone & start infrastructure

```bash
git clone https://github.com/your-username/video_transcoding_api.git
cd video_transcoding_api

# Start PostgreSQL, Redis, and the API
docker compose up -d

# Run database migrations
docker compose exec api alembic upgrade head
```

### 2. Start the frontend

```bash
cd frontend
npm ci
npm run dev
```

The dashboard is now live at **http://localhost:5173**, the API at **http://localhost:8000**.

### 3. Submit your first job

```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "X-API-Key: vf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://example.com/video.mp4",
    "output_format": "mp4",
    "preset": "youtube"
  }'
```

That's it. The worker picks up the job, transcodes via FFmpeg, uploads to S3/R2, and reports back.

---

## Architecture

TranscodeFlow is a distributed system designed for multi-node deployment — a **control plane** (API + DB + frontend) and **remote worker nodes** connected via Tailscale VPN.

```
┌──────────────────────────────────────────────────────────┐
│                     Control Plane                        │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ FastAPI   │  │ React    │  │ PostgreSQL│  │ Redis  │  │
│  │ REST API  │  │ Dashboard│  │           │  │ Broker │  │
│  └─────┬─────┘  └──────────┘  └──────────┘  └───┬────┘  │
│        │                                         │       │
└────────┼─────────────────────────────────────────┼───────┘
         │                                         │
         ▼                                         ▼
┌─────────────────────┐              ┌──────────────────────┐
│   Worker Node       │              │   ML Worker Node     │
│                     │              │                      │
│  ┌───────────────┐  │              │  ┌────────────────┐  │
│  │ FFmpeg        │  │              │  │ WhisperX       │  │
│  │ Transcoding   │  │              │  │ Subtitles      │  │
│  └───────────────┘  │              │  └────────────────┘  │
│                     │              │                      │
│  Upload ──────────► S3 / Cloudflare R2                   │
└─────────────────────┘              └──────────────────────┘
```

### Job Processing Flow

```
Client ──POST /jobs──▶ API ──enqueue──▶ Redis ──dequeue──▶ Worker
                                                     │
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                    FFmpeg Transcode      WhisperX
                                          │              Subtitles
                                          ▼                     │
                                    Upload to S3/R2 ◄──────────┘
                                          │
                                          ▼
                                    Update job ──▶ Webhook (optional)
```

### Tech Stack

| Layer | Technology |
|---|---|
| **API** | FastAPI + Uvicorn, Pydantic Settings |
| **Database** | PostgreSQL 15, SQLAlchemy 2, Alembic |
| **Task Queue** | Celery 5 + Redis 7 |
| **Transcoding** | FFmpeg (MP4, HLS, multi-rendition) |
| **Subtitles** | WhisperX (ML worker with GPU support) |
| **Auth** | JWT for dashboard, API keys (`X-API-Key`) for jobs |
| **Storage** | Cloudflare R2 / S3-compatible via boto3 |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand |
| **Routing** | React Router v6 with protected routes |
| **HTTP Client** | Axios with token refresh interceptors |
| **CI/CD** | GitHub Actions (lint, build, Docker) |
| **Deployment** | Docker Compose — 4 images (API, Worker, ML, Frontend) |

---

## Project Structure

```
video_transcoding_api/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/        # Route handlers (auth, jobs, keys, usage)
│   │   │   └── dependencies.py   # DI — DB sessions, auth, rate limiting
│   │   ├── core/                 # Config, database, security, storage
│   │   ├── models/               # SQLAlchemy ORM (User, ApiKey, Job)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── worker/tasks.py       # Celery tasks (transcode, subtitle gen)
│   │   └── main.py               # FastAPI app entry point
│   ├── requirements-api.txt
│   ├── requirements-worker.txt
│   └── requirements-ml.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                # Landing, Dashboard, Playground, Settings, API Docs
│   │   ├── components/           # Reusable UI components
│   │   ├── store/                # Zustand auth store with persistence
│   │   ├── data/docs/            # API documentation content
│   │   ├── api.ts                # Axios instance with interceptors
│   │   └── App.tsx               # Router + layout
│   └── package.json
├── docker-compose.yml            # Local development
├── docker-compose.control.yml    # Production control plane
├── docker-compose.worker.yml     # Transcode worker nodes
├── docker-compose.ml.yml         # ML/subtitle worker nodes
└── .github/workflows/ci.yml      # CI pipeline
```

---

## API Reference

The API exposes RESTful endpoints under `/api/v1/`. Auth uses JWT tokens for dashboard access and API keys for programmatic access.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Get JWT tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/jobs` | Submit a transcoding job |
| `GET` | `/jobs` | List your jobs |
| `GET` | `/jobs/{id}` | Get job details + progress |
| `GET` | `/jobs/{id}/stream` | SSE progress stream |
| `POST` | `/keys` | Generate API key |
| `GET` | `/keys` | List API keys |
| `DELETE` | `/keys/{id}` | Revoke API key |
| `GET` | `/usage` | Usage statistics |

Full interactive documentation is available at `/docs` (Swagger UI) when the API is running.

---

## Deployment

TranscodeFlow ships with production-ready Docker Compose configs for distributed deployment:

```bash
# Control plane (API + Frontend + DB + Redis + Traefik)
docker compose -f docker-compose.control.yml up -d

# Transcode worker node (connects via Tailscale VPN)
docker compose -f docker-compose.worker.yml up -d

# ML/subtitle worker node (GPU recommended)
docker compose -f docker-compose.ml.yml up -d
```

### Environment Variables

Three `.env` files (gitignored):

| File | Purpose |
|---|---|
| **Root `.env`** | Docker Compose — DB/Redis credentials, JWT secrets, CORS origins |
| **`backend/.env`** | FastAPI when running locally (`localhost:5432`, `localhost:6379`) |
| **`frontend/.env`** | `VITE_API_URL=http://localhost:8000/api/v1` |

---

## Development

### Backend

```bash
# Run infra only (DB + Redis in Docker, API locally for hot-reload)
docker compose up -d db redis
cd backend && source .venv/bin/activate
pip install -r requirements-api.txt
uvicorn app.main:app --reload --port 8000
```

```bash
# Lint & format
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics
black --check --diff .

# Database migrations
alembic revision --autogenerate -m "description"
alembic downgrade -1
```

### Frontend

```bash
cd frontend
npm ci
npm run dev          # Dev server on :5173
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
```

---

## License

This project is licensed under the MIT License.

---

<div align="center">

Built with the TranscodeFlow platform.

</div>
