from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, UUID4


class PresignUploadRequest(BaseModel):
    filename: str = Field(
        ...,
        max_length=255,
        description="Original filename with extension",
    )
    file_size_bytes: int = Field(..., gt=0, description="Exact file size in bytes")
    content_type: str = Field("video/mp4", description="MIME type of the file")


class PresignUploadResponse(BaseModel):
    upload_id: UUID4
    upload_url: str
    s3_key: str
    source_url: str
    expires_at: datetime
    headers: dict


class UploadStatusResponse(BaseModel):
    upload_id: UUID4
    status: str
    source_url: Optional[str] = None
    filename: str
    file_size_bytes: int
    content_type: str
    actual_size_bytes: Optional[int] = None
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True
