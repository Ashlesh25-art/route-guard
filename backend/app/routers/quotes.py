from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.dependencies import get_current_user
from app.models.cargo import Cargo
from app.models.logistics_service_lane import LogisticsServiceLane
from app.models.negotiation_message import NegotiationMessage
from app.models.port import Port
from app.models.quote_offer import QuoteOffer, QuoteOfferStatus
from app.models.quote_request import QuoteRequest, QuoteRequestStatus
from app.models.quote_to_shipment import QuoteToShipment
from app.models.shipment import Shipment, ShipmentStatus
from app.models.user import User
from app.schemas.quote import (
	AcceptOfferResponse,
	NegotiationMessageCreate,
	NegotiationMessageResponse,
	QuoteOfferCreate,
	QuoteOfferResponse,
	QuoteRequestCreate,
	QuoteRequestResponse,
)
from app.services.shipment_service import generate_tracking_number

router = APIRouter()


def _enrich_request(req: QuoteRequest, db: Session) -> dict:
	"""Enrich a quote request with port names, shipper/receiver names, and offer count."""
	origin_port = db.query(Port).filter(Port.port_id == req.origin_port_id).first()
	dest_port = db.query(Port).filter(Port.port_id == req.destination_port_id).first()
	offer_count = db.query(func.count(QuoteOffer.offer_id)).filter(QuoteOffer.request_id == req.request_id).scalar() or 0
	shipper = db.query(User).filter(User.user_id == req.shipper_id).first()
	receiver = db.query(User).filter(User.user_id == req.receiver_id).first()
	return {
		'request_id': str(req.request_id),
		'shipper_id': str(req.shipper_id),
		'shipper_name': shipper.full_name if shipper else None,
		'shipper_company': shipper.company_name if shipper else None,
		'receiver_id': str(req.receiver_id),
		'receiver_name': receiver.full_name if receiver else None,
		'origin_port_id': str(req.origin_port_id),
		'origin_port_name': origin_port.port_name if origin_port else None,
		'origin_port_country': origin_port.country if origin_port else None,
		'destination_port_id': str(req.destination_port_id),
		'destination_port_name': dest_port.port_name if dest_port else None,
		'destination_port_country': dest_port.country if dest_port else None,
		'pickup_address': req.pickup_address,
		'dropoff_address': req.dropoff_address,
		'cargo_type': req.cargo_type.value if req.cargo_type else None,
		'quantity': req.quantity,
		'weight_kg': float(req.weight_kg) if req.weight_kg else None,
		'volume_cbm': float(req.volume_cbm) if req.volume_cbm else None,
		'special_instructions': req.special_instructions,
		'status': req.status.value if req.status else None,
		'selected_offer_id': str(req.selected_offer_id) if req.selected_offer_id else None,
		'offer_count': offer_count,
		'created_at': req.created_at.isoformat() if req.created_at else None,
		'updated_at': req.updated_at.isoformat() if req.updated_at else None,
	}


def _role_value(user: User) -> str:
	return user.role.value if hasattr(user.role, 'value') else str(user.role)


