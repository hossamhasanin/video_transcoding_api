from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.models.job import Job
from app.models.api_key import ApiKey
from app.schemas.job import JobCreate, JobResponse, JobStatusResponse
from app.api.dependencies import get_current_api_key, check_concurrent_jobs_limit
from app.core.rate_limit import limiter
from app.worker.tasks import transcode_video_task

router = APIRouter()


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
    # Create DB Record
    new_job = Job(
        user_id=api_key.user_id,
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

    # Queue Celery Task
    transcode_video_task.delay(str(new_job.id))

    return new_job


@router.get(
    "/{tracking_id}",
    response_model=JobStatusResponse,
    summary="Get job status",
    description="Polls for the current status of a specific transcoding job.",
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

    return job
