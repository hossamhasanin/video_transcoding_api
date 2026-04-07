# Developer Experience Analysis & Improvement Plan

## Context

This is a developer-first video transcoding API. The goal is to make it dead simple for devs to go from "I have a video" to "I have a transcoded result" while still being powerful enough for advanced use cases (HLS, multi-rendition, subtitles, webhooks).

---

## Current Developer Journey

### Step 1: Sign Up & Get API Key
```
POST /api/v1/auth/register  → JWT access + refresh tokens
POST /api/v1/keys/           → API key (vf_xxx) — shown once, never again
```
- Two-step process: register, then create key
- Key is prefixed `vf_` and only displayed once at creation

### Step 2: Submit a Transcoding Job
```
POST /api/v1/jobs/   (X-API-Key header)
```
- Source must be a **public URL** — no direct file upload through the API
- Optional presets: `tiktok`, `youtube`, `instagram`
- Optional: `generate_subtitles`, `webhook_url`, `hls_config`
- Returns job ID with status `pending`

### Step 3: Track Progress
```
GET /api/v1/jobs/{tracking_id}   (X-API-Key header)
```
- **Polling only** — no push-based updates (WebSocket/SSE)
- Status: `pending` → `processing` → `completed` / `failed`
- No progress percentage or ETA — binary status only

### Step 4: Get Results
- `output_url` field on completed job (direct R2/S3 URL)
- `subtitle_url` if subtitles were requested
- For HLS: master manifest URL + rendition playlists

### Step 5: Webhook (Optional)
- POST to `webhook_url` on completion
- HMAC signature in `X-Webhook-Signature` header
- No retry on delivery failure, no delivery log

---

## What's Working Well

| Area | Details |
|------|---------|
| **Simple auth model** | API key via `X-API-Key` header — familiar pattern, easy to test |
| **Presets** | TikTok/YouTube/Instagram — devs can get going without understanding codecs |
| **Playground** | Interactive testing with live cURL preview, video player, real-time polling |
| **Webhook with HMAC** | Secure webhook delivery with signature verification |
| **HLS support** | Multi-rendition streaming with configurable segment duration |
| **Subtitle generation** | WhisperX-based auto-subtitles as a toggle |
| **Error codes** | Proper HTTP status codes (429, 413, 415, etc.) |

---

## Gaps & Improvement Opportunities

### HIGH IMPACT — These would meaningfully change how devs experience the platform

#### 1. No Direct File Upload via API
**Current**: Source must be a public URL. Devs must host their video somewhere first.
**Problem**: Most developers don't have a public URL for every video. The playground has upload (`/playground/upload`) but the real API doesn't.
**Fix**: Add `POST /api/v1/jobs/upload` — multipart file upload that returns a `source_url` or accepts inline. Alternatively, add presigned upload URLs so devs upload directly to R2.

#### 2. No Job List / History Endpoint
**Current**: `GET /jobs/{id}` only — must know the exact job ID.
**Problem**: Devs have no way to list their jobs, filter by status, or see history.
**Fix**: `GET /api/v1/jobs/?status=completed&limit=50&offset=0` with pagination and filtering.

#### 3. No Progress Details
**Current**: Status is binary — `pending`, `processing`, `completed`, `failed`.
**Problem**: For large videos, `processing` could be 30+ minutes with zero feedback.
**Fix**: Add `progress` (0-100 percentage) and `eta_seconds` to job response. Workers can report progress via Redis.

#### 4. No SDKs or Client Libraries
**Current**: Raw HTTP only. Playground generates cURL but no copy-paste SDK code.
**Problem**: Every dev must write their own HTTP integration. This is the #1 friction for API adoption.
**Fix**:
  - Python SDK (`pip install transcodeflow`)
  - JavaScript/TypeScript SDK (`npm install @transcodeflow/sdk`)
  - Both should handle auth, retries, polling, and typed responses

#### 5. No Quickstart Guide / Docs Site
**Current**: OpenAPI/Swagger auto-docs at `/docs` — functional but not a developer onboarding experience.
**Problem**: Devs land on the platform and don't know where to start.
**Fix**: A docs site with:
  - 5-minute quickstart (sign up → get key → first transcoded video)
  - Copy-paste code snippets in Python, JS, cURL
  - Concept guides (presets, HLS, webhooks)

