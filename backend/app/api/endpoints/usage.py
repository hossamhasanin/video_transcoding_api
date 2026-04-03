from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.job import Job
from app.schemas.usage import UsageStatsResponse
from app.api.dependencies import get_current_user

router = APIRouter()


@router.get(
    "/",
    response_model=UsageStatsResponse,
    summary="Get Usage Statistics",
    description="Fetches aggregated usage statistics consisting of job counts, storage used, and processing time."
)
def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Job counts
    total_jobs = db.query(func.count(Job.id)).filter(Job.user_id == current_user.id).scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.user_id == current_user.id, Job.status == "completed"
    ).scalar() or 0
    failed_jobs = db.query(func.count(Job.id)).filter(
        Job.user_id == current_user.id, Job.status == "failed"
    ).scalar() or 0

    # Real storage tracking (sum of actual output sizes from completed jobs)
    storage_result = db.query(func.coalesce(func.sum(Job.output_size_bytes), 0)).filter(
        Job.user_id == current_user.id,
        Job.status == "completed",
        Job.output_size_bytes.isnot(None)
    ).scalar()
    storage_used_bytes = int(storage_result)

    # Real processing time tracking (sum of actual processing durations)
    duration_result = db.query(func.coalesce(func.sum(Job.processing_duration_seconds), 0)).filter(
        Job.user_id == current_user.id,
        Job.status == "completed",
        Job.processing_duration_seconds.isnot(None)
    ).scalar()
    # Convert seconds to minutes, rounded to 2 decimal places
    processed_minutes = round(float(duration_result) / 60, 2)

    return UsageStatsResponse(
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        failed_jobs=failed_jobs,
        storage_used_bytes=storage_used_bytes,
        processed_minutes=processed_minutes
    )
