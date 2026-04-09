from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class WebhookDeliveryLogResponse(BaseModel):
    id: UUID
    job_id: UUID
    event_type: str
    attempt_number: int
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    delivered_at: datetime

    class Config:
        from_attributes = True


class PaginatedWebhookDeliveryResponse(BaseModel):
    items: list[WebhookDeliveryLogResponse]
    total: int
    limit: int
    offset: int