### MEDIUM IMPACT — Nice-to-haves that make the platform feel polished

#### 6. No Real-Time Updates (WebSocket or SSE)
**Current**: Polling only.
**Fix**: `GET /api/v1/jobs/{id}/events` — SSE stream that pushes status changes. Much friendlier than asking devs to implement polling loops.

#### 7. No Job Cancellation
**Current**: Once submitted, a job runs until completion or failure.
**Fix**: `DELETE /api/v1/jobs/{id}` or `POST /api/v1/jobs/{id}/cancel` — kill a queued or in-progress job.

#### 8. No Signed/Expiring Download URLs
**Current**: `output_url` is a direct R2 URL — either always public or always private.
**Fix**: Generate time-limited signed URLs. Add `POST /api/v1/jobs/{id}/download` that returns a temporary signed URL.

#### 9. Webhook Improvements
**Current**: Fire-and-forget with no visibility.
**Fix**:
  - Webhook delivery log (attempt history, response codes)
  - Automatic retry with exponential backoff (3 attempts)
  - Webhook event types (`job.started`, `job.completed`, `job.failed`)
  - Webhook secret per key (not just global)

#### 10. Rate Limit Headers
**Current**: 429 response when limit hit, but no visibility into remaining quota.
**Fix**: Return standard headers:
  ```
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1712500000
  ```

#### 11. Batch Job Submission
**Current**: One job per request.
**Fix**: `POST /api/v1/jobs/batch` — accept array of jobs, return array of job IDs.

### NICE-TO-HAVE — Polish items

#### 12. Job Retry
`POST /api/v1/jobs/{id}/retry` — re-queue a failed job with same params.

#### 13. Output Format Templates
Predefined HLS configs beyond presets — e.g., "adaptive streaming", "low bandwidth", "4K".

#### 14. Dashboard Job History
The dashboard has no job list — only aggregate stats. Add a job table with filtering.

#### 15. API Key Permissions / Scopes
Currently all keys have full access. Consider read-only keys, or keys scoped to specific operations.

#### 16. Consistent Error Response Shape
Current errors are `{detail: "message"}`. Adopt a structured format:
```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Job xyz was not found",
    "docs_url": "https://docs.transcodeflow.com/errors/JOB_NOT_FOUND"
  }
}
```

---

## Recommended Priority

| Priority | Items |
|----------|-------|
| **P0 — Must have** | Direct file upload, Job list endpoint, Progress details, Quickstart docs |
| **P1 — Should have** | SDKs, SSE events, Job cancellation, Signed download URLs, Rate limit headers |
| **P2 — Nice to have** | Webhook improvements, Batch jobs, Job retry, Dashboard history, Error shape, Scopes |

---

## Current API Endpoint Reference

### Authentication (`/api/v1/auth`)
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/register` | None | 5/min | Create account |
| POST | `/login` | None | 10/min | Get JWT tokens |
| POST | `/refresh` | None | 20/min | Refresh access token |
| GET | `/me` | JWT | — | Get current user |
| POST | `/change-password` | JWT | 5/min | Change password |
| POST | `/forgot-password` | None | 3/min | Request reset email |
| POST | `/reset-password` | None | 5/min | Reset with token |
| GET | `/verify-email` | None | 10/min | Verify email |
| POST | `/resend-verification` | JWT | 3/min | Resend verification |

### API Keys (`/api/v1/keys`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List all keys |
| POST | `/` | JWT | Create new key |
| DELETE | `/{key_id}` | JWT | Revoke a key |

### Jobs (`/api/v1/jobs`)
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/` | API Key | 10/min | Create transcoding job |
| GET | `/{tracking_id}` | API Key | 30/min | Get job status |

### Usage (`/api/v1/usage`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT or API Key | Get usage stats |

### Playground (`/api/v1/playground`)
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/upload` | JWT | 5/min | Upload video file |
| POST | `/test-job` | JWT | 10/min | Submit test job |
| GET | `/test-job/{job_id}` | JWT | 30/min | Get test job status |
| GET | `/stream/{job_id}/{file}` | JWT | 60/min | Stream transcoded file |

---

## Verification

After implementing any of these, verify by:
1. Running the backend locally (`docker compose up -d`)
2. Testing new endpoints via the Swagger UI at `/api/v1/docs`
3. Checking that existing tests still pass
4. Testing from the playground dashboard for UI-facing changes
