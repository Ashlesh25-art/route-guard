export const ENDPOINTS = {
	LOGIN: '/auth/login',
	REGISTER: '/auth/register',
	ME: '/auth/me',
	RECEIVERS: '/auth/receivers',
	MANAGERS: '/auth/managers',
	PORTS: '/auth/ports',
	PUBLIC_PORTS: '/auth/public-ports',
	VESSELS: '/auth/vessels',
	ONBOARDING_STATUS: '/auth/onboarding-status',

	CREATE_SHIPMENT: '/shipments/create',
	MY_SHIPMENTS: '/shipments/my',
	SHIPMENT_DETAIL: (id) => `/shipments/${id}`,
	UPDATE_STATUS: (id) => `/shipments/${id}/status`,
	CONSIGNMENTS: '/consignments',

	RISK_SCORE: (id) => `/shipments/${id}/risk`,
	ML_PREDICTION: (id) => `/shipments/${id}/prediction`,
	ALTERNATE_ROUTES: (id) => `/shipments/${id}/routes`,
	APPROVE_REROUTE: (id) => `/shipments/${id}/reroute`,

	ACTIVE_ALERTS: '/alerts/active',
	RESOLVE_ALERT: (id) => `/alerts/${id}/resolve`,
	MARK_ALERT_READ: (id) => `/alerts/${id}/read`,

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

	QUOTE_REQUESTS: '/quote-requests',
	QUOTE_REQUEST_DETAIL: (id) => `/quote-requests/${id}`,
	BROADCAST_QUOTE_REQUEST: (id) => `/quote-requests/${id}/broadcast`,
	QUOTE_OFFERS: (id) => `/quote-requests/${id}/offers`,
	QUOTE_MESSAGES: (id) => `/quote-requests/${id}/messages`,
	ACCEPT_OFFER: (id) => `/quote-offers/${id}/accept`,
	REJECT_OFFER: (id) => `/quote-offers/${id}/reject`,

	SHIPPER_ADDRESSES: '/shipper/addresses',
	SHIPPER_SHIPMENT_DOCS: (id) => `/shipper/shipments/${id}/documents`,
	SHIPPER_INVOICE: (id) => `/shipper/shipments/${id}/invoice`,
	SHIPPER_REVIEW: (id) => `/shipper/shipments/${id}/review`,
};
