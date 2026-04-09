from pydantic import BaseModel, Field, HttpUrl, UUID4, model_validator
from datetime import datetime
from typing import Optional, Literal, List


class RenditionConfig(BaseModel):
    name: str = Field(
        ...,
        description="Rendition name used as subdirectory, e.g. '360p', '720p'",
        pattern=r"^[a-zA-Z0-9_\-]+$",
    )
    width: int = Field(..., gt=0, description="Video width in pixels")
    height: int = Field(..., gt=0, description="Video height in pixels")
    video_bitrate: str = Field(
        ..., description="Target video bitrate, e.g. '1500k', '3000k'"
    )
    audio_bitrate: str = Field(
        default="128k", description="Target audio bitrate, e.g. '128k'"
    )


class HLSConfig(BaseModel):
    renditions: Optional[List[RenditionConfig]] = Field(
        default=None,
        description="List of quality renditions. If omitted, sensible defaults are used.",
    )
    segment_duration: int = Field(
        default=10, ge=2, le=30, description="HLS segment duration in seconds"
    )
    video_codec_preset: Literal[
        "ultrafast",
        "superfast",
        "veryfast",
        "faster",
        "fast",
        "medium",
        "slow",
        "slower",
        "veryslow",
    ] = Field(default="fast", description="libx264 encoding preset")
    video_crf: int = Field(
        default=23, ge=0, le=51, description="Constant Rate Factor (quality)"
    )
    video_profile: Literal["baseline", "main", "high"] = Field(
        default="high", description="H.264 profile"
    )

    @model_validator(mode="after")
    def validate_unique_rendition_names(self):
        if self.renditions:
            names = [r.name for r in self.renditions]
            if len(names) != len(set(names)):
                raise ValueError("Rendition names must be unique")
        return self


HlsTemplateName = Literal[
    "adaptive_streaming", "low_bandwidth", "4k_ultra", "mobile_only", "broadcast"
]


class JobCreate(BaseModel):
    source_url: Optional[str] = None
    upload_id: Optional[UUID4] = None
    preset: Optional[Literal["tiktok", "youtube", "instagram"]] = None
    output_format: Optional[Literal["mp4", "hls"]] = "mp4"
    webhook_url: Optional[HttpUrl] = None
    generate_subtitles: Optional[bool] = False
    hls_config: Optional[HLSConfig] = None
    hls_template: Optional[HlsTemplateName] = None

    @model_validator(mode="after")
    def validate_source(self):
        if not self.source_url and not self.upload_id:
            raise ValueError("Either source_url or upload_id must be provided")
        if self.source_url and self.upload_id:
            raise ValueError("Provide either source_url or upload_id, not both")
        return self

    @model_validator(mode="after")
    def validate_hls_config_or_template(self):
        if self.hls_template and self.hls_config:
            raise ValueError("Provide either hls_template or hls_config, not both")
        return self


class JobResponse(BaseModel):
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
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobStatusResponse(JobResponse):
    output_url: Optional[str] = None
    output_url_expires_at: Optional[datetime] = None
    output_zip_url: Optional[str] = None
    output_zip_url_expires_at: Optional[datetime] = None
    progress: Optional[int] = None  # 0-100, None when not available
    eta_seconds: Optional[float] = None  # estimated seconds remaining


class JobCancelResponse(BaseModel):
    id: UUID4
    status: str
    message: str

    class Config:
        from_attributes = True


class PaginatedJobResponse(BaseModel):
    items: List[JobResponse]
    total: int
    limit: int
    offset: int


class PaginatedDashboardJobResponse(BaseModel):
    items: List[JobResponse]
    total: int
    limit: int
    offset: int
