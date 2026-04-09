import os
import re
from datetime import datetime, timezone, timedelta

import asyncio
import json

from sse_starlette.sse import EventSourceResponse

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.config import settings
from app.models.job import Job
from app.models.api_key import ApiKey
from app.models.upload import PendingUpload
from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobStatusResponse,
    PaginatedJobResponse,
)
from app.api.dependencies import (
    get_current_api_key,
    check_concurrent_jobs_limit,
    verify_api_key_str,
)
from app.core.rate_limit import limiter
from app.core.redis import get_progress, subscribe_to_job, publish_event
from app.core.storage import (
    get_s3_client,
    generate_presigned_download_url,
    extract_r2_key,
    CONTENT_TYPES,
)
from app.worker.tasks import transcode_video_task

router = APIRouter()


def _resolve_source_url(job_in: JobCreate, user_id, db: Session) -> str:
    """Resolve source_url from either a direct URL or an upload_id."""
    if job_in.upload_id:
        upload = (
            db.query(PendingUpload)
            .filter(
                PendingUpload.id == job_in.upload_id,
                PendingUpload.user_id == user_id,
            )
            .first()
        )
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found.",
            )
        if upload.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Upload status is '{upload.status}', expected 'completed'.",
            )
        return upload.source_url
    return job_in.source_url


