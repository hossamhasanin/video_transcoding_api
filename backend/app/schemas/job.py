from pydantic import BaseModel, HttpUrl, UUID4
from datetime import datetime
from typing import Optional, Literal


class JobCreate(BaseModel):
    source_url: str
    preset: Optional[Literal["tiktok", "youtube", "instagram"]] = None
    output_format: Optional[Literal["mp4", "hls"]] = "mp4"
    webhook_url: Optional[HttpUrl] = None
    generate_subtitles: Optional[bool] = False


class JobResponse(BaseModel):
    id: UUID4
    status: str
    source_url: str
    webhook_url: Optional[str] = None
    preset: Optional[str] = None
    output_format: str
    generate_subtitles: bool
    subtitle_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobStatusResponse(JobResponse):
    output_url: Optional[str] = None
    error_message: Optional[str] = None
