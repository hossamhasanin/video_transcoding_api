from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ApiKeyBase(BaseModel):
    name: str = "Default Key"

class ApiKeyCreate(ApiKeyBase):
    pass

class ApiKeyCreateResponse(ApiKeyBase):
    id: UUID
    key_prefix: str
    key_value: str # The plaintext key, only returned once
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class ApiKeyResponse(ApiKeyBase):
    id: UUID
    key_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True
