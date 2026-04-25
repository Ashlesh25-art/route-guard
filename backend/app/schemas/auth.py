from datetime import datetime
from uuid import UUID

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr

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


class UserRegister(BaseModel):
	full_name: str
	email: EmailStr
	password: str
	role: UserRole
	account_type: AccountType | None = None
	company_name: str | None = None
	phone_number: str | None = None
	country: str | None = None
	company_profile: CompanyProfileRegister | None = None
	service_lanes: list[LogisticsServiceLaneRegister] = []
	tos_accepted: bool = False
	privacy_accepted: bool = False
	shipping_terms_accepted: bool = False


class UserResponse(BaseModel):
	user_id: UUID
	full_name: str
	email: str
	role: UserRole
	account_type: AccountType | None = None
	company_name: str | None = None
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
