from fastapi import Depends, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_
from passlib.context import CryptContext
from jose import JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.api_key import ApiKey
from app.models.user import User

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_api_key_str(plain_key: str, hashed_key: str) -> bool:
    return pwd_context.verify(plain_key, hashed_key)


def get_hash(plain_key: str) -> str:
    return pwd_context.hash(plain_key)


def _get_user_from_api_key(api_key: str, db: Session) -> User:
    """Validate an API key string and return the associated User."""
    if "_" not in api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key format",
        )

    prefix = api_key.split("_")[0] + "_"

    db_keys = (
        db.query(ApiKey)
        .filter(ApiKey.key_prefix == prefix, ApiKey.is_active == True)
        .all()
    )

    for db_key in db_keys:
        if verify_api_key_str(api_key, db_key.key_hash):
            user = db.query(User).filter(User.id == db_key.user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


def _get_user_from_jwt(token: str, db: Session) -> User:
    """Validate a JWT access token and return the associated User."""
    try:
        payload = decode_token(token, expected_type="access")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user


def get_current_api_key(
    api_key: str = Security(api_key_header), db: Session = Depends(get_db)
) -> ApiKey:
    """
    Validates the provided API key and returns the ApiKey model instance.
    The api key is typically in the format: prefix_actualkey
    We match by prefix first, then verify the hash.
    """
    if not api_key or "_" not in api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key format",
        )

    prefix = api_key.split("_")[0] + "_"

    # Find active keys with this prefix
    db_keys = (
        db.query(ApiKey)
        .filter(ApiKey.key_prefix == prefix, ApiKey.is_active == True)
        .all()
    )

    for db_key in db_keys:
        if verify_api_key_str(api_key, db_key.key_hash):
            return db_key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


def get_current_user(
    api_key: str = Security(api_key_header),
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Returns the current user via either JWT bearer token or API key."""
    # Try JWT first (dashboard/frontend)
    if credentials is not None:
        return _get_user_from_jwt(credentials.credentials, db)

    # Fall back to API key
    if api_key is not None:
        return _get_user_from_api_key(api_key, db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


def check_concurrent_jobs_limit(
    api_key_obj: ApiKey = Depends(get_current_api_key), db: Session = Depends(get_db)
) -> ApiKey:
    """Enforce a maximum number of concurrent pending/processing jobs per user."""
    from app.models.job import Job

    active_jobs_count = (
        db.query(Job)
        .filter(
            Job.user_id == api_key_obj.user_id,
            or_(Job.status == "pending", Job.status == "processing"),
        )
        .count()
    )

    if active_jobs_count >= settings.MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Concurrent job limit exceeded. Maximum allowable is {settings.MAX_CONCURRENT_JOBS}.",
        )
    return api_key_obj
