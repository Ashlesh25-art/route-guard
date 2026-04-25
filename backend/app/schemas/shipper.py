from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class AddressCreate(BaseModel):
	name: str
	address_line: str
	contact: str | None = None
	address_type: str = 'pickup'
	is_default: bool = False


class AddressUpdate(BaseModel):
	name: str | None = None
	address_line: str | None = None
	contact: str | None = None
	address_type: str | None = None
	is_default: bool | None = None


class AddressResponse(BaseModel):
	address_id: str
	name: str
	address_line: str
	contact: str | None = None
	address_type: str
	is_default: bool
	created_at: datetime
	updated_at: datetime | None = None

	model_config = ConfigDict(from_attributes=True)

	@field_validator('address_id', mode='before')
	@classmethod
	def uuid_to_str(cls, value):
		return str(value) if value is not None else value


class ShipmentDocumentCreate(BaseModel):
	doc_type: str
	file_url: str


class ShipmentDocumentResponse(BaseModel):
	document_id: str
	shipment_id: str
	doc_type: str
	file_url: str
	review_status: str
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

	@field_validator('document_id', 'shipment_id', mode='before')
	@classmethod
	def uuid_to_str(cls, value):
		return str(value) if value is not None else value


class ShipmentReviewCreate(BaseModel):
	overall_rating: int
	on_time_rating: int
	communication_rating: int
	cargo_condition_rating: int
	comment: str | None = None


class ShipmentReviewResponse(BaseModel):
	review_id: str
	shipment_id: str
	overall_rating: int
	on_time_rating: int
	communication_rating: int
	cargo_condition_rating: int
	average_rating: float
	comment: str | None = None
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

	@field_validator('review_id', 'shipment_id', mode='before')
	@classmethod
	def uuid_to_str(cls, value):
		return str(value) if value is not None else value