@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new transcoding job",
    description="Queues a video for transcoding into MP4 or HLS formats. Enforces rate limits and concurrent processing limits.",
)
@limiter.limit("10/minute")
def create_job(
    request: Request,
    job_in: JobCreate,
    api_key: ApiKey = Depends(check_concurrent_jobs_limit),
    db: Session = Depends(get_db),
):
    source_url = _resolve_source_url(job_in, api_key.user_id, db)

    # Create DB Record
    new_job = Job(
        user_id=api_key.user_id,
        api_key_id=api_key.id,
        source_url=source_url,
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

    # Queue Celery Task
    transcode_video_task.delay(str(new_job.id))

    return new_job


# ---------------------------------------------------------------------------
# Helpers: build accessible URLs for completed jobs
# ---------------------------------------------------------------------------


def _build_output_url(job: Job, base_url: str) -> tuple[str | None, datetime | None]:
    """Return (accessible_output_url, expires_at) for a completed job.

    - MP4/VTT: presigned GET URL (time-limited)
    - HLS: proxy URL served by the streaming endpoint
    """
    if job.status != "completed" or not job.output_url:
        return None, None

    if job.output_format == "hls":
        url = f"{base_url}{settings.API_V1_STR}/jobs/{job.id}/stream/master.m3u8"
        return url, None

    # MP4 / other single-file output
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


def _build_subtitle_url(job: Job) -> str | None:
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


def _build_output_zip_url(job: Job) -> tuple[str | None, datetime | None]:
    """Return (presigned_zip_url, expires_at) for HLS jobs, or (None, None)."""
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


@router.get(
    "/",
    response_model=PaginatedJobResponse,
    summary="List transcoding jobs",
    description="Retrieves a paginated list of transcoding jobs for the authenticated user. "
    "Supports filtering by status, output format, and preset. "
    "Results are sorted by creation date, newest first.",
)
@limiter.limit("30/minute")
def list_jobs(
    request: Request,
    status: str | None = Query(
        None, description="Filter by status: pending, processing, completed, failed"
    ),
    output_format: str | None = Query(
        None, description="Filter by output format: mp4, hls"
    ),
    preset: str | None = Query(
        None, description="Filter by preset: tiktok, youtube, instagram"
    ),
    limit: int = Query(50, ge=1, le=100, description="Number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    api_key: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.user_id == api_key.user_id)

    if status is not None:
        query = query.filter(Job.status == status)
    if output_format is not None:
        query = query.filter(Job.output_format == output_format)
    if preset is not None:
        query = query.filter(Job.preset == preset)

    total = query.count()

    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    return PaginatedJobResponse(items=jobs, total=total, limit=limit, offset=offset)


@router.get(
    "/{tracking_id}",
    response_model=JobStatusResponse,
    summary="Get job status",
    description="Polls for the current status of a specific transcoding job. "
    "For completed MP4 jobs, output_url is a time-limited presigned URL. "
    "For completed HLS jobs, output_url is a streaming proxy URL. "
    "Re-poll to refresh expired presigned URLs.",
)
@limiter.limit("30/minute")
def get_job_status(
    request: Request,
    tracking_id: UUID,
    api_key: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db),
):
    job = (
        db.query(Job)
        .filter(Job.id == tracking_id, Job.user_id == api_key.user_id)
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    base_url = str(request.base_url).rstrip("/")
    output_url, output_url_expires_at = _build_output_url(job, base_url)
    subtitle_url = _build_subtitle_url(job)
    output_zip_url, output_zip_url_expires_at = _build_output_zip_url(job)

    # Enrich with real-time progress from Redis if available
    progress_data = get_progress(str(tracking_id))
    progress = None
    eta_seconds = None
    if progress_data and job.status == "processing":
        progress = progress_data.get("progress")
        eta_seconds = progress_data.get("eta_seconds")

    return JobStatusResponse(
        id=job.id,
        status=job.status,
        source_url=job.source_url,
        webhook_url=job.webhook_url,
        preset=job.preset,
        output_format=job.output_format,
        generate_subtitles=job.generate_subtitles,
        subtitle_url=subtitle_url,
        output_url=output_url,
        error_message=job.error_message,
        hls_config=job.hls_config,
        source_size_bytes=job.source_size_bytes,
        output_size_bytes=job.output_size_bytes,
        processing_duration_seconds=job.processing_duration_seconds,
        output_url_expires_at=output_url_expires_at,
        output_zip_url=output_zip_url,
        output_zip_url_expires_at=output_zip_url_expires_at,
        progress=progress,
        eta_seconds=eta_seconds,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


# ---------------------------------------------------------------------------
# SSE — real-time job event stream
# ---------------------------------------------------------------------------


@router.get(
    "/{tracking_id}/events",
    summary="Stream job events via SSE",
    description="Real-time Server-Sent Events stream for job progress, status changes, "
    "and completion. Authenticate via x-api-key header or ?api_key= query parameter. "
    "Event types: progress, status_change, done, error, heartbeat.",
)
async def stream_job_events(
    request: Request,
    tracking_id: UUID,
    api_key_query: str | None = Query(None, alias="api_key"),
    db: Session = Depends(get_db),
):
    # Auth — reuse existing query-param-aware validation
    api_key = _resolve_api_key_for_stream(request, api_key_query, db)

    job = (
        db.query(Job)
        .filter(Job.id == tracking_id, Job.user_id == api_key.user_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_id = str(tracking_id)

    async def _event_generator():
        # If job already in a terminal state, emit and close immediately
        if job.status in ("completed", "failed"):
            payload = {"status": job.status}
            if job.error_message:
                payload["error_message"] = job.error_message
            yield {
                "event": "done" if job.status == "completed" else "error",
                "data": json.dumps(payload),
            }
            return

        # Send current progress from Redis if available
        progress_data = get_progress(job_id)
        if progress_data:
            yield {
                "event": "progress",
                "data": json.dumps(progress_data),
            }

        # Subscribe to Redis pub/sub for this job
        pubsub = subscribe_to_job(job_id)
        loop = asyncio.get_event_loop()

        try:
            while True:
                if await request.is_disconnected():
                    break

                # Poll pub/sub with a timeout
                message = await loop.run_in_executor(
                    None,
                    lambda: pubsub.get_message(timeout=settings.SSE_HEARTBEAT_INTERVAL),
                )

                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    event_type = data.pop("event_type", "progress")
                    yield {
                        "event": event_type,
                        "data": json.dumps(data),
                    }
                    # Terminal events close the stream
                    if event_type in ("done", "error"):
                        break
        finally:
            pubsub.unsubscribe()
            pubsub.close()

    return EventSourceResponse(
        _event_generator(),
        ping=settings.SSE_HEARTBEAT_INTERVAL,
    )


# ---------------------------------------------------------------------------
# Streaming proxy — serves HLS manifests, presigned segment URLs
# ---------------------------------------------------------------------------


def _resolve_api_key_for_stream(
    request: Request, api_key_query: str | None, db: Session
) -> ApiKey:
    """Validate API key from x-api-key header or ?api_key= query param."""
    raw_key = request.headers.get("x-api-key") or api_key_query
    if not raw_key or "_" not in raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    prefix = raw_key.split("_")[0] + "_"
    db_keys = (
        db.query(ApiKey)
        .filter(ApiKey.key_prefix == prefix, ApiKey.is_active == True)
        .all()
    )

    for db_key in db_keys:
        if verify_api_key_str(raw_key, db_key.key_hash):
            return db_key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


@router.get(
    "/{tracking_id}/stream/{file_path:path}",
    summary="Stream transcoded HLS content",
    description="Proxies HLS manifests from R2 and returns presigned URLs for "
    "segments so they are fetched directly from storage. "
    "Authenticate via x-api-key header or ?api_key= query parameter.",
)
@limiter.limit("120/minute")
def stream_job_output(
    request: Request,
    tracking_id: UUID,
    file_path: str,
    api_key_query: str | None = Query(None, alias="api_key"),
    db: Session = Depends(get_db),
):
    # Auth
    api_key = _resolve_api_key_for_stream(request, api_key_query, db)

    job = (
        db.query(Job)
        .filter(Job.id == tracking_id, Job.user_id == api_key.user_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job status is '{job.status}', not 'completed'",
        )

    # Sanitise path
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    s3_key = f"transcoded/{tracking_id}/{file_path}"
    bucket = settings.R2_BUCKET_NAME
    s3 = get_s3_client()

    _, ext = os.path.splitext(file_path)
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

    try:
        resp = s3.get_object(Bucket=bucket, Key=s3_key)
    except s3.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch file")

    body = resp["Body"]

    # Smart manifest rewriting:
    #   master.m3u8  → rewrite variant URLs to proxy URLs (with ?api_key=)
    #   variant .m3u8 → rewrite segment URLs to presigned R2 URLs
    if ext == ".m3u8":
        raw = body.read().decode("utf-8")
        raw_key = request.headers.get("x-api-key") or api_key_query or ""

        # Determine directory prefix for relative paths
        dir_prefix = file_path.rsplit("/", 1)[0] + "/" if "/" in file_path else ""

        # Check if this manifest references .m3u8 files (master) or .ts (variant)
        has_m3u8_refs = bool(re.search(r"\.m3u8\b", raw))
        has_ts_refs = bool(re.search(r"\.ts\b", raw))

        if has_ts_refs and not has_m3u8_refs:
            # Variant playlist — rewrite .ts segment refs to presigned URLs
            def _rewrite_segment(m: re.Match) -> str:
                url = m.group(2)
                if url and not url.startswith("#") and not url.startswith("http"):
                    seg_key = f"transcoded/{tracking_id}/{dir_prefix}{url}"
                    presigned = generate_presigned_download_url(
                        bucket,
                        seg_key,
                        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
                    )
                    return m.group(1) + presigned
                return m.group(0)

            rewritten = re.sub(
                r"^((?:#EXT-X-.*:.*\n)?)(.*)$",
                _rewrite_segment,
                raw,
                flags=re.MULTILINE,
            )
        else:
            # Master manifest — rewrite variant playlist refs to proxy URLs
            base = f"{settings.API_V1_STR}/jobs/{tracking_id}/stream"
            auth_qs = f"?api_key={raw_key}" if raw_key else ""

            def _rewrite_variant(m: re.Match) -> str:
                url = m.group(2)
                if url and not url.startswith("#") and not url.startswith("http"):
                    return m.group(1) + f"{base}/{dir_prefix}{url}{auth_qs}"
                return m.group(0)

            rewritten = re.sub(
                r"^((?:#EXT-X-STREAM-INF:.*\n)?)(.*)$",
                _rewrite_variant,
                raw,
                flags=re.MULTILINE,
            )

        return Response(content=rewritten, media_type=content_type)

    # Fallback: stream binary files (should rarely happen with presigned URLs)
    def _iter():
        try:
            while True:
                chunk = body.read(64 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            body.close()

    return StreamingResponse(_iter(), media_type=content_type)
