from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.job import Job
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.playground import TestJobRequest, TestJobResponse
from app.api.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.worker.tasks import transcode_video_task
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
