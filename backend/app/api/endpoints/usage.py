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
    description="Fetches aggregated usage statistics consisting of job counts, processed duration, and storage tracking."
)
def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_jobs = db.query(func.count(Job.id)).filter(Job.user_id == current_user.id).scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(Job.user_id == current_user.id, Job.status == "completed").scalar() or 0
    failed_jobs = db.query(func.count(Job.id)).filter(Job.user_id == current_user.id, Job.status == "failed").scalar() or 0
    
    # For MVP, we mock these since we don't store actual minutes or bytes in Job table yet.
    return UsageStatsResponse(
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        failed_jobs=failed_jobs,
        storage_used_bytes=completed_jobs * 1024 * 1024 * 50, # approx 50MB per job
        processed_minutes=completed_jobs * 2 # approx 2 mins per job
    )
