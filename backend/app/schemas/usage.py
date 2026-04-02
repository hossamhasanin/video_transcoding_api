from pydantic import BaseModel
from typing import Dict, Any

class UsageStatsResponse(BaseModel):
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    storage_used_bytes: int # mock or calculate if possible
    processed_minutes: int # mock or calculate if possible
