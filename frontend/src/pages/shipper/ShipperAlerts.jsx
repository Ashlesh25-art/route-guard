import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function formatDateTime(value) {
	if (!value) return '';
	try {
		return new Date(value).toLocaleString();
	} catch {
		return String(value);
	}
}

export default function ShipperAlerts() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [alerts, setAlerts] = useState([]);
	const [error, setError] = useState('');

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError('');
			try {
				const response = await api.get(ENDPOINTS.ACTIVE_ALERTS);
				const rows = Array.isArray(response.data) ? response.data : response.data?.alerts || [];
				setAlerts(rows);
			} catch {
				setError('Unable to load alerts.');
				setAlerts([]);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	if (loading) {
		return (
			<div className="card" style={{ minHeight: 220, display: 'grid', placeItems: 'center' }}>
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Alerts</h1>
					<p className="page-subtitle">Operational notifications for your quote requests and consignments.</p>
				</div>
			</div>

			{error ? (
				<div className="card" style={{ marginBottom: 14 }}>
					<strong>{error}</strong>
				</div>
			) : null}

			{alerts.length === 0 ? (
				<EmptyState icon={BellRing} title="No active alerts" description="You are all clear for now." />
			) : (
				<div className="grid-two">
					{alerts.map((alert) => (
						<div key={alert.alert_id} className="card" style={{ padding: 14 }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
								<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
									{String(alert.alert_type || 'ALERT').toUpperCase()}
								</div>
								<div
									style={{
										fontSize: 10,
										fontWeight: 700,
										padding: '2px 8px',
										borderRadius: 10,
										textTransform: 'uppercase',
										background:
											String(alert.severity || '').toLowerCase() === 'critical'
												? 'rgba(239, 68, 68, 0.2)'
												: String(alert.severity || '').toLowerCase() === 'high'
													? 'rgba(249, 115, 22, 0.2)'
													: 'rgba(34, 197, 94, 0.2)',
										color:
											String(alert.severity || '').toLowerCase() === 'critical'
												? '#ef4444'
												: String(alert.severity || '').toLowerCase() === 'high'
													? '#f97316'
													: '#22c55e',
									}}
								>
									{String(alert.severity || 'info')}
								</div>
							</div>
							<div style={{ fontWeight: 700, marginBottom: 6 }}>{alert.message}</div>
							<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
								Order: {alert.tracking_number || alert.shipment_id || 'N/A'}
							</div>
							<div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
								{formatDateTime(alert.created_at)}
							</div>
							{alert.shipment_id ? (
								<div style={{ marginTop: 10 }}>
									<button
										type="button"
										className="btn-outline"
										style={{ padding: '8px 10px' }}
										onClick={() => navigate(`/shipper/shipments/${alert.shipment_id}`)}
									>
										Open Order
									</button>
								</div>
							) : null}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
