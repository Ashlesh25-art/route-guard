export const ENDPOINTS = {
	LOGIN: '/auth/login',
	REGISTER: '/auth/register',
	ME: '/auth/me',
	RECEIVERS: '/auth/receivers',
	MANAGERS: '/auth/managers',
	PORTS: '/auth/ports',
	VESSELS: '/auth/vessels',

	CREATE_SHIPMENT: '/shipments/create',
	MY_SHIPMENTS: '/shipments/my',
	SHIPMENT_DETAIL: (id) => `/shipments/${id}`,
	UPDATE_STATUS: (id) => `/shipments/${id}/status`,

	RISK_SCORE: (id) => `/shipments/${id}/risk`,
	ML_PREDICTION: (id) => `/shipments/${id}/prediction`,
	ALTERNATE_ROUTES: (id) => `/shipments/${id}/routes`,
	APPROVE_REROUTE: (id) => `/shipments/${id}/reroute`,

	ACTIVE_ALERTS: '/alerts/active',
	RESOLVE_ALERT: (id) => `/alerts/${id}/resolve`,

	MANAGER_SUMMARY: '/manager/summary',
	MANAGER_DRIVERS: '/manager/drivers',
	ALL_SHIPMENTS: '/manager/shipments',
	PORT_STATUS: '/manager/ports',
	ASSIGN_RESOURCES: (id) => `/manager/shipments/${id}/assign`,

	OVERVIEW: '/analytics/overview',
	MODEL_ACCURACY: '/analytics/accuracy',

	CONFIRM_DELIVERY: (id) => `/shipments/${id}/deliver`,

	MY_ASSIGNMENT: '/driver/assignment',
	REPORT_INCIDENT: (id) => `/driver/shipments/${id}/incident`,
};
