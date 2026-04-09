from pydantic import BaseModel, field_validator
from typing import Optional


class WebhookSettingsResponse(BaseModel):
    webhook_secret_set: bool
    webhook_secret_masked: Optional[str] = None
    default_webhook_url: Optional[str] = None


class WebhookSettingsUpdate(BaseModel):
    default_webhook_url: Optional[str] = None

    @field_validator("default_webhook_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v and not v.startswith(("http://", "https://")):
                raise ValueError("Webhook URL must start with http:// or https://")
            if len(v) > 500:
                raise ValueError("Webhook URL must be at most 500 characters")
        return v


class WebhookSecretRegenerateResponse(BaseModel):
    webhook_secret: str
    webhook_secret_masked: str