@router.post('/quote-requests', response_model=QuoteRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_quote_request(
	payload: QuoteRequestCreate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	if _role_value(current_user) != 'shipper':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only shippers can create quote requests')

	record = QuoteRequest(
		shipper_id=current_user.user_id,
		receiver_id=UUID(payload.receiver_id),
		origin_port_id=UUID(payload.origin_port_id),
		destination_port_id=UUID(payload.destination_port_id),
		pickup_address=payload.pickup_address,
		dropoff_address=payload.dropoff_address,
		cargo_type=payload.cargo_type,
		quantity=payload.quantity,
		weight_kg=payload.weight_kg,
		volume_cbm=payload.volume_cbm,
		special_instructions=payload.special_instructions,
		status=payload.status,
	)
	db.add(record)
	db.commit()
	db.refresh(record)
	return QuoteRequestResponse.model_validate(record)


@router.get('/quote-requests')
async def list_quote_requests(
	status_filter: QuoteRequestStatus | None = None,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	role = _role_value(current_user)
	query = db.query(QuoteRequest)
	if role == 'shipper':
		query = query.filter(QuoteRequest.shipper_id == current_user.user_id)
	elif role == 'receiver':
		query = query.filter(QuoteRequest.receiver_id == current_user.user_id)
	else:
		# Manager sees all SENT/NEGOTIATING plus accepted for history
		query = query.filter(QuoteRequest.status.in_([
			QuoteRequestStatus.SENT,
			QuoteRequestStatus.NEGOTIATING,
			QuoteRequestStatus.ACCEPTED,
		]))

	if status_filter:
		query = query.filter(QuoteRequest.status == status_filter)

	items = query.order_by(QuoteRequest.created_at.desc()).all()
	# Managers get enriched dicts; shippers/receivers get Pydantic models
	if role == 'manager':
		return [_enrich_request(item, db) for item in items]
	return [QuoteRequestResponse.model_validate(item) for item in items]


@router.get('/quote-requests/{request_id}')
async def get_quote_request(request_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	item = db.query(QuoteRequest).filter(QuoteRequest.request_id == UUID(request_id)).first()
	if not item:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')
	role = _role_value(current_user)
	if role == 'shipper' and item.shipper_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
	if role == 'receiver' and item.receiver_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
	return QuoteRequestResponse.model_validate(item)


@router.post('/quote-requests/{request_id}/offers', response_model=QuoteOfferResponse, status_code=status.HTTP_201_CREATED)
async def add_offer(
	request_id: str,
	payload: QuoteOfferCreate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	if _role_value(current_user) != 'manager':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only logistics managers can create offers')

	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == UUID(request_id)).first()
	if not req:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')

	offer = QuoteOffer(
		request_id=req.request_id,
		provider_user_id=UUID(payload.provider_user_id) if payload.provider_user_id else current_user.user_id,
		lane_id=UUID(payload.lane_id) if payload.lane_id else None,
		offered_amount_usd=payload.offered_amount_usd,
		currency=payload.currency,
		estimated_pickup_at=payload.estimated_pickup_at,
		estimated_delivery_at=payload.estimated_delivery_at,
		notes=payload.notes,
		valid_until=payload.valid_until,
	)
	db.add(offer)
	if req.status == QuoteRequestStatus.DRAFT:
		req.status = QuoteRequestStatus.SENT
	db.commit()
	db.refresh(offer)
	return QuoteOfferResponse.model_validate(offer)


@router.post('/quote-requests/{request_id}/broadcast')
async def broadcast_quote_request(request_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	if _role_value(current_user) != 'shipper':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only shippers can broadcast quote requests')

	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == UUID(request_id)).first()
	if not req:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')
	if req.shipper_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

	matched_lanes = (
		db.query(LogisticsServiceLane)
		.filter(
			LogisticsServiceLane.origin_port_id == req.origin_port_id,
			LogisticsServiceLane.destination_port_id == req.destination_port_id,
			LogisticsServiceLane.active.is_(True),
		)
		.all()
	)
	provider_ids = {str(l.provider_user_id) for l in matched_lanes}
	req.status = QuoteRequestStatus.SENT
	db.commit()
	return {
		'ok': True,
		'request_id': str(req.request_id),
		'matched_lane_count': len(matched_lanes),
		'matched_provider_count': len(provider_ids),
		'provider_user_ids': sorted(provider_ids),
	}


@router.get('/quote-requests/{request_id}/offers', response_model=list[QuoteOfferResponse])
async def get_offers(request_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ = current_user
	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == UUID(request_id)).first()
	if not req:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')
	items = (
		db.query(QuoteOffer)
		.filter(QuoteOffer.request_id == req.request_id)
		.order_by(QuoteOffer.offered_amount_usd.asc(), QuoteOffer.created_at.desc())
		.all()
	)
	return [QuoteOfferResponse.model_validate(item) for item in items]


@router.post('/quote-requests/{request_id}/messages', response_model=NegotiationMessageResponse, status_code=status.HTTP_201_CREATED)
async def post_message(
	request_id: str,
	payload: NegotiationMessageCreate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == UUID(request_id)).first()
	if not req:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')

	msg = NegotiationMessage(
		request_id=req.request_id,
		offer_id=UUID(payload.offer_id) if payload.offer_id else None,
		sender_user_id=current_user.user_id,
		message_type=payload.message_type,
		body=payload.body,
		counter_amount_usd=payload.counter_amount_usd,
	)
	db.add(msg)
	req.status = QuoteRequestStatus.NEGOTIATING
	db.commit()
	db.refresh(msg)
	return NegotiationMessageResponse.model_validate(msg)


@router.get('/quote-requests/{request_id}/messages', response_model=list[NegotiationMessageResponse])
async def list_messages(request_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	_ = current_user
	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == UUID(request_id)).first()
	if not req:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')

	items = (
		db.query(NegotiationMessage)
		.filter(NegotiationMessage.request_id == req.request_id)
		.order_by(NegotiationMessage.created_at.asc())
		.all()
	)
	return [NegotiationMessageResponse.model_validate(item) for item in items]


@router.post('/quote-offers/{offer_id}/accept', response_model=AcceptOfferResponse)
async def accept_offer(offer_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	if _role_value(current_user) != 'shipper':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only shippers can accept offers')

	offer = db.query(QuoteOffer).filter(QuoteOffer.offer_id == UUID(offer_id)).first()
	if not offer:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Offer not found')

	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == offer.request_id).first()
	if not req:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Quote request not found')
	if req.shipper_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

	tracking_number = generate_tracking_number(db)
	departure_time = offer.estimated_pickup_at or datetime.now(UTC)
	expected_arrival = offer.estimated_delivery_at or (departure_time + timedelta(days=7))
	shipment = Shipment(
		tracking_number=tracking_number,
		shipper_id=req.shipper_id,
		receiver_id=req.receiver_id,
		assigned_manager_id=offer.provider_user_id,
		origin_port_id=req.origin_port_id,
		destination_port_id=req.destination_port_id,
		departure_time=departure_time,
		expected_arrival=expected_arrival,
		current_status=ShipmentStatus.CREATED,
		special_instructions=req.special_instructions,
	)
	db.add(shipment)
	db.flush()

	if req.cargo_type and req.weight_kg:
		db.add(
			Cargo(
				shipment_id=shipment.shipment_id,
				cargo_type=req.cargo_type,
				description=req.special_instructions or 'Cargo from accepted quote',
				weight_kg=req.weight_kg,
				volume_cbm=req.volume_cbm,
				quantity=req.quantity,
			)
		)

	offer.status = QuoteOfferStatus.ACCEPTED
	db.query(QuoteOffer).filter(QuoteOffer.request_id == req.request_id, QuoteOffer.offer_id != offer.offer_id).update(
		{QuoteOffer.status: QuoteOfferStatus.REJECTED},
		synchronize_session=False,
	)
	req.status = QuoteRequestStatus.ACCEPTED
	req.selected_offer_id = offer.offer_id

	mapping = QuoteToShipment(request_id=req.request_id, offer_id=offer.offer_id, shipment_id=shipment.shipment_id)
	db.add(mapping)
	db.commit()

	return AcceptOfferResponse(
		offer_id=str(offer.offer_id),
		request_id=str(req.request_id),
		shipment_id=str(shipment.shipment_id),
		tracking_number=shipment.tracking_number,
	)


@router.post('/quote-offers/{offer_id}/reject')
async def reject_offer(offer_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	if _role_value(current_user) != 'shipper':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only shippers can reject offers')

	offer = db.query(QuoteOffer).filter(QuoteOffer.offer_id == UUID(offer_id)).first()
	if not offer:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Offer not found')
	req = db.query(QuoteRequest).filter(QuoteRequest.request_id == offer.request_id).first()
	if not req or req.shipper_id != current_user.user_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
	if req.status == QuoteRequestStatus.ACCEPTED:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Request already accepted')

	offer.status = QuoteOfferStatus.REJECTED
	db.commit()
	return {'ok': True, 'offer_id': str(offer.offer_id), 'status': offer.status.value}


@router.get('/consignments')
async def list_shipper_consignments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	if _role_value(current_user) != 'shipper':
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only shippers can view consignments')

	items = (
		db.query(Shipment)
		.filter(Shipment.shipper_id == current_user.user_id)
		.order_by(Shipment.created_at.desc())
		.all()
	)
	offer_amount_by_shipment: dict[str, float] = {}
	shipment_ids = [s.shipment_id for s in items]
	if shipment_ids:
		mappings = db.query(QuoteToShipment).filter(QuoteToShipment.shipment_id.in_(shipment_ids)).all()
		offer_ids = [m.offer_id for m in mappings]
		offers = db.query(QuoteOffer).filter(QuoteOffer.offer_id.in_(offer_ids)).all() if offer_ids else []
		offer_amount_by_id = {o.offer_id: float(o.offered_amount_usd or 0) for o in offers}
		for m in mappings:
			offer_amount_by_shipment[str(m.shipment_id)] = offer_amount_by_id.get(m.offer_id, 0.0)

	data = [
		{
			'shipment_id': str(s.shipment_id),
			'tracking_number': s.tracking_number,
			'status': s.current_status.value if hasattr(s.current_status, 'value') else str(s.current_status),
			'expected_arrival': s.expected_arrival.isoformat() if s.expected_arrival else None,
			'origin_port_name': s.origin_port.port_name if s.origin_port else None,
			'destination_port_name': s.destination_port.port_name if s.destination_port else None,
			'manager_name': s.manager.full_name if s.manager else None,
			'vessel_name': s.vessel.vessel_name if s.vessel else None,
			'declared_value': float(s.cargo.declared_value) if s.cargo and s.cargo.declared_value is not None else 0.0,
			'invoice_amount_usd': offer_amount_by_shipment.get(str(s.shipment_id), 0.0),
		}
		for s in items
	]
	return {
		'pending': [i for i in data if i['status'] in {'created', 'picked_up', 'at_port', 'customs'}],
		'in_transit': [i for i in data if i['status'] == 'in_transit'],
		'completed': [i for i in data if i['status'] == 'delivered'],
		'delayed': [i for i in data if i['status'] == 'delayed'],
		'cancelled': [i for i in data if i['status'] == 'cancelled'],
	}
