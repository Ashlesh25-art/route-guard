import httpx
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app.models.port import Port
from app.models.route import Route, RouteType
from app.services.feature_engine import build_feature_vector, haversine_distance
from app.services.ml_service import classify_risk_level, predict_delay_hours, predict_risk_score


async def create_initial_route(db: Session, shipment_id: str, origin_port_id: str, destination_port_id: str) -> Route:
	origin = db.query(Port).filter(Port.port_id == UUID(origin_port_id)).first()
	destination = db.query(Port).filter(Port.port_id == UUID(destination_port_id)).first()
	if not origin or not destination:
		raise ValueError('Invalid origin or destination port')

	waypoints = await get_route_waypoints(
		(float(origin.latitude), float(origin.longitude)),
		(float(destination.latitude), float(destination.longitude)),
	)

	distance_km = haversine_distance(
		float(origin.latitude),
		float(origin.longitude),
		float(destination.latitude),
		float(destination.longitude),
	)

	return Route(
		shipment_id=UUID(shipment_id),
		route_type=RouteType.ORIGINAL,
		is_active=True,
		origin_port_id=origin.port_id,
		destination_port_id=destination.port_id,
		total_distance_km=round(distance_km, 2),
		estimated_duration_hr=round(distance_km / 28.0, 2),
		estimated_fuel_cost=round(distance_km * 2.4, 2),
		waypoints=waypoints,
	)


def generate_route_waypoints(origin: tuple[float, float], destination: tuple[float, float], steps: int = 20) -> list[dict[str, float]]:
	"""Generate waypoints along a great-circle (geodesic) path — fallback only."""
	import math
	lat1, lng1 = math.radians(origin[0]), math.radians(origin[1])
	lat2, lng2 = math.radians(destination[0]), math.radians(destination[1])

	d = math.acos(
		min(1.0, max(-1.0,
			math.sin(lat1) * math.sin(lat2) +
			math.cos(lat1) * math.cos(lat2) * math.cos(lng2 - lng1)
		))
	)

	points: list[dict[str, float]] = []
	for index in range(steps + 1):
		t = index / steps
		if d < 1e-6:
			lat = origin[0] + (destination[0] - origin[0]) * t
			lng = origin[1] + (destination[1] - origin[1]) * t
		else:
			a = math.sin((1 - t) * d) / math.sin(d)
			b = math.sin(t * d) / math.sin(d)
			x = a * math.cos(lat1) * math.cos(lng1) + b * math.cos(lat2) * math.cos(lng2)
			y = a * math.cos(lat1) * math.sin(lng1) + b * math.cos(lat2) * math.sin(lng2)
			z = a * math.sin(lat1) + b * math.sin(lat2)
			lat = math.degrees(math.atan2(z, math.sqrt(x * x + y * y)))
			lng = math.degrees(math.atan2(y, x))
		points.append({'lat': round(lat, 6), 'lng': round(lng, 6)})
	return points


def _downsample_waypoints(points: list[dict[str, float]], max_points: int = 80) -> list[dict[str, float]]:
	"""Keep route payloads compact while preserving start/end and overall shape."""
	if len(points) <= max_points:
		return points
	if max_points < 2:
		return [points[0], points[-1]]
	step = (len(points) - 1) / (max_points - 1)
	result: list[dict[str, float]] = []
	for idx in range(max_points):
		source_index = round(idx * step)
		result.append(points[source_index])
	return result


async def _fetch_openrouteservice_waypoints(
	origin: tuple[float, float],
	destination: tuple[float, float],
) -> list[dict[str, float]] | None:
	if not settings.OPENROUTESERVICE_API_KEY:
		return None

	url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'
	payload = {
		'coordinates': [
			[origin[1], origin[0]],       # ORS uses [lng, lat]
			[destination[1], destination[0]],
		]
	}
	headers = {'Authorization': settings.OPENROUTESERVICE_API_KEY}

	try:
		async with httpx.AsyncClient(timeout=20.0) as client:
			response = await client.post(url, headers=headers, json=payload)
			response.raise_for_status()
		features = response.json().get('features', [])
		if not features:
			return None
		coords = features[0].get('geometry', {}).get('coordinates', [])
		waypoints = [{'lat': round(float(lat), 6), 'lng': round(float(lng), 6)} for lng, lat in coords]
		if len(waypoints) < 2:
			return None
		return _downsample_waypoints(waypoints, max_points=80)
	except Exception:
		return None


