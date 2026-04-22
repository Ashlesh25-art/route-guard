export const DUMMY_USERS = [
	{ user_id: 'USR-001', name: 'Kim Ji-ho', email: 'shipper@routeguard.com', password: 'test1234', role: 'shipper', company: 'Samsung Electronics' },
	{ user_id: 'USR-002', name: 'Sarah Chen', email: 'manager@routeguard.com', password: 'test1234', role: 'manager', company: 'GlobalFreight Corp' },
	{ user_id: 'USR-003', name: 'James Okafor', email: 'driver@routeguard.com', password: 'test1234', role: 'driver', company: 'Pacific Maritime' },
	{ user_id: 'USR-004', name: 'Anna Schmidt', email: 'receiver@routeguard.com', password: 'test1234', role: 'receiver', company: 'Amazon Logistics EU' },
];

export function dummyLogin(email, password) {
	const user = DUMMY_USERS.find((u) => u.email === email && u.password === password);
	if (!user) return null;
	return {
		user: {
			user_id: user.user_id,
			name: user.name,
			email: user.email,
			role: user.role,
			company: user.company,
		},
		token: `dummy_token_${user.role}_${Date.now()}`,
	};
}
