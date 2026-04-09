import secrets

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.settings import (
    WebhookSettingsResponse,
    WebhookSettingsUpdate,
    WebhookSecretRegenerateResponse,
)

router = APIRouter()


def _mask_secret(secret: str) -> str:
    """Return a masked version showing only the last 4 characters."""
    if len(secret) <= 4:
        return "••••"
    return "••••••" + secret[-4:]


@router.get(
    "/webhook", response_model=WebhookSettingsResponse, summary="Get webhook settings"
)
def get_webhook_settings(current_user: User = Depends(get_current_user)):
    return WebhookSettingsResponse(
        webhook_secret_set=current_user.webhook_secret is not None,
        webhook_secret_masked=(
            _mask_secret(current_user.webhook_secret)
            if current_user.webhook_secret
            else None
        ),
        default_webhook_url=current_user.default_webhook_url,
    )


@router.put(
    "/webhook",
    response_model=WebhookSettingsResponse,
    summary="Update webhook settings",
)
@limiter.limit("10/minute")
def update_webhook_settings(
    request: Request,
    settings_in: WebhookSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = settings_in.default_webhook_url
    current_user.default_webhook_url = url if url else None
    db.commit()
    db.refresh(current_user)

    return WebhookSettingsResponse(
        webhook_secret_set=current_user.webhook_secret is not None,
        webhook_secret_masked=(
            _mask_secret(current_user.webhook_secret)
            if current_user.webhook_secret
            else None
        ),
        default_webhook_url=current_user.default_webhook_url,
    )


@router.post(
    "/webhook/regenerate-secret",
    response_model=WebhookSecretRegenerateResponse,
    summary="Regenerate webhook signing secret",
)
@limiter.limit("5/minute")
def regenerate_webhook_secret(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_secret = secrets.token_hex(32)
    current_user.webhook_secret = new_secret
    db.commit()

    return WebhookSecretRegenerateResponse(
        webhook_secret=new_secret,
        webhook_secret_masked=_mask_secret(new_secret),
    )
