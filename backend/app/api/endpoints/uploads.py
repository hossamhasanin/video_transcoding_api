import os
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.storage import (
    generate_presigned_upload_url,
    check_object_exists,
    delete_object,
)
from app.models.api_key import ApiKey
from app.models.upload import PendingUpload
from app.api.dependencies import get_current_api_key, check_concurrent_jobs_limit
from app.schemas.upload import (
    PresignUploadRequest,
    PresignUploadResponse,
    UploadStatusResponse,
)

router = APIRouter()

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv"}
ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
}


def _build_source_url(s3_key: str) -> str:
    if settings.R2_ACCOUNT_ID:
        return (
            f"https://{settings.R2_BUCKET_NAME}"
            f".{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{s3_key}"
        )
    return f"https://{settings.R2_BUCKET_NAME}.s3.amazonaws.com/{s3_key}"


@router.post(
    "/presign",
    response_model=PresignUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Get a presigned URL for direct upload",
    description="Returns a presigned R2 URL for direct file upload. "
    "Upload the file via PUT to the returned URL, then create a job "
    "with the upload_id.",
)
@limiter.limit("10/minute")
def presign_upload(
    request: Request,
    body: PresignUploadRequest,
    api_key: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db),
):
    # Validate extension
    ext = os.path.splitext(body.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {ext}. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Validate content type
    if body.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type: {body.content_type}. "
            f"Allowed: {', '.join(sorted(ALLOWED_VIDEO_TYPES))}",
        )

    # Validate file size
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if body.file_size_bytes > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large: {body.file_size_bytes / (1024*1024):.1f}MB "
            f"exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    # Auto-expire stale pending uploads whose presigned URL has already expired
    # This prevents developers from getting blocked by old unused presigned URLs
    now = datetime.utcnow()
    stale = (
        db.query(PendingUpload)
        .filter(
            PendingUpload.user_id == api_key.user_id,
            PendingUpload.status == "pending",
            PendingUpload.expires_at < now,
        )
        .all()
    )
    for upload in stale:
        upload.status = "expired"
        upload.updated_at = now
    if stale:
        db.flush()

    # Check concurrent pending uploads limit (only counts genuinely active ones)
    pending_count = (
        db.query(PendingUpload)
        .filter(
            PendingUpload.user_id == api_key.user_id,
            PendingUpload.status == "pending",
        )
        .count()
    )
    if pending_count >= settings.MAX_PENDING_UPLOADS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many active uploads ({pending_count}). "
            f"Limit: {settings.MAX_PENDING_UPLOADS_PER_USER}. "
            f"Wait for uploads to complete or presigned URLs to expire.",
        )

    # Generate upload record
    upload_id = uuid.uuid4()
    s3_key = (
        f"{settings.UPLOAD_API_SOURCE_PREFIX}"
        f"/{api_key.user_id}/{upload_id}{ext}"
    )
    source_url = _build_source_url(s3_key)

    # Generate presigned URL
    presigned = generate_presigned_upload_url(
        bucket_name=settings.R2_BUCKET_NAME,
        object_key=s3_key,
        content_type=body.content_type,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )

    # Create DB record
    now = datetime.utcnow()
    upload = PendingUpload(
        id=upload_id,
        user_id=api_key.user_id,
        api_key_id=api_key.id,
        s3_key=s3_key,
        source_url=source_url,
        filename=body.filename,
        declared_size_bytes=body.file_size_bytes,
        content_type=body.content_type,
        status="pending",
        presigned_at=now,
        expires_at=presigned["expires_at"],
        created_at=now,
        updated_at=now,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    return PresignUploadResponse(
        upload_id=upload.id,
        upload_url=presigned["upload_url"],
        s3_key=s3_key,
        source_url=source_url,
        expires_at=presigned["expires_at"],
        headers=presigned["headers"],
    )


@router.get(
    "/{upload_id}/status",
    response_model=UploadStatusResponse,
    summary="Check upload status",
    description="Returns the current status of a presigned upload. "
    "If pending, checks R2 to see if the file has arrived.",
)
@limiter.limit("30/minute")
def get_upload_status(
    request: Request,
    upload_id: str,
    api_key: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db),
):
    upload = (
        db.query(PendingUpload)
        .filter(
            PendingUpload.id == upload_id,
            PendingUpload.user_id == api_key.user_id,
        )
        .first()
    )
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found.",
        )

    # If still pending, check if file has arrived in R2
    if upload.status == "pending":
        obj = check_object_exists(settings.R2_BUCKET_NAME, upload.s3_key)
        if obj:
            upload.status = "completed"
            upload.actual_size_bytes = obj["content_length"]
            upload.confirmed_at = datetime.utcnow()
            upload.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(upload)

    return UploadStatusResponse(
        upload_id=upload.id,
        status=upload.status,
        source_url=upload.source_url if upload.status == "completed" else None,
        filename=upload.filename,
        file_size_bytes=upload.declared_size_bytes,
        content_type=upload.content_type,
        actual_size_bytes=upload.actual_size_bytes,
        created_at=upload.created_at,
        expires_at=upload.expires_at,
    )


@router.delete(
    "/{upload_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel an upload",
    description="Cancels a pending upload and removes the record. "
    "Deletes the R2 object if it exists.",
)
@limiter.limit("10/minute")
def cancel_upload(
    request: Request,
    upload_id: str,
    api_key: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db),
):
    upload = (
        db.query(PendingUpload)
        .filter(
            PendingUpload.id == upload_id,
            PendingUpload.user_id == api_key.user_id,
        )
        .first()
    )
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found.",
        )

    if upload.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed upload.",
        )

    # Delete from R2 if object exists
    delete_object(settings.R2_BUCKET_NAME, upload.s3_key)

    upload.status = "cancelled"
    upload.updated_at = datetime.utcnow()
    db.commit()

    return None
