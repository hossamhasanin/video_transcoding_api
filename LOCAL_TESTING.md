# Local Testing Guide

Quick reference for running and testing the Video Transcoding API locally — frontend, backend, database, and optionally workers for transcoding and subtitle generation.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Docker & Docker Compose | v2+ |
| Node.js | v18+ |
| Python | 3.13+ (only if running backend outside Docker) |
| curl / httpie | any (for API testing) |

---

## Quick Start

```bash
# 1. Start infrastructure (PostgreSQL, Redis, FastAPI backend)
docker compose up -d

# 2. Run database migrations
docker compose exec api alembic upgrade head

# 3. Start the frontend dev server
cd frontend && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Transcode Worker | `--profile worker` required |
| ML Worker | `--profile ml` required |

### Optional: Run Workers

If you need transcoding or subtitle generation, set up R2 credentials in `.env` (see "Running Workers Locally" below) then:

```bash
# Add the transcode worker
docker compose --profile worker up -d

# Or add both workers
docker compose --profile worker --profile ml up -d
```

---

## Environment Files

Three `.env` files control local development. All are gitignored.

### Root `.env` — Docker Compose

Used by `docker-compose.yml` to configure the `db`, `redis`, and `api` services.

```bash
POSTGRES_USER=admin
POSTGRES_PASSWORD=localdevpassword123
REDIS_PASSWORD=localredispassword123

JWT_SECRET_KEY=<generated-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

CORS_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173

# R2/S3 not needed for auth & dashboard testing
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

### Backend `backend/.env` — FastAPI (local run)

Used when running the backend **without** Docker (e.g. `uvicorn app.main:app`). The docker-compose `api` service overrides `DATABASE_URL` and `CELERY_BROKER_URL` to use Docker internal hostnames.

```bash
DATABASE_URL=postgresql://admin:localdevpassword123@localhost:5432/transcoding_db
CELERY_BROKER_URL=redis://:localredispassword123@localhost:6379/0
CELERY_RESULT_BACKEND=redis://:localredispassword123@localhost:6379/0
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
JWT_SECRET_KEY=<same-as-root>
```

### Frontend `frontend/.env` — Vite

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Testing Authentication

All auth endpoints are prefixed `/api/v1/auth`. Password rules: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.

### Register

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Str0ng!Pass",
    "full_name": "Test User"
  }'
```

Returns `user` object + `tokens` (access_token, refresh_token).

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Str0ng!Pass"
  }'
```

### Get Current User (Authenticated)

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Refresh Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

### Change Password

```bash
curl -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Str0ng!Pass",
    "new_password": "N3wP@ssw0rd"
  }'
```

---

## Testing API Keys

API keys are required for job endpoints. First login to get a bearer token, then create an API key.

### Create API Key

```bash
curl -X POST http://localhost:8000/api/v1/keys/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Test Key"}'
```

**Save the `key_value` — it's only returned once.**

### List API Keys

```bash
curl http://localhost:8000/api/v1/keys/ \
  -H "Authorization: Bearer <access_token>"
```

### Delete API Key

```bash
curl -X DELETE http://localhost:8000/api/v1/keys/<key_id> \
  -H "Authorization: Bearer <access_token>"
```

---

## Testing Jobs

Jobs require an API key (passed as `X-API-Key` header). Since workers aren't running, jobs will stay in `pending` status — this is expected.

### Create a Job

```bash
curl -X POST http://localhost:8000/api/v1/jobs/ \
  -H "X-API-Key: <api_key_value>" \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://example.com/video.mp4",
    "preset": "youtube",
    "output_format": "mp4",
    "generate_subtitles": false
  }'
```

### Check Job Status

```bash
curl http://localhost:8000/api/v1/jobs/<tracking_id> \
  -H "X-API-Key: <api_key_value>"
```

### Get Usage Stats

```bash
curl http://localhost:8000/api/v1/usage/ \
  -H "Authorization: Bearer <access_token>"
```

---

## Testing the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. Test these flows:

| Flow | Route | What to verify |
|------|-------|----------------|
| Register | `/register` | Creates account, redirects to dashboard |
| Login | `/login` | Authenticates, redirects to dashboard |
| Dashboard | `/` | Shows stats, job list (empty is fine) |
| Settings | `/settings` | API key management |
| Forgot Password | `/forgot-password` | Form submission (no email sent locally) |
| Auto-redirect | `/login` (while logged in) | Redirects to dashboard |

---

## Useful Commands

### Docker Compose

```bash
# Start all services
docker compose up -d

# Start only DB and Redis (run backend locally)
docker compose up -d db redis

# View logs
docker compose logs -f api          # Follow API logs
docker compose logs --tail 50 db    # Last 50 DB logs

# Restart a single service
docker compose restart api

# Stop everything (keeps data)
docker compose down

# Stop and wipe database volume
docker compose down -v

# Start with transcode worker
docker compose --profile worker up -d

# Start with ML worker
docker compose --profile ml up -d

# Start everything (base + both workers)
docker compose --profile worker --profile ml up -d

# Stop everything including workers
docker compose --profile worker --profile ml down
```