async def _fetch_osrm_waypoints(
	origin: tuple[float, float],
	destination: tuple[float, float],
) -> list[dict[str, float]] | None:
	"""Free public OSRM routing — real road geometry, no API key needed."""
	try:
		lat1, lng1 = origin
		lat2, lng2 = destination
		url = (
			f'https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}'
			'?overview=full&geometries=geojson&steps=false'
		)
		async with httpx.AsyncClient(timeout=15.0) as client:
			resp = await client.get(url, headers={'User-Agent': 'RouteGuard/1.0'})
			resp.raise_for_status()
		routes = resp.json().get('routes', [])
		if not routes:
			return None
		coords = routes[0].get('geometry', {}).get('coordinates', [])
		waypoints = [{'lat': round(float(lat), 6), 'lng': round(float(lng), 6)} for lng, lat in coords]
		if len(waypoints) < 2:
			return None
		return _downsample_waypoints(waypoints, max_points=80)
	except Exception:
		return None


async def get_route_waypoints(origin: tuple[float, float], destination: tuple[float, float]) -> list[dict[str, float]]:
	"""
	Return best-available waypoints with land-first preference.
	Fallback chain: OpenRouteService (land) -> SeaRoutingEngine -> great-circle slerp.

	Args:
		origin:      (lat, lon)
		destination: (lat, lon)
	"""
	# 1. Prefer OpenRouteService first so land trips get real road geometry.
	ors_waypoints = await _fetch_openrouteservice_waypoints(origin, destination)
	if ors_waypoints:
		return ors_waypoints

	# 2. Free OSRM public API — real road geometry, no key required.
	#    Only useful for land/road routes; silently skipped if origin/dest are at sea.
	osrm_waypoints = await _fetch_osrm_waypoints(origin, destination)
	if osrm_waypoints:
		return osrm_waypoints

	# 3. Try sea routing engine for maritime paths.
	try:
		from app.services.sea_routing_engine import get_sea_routing_engine
		engine = get_sea_routing_engine()
		# engine.get_waypoints() expects (lon, lat)
		wps = engine.get_waypoints(origin[1], origin[0], destination[1], destination[0])
		if wps and len(wps) >= 2:
			return _downsample_waypoints(wps, max_points=120)
	except Exception:
		pass

	# 3. Last fallback: great-circle geodesic line.
	return generate_route_waypoints(origin, destination)


def _generate_route_waypoints_with_deviation(
	origin: tuple[float, float],
	destination: tuple[float, float],
	deviation_lat: float,
	deviation_lng: float,
) -> list[dict[str, float]]:
	"""Generate a curved route that passes through a deviated midpoint (geodesic fallback)."""
	mid_lat = (origin[0] + destination[0]) / 2 + deviation_lat
	mid_lng = (origin[1] + destination[1]) / 2 + deviation_lng
	midpoint = (mid_lat, mid_lng)

	first_half = generate_route_waypoints(origin, midpoint, steps=10)
	second_half = generate_route_waypoints(midpoint, destination, steps=10)
	return first_half + second_half[1:]


