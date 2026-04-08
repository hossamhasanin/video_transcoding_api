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

    # JWT Authentication
    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Storage (Cloudflare R2 / S3)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "video-transcoding"
    S3_ENDPOINT_URL: Optional[str] = None

    # Job Limits
    MAX_CONCURRENT_JOBS: int = 10
    MAX_UPLOAD_SIZE_MB: int = 500

    # File Uploads
    UPLOAD_SOURCE_PREFIX: str = "uploads/playground"
    LOCAL_UPLOAD_DIR: str = "/tmp/transcode_uploads"

    # Presigned Upload (API)
    PRESIGNED_URL_EXPIRES_SECONDS: int = 3600
    UPLOAD_API_SOURCE_PREFIX: str = "uploads/api"
    MAX_PENDING_UPLOADS_PER_USER: int = 5
    UPLOAD_AUTO_CLEANUP_HOURS: int = 24

    # API base URL (used by workers to build accessible output URLs for webhooks)
    API_BASE_URL: str = "http://localhost:8000"

    # Webhooks
    WEBHOOK_SECRET_KEY: str = "your-secret-key"

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()