### Database Migrations

```bash
# Run all pending migrations
docker compose exec api alembic upgrade head

# Check current migration version
docker compose exec api alembic current

# Create a new migration (after model changes)
docker compose exec api alembic revision --autogenerate -m "description"

# Rollback one migration
docker compose exec api alembic downgrade -1

# Rollback to specific version
docker compose exec api alembic downgrade <revision_id>
```

### Database Queries

Connect to PostgreSQL directly:

```bash
# Open an interactive psql session
docker compose exec db psql -U admin -d transcoding_db
```

**Common queries inside `psql`:**

```sql
-- List all tables
\dt

-- Describe a table structure
\d users

-- View all users
SELECT id, email, full_name, is_active, email_verified, created_at FROM users;

-- View all API keys (key_hash is hashed, key_prefix is readable)
SELECT id, user_id, key_prefix, name, is_active, created_at FROM api_keys;

-- View all jobs and their status
SELECT id, user_id, status, preset, output_format, created_at FROM jobs;

-- Find jobs stuck in pending
SELECT * FROM jobs WHERE status = 'pending';

-- Count jobs by status
SELECT status, COUNT(*) FROM jobs GROUP BY status;

-- Check a specific user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Exit psql
\q
```

### Modifying Database Rows

```bash
docker compose exec db psql -U admin -d transcoding_db
```

```sql
-- Activate/deactivate a user
UPDATE users SET is_active = true WHERE email = 'user@example.com';
UPDATE users SET is_active = false WHERE email = 'user@example.com';

-- Verify a user's email manually
UPDATE users SET email_verified = true WHERE email = 'user@example.com';

-- Change a user's name
UPDATE users SET full_name = 'New Name' WHERE email = 'user@example.com';

-- Deactivate an API key
UPDATE api_keys SET is_active = false WHERE key_prefix = 'vf_abc';

-- Force a job to completed status (for dashboard testing)
UPDATE jobs SET status = 'completed', output_url = 'https://example.com/output.mp4' WHERE id = '<job_uuid>';

-- Force a job to failed status
UPDATE jobs SET status = 'failed', error_message = 'Manual test failure' WHERE id = '<job_uuid>';

-- Set fake usage stats on a job (for dashboard testing)
UPDATE jobs
SET source_size_bytes = 52428800,
    output_size_bytes = 26214400,
    processing_duration_seconds = 45.2
WHERE id = '<job_uuid>';

-- Delete all jobs for a user
DELETE FROM jobs WHERE user_id = '<user_uuid>';

-- Delete a user and all their data (cascades to keys and jobs)
DELETE FROM users WHERE email = 'user@example.com';

-- Reset the entire database (nuclear option)
TRUNCATE users, api_keys, jobs CASCADE;
```

### Quick one-liners (no psql session needed)

```bash
# Check if a user exists
docker compose exec db psql -U admin -d transcoding_db -c \
  "SELECT email, is_active, email_verified FROM users;"

# Count rows in each table
docker compose exec db psql -U admin -d transcoding_db -c \
  "SELECT 'users' AS table_name, COUNT(*) FROM users UNION ALL
   SELECT 'api_keys', COUNT(*) FROM api_keys UNION ALL
   SELECT 'jobs', COUNT(*) FROM jobs;"

# Verify a user's email from CLI
docker compose exec db psql -U admin -d transcoding_db -c \
  "UPDATE users SET email_verified = true WHERE email = 'user@example.com';"
```

### Running Backend Locally (without Docker)

Useful for debugging with hot-reload:

```bash
# Start only the infrastructure
docker compose up -d db redis

# Create/activate a virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-api.txt

# Run with hot-reload
uvicorn app.main:app --reload --port 8000
```

The backend reads `backend/.env` which points to `localhost:5432` and `localhost:6379`.

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Register | 5/min |
| Login | 10/min |
| Refresh token | 20/min |
| Change password | 5/min |
| Forgot password | 3/min |
| Reset password | 5/min |
| Verify email | 10/min |
| Resend verification | 3/min |
| Create job | 10/min |
| Get job status | 30/min |

If you hit rate limits during testing, restart the API container to reset:

```bash
docker compose restart api
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Connection refused` on port 5432/6379 | Containers not running — `docker compose up -d db redis` |
| API returns 500 on auth | Migrations not applied — `docker compose exec api alembic upgrade head` |
| Frontend shows network errors | Check `VITE_API_URL` in `frontend/.env` and that backend is on port 8000 |
| CORS errors in browser | Ensure `CORS_ORIGINS` in root `.env` includes `http://localhost:5173` |
| Rate limit hit during testing | `docker compose restart api` |
| Port already in use | `lsof -i :8000` to find the process, then kill it |
| Database data corrupted | `docker compose down -v` then `docker compose up -d` (wipes all data) |
| Want fresh start | `docker compose down -v && docker compose up -d && docker compose exec api alembic upgrade head` |

---

## Running Workers Locally

Workers handle video transcoding (FFmpeg) and ML-based subtitle generation (WhisperX). They are **opt-in** using Docker Compose profiles — the base `docker compose up -d` does not start them.

