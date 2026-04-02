FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (including ffmpeg and git for whisperx install)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirement files
COPY requirements-api.txt requirements-worker.txt requirements-ml.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-ml.txt

# Copy source code
COPY . .

# Run Celery worker for ML queue (subtitles)
CMD ["celery", "-A", "app.core.celery_app", "worker", "-Q", "ml_queue", "-c", "1", "--loglevel=info"]
