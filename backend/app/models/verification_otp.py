import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.postgres import Base


class VerificationOTP(Base):
	__tablename__ = 'verification_otps'

	otp_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
	channel = Column(String(20), nullable=False)
	destination = Column(String(120), nullable=False)
	otp_hash = Column(String(255), nullable=False)
	expires_at = Column(DateTime(timezone=True), nullable=False)
	consumed_at = Column(DateTime(timezone=True), nullable=True)
	attempt_count = Column(Integer, nullable=False, default=0)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	user = relationship('User', backref='otp_logs')
