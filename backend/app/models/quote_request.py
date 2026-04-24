import enum
import uuid

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.postgres import Base
from app.models.cargo import CargoType
from app.models.enum_utils import enum_values


class QuoteRequestStatus(str, enum.Enum):
	DRAFT = 'draft'
	SENT = 'sent'
	NEGOTIATING = 'negotiating'
	ACCEPTED = 'accepted'
	REJECTED = 'rejected'
	EXPIRED = 'expired'
	CANCELLED = 'cancelled'


class QuoteRequest(Base):
	__tablename__ = 'quote_requests'

	request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	shipper_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False, index=True)
	receiver_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
	origin_port_id = Column(UUID(as_uuid=True), ForeignKey('ports.port_id'), nullable=False)
	destination_port_id = Column(UUID(as_uuid=True), ForeignKey('ports.port_id'), nullable=False)
	pickup_address = Column(Text, nullable=False)
	dropoff_address = Column(Text, nullable=True)
	cargo_type = Column(SQLEnum(CargoType, values_callable=enum_values, name='cargo_type'), nullable=True)
	quantity = Column(Integer, nullable=True)
	weight_kg = Column(Numeric, nullable=True)
	volume_cbm = Column(Numeric, nullable=True)
	special_instructions = Column(Text, nullable=True)
	status = Column(SQLEnum(QuoteRequestStatus, values_callable=enum_values, name='quote_request_status'), nullable=False, default=QuoteRequestStatus.DRAFT, index=True)
	selected_offer_id = Column(UUID(as_uuid=True), ForeignKey('quote_offers.offer_id'), nullable=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())
	updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

	shipper = relationship('User', foreign_keys=[shipper_id], backref='quote_requests')
	receiver = relationship('User', foreign_keys=[receiver_id])
