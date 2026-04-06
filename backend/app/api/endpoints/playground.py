import os
import uuid
import shutil

from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.job import Job
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.playground import TestJobRequest, TestJobResponse, UploadResponse
from app.api.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.worker.tasks import transcode_video_task
from app.core.storage import upload_file_to_s3, get_s3_client
from sqlalchemy import or_

router = APIRouter()


@router.post(
    "/test-job",
    response_model=TestJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a test transcoding job from the Playground",
    description="Allows session-authenticated dashboard users to submit test jobs. Auto-selects the first active API key.",
)
@limiter.limit("10/minute")
def submit_test_job(
    request: Request,
    job_in: TestJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-select first active API key for this user
    api_key = (
        db.query(ApiKey)
        .filter(
            ApiKey.user_id == current_user.id,
            ApiKey.is_active == True,
        )
        .order_by(ApiKey.created_at.asc())
        .first()
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active API key found. Please create an API key from the Dashboard before submitting test jobs.",
        )

    # Enforce concurrent job limit
    active_jobs_count = (
        db.query(Job)
        .filter(
            Job.user_id == current_user.id,
            or_(Job.status == "pending", Job.status == "processing"),
        )
        .count()
    )

    if active_jobs_count >= settings.MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Concurrent job limit exceeded. Maximum allowable is {settings.MAX_CONCURRENT_JOBS}.",
        )

    # Create DB record (same pattern as jobs.py)
    new_job = Job(
        user_id=current_user.id,
        api_key_id=api_key.id,
        source_url=job_in.source_url,
        preset=job_in.preset,
        output_format=job_in.output_format,
        webhook_url=str(job_in.webhook_url) if job_in.webhook_url else None,
        generate_subtitles=job_in.generate_subtitles,
        hls_config=(
            job_in.hls_config.model_dump(mode="json") if job_in.hls_config else None
        ),
        status="pending",
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Queue Celery task
    transcode_video_task.delay(str(new_job.id))

    return new_job


ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
}
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv"}


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a video file from the Playground",
    description="Uploads a video file and returns a source URL that can be used in test jobs.",
)
@limiter.limit("5/minute")
def upload_video(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided.",
        )

    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {ext}. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Validate MIME type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type: {file.content_type}. "
            f"Allowed: {', '.join(sorted(ALLOWED_VIDEO_TYPES))}",
        )

    # Validate file size
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large: {file_size / (1024*1024):.1f}MB "
            f"exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"

    # Upload to S3/R2
    if settings.R2_ACCESS_KEY_ID:
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            s3_key = (
                f"{settings.UPLOAD_SOURCE_PREFIX}/{current_user.id}/{safe_filename}"
            )
            upload_file_to_s3(
                tmp_path,
                settings.R2_BUCKET_NAME,
                s3_key,
                content_type=file.content_type,
            )

            if settings.R2_ACCOUNT_ID:
                source_url = (
                    f"https://{settings.R2_BUCKET_NAME}"
                    f".{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{s3_key}"
                )
            else:
                source_url = (
                    f"https://{settings.R2_BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
                )
        finally:
            os.remove(tmp_path)
    else:
        # Local dev fallback: save to LOCAL_UPLOAD_DIR
        local_dir = os.path.join(settings.LOCAL_UPLOAD_DIR, str(current_user.id))
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, safe_filename)
        with open(local_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        source_url = f"file://{local_path}"

    return UploadResponse(
        source_url=source_url,
        filename=file.filename,
        size_bytes=file_size,
        content_type=file.content_type,
    )