async def generate_alternate_routes(
	origin_coords: tuple[float, float],
	destination_coords: tuple[float, float],
	current_coords: tuple[float, float] | None = None,
) -> list[dict[str, Any]]:
	"""
	Generate 3 alternate sea routes from the vessel's CURRENT position to destination.
	If current_coords is not available, falls back to origin_coords.

	Args:
		origin_coords:      (lat, lon) — port of origin (used as fallback)
		destination_coords: (lat, lon)
		current_coords:     (lat, lon) — live vessel position (preferred start)
	"""
	# Rerouting starts from where the ship IS NOW, not where it came from
	start_coords = current_coords if current_coords is not None else origin_coords

	try:
		from app.services.sea_routing_engine import DEFAULT_PASSAGES, get_sea_routing_engine
		engine = get_sea_routing_engine()
		# Engine wants (lon, lat)
		s_lon, s_lat = start_coords[1], start_coords[0]
		d_lon, d_lat = destination_coords[1], destination_coords[0]

		# Route A — standard (all major passages open)
		p_standard = dict(DEFAULT_PASSAGES)
		wps_a_raw = engine.get_waypoints(s_lon, s_lat, d_lon, d_lat, p_standard)
		wps_a = _downsample_waypoints(wps_a_raw, 120) if wps_a_raw else []
		dist_a = engine.get_route(s_lon, s_lat, d_lon, d_lat, p_standard)
		dist_a_km = dist_a['distKM'] if dist_a else 0

		# Route B — avoid Suez (forces Cape of Good Hope)
		p_no_suez = dict(DEFAULT_PASSAGES, suez=False, babelmandeb=False)
		wps_b_raw = engine.get_waypoints(s_lon, s_lat, d_lon, d_lat, p_no_suez)
		wps_b = _downsample_waypoints(wps_b_raw, 120) if wps_b_raw else wps_a
		dist_b = engine.get_route(s_lon, s_lat, d_lon, d_lat, p_no_suez)
		dist_b_km = dist_b['distKM'] if dist_b else dist_a_km

		# Route C — avoid Panama (forces Magellan or other deviation)
		p_no_panama = dict(DEFAULT_PASSAGES, panama=False)
		wps_c_raw = engine.get_waypoints(s_lon, s_lat, d_lon, d_lat, p_no_panama)
		wps_c = _downsample_waypoints(wps_c_raw, 120) if wps_c_raw else wps_a
		dist_c = engine.get_route(s_lon, s_lat, d_lon, d_lat, p_no_panama)
		dist_c_km = dist_c['distKM'] if dist_c else dist_a_km

		return [
			{
				'name': 'Optimal Remaining Route',
				'description': 'Shortest sea path from current position to destination',
				'waypoints': wps_a,
				'extra_distance_km': 0,
				'from_current': True,
				'start_lat': start_coords[0],
				'start_lon': start_coords[1],
			},
			{
				'name': 'Cape of Good Hope',
				'description': 'Avoids Suez Canal from current position — lower geopolitical risk',
				'waypoints': wps_b,
				'extra_distance_km': round(max(0, dist_b_km - dist_a_km), 1),
				'from_current': True,
				'start_lat': start_coords[0],
				'start_lon': start_coords[1],
			},
			{
				'name': 'Panama-Free Route',
				'description': 'Bypasses Panama Canal from current position',
				'waypoints': wps_c,
				'extra_distance_km': round(max(0, dist_c_km - dist_a_km), 1),
				'from_current': True,
				'start_lat': start_coords[0],
				'start_lon': start_coords[1],
			},
		]
	except Exception:
		# Engine unavailable — fall back to geodesic approximations from current position
		s_coords = current_coords if current_coords is not None else origin_coords
		accelerated_waypoints = await get_route_waypoints(s_coords, destination_coords)
		return [
			{
				'name': 'Optimal Remaining Route',
				'description': 'Best available path from current position',
				'waypoints': accelerated_waypoints,
				'extra_distance_km': 0,
				'from_current': True,
				'start_lat': s_coords[0],
				'start_lon': s_coords[1],
			},
			{
				'name': 'Northern Deviation',
				'description': 'Avoids southern congestion from current position',
				'waypoints': _generate_route_waypoints_with_deviation(s_coords, destination_coords, 4.0, 0.0),
				'extra_distance_km': 820,
				'from_current': True,
				'start_lat': s_coords[0],
				'start_lon': s_coords[1],
			},
			{
				'name': 'Southern Deviation',
				'description': 'Lower weather volatility from current position',
				'waypoints': _generate_route_waypoints_with_deviation(s_coords, destination_coords, -4.5, 0.0),
				'extra_distance_km': 740,
				'from_current': True,
				'start_lat': s_coords[0],
				'start_lon': s_coords[1],
			},
		]


def _polyline_distance_km(waypoints: list[dict[str, float]]) -> float:
	"""Sum haversine distances along all segments of a waypoint list."""
	import math
	R = 6371.0
	total = 0.0
	for i in range(len(waypoints) - 1):
		lat1 = math.radians(waypoints[i]['lat'])
		lon1 = math.radians(waypoints[i]['lng'])
		lat2 = math.radians(waypoints[i+1]['lat'])
		lon2 = math.radians(waypoints[i+1]['lng'])
		dlat = lat2 - lat1
		dlon = lon2 - lon1
		a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
		total += 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))
	return round(total, 2)