### Prerequisites

Workers need **Cloudflare R2 credentials** to upload/download transcoded files. Without these, jobs will fail at the storage step.

### Setting Up Cloudflare R2

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage** (left sidebar)
3. If prompted, enable R2 (may require payment method on file)
4. Click **Create bucket** and name it (e.g., `video-transcoding`)
5. Go to **Manage R2 API Tokens** (right sidebar on the R2 page)
6. Click **Create API Token**
7. Permissions: **Object Read & Write**
8. Specify bucket: **Apply to only the bucket you created**
9. Click **Create API Token**
10. Copy the values into your root `.env`:

| `.env` Variable | Where to Find It |
|-----------------|------------------|
| `R2_ACCOUNT_ID` | R2 overview page, or in the token details after creation |
| `R2_ACCESS_KEY_ID` | **Access Key ID** shown after token creation |
| `R2_SECRET_ACCESS_KEY` | **Secret Access Key** shown after token creation (shown once!) |
| `R2_BUCKET_NAME` | The bucket name you created in step 4 (default: `video-transcoding`) |

Your root `.env` should look like:

```bash
R2_ACCOUNT_ID=abc123def456ghi789
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=video-transcoding
S3_ENDPOINT_URL=
```

**Note:** `S3_ENDPOINT_URL` can be left empty — the worker auto-constructs it from `R2_ACCOUNT_ID`.

### Starting Workers

```bash
# Base stack only (db, redis, api) — no workers
docker compose up -d

# Add the transcode worker
docker compose --profile worker up -d

# Add the ML worker (subtitle generation)
docker compose --profile ml up -d

# Run everything — base stack + both workers
docker compose --profile worker --profile ml up -d
```

Workers are built from `backend/Dockerfile.worker` and `backend/Dockerfile.ml`. The first build takes a few minutes to install FFmpeg and Python dependencies.

### Verifying Workers Are Running

```bash
# List all running containers (workers should appear)
docker compose ps

# Check worker logs
docker compose logs -f worker-transcode
docker compose logs -f worker-ml

# Verify Celery is connected to the broker
docker compose logs worker-transcode | grep "ready"
# You should see: "celery@transcoding-worker ready."
```

### Testing a Full Transcode Job

1. Make sure the base stack and worker are running:

   ```bash
   docker compose --profile worker up -d
   ```

2. Register a user and create an API key (see sections above).

3. Submit a job with a publicly accessible video URL:

   ```bash
   curl -X POST http://localhost:8000/api/v1/jobs/ \
     -H "X-API-Key: <api_key_value>" \
     -H "Content-Type: application/json" \
     -d '{
       "source_url": "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
       "preset": "youtube",
       "output_format": "mp4",
       "generate_subtitles": false
     }'
   ```

4. Watch the worker pick it up:

   ```bash
   docker compose logs -f worker-transcode
   ```

5. Poll the job status until it shows `completed`:

   ```bash
   curl http://localhost:8000/api/v1/jobs/<tracking_id> \
     -H "X-API-Key: <api_key_value>"
   ```

### Worker Commands Reference

```bash
# View real-time worker logs
docker compose logs -f worker-transcode
docker compose logs -f worker-ml

# View last 100 lines of worker logs
docker compose logs --tail 100 worker-transcode

# Restart a worker (picks up env changes)
docker compose --profile worker restart worker-transcode

# Rebuild and restart (after code changes)
docker compose --profile worker up -d --build worker-transcode

# Stop just the worker (keep base stack running)
docker compose stop worker-transcode

# Check Celery queue depth (via Redis)
docker compose exec redis redis-cli -a localredispassword123 LLEN transcode_queue
docker compose exec redis redis-cli -a localredispassword123 LLEN ml_queue
```

### Troubleshooting Workers

| Issue | Fix |
|-------|-----|
| Worker exits immediately | Check logs: `docker compose logs worker-transcode`. Usually missing R2 credentials or Redis connection failure. |
| `Name or service not known` for `db` or `redis` | Worker not on the Docker network. Make sure you used `docker compose --profile worker up -d` (not `docker run`). |
| Job stays in `pending` forever | Worker not running or not connected to Redis. Check `docker compose ps` and worker logs. |
| `Access Denied` on S3 upload | R2 credentials incorrect. Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in root `.env`. |
| `NoSuchBucket` error | `R2_BUCKET_NAME` doesn't match the bucket name in Cloudflare. |
| Worker build fails on `whisperx` | ML worker needs `git` (already in Dockerfile.ml). If pip fails, check network connectivity. |
| ML worker runs out of memory | WhisperX needs significant RAM (~2-4 GB). Use `--profile ml` only when testing subtitles. |

---

## What's Not Tested Locally (without worker profiles)

These features require worker profiles or external services:

- **Video transcoding** — run `docker compose --profile worker up -d` (needs R2 credentials)
- **Subtitle generation** — run `docker compose --profile ml up -d` (needs R2 credentials)
- **Email delivery** — forgot-password / email-verification endpoints work but no emails are sent
- **Webhooks** — callback URLs need to be reachable from the worker container
