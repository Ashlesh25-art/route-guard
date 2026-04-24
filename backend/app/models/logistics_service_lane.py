import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.postgres import Base


class LogisticsServiceLane(Base):
	__tablename__ = 'logistics_service_lanes'
	__table_args__ = (
		UniqueConstraint(
			'provider_user_id',
			'origin_port_id',
			'destination_port_id',
			'service_mode',
			name='uq_provider_lane_mode',
		),
	)

	lane_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	provider_user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
	origin_port_id = Column(UUID(as_uuid=True), ForeignKey('ports.port_id'), nullable=False)
	destination_port_id = Column(UUID(as_uuid=True), ForeignKey('ports.port_id'), nullable=False)
	service_mode = Column(String(30), nullable=False, default='sea')
	min_transit_days = Column(Integer, nullable=True)
	max_transit_days = Column(Integer, nullable=True)
	base_price_usd = Column(Numeric(12, 2), nullable=True)
	price_per_kg_usd = Column(Numeric(12, 4), nullable=True)
	active = Column(Boolean, nullable=False, default=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	provider = relationship('User', backref='service_lanes')