async def score_alternate_route(
	shipment_id: str,
	route_waypoints: list[dict[str, float]],
	db: Session,
	base_distance_km: float | None = None,
) -> dict[str, Any]:
	"""
	ML-score an alternate route and persist it to the DB.

	Args:
		shipment_id:      UUID string of the shipment.
		route_waypoints:  List of {lat, lng} dicts for the candidate route.
		db:               SQLAlchemy session.
		base_distance_km: Distance of the current active route (km).
		                  If omitted it is read from the shipment's active DB route.
	"""
	from app.models.shipment import Shipment

	shipment = db.query(Shipment).filter(Shipment.shipment_id == UUID(shipment_id)).first()
	if not shipment or not shipment.cargo:
		return {}

	# ── Real distance of this alternate route ────────────────────────────────
	alt_dist_km = _polyline_distance_km(route_waypoints)

	# ── Base (active / optimal) route distance ────────────────────────────────
	if base_distance_km is None:
		active_route = next((r for r in shipment.routes if r.is_active), None)
		if active_route is None and shipment.routes:
			active_route = shipment.routes[0]
		base_distance_km = float(active_route.total_distance_km) if active_route and active_route.total_distance_km else alt_dist_km

	extra_distance = max(0.0, alt_dist_km - base_distance_km)
	extra_time     = round(extra_distance / 28.0, 2)   # hrs at avg vessel speed 28 km/h
	extra_cost     = round(extra_distance * 2.4, 2)    # same $/km rate used for initial routes

	# ── Feature vector using route midpoint as current position ──────────────
	midpoint = route_waypoints[len(route_waypoints) // 2]
	features = await build_feature_vector(
		shipment_id=shipment_id,
		current_coords=(midpoint['lat'], midpoint['lng']),
		destination_port_id=str(shipment.destination_port_id),
		route_id=str(shipment.routes[0].route_id) if shipment.routes else str(shipment.shipment_id),
		cargo_sensitivity=float(shipment.cargo.cargo_sensitivity_score or 40),
		db=db,
	)

	risk_result = predict_risk_score(features)
	delay_hours = predict_delay_hours({**features, 'risk_score': risk_result['risk_score']})

	# Lower optimization score = better (lower risk + less delay + lower extra cost)
	optimization_score = (
		risk_result['risk_score'] * 0.45
		+ delay_hours * 0.35
		+ (extra_distance / 100) * 0.2
	)

	# ── Pick route type slot ────────────────────────────────────────────────
	existing_alts = db.query(Route).filter(
		Route.shipment_id == UUID(shipment_id),
		Route.route_type != RouteType.ORIGINAL,
	).count()
	alt_types = [RouteType.ALTERNATE_1, RouteType.ALTERNATE_2, RouteType.ALTERNATE_3]
	route_type = alt_types[min(existing_alts, len(alt_types) - 1)]

	# ── Persist to DB ────────────────────────────────────────────────────────
	new_route = Route(
		shipment_id=UUID(shipment_id),
		route_type=route_type,
		is_active=False,
		origin_port_id=shipment.origin_port_id,
		destination_port_id=shipment.destination_port_id,
		total_distance_km=round(alt_dist_km, 2),
		estimated_duration_hr=round(alt_dist_km / 28.0, 2),
		estimated_fuel_cost=round(alt_dist_km * 2.4, 2),
		waypoints=route_waypoints,
		risk_score_at_creation=Decimal(str(round(risk_result['risk_score'], 2))),
	)
	db.add(new_route)
	db.flush()

	return {
		'route_id':           str(new_route.route_id),
		'name':               'Alternate Route',
		'description':        'ML-scored route option',
		'dist_km':            round(alt_dist_km, 2),
		'risk_score':         Decimal(str(round(risk_result['risk_score'], 2))),
		'risk_level':         classify_risk_level(risk_result['risk_score']),
		'delay_hours':        Decimal(str(round(delay_hours, 2))),
		'extra_distance_km':  Decimal(str(round(extra_distance, 2))),
		'extra_time_hours':   Decimal(str(round(extra_time, 2))),
		'extra_cost_usd':     Decimal(str(round(extra_cost, 2))),
		'optimization_score': Decimal(str(round(optimization_score, 2))),
		'recommended':        risk_result['risk_score'] < 55,
		'waypoints':          route_waypoints,
	}
