# Phase 0: Research & Technical Context

## Language/Version
- **Decision**: Python 3.10+ / FastAPI.
- **Rationale**: Python provides excellent async capabilities and native bindings for FFmpeg (e.g., ffmpeg-python), making it ideal for video processing. FastAPI offers high-performance asynchronous API routing, great OpenAPI documentation out of the box, and a solid foundation for queue management with Celery.
- **Alternatives considered**: Node.js/TypeScript (great async, but less mature multimedia standard libraries). PHP/Laravel (excellent for web and billing, but less performant for heavy async multimedia workloads and AI extensions).

## Primary Dependencies
- **Decision**: FFmpeg (via standard `subprocess` or `ffmpeg-python`), Redis (Queueing via Celery), Boto3 (for R2/S3 Integration).
- **Rationale**: FFmpeg is the industry standard for transcoding, HLS extraction, and subtitles. Redis with Celery ensures queues can be metered, limits enforced natively via rate limiting and concurrency checks, and job retries are reliable.
- **Alternatives considered**: AWS MediaConvert (SaaS, but requirements imply we run our own nodes and track retries). 

## Storage
- **Decision**: PostgreSQL + Cloudflare R2 / AWS S3 via Boto3.
- **Rationale**: Relational data maps well to user, API Keys, and Job status logs. Cloudflare R2 provides cheap, fast egress ideal for 24hr temporary video storage.
- **Alternatives considered**: MongoDB (poor fit for strict billing relations).

## Testing
- **Decision**: Pytest standard Python testing suite.
- **Rationale**: Native to the ecosystem, excellent support for mocking storage arrays, testing jobs and webhooks without triggering real network requests.

## Architecture Patterns (Webhooks & Retries)
- **Decision**: Signed Webhooks with exponential backoff using Celery Tasks.
- **Rationale**: Robust HTTP client via `httpx`. Retries, failures, and backoff logic are natively supported in Celery tasks (`autoretry_for`, `retry_backoff=True`). Generating HMAC signatures is straightforward via the built-in `hmac` Python library.

## Target Platform
- **Decision**: Linux Server (Ubuntu) with FFmpeg and Redis installed.
- **Rationale**: Required for running Python Celery worker nodes reliably with FFmpeg paths resolving properly.
