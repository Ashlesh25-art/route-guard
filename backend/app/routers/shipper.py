from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.dependencies import get_current_user
from app.models.quote_offer import QuoteOffer
from app.models.quote_to_shipment import QuoteToShipment
from app.models.shipment import Shipment, ShipmentStatus
from app.models.shipment_document import ShipmentDocument
from app.models.shipment_review import ShipmentReview
from app.models.user import User
from app.models.user_address import UserAddress
from app.schemas.shipper import (
	AddressCreate,
	AddressResponse,
	AddressUpdate,
	ShipmentDocumentCreate,
	ShipmentDocumentResponse,
	ShipmentReviewCreate,
	ShipmentReviewResponse,
)

router = APIRouter()


def _role_value(user: User) -> str:
	return user.role.value if hasattr(user.role, 'value') else str(user.role)


def _ensure_shipper(user: User):
	if _role_value(user) != 'shipper':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only shippers can access this resource')


def _get_shipper_shipment_or_404(db: Session, shipment_id: str, user: User) -> Shipment:
	shipment = db.query(Shipment).filter(Shipment.shipment_id == UUID(shipment_id)).first()
	if not shipment:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Shipment not found')
	if shipment.shipper_id != user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
	return shipment


@router.get('/shipper/addresses', response_model=list[AddressResponse])
async def list_addresses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ensure_shipper(current_user)
	items = (
		db.query(UserAddress)
		.filter(UserAddress.user_id == current_user.user_id)
		.order_by(UserAddress.is_default.desc(), UserAddress.created_at.desc())
		.all()
	)
	return [AddressResponse.model_validate(i) for i in items]


