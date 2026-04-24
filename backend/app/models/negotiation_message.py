import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.postgres import Base


class NegotiationMessage(Base):
	__tablename__ = 'negotiation_messages'

	message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	request_id = Column(UUID(as_uuid=True), ForeignKey('quote_requests.request_id', ondelete='CASCADE'), nullable=False, index=True)
	offer_id = Column(UUID(as_uuid=True), ForeignKey('quote_offers.offer_id', ondelete='SET NULL'), nullable=True, index=True)
	sender_user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=False)
	message_type = Column(String(20), nullable=False, default='text')
	body = Column(Text, nullable=True)
	counter_amount_usd = Column(Numeric(12, 2), nullable=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	request = relationship('QuoteRequest', backref='messages')
	offer = relationship('QuoteOffer')
	sender = relationship('User')
