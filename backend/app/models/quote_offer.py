import enum
import uuid

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.postgres import Base
from app.models.enum_utils import enum_values


class QuoteOfferStatus(str, enum.Enum):
	ACTIVE = 'active'
	COUNTERED = 'countered'
	WITHDRAWN = 'withdrawn'
	ACCEPTED = 'accepted'
	REJECTED = 'rejected'
	EXPIRED = 'expired'


class QuoteOffer(Base):
	__tablename__ = 'quote_offers'

	offer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	request_id = Column(UUID(as_uuid=True), ForeignKey('quote_requests.request_id', ondelete='CASCADE'), nullable=False, index=True)
	provider_user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False, index=True)
	lane_id = Column(UUID(as_uuid=True), ForeignKey('logistics_service_lanes.lane_id'), nullable=True)
	offered_amount_usd = Column(Numeric(12, 2), nullable=False)
	currency = Column(String(10), nullable=False, default='USD')
	estimated_pickup_at = Column(DateTime(timezone=True), nullable=True)
	estimated_delivery_at = Column(DateTime(timezone=True), nullable=True)
	notes = Column(Text, nullable=True)
	status = Column(SQLEnum(QuoteOfferStatus, values_callable=enum_values, name='quote_offer_status'), nullable=False, default=QuoteOfferStatus.ACTIVE, index=True)
	valid_until = Column(DateTime(timezone=True), nullable=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	request = relationship('QuoteRequest', foreign_keys=[request_id], backref='offers')
	provider = relationship('User', foreign_keys=[provider_user_id])
