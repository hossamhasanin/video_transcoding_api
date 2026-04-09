from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobResponse, PaginatedDashboardJobResponse
from app.api.dependencies import get_current_user
from app.core.rate_limit import limiter

router = APIRouter()


@router.get(
    "/jobs",
    response_model=PaginatedDashboardJobResponse,
    summary="List jobs for dashboard",
    description="Retrieves a paginated list of jobs for the authenticated user. "
    "Supports filtering by status, output format, preset, and date range. "
    "Results are sorted by creation date, newest first.",
)
@limiter.limit("30/minute")
def list_dashboard_jobs(
    request: Request,
    status: Optional[str] = Query(
        None, description="Filter by status: pending, processing, transcoding, uploading, completed, failed, cancelled"
    ),
    output_format: Optional[str] = Query(
        None, description="Filter by output format: mp4, hls"
    ),
    preset: Optional[str] = Query(
        None, description="Filter by preset: tiktok, youtube, instagram"
    ),
    created_after: Optional[datetime] = Query(
        None, description="Filter jobs created after this ISO 8601 datetime"
    ),
    created_before: Optional[datetime] = Query(
        None, description="Filter jobs created before this ISO 8601 datetime"
    ),
    limit: int = Query(50, ge=1, le=100, description="Number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.user_id == current_user.id)

    if status is not None:
        query = query.filter(Job.status == status)
    if output_format is not None:
        query = query.filter(Job.output_format == output_format)
    if preset is not None:
        query = query.filter(Job.preset == preset)
    if created_after is not None:
        query = query.filter(Job.created_at >= created_after)
    if created_before is not None:
        query = query.filter(Job.created_at <= created_before)

    total = query.count()

    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    return PaginatedDashboardJobResponse(
        items=jobs, total=total, limit=limit, offset=offset
    )
