import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) # Acts as tracking_id
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(String(50), nullable=False, default="pending", index=True) # pending, processing, completed, failed
    source_url = Column(String(2048), nullable=False)
    output_url = Column(String(2048), nullable=True)
    error_message = Column(Text, nullable=True)
    webhook_url = Column(String(2048), nullable=True)
    preset = Column(String(50), nullable=True)
    output_format = Column(String(20), nullable=False, default="mp4")
    generate_subtitles = Column(Boolean, nullable=False, default=False)
    subtitle_url = Column(String(2048), nullable=True)    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = relationship("User", backref="jobs")
    api_key = relationship("ApiKey", backref="jobs")
