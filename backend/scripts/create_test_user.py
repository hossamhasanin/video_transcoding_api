import os
import sys
import uuid
import secrets
import string
from sqlalchemy.orm import Session

# Add the app directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.api_key import ApiKey
from app.api.dependencies import get_hash


def generate_key():
    alphabet = string.ascii_letters + string.digits
    raw_key = "".join(secrets.choice(alphabet) for i in range(32))
    prefix = "vf_"
    actual_key = prefix + raw_key
    return actual_key, prefix


def create_test_user():
    db = SessionLocal()
    try:
        email = "test@transcodeflow.api"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(id=uuid.uuid4(), email=email)
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created user: {user.email} with ID: {user.id}")
        else:
            print(f"User {user.email} already exists")

        # Create API key
        actual_key, prefix = generate_key()
        hashed_key = get_hash(actual_key)

        api_key = ApiKey(
            user_id=user.id,
            key_hash=hashed_key,
            key_prefix=prefix,
            name="Test Script Key",
        )
        db.add(api_key)
        db.commit()

        print("-" * 40)
        print("API KEY GENERATED (Save this, it will not be shown again):")
        print(actual_key)
        print("-" * 40)

    finally:
        db.close()


if __name__ == "__main__":
    create_test_user()
