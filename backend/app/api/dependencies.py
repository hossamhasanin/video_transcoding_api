from fastapi import Depends, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from sqlalchemy import or_
from passlib.context import CryptContext

from app.core.database import get_db
from app.models.api_key import ApiKey
from app.models.user import User

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_api_key_str(plain_key: str, hashed_key: str) -> bool:
    return pwd_context.verify(plain_key, hashed_key)

def get_hash(plain_key: str) -> str:
    return pwd_context.hash(plain_key)

def get_current_api_key(
    api_key: str = Security(api_key_header),
    db: Session = Depends(get_db)
) -> ApiKey:
    """
    Validates the provided API key and returns the ApiKey model instance.
    The api key is typically in the format: prefix_actualkey
    We match by prefix first, or just verify all active keys for the user (less efficient).
    A better approach is extracting the prefix from the API key to find it faster.
    """
    if "_" not in api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key format",
        )
    
    prefix = api_key.split("_")[0] + "_"
    
    # Find active keys with this prefix
    db_keys = db.query(ApiKey).filter(ApiKey.key_prefix == prefix, ApiKey.is_active == True).all()
    
    for db_key in db_keys:
        if verify_api_key_str(api_key, db_key.key_hash):
            return db_key
            
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

def get_current_user(
    api_key_obj: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db)
) -> User:
    """Returns the user associated with the valid API key."""
    user = db.query(User).filter(User.id == api_key_obj.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

def check_concurrent_jobs_limit(
    api_key_obj: ApiKey = Depends(get_current_api_key),
    db: Session = Depends(get_db)
) -> ApiKey:
    """Enforce a maximum number of concurrent pending/processing jobs per user."""
    MAX_CONCURRENT_JOBS = 10
    
    from app.models.job import Job
    active_jobs_count = db.query(Job).filter(
        Job.user_id == api_key_obj.user_id,
        or_(Job.status == "pending", Job.status == "processing")
    ).count()
    
    if active_jobs_count >= MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Concurrent job limit exceeded. Maximum allowable is {MAX_CONCURRENT_JOBS}."
        )
    return api_key_obj
