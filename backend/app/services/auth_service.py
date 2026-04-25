from datetime import UTC, datetime, timedelta
import hashlib
import random
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.company_profile import CompanyProfile
from app.models.logistics_service_lane import LogisticsServiceLane
from app.models.user import User, UserRole
from app.models.user_document import UserDocument
from app.models.verification_otp import VerificationOTP
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse
from app.utils.auth import create_access_token, hash_password, verify_password


def register_user(db: Session, user_data: UserRegister) -> TokenResponse:
	existing = db.query(User).filter(User.email == user_data.email).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already registered')

	new_user = User(
		full_name=user_data.full_name,
		email=user_data.email,
		password_hash=hash_password(user_data.password),
		role=user_data.role,
		account_type=user_data.account_type,
		company_name=user_data.company_name,
		phone_number=user_data.phone_number,
		country=user_data.country,
		tos_accepted=user_data.tos_accepted,
		privacy_accepted=user_data.privacy_accepted,
		shipping_terms_accepted=user_data.shipping_terms_accepted,
	)

	db.add(new_user)
	db.flush()

	should_create_company_profile = bool(
		user_data.company_profile
		or (user_data.company_name and user_data.role in {UserRole.MANAGER, UserRole.SHIPPER})
	)
	if should_create_company_profile:
		preferred_ports = None
		if user_data.company_profile and user_data.company_profile.preferred_ports:
			preferred_ports = []
			for port_id in user_data.company_profile.preferred_ports:
				try:
					preferred_ports.append(str(UUID(str(port_id))))
				except (TypeError, ValueError):
					continue
			preferred_ports = preferred_ports or None

		profile = CompanyProfile(
			user_id=new_user.user_id,
			company_type=user_data.company_profile.company_type if user_data.company_profile else None,
			registration_number=user_data.company_profile.registration_number if user_data.company_profile else None,
			tax_vat_number=user_data.company_profile.tax_vat_number if user_data.company_profile else None,
			hq_address=user_data.company_profile.hq_address if user_data.company_profile else None,
			website=user_data.company_profile.website if user_data.company_profile else None,
			contact_name=user_data.company_profile.contact_name if user_data.company_profile else None,
			contact_designation=user_data.company_profile.contact_designation if user_data.company_profile else None,
			typical_cargo=user_data.company_profile.typical_cargo if user_data.company_profile else None,
			monthly_volume_band=user_data.company_profile.monthly_volume_band if user_data.company_profile else None,
			preferred_ports=preferred_ports,
		)
		db.add(profile)

	if user_data.role == UserRole.MANAGER and user_data.service_lanes:
		seen_keys: set[tuple[str, str, str]] = set()
		for lane in user_data.service_lanes:
			if lane.origin_port_id == lane.destination_port_id:
				raise HTTPException(
					status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
					detail='Origin and destination must be different for service lanes',
				)
			try:
				origin_port_id = UUID(str(lane.origin_port_id))
				destination_port_id = UUID(str(lane.destination_port_id))
			except (TypeError, ValueError) as exc:
				raise HTTPException(
					status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
					detail='Invalid port ID in service lane',
				) from exc
			key = (str(origin_port_id), str(destination_port_id), lane.service_mode.strip().lower())
			if key in seen_keys:
				continue
			seen_keys.add(key)

			db.add(
				LogisticsServiceLane(
					provider_user_id=new_user.user_id,
					origin_port_id=origin_port_id,
					destination_port_id=destination_port_id,
					service_mode=lane.service_mode.strip().lower() or 'sea',
					min_transit_days=lane.min_transit_days,
					max_transit_days=lane.max_transit_days,
					base_price_usd=lane.base_price_usd,
					price_per_kg_usd=lane.price_per_kg_usd,
					active=lane.active,
				)
			)

	db.commit()
	db.refresh(new_user)

	access_token = create_access_token(
		data={'sub': str(new_user.user_id)},
		expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
	)

	return TokenResponse(access_token=access_token, user=UserResponse.model_validate(new_user))


def authenticate_user(db: Session, credentials: UserLogin) -> TokenResponse:
	user = db.query(User).filter(User.email == credentials.email).first()
	if not user or not verify_password(credentials.password, user.password_hash):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password')

	if not user.is_active:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User account is inactive')

	user.last_login = datetime.now(UTC)
	db.commit()

	access_token = create_access_token(
		data={'sub': str(user.user_id)},
		expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
	)

	return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


def create_and_store_otp(db: Session, user: User, channel: str, destination: str) -> str:
	otp = f'{random.randint(0, 999999):06d}'
	otp_hash = hash_password(otp)
	record = VerificationOTP(
		user_id=user.user_id,
		channel=channel,
		destination=destination,
		otp_hash=otp_hash,
		expires_at=datetime.now(UTC) + timedelta(minutes=10),
	)
	db.add(record)
	db.commit()
	return otp


def verify_stored_otp(db: Session, user: User, channel: str, code: str) -> bool:
	record = (
		db.query(VerificationOTP)
		.filter(
			VerificationOTP.user_id == user.user_id,
			VerificationOTP.channel == channel,
			VerificationOTP.consumed_at.is_(None),
		)
		.order_by(VerificationOTP.created_at.desc())
		.first()
	)
	if not record:
		return False

	if datetime.now(UTC) > record.expires_at:
		return False

	record.attempt_count += 1
	if not verify_password(code, record.otp_hash):
		db.commit()
		return False

	record.consumed_at = datetime.now(UTC)
	if channel == 'email':
		user.email_verified = True
	if channel == 'phone':
		user.phone_verified = True
	if user.email_verified and user.phone_verified and user.tos_accepted and user.privacy_accepted and user.shipping_terms_accepted:
		user.onboarding_completed_at = datetime.now(UTC)
	db.commit()
	return True


def save_document_reference(db: Session, user: User, doc_type: str, file_url: str) -> UserDocument:
	doc = UserDocument(user_id=user.user_id, doc_type=doc_type, file_url=file_url)
	db.add(doc)
	db.commit()
	db.refresh(doc)
	return doc


def legal_flags_complete(user: User) -> bool:
	return bool(user.tos_accepted and user.privacy_accepted and user.shipping_terms_accepted)


def otp_preview(otp: str) -> str:
	# Hackathon/dev mode: return masked hint that can be logged by UI for demo verification.
	return hashlib.sha256(otp.encode()).hexdigest()[:8]
