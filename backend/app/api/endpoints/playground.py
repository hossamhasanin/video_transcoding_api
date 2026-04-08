import os
import re
import uuid as uuid_mod
import shutil

from datetime import datetime, timezone, timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
    Request,
    File,
    UploadFile,
)
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.config import settings
from app.models.job import Job
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.playground import (
    TestJobRequest,
    TestJobResponse,
    TestJobStatusResponse,
    UploadResponse,
)
from app.api.dependencies import get_current_user
from app.core.security import decode_token
from app.core.rate_limit import limiter
from app.worker.tasks import transcode_video_task
from app.core.storage import (
    upload_file_to_s3,
    get_s3_client,
    generate_presigned_download_url,
    extract_r2_key,
    CONTENT_TYPES,
)
from sqlalchemy import or_

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers: build accessible URLs for playground test jobs
# ---------------------------------------------------------------------------


def _build_output_url_for_playground(
    job: Job, base_url: str
) -> tuple[str | None, datetime | None]:
    """Return (accessible_output_url, expires_at) for a playground test job."""
    if job.status != "completed" or not job.output_url:
        return None, None

    if job.output_format == "hls":
        url = f"{base_url}{settings.API_V1_STR}/playground/stream/{job.id}/master.m3u8"
        return url, None

    key = extract_r2_key(job.output_url)
    if not key:
        return job.output_url, None

    presigned = generate_presigned_download_url(
        settings.R2_BUCKET_NAME,
        key,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.PRESIGNED_URL_EXPIRES_SECONDS
    )
    return presigned, expires_at


def _build_subtitle_url_for_playground(job: Job) -> str | None:
    """Return an accessible URL for subtitles (presigned GET URL)."""
    if job.status != "completed" or not job.subtitle_url:
        return None

    key = extract_r2_key(job.subtitle_url)
    if not key:
        return job.subtitle_url

    return generate_presigned_download_url(
        settings.R2_BUCKET_NAME,
        key,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )


def _build_output_zip_url_for_playground(
    job: Job,
) -> tuple[str | None, datetime | None]:
    """Return (presigned_zip_url, expires_at) for HLS playground jobs."""
    if job.status != "completed" or not job.output_zip_url:
        return None, None

    key = extract_r2_key(job.output_zip_url)
    if not key:
        return job.output_zip_url, None

    presigned = generate_presigned_download_url(
        settings.R2_BUCKET_NAME,
        key,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.PRESIGNED_URL_EXPIRES_SECONDS
    )
    return presigned, expires_at


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


@router.get(
    "/test-job/{job_id}",
    response_model=TestJobStatusResponse,
    summary="Get playground test job status",
    description="Polls for the current status of a playground test job. "
    "Returns output URL and error details when available.",
)
@limiter.limit("30/minute")
def get_test_job_status(
    request: Request,
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    base_url = str(request.base_url).rstrip("/")
    output_url, output_url_expires_at = _build_output_url_for_playground(job, base_url)
    subtitle_url = _build_subtitle_url_for_playground(job)
    output_zip_url, output_zip_url_expires_at = _build_output_zip_url_for_playground(job)

    return TestJobStatusResponse(
        id=job.id,
        status=job.status,
        source_url=job.source_url,
        webhook_url=job.webhook_url,
        preset=job.preset,
        output_format=job.output_format,
        generate_subtitles=job.generate_subtitles,
        subtitle_url=subtitle_url,
        hls_config=job.hls_config,
        source_size_bytes=job.source_size_bytes,
        output_size_bytes=job.output_size_bytes,
        processing_duration_seconds=job.processing_duration_seconds,
        created_at=job.created_at,
        updated_at=job.updated_at,
        output_url=output_url,
        output_url_expires_at=output_url_expires_at,
        output_zip_url=output_zip_url,
        output_zip_url_expires_at=output_zip_url_expires_at,
        error_message=job.error_message,
    )


# ---------------------------------------------------------------------------
# Helper: resolve user from JWT in header or query param
# ---------------------------------------------------------------------------


def _resolve_user(
    token: str | None,
    db: Session,
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token, expected_type="access")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _extract_bearer_token(request: Request) -> str | None:
    """Pull JWT from Authorization: Bearer <token> header."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


# ---------------------------------------------------------------------------
# Stream proxy — serves transcoded files via same-origin to avoid CORS
# ---------------------------------------------------------------------------


@router.get(
    "/stream/{job_id}/{file_path:path}",
    summary="Stream a transcoded file (proxy to avoid CORS)",
    description="Proxies transcoded output files from S3/R2 through the API "
    "so the browser can access them without cross-origin issues. "
    "Accepts JWT via Authorization header or ?token= query parameter.",
)
@limiter.limit("60/minute")
def stream_job_file(
    request: Request,
    job_id: UUID,
    file_path: str,
    token: str | None = Query(None, description="JWT access token"),
    db: Session = Depends(get_db),
):
    # Auth: try Authorization header first (hls.js xhrSetup), then query
    # param (<video>/<track> src cannot set headers).
    bearer = _extract_bearer_token(request)
    user = _resolve_user(bearer or token, db)

    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Only allow streaming completed jobs
    if job.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job status is '{job.status}', not 'completed'",
        )

    # Sanitise path — prevent directory traversal
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    s3_key = f"transcoded/{job_id}/{file_path}"
    bucket = settings.R2_BUCKET_NAME
    s3 = get_s3_client()

    # Determine content type
    _, ext = os.path.splitext(file_path)
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

    try:
        resp = s3.get_object(Bucket=bucket, Key=s3_key)
    except s3.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch file")

    body = resp["Body"]

    # For HLS manifests, rewrite relative URLs to proxy paths
    if ext == ".m3u8":
        raw = body.read().decode("utf-8")
        base = f"/api/v1/playground/stream/{job_id}"
        # Preserve the subdirectory for relative segment references.
        # e.g. file_path="720p/index.m3u8" → prefix="720p"
        dir_prefix = file_path.rsplit("/", 1)[0] + "/" if "/" in file_path else ""
        # Propagate the token so all subsequent requests carry auth
        tok_param = f"?token={token}" if token else ""
        bearer_param = ""
        if not token and bearer:
            bearer_param = f"?token={bearer}"

        auth_qs = tok_param or bearer_param

        def _rewrite_line(m: re.Match) -> str:
            url = m.group(2)
            if url and not url.startswith("#") and not url.startswith("http"):
                return m.group(1) + f"{base}/{dir_prefix}{url}{auth_qs}"
            return m.group(0)

        rewritten = re.sub(
            r"^((?:#EXT-X-STREAM-INF:.*\n)?)(.*)$",
            _rewrite_line,
            raw,
            flags=re.MULTILINE,
        )
        return Response(
            content=rewritten,
            media_type=content_type,
        )

    # For binary files, stream directly
    def _iter():
        try:
            while True:
                chunk = body.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            body.close()

    return StreamingResponse(
        _iter(),
        media_type=content_type,
    )


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

    file_id = str(uuid_mod.uuid4())
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
