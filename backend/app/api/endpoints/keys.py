from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import secrets

from app.core.database import get_db
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse, ApiKeyCreateResponse
from app.api.dependencies import get_current_user, get_hash

router = APIRouter()

def generate_api_key(prefix: str = "vf_"):
    raw_key = secrets.token_urlsafe(32)
    return f"{prefix}{raw_key}"

@router.get(
    "/",
    response_model=list[ApiKeyResponse],
    summary="List API Keys",
    description="Retrieves a list of all active API keys associated with the current user account."
)
def get_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).all()
    return keys

@router.post(
    "/",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create API Key",
    description="Generates a new API key for the current user. Only returns the full key once."
)
def create_api_key(
    key_in: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raw_key = generate_api_key()
    key_prefix = "vf_"
    hashed_key = get_hash(raw_key)

    new_key = ApiKey(
        user_id=current_user.id,
        key_hash=hashed_key,
        key_prefix=key_prefix,
        name=key_in.name,
        is_active=True
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    return ApiKeyCreateResponse(
        id=new_key.id,
        name=new_key.name,
        key_prefix=new_key.key_prefix,
        key_value=raw_key,
        created_at=new_key.created_at,
        is_active=new_key.is_active
    )

@router.delete(
    "/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke API Key",
    description="Revokes and deletes an existing API key, preventing future access."
)
def delete_api_key(
    key_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.user_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API Key not found")
    
    # We revoke by setting is_active to False (or we could physically delete)
    # The requirement is "revoke", so soft delete seems better or physical delete.
    db.delete(key)
    db.commit()
    return None
