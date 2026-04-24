import uuid

from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.postgres import Base


class QuoteToShipment(Base):
	__tablename__ = 'quote_to_shipment'

	mapping_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	request_id = Column(UUID(as_uuid=True), ForeignKey('quote_requests.request_id', ondelete='CASCADE'), nullable=False, unique=True)
	offer_id = Column(UUID(as_uuid=True), ForeignKey('quote_offers.offer_id'), nullable=False)
	shipment_id = Column(UUID(as_uuid=True), ForeignKey('shipments.shipment_id', ondelete='CASCADE'), nullable=False, unique=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())
