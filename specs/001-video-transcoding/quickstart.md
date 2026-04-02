# Quickstart: Transcoding API

## Prerequisites
- Python 3.10+
- pip / Poetry
- FFmpeg installed via Homebrew (`brew install ffmpeg`) or apt (`apt install ffmpeg`).
- Redis running on `localhost:6379`.
- A Cloudflare R2 bucket and access keys.

## Local Environment

1. Set up `.env` with R2 credentials:
```ini
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_DEFAULT_REGION=auto
R2_BUCKET=video-transcode-tmp
R2_ENDPOINT=https://your-id.r2.cloudflarestorage.com
```

2. Generate test API keys natively or via top-level CLI command:
```bash
python scripts/generate_api_key.py --user 1
```

3. Run the API and queue workers:
```bash
# Start FastAPI server
uvicorn app.main:app --reload

# Start Celery worker in another terminal
celery -A app.worker.celery_app worker --loglevel=info
```

## Creating a Job via Webhook test
```bash
curl -X POST https://localhost/v1/jobs \
  -H "X-API-Key: generated_key" \
  -H "Content-Type: application/json" \
  -d '{
    "input_url": "https://example.com/test_1080p.mp4",
    "preset": "tiktok",
    "webhook_url": "https://webhook.site/your_url"
  }'

# Monitor webhook.site, output webhook will arrive confirming payload
```
