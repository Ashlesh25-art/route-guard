export function normalizeShipment(shipment = {}) {
	const status = shipment.current_status ?? shipment.status ?? 'created';
	const origin = shipment.origin_port_name ?? shipment.origin ?? '';
	const destination = shipment.destination_port_name ?? shipment.destination ?? '';
	const currentLatitude = shipment.current_latitude ?? shipment.current_coordinates?.lat;
	const currentLongitude = shipment.current_longitude ?? shipment.current_coordinates?.lng;
	const routeWaypoints = Array.isArray(shipment.route_waypoints)
		? shipment.route_waypoints
			.filter((point) => point && point.lat !== undefined && point.lng !== undefined)
			.map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
		: [];

	return {
		...shipment,
		status,
		current_status: status,
		origin,
		destination,
		current_coordinates: currentLatitude !== undefined && currentLongitude !== undefined
			? { lat: Number(currentLatitude), lng: Number(currentLongitude) }
			: shipment.current_coordinates ?? { lat: 0, lng: 0 },
		route_waypoints: routeWaypoints,
		assigned_vessel: shipment.assigned_vessel ?? shipment.vessel_name ?? '',
		assigned_manager: shipment.assigned_manager ?? shipment.manager_name ?? '',
		assigned_driver: shipment.assigned_driver ?? shipment.driver_name ?? '',
		cargo_type: shipment.cargo_type ?? shipment.cargo?.cargo_type ?? '',
		cargo_description: shipment.cargo_description ?? shipment.cargo?.description ?? '',
		declared_value: Number(shipment.declared_value ?? shipment.cargo?.declared_value ?? 0),
		current_risk_level: shipment.current_risk_level ?? 'low',
		current_risk_score: Number(shipment.current_risk_score ?? 0),
	};
}