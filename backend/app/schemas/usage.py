from pydantic import BaseModel


class UsageStatsResponse(BaseModel):
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    storage_used_bytes: int  # Real: sum of actual output file sizes from completed jobs
    processed_minutes: float  # Real: sum of actual transcoding durations in minutes
