import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.postgres import Base


class CompanyProfile(Base):
	__tablename__ = 'company_profiles'

	company_profile_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, unique=True)
	company_type = Column(String(50), nullable=True)
	registration_number = Column(String(100), nullable=True)
	tax_vat_number = Column(String(100), nullable=True)
	hq_address = Column(Text, nullable=True)
	website = Column(String(255), nullable=True)
	contact_name = Column(String(120), nullable=True)
	contact_designation = Column(String(80), nullable=True)
	typical_cargo = Column(String(100), nullable=True)
	monthly_volume_band = Column(String(30), nullable=True)
	preferred_ports = Column(JSONB, nullable=True)
	verification_status = Column(String(20), nullable=False, default='pending')
	created_at = Column(DateTime(timezone=True), server_default=func.now())
	updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

	user = relationship('User', backref='company_profile')
