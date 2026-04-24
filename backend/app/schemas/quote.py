from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.cargo import CargoType
from app.models.quote_offer import QuoteOfferStatus
from app.models.quote_request import QuoteRequestStatus


class QuoteRequestCreate(BaseModel):
	receiver_id: str
	origin_port_id: str
	destination_port_id: str
	pickup_address: str
	dropoff_address: str | None = None
	cargo_type: CargoType | None = None
	quantity: int | None = None
	weight_kg: Decimal | None = None
	volume_cbm: Decimal | None = None
	special_instructions: str | None = None
	status: QuoteRequestStatus = QuoteRequestStatus.DRAFT


class QuoteRequestResponse(BaseModel):
	request_id: str
	shipper_id: str
	receiver_id: str
	origin_port_id: str
	destination_port_id: str
	pickup_address: str
	dropoff_address: str | None = None
	cargo_type: CargoType | None = None
	quantity: int | None = None
	weight_kg: Decimal | None = None
	volume_cbm: Decimal | None = None
	special_instructions: str | None = None
	status: QuoteRequestStatus
	selected_offer_id: str | None = None
	created_at: datetime
	updated_at: datetime

	model_config = ConfigDict(from_attributes=True)

	@field_validator(
		'request_id',
		'shipper_id',
		'receiver_id',
		'origin_port_id',
		'destination_port_id',
		'selected_offer_id',
		mode='before',
	)
	@classmethod
	def uuid_to_str(cls, value):
		return str(value) if value is not None else value


class QuoteOfferCreate(BaseModel):
	provider_user_id: str | None = None
	lane_id: str | None = None
	offered_amount_usd: Decimal
	currency: str = 'USD'
	estimated_pickup_at: datetime | None = None
	estimated_delivery_at: datetime | None = None
	notes: str | None = None
	valid_until: datetime | None = None


class QuoteOfferResponse(BaseModel):
	offer_id: str
	request_id: str
	provider_user_id: str
	lane_id: str | None = None
	offered_amount_usd: Decimal
	currency: str
	estimated_pickup_at: datetime | None = None
	estimated_delivery_at: datetime | None = None
	notes: str | None = None
	status: QuoteOfferStatus
	valid_until: datetime | None = None
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

	@field_validator('offer_id', 'request_id', 'provider_user_id', 'lane_id', mode='before')
	@classmethod
	def uuid_to_str(cls, value):
		return str(value) if value is not None else value


class NegotiationMessageCreate(BaseModel):
	offer_id: str | None = None
	message_type: str = 'text'
	body: str | None = None
	counter_amount_usd: Decimal | None = None


class NegotiationMessageResponse(BaseModel):
	message_id: str
	request_id: str
	offer_id: str | None = None
	sender_user_id: str
	message_type: str
	body: str | None = None
	counter_amount_usd: Decimal | None = None
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

	@field_validator('message_id', 'request_id', 'offer_id', 'sender_user_id', mode='before')
	@classmethod
	def uuid_to_str(cls, value):
		return str(value) if value is not None else value


class AcceptOfferResponse(BaseModel):
	offer_id: str
	request_id: str
	shipment_id: str
	tracking_number: str
