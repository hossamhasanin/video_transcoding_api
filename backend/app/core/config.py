from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Video Transcoding API"
    API_V1_STR: str = "/api/v1"

    # Database (PostgreSQL for production)
    DATABASE_URL: str = "postgresql://admin:adminpassword@localhost:5432/transcoding_db"

    # Redis / Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # CORS - comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:5173"

    # Storage (Cloudflare R2 / S3)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "video-transcoding"
    S3_ENDPOINT_URL: Optional[str] = None

    # Job Limits
    MAX_CONCURRENT_JOBS: int = 10
    MAX_UPLOAD_SIZE_MB: int = 500

    # Webhooks
    WEBHOOK_SECRET_KEY: str = "your-secret-key"

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()
