import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    BigInteger,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PendingUpload(Base):
    __tablename__ = "pending_uploads"

    id = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    api_key_id = Column(
        UUID(as_uuid=True),
        ForeignKey("api_keys.id", ondelete="SET NULL"),
        nullable=True,
    )
    s3_key = Column(String(1024), nullable=False, unique=True)
    source_url = Column(String(2048), nullable=False)
    filename = Column(String(255), nullable=False)
    declared_size_bytes = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)
    status = Column(
        String(20), nullable=False, default="pending", index=True
    )  # pending, completed, expired, cancelled
    actual_size_bytes = Column(BigInteger, nullable=True)
    presigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", backref="pending_uploads")

    __table_args__ = (
        Index("ix_pending_uploads_user_status", "user_id", "status"),
    )
