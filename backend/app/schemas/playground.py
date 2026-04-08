from pydantic import BaseModel, Field, HttpUrl, UUID4
from datetime import datetime
from typing import Optional, Literal

from app.schemas.job import HLSConfig

from app.schemas.job import HLSConfig


class TestJobRequest(BaseModel):
    source_url: str
    preset: Optional[Literal["tiktok", "youtube", "instagram"]] = None
    output_format: Optional[Literal["mp4", "hls"]] = "mp4"
    webhook_url: Optional[HttpUrl] = None
    generate_subtitles: Optional[bool] = False
    hls_config: Optional[HLSConfig] = None


class TestJobResponse(BaseModel):
    id: UUID4
    status: str
    source_url: str
    webhook_url: Optional[str] = None
    preset: Optional[str] = None
    output_format: str
    generate_subtitles: bool
    subtitle_url: Optional[str] = None
    hls_config: Optional[dict] = None
    source_size_bytes: Optional[int] = None
    output_size_bytes: Optional[int] = None
    processing_duration_seconds: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestJobStatusResponse(TestJobResponse):
    output_url: Optional[str] = None
    error_message: Optional[str] = None
    output_url_expires_at: Optional[datetime] = None
    output_zip_url: Optional[str] = None
    output_zip_url_expires_at: Optional[datetime] = None


class UploadResponse(BaseModel):
    source_url: str
    filename: str
    size_bytes: int
    content_type: str
