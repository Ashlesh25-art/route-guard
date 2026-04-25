from datetime import datetime
from uuid import UUID

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.user import AccountType, UserRole


class UserLogin(BaseModel):
	email: EmailStr
	password: str


class CompanyProfileRegister(BaseModel):
	company_type: str | None = None
	registration_number: str | None = None
	tax_vat_number: str | None = None
	hq_address: str | None = None
	website: str | None = None
	contact_name: str | None = None
	contact_designation: str | None = None
	typical_cargo: str | None = None
	monthly_volume_band: str | None = None
	preferred_ports: list[str] | None = None


class LogisticsServiceLaneRegister(BaseModel):
	origin_port_id: str
	destination_port_id: str
	service_mode: str = 'sea'
	min_transit_days: int | None = None
	max_transit_days: int | None = None
	base_price_usd: Decimal | None = None
	price_per_kg_usd: Decimal | None = None
	active: bool = True

	@field_validator('origin_port_id', 'destination_port_id', 'service_mode', mode='before')
	@classmethod
	def normalize_text_fields(cls, value):
		if value is None:
			return value
		return str(value).strip()

	@model_validator(mode='after')
	def validate_lane(self):
		if not self.origin_port_id or not self.destination_port_id:
			raise ValueError('Service lane must include origin and destination ports')
		if self.origin_port_id == self.destination_port_id:
			raise ValueError('Service lane origin and destination must be different')
		if self.min_transit_days is not None and self.max_transit_days is not None and self.min_transit_days > self.max_transit_days:
			raise ValueError('Service lane min transit days cannot be greater than max transit days')
		if self.base_price_usd is not None and self.base_price_usd < 0:
			raise ValueError('Service lane base price cannot be negative')
		if self.price_per_kg_usd is not None and self.price_per_kg_usd < 0:
			raise ValueError('Service lane price per kg cannot be negative')
		return self


class UserRegister(BaseModel):
	full_name: str = Field(min_length=2, max_length=100)
	email: EmailStr
	password: str = Field(min_length=8, max_length=128)
	role: UserRole
	account_type: AccountType | None = None
	company_name: str | None = None
	phone_number: str | None = None
	country: str | None = None
	company_profile: CompanyProfileRegister | None = None
	service_lanes: list[LogisticsServiceLaneRegister] = Field(default_factory=list)
	tos_accepted: bool = False
	privacy_accepted: bool = False
	shipping_terms_accepted: bool = False

	@field_validator('full_name', 'company_name', 'phone_number', 'country', mode='before')
	@classmethod
	def normalize_optional_text(cls, value):
		if value is None:
			return None
		text = str(value).strip()
		return text or None

	@field_validator('email', mode='before')
	@classmethod
	def normalize_email(cls, value):
		return str(value or '').strip().lower()

	@model_validator(mode='after')
	def validate_business_rules(self):
		if not self.phone_number:
			raise ValueError('Phone number is required')
		if not (self.tos_accepted and self.privacy_accepted and self.shipping_terms_accepted):
			raise ValueError('Terms, privacy, and shipping terms must be accepted')
		if self.role in {UserRole.SHIPPER, UserRole.MANAGER, UserRole.RECEIVER} and not self.company_name:
			raise ValueError('Company / organization name is required for this role')
		if self.role == UserRole.MANAGER:
			if not self.company_profile:
				raise ValueError('Company profile is required for manager signup')
			if not self.service_lanes:
				raise ValueError('At least one service lane is required for manager signup')
		return self


class UserResponse(BaseModel):
	user_id: UUID
	full_name: str
	email: str
	role: UserRole
	account_type: AccountType | None = None
	company_name: str | None = None
	phone_number: str | None = None
	country: str | None = None
	email_verified: bool = False
	phone_verified: bool = False
	tos_accepted: bool = False
	privacy_accepted: bool = False
	shipping_terms_accepted: bool = False
	is_active: bool
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
	access_token: str
	token_type: str = 'bearer'
	user: UserResponse


class UserUpdateRequest(BaseModel):
	full_name: str = Field(min_length=2, max_length=100)
	email: EmailStr
	account_type: AccountType | None = None
	company_name: str | None = None
	phone_number: str | None = None
	country: str | None = None

	@field_validator('full_name', 'company_name', 'phone_number', 'country', mode='before')
	@classmethod
	def normalize_optional_text(cls, value):
		if value is None:
			return None
		text = str(value).strip()
		return text or None

	@field_validator('email', mode='before')
	@classmethod
	def normalize_email(cls, value):
		return str(value or '').strip().lower()

	@model_validator(mode='after')
	def validate_phone(self):
		if not self.phone_number:
			raise ValueError('Phone number is required')
		return self


class SendOTPRequest(BaseModel):
	channel: str
	destination: str


class VerifyOTPRequest(BaseModel):
	channel: str
	code: str


class AcceptLegalRequest(BaseModel):
	tos_accepted: bool = True
	privacy_accepted: bool = True
	shipping_terms_accepted: bool = True


class UploadDocumentRequest(BaseModel):
	doc_type: str
	file_url: str


class OnboardingStatusResponse(BaseModel):
	email_verified: bool
	phone_verified: bool
	tos_accepted: bool
	privacy_accepted: bool
	shipping_terms_accepted: bool
	onboarding_completed: bool