@router.post('/shipper/addresses', response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(payload: AddressCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ensure_shipper(current_user)

	if payload.is_default:
		db.query(UserAddress).filter(UserAddress.user_id == current_user.user_id).update({UserAddress.is_default: False})

	record = UserAddress(
		user_id=current_user.user_id,
		name=payload.name.strip(),
		address_line=payload.address_line.strip(),
		contact=(payload.contact or '').strip() or None,
		address_type=(payload.address_type or 'pickup').strip().lower(),
		is_default=bool(payload.is_default),
	)
	db.add(record)
	db.commit()
	db.refresh(record)
	return AddressResponse.model_validate(record)


@router.put('/shipper/addresses/{address_id}', response_model=AddressResponse)
async def update_address(address_id: str, payload: AddressUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ensure_shipper(current_user)
	record = db.query(UserAddress).filter(UserAddress.address_id == UUID(address_id)).first()
	if not record:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Address not found')
	if record.user_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

	if payload.is_default is True:
		db.query(UserAddress).filter(UserAddress.user_id == current_user.user_id).update({UserAddress.is_default: False})

	if payload.name is not None:
		record.name = payload.name.strip()
	if payload.address_line is not None:
		record.address_line = payload.address_line.strip()
	if payload.contact is not None:
		record.contact = payload.contact.strip() or None
	if payload.address_type is not None:
		record.address_type = payload.address_type.strip().lower()
	if payload.is_default is not None:
		record.is_default = payload.is_default

	db.commit()
	db.refresh(record)
	return AddressResponse.model_validate(record)


@router.delete('/shipper/addresses/{address_id}')
async def delete_address(address_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ensure_shipper(current_user)
	record = db.query(UserAddress).filter(UserAddress.address_id == UUID(address_id)).first()
	if not record:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Address not found')
	if record.user_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

	was_default = record.is_default
	db.delete(record)
	db.commit()

	if was_default:
		next_item = (
			db.query(UserAddress)
			.filter(UserAddress.user_id == current_user.user_id)
			.order_by(UserAddress.created_at.desc())
			.first()
		)
		if next_item:
			next_item.is_default = True
			db.commit()

	return {'ok': True}


@router.get('/shipper/shipments/{shipment_id}/documents', response_model=list[ShipmentDocumentResponse])
async def list_shipment_documents(shipment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ensure_shipper(current_user)
	_get_shipper_shipment_or_404(db, shipment_id, current_user)
	items = (
		db.query(ShipmentDocument)
		.filter(ShipmentDocument.shipment_id == UUID(shipment_id))
		.order_by(ShipmentDocument.created_at.desc())
		.all()
	)
	return [ShipmentDocumentResponse.model_validate(i) for i in items]


@router.post('/shipper/shipments/{shipment_id}/documents', response_model=ShipmentDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_shipment_document(
	shipment_id: str,
	payload: ShipmentDocumentCreate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	_ensure_shipper(current_user)
	_get_shipper_shipment_or_404(db, shipment_id, current_user)

	record = ShipmentDocument(
		shipment_id=UUID(shipment_id),
		uploaded_by=current_user.user_id,
		doc_type=payload.doc_type.strip().lower(),
		file_url=payload.file_url.strip(),
		review_status='uploaded',
	)
	db.add(record)
	db.commit()
	db.refresh(record)
	return ShipmentDocumentResponse.model_validate(record)


@router.get('/shipper/shipments/{shipment_id}/invoice')
async def get_invoice(shipment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ensure_shipper(current_user)
	shipment = _get_shipper_shipment_or_404(db, shipment_id, current_user)

	mapping = db.query(QuoteToShipment).filter(QuoteToShipment.shipment_id == shipment.shipment_id).first()
	offer_amount = None
	if mapping:
		offer = db.query(QuoteOffer).filter(QuoteOffer.offer_id == mapping.offer_id).first()
		if offer and offer.offered_amount_usd is not None:
			offer_amount = Decimal(offer.offered_amount_usd)

	declared_value = Decimal(shipment.cargo.declared_value) if shipment.cargo and shipment.cargo.declared_value is not None else Decimal('0')
	total_usd = offer_amount if offer_amount is not None else declared_value

	return JSONResponse(
		{
			'shipment_id': str(shipment.shipment_id),
			'tracking_number': shipment.tracking_number,
			'status': shipment.current_status.value if hasattr(shipment.current_status, 'value') else str(shipment.current_status),
			'currency': 'USD',
			'total_amount_usd': float(total_usd),
			'line_items': [
				{
					'label': 'Freight Service',
					'amount_usd': float(total_usd),
				}
			],
		}
	)


@router.post('/shipper/shipments/{shipment_id}/review', response_model=ShipmentReviewResponse)
async def upsert_review(
	shipment_id: str,
	payload: ShipmentReviewCreate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	_ensure_shipper(current_user)
	shipment = _get_shipper_shipment_or_404(db, shipment_id, current_user)
	if shipment.current_status != ShipmentStatus.DELIVERED:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Review is allowed only for delivered shipments')

	values = [payload.overall_rating, payload.on_time_rating, payload.communication_rating, payload.cargo_condition_rating]
	for value in values:
		if value < 1 or value > 5:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Ratings must be between 1 and 5')
	average = round(sum(values) / len(values), 2)

	record = db.query(ShipmentReview).filter(ShipmentReview.shipment_id == shipment.shipment_id).first()
	if not record:
		record = ShipmentReview(
			shipment_id=shipment.shipment_id,
			reviewer_user_id=current_user.user_id,
			manager_user_id=shipment.assigned_manager_id,
			overall_rating=payload.overall_rating,
			on_time_rating=payload.on_time_rating,
			communication_rating=payload.communication_rating,
			cargo_condition_rating=payload.cargo_condition_rating,
			average_rating=Decimal(str(average)),
			comment=(payload.comment or '').strip() or None,
		)
		db.add(record)
	else:
		record.overall_rating = payload.overall_rating
		record.on_time_rating = payload.on_time_rating
		record.communication_rating = payload.communication_rating
		record.cargo_condition_rating = payload.cargo_condition_rating
		record.average_rating = Decimal(str(average))
		record.comment = (payload.comment or '').strip() or None

	db.commit()
	db.refresh(record)
	return ShipmentReviewResponse(
		review_id=str(record.review_id),
		shipment_id=str(record.shipment_id),
		overall_rating=record.overall_rating,
		on_time_rating=record.on_time_rating,
		communication_rating=record.communication_rating,
		cargo_condition_rating=record.cargo_condition_rating,
		average_rating=float(record.average_rating),
		comment=record.comment,
		created_at=record.created_at,
	)
