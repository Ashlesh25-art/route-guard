import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, Package, PackagePlus, RotateCw, ShieldAlert, Truck } from 'lucide-react';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ShipmentCard from '../../components/shipments/ShipmentCard';
import ShipmentTable from '../../components/shipments/ShipmentTable';
import Spinner from '../../components/ui/Spinner';
import { normalizeShipment } from '../../utils/shipmentView';

function StatCard({ icon: Icon, label, value, subtitle }) {
	return (
		<div className="card" style={{ padding: 16, borderTop: '3px solid var(--accent)' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
				<div style={{ padding: 8, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
					<Icon size={20} style={{ color: 'var(--accent)' }} />
				</div>
			</div>
			<p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
			<p style={{ fontSize: 32, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>{value}</p>
			<p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>
		</div>
	);
}

export default function ShipperOrders() {
	const navigate = useNavigate();
	const [shipments, setShipments] = useState([]);
	const [quoteRequests, setQuoteRequests] = useState([]);
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError('');
			try {
				const [shipmentsRes, alertsRes, requestsRes] = await Promise.all([
					api.get(ENDPOINTS.CONSIGNMENTS).catch(() => api.get(ENDPOINTS.MY_SHIPMENTS)),
					api.get(ENDPOINTS.ACTIVE_ALERTS),
					api.get(ENDPOINTS.QUOTE_REQUESTS).catch(() => ({ data: [] })),
				]);
				const shipmentsPayload = shipmentsRes.data;
				if (Array.isArray(shipmentsPayload)) {
					setShipments(shipmentsPayload);
				} else if (shipmentsPayload && typeof shipmentsPayload === 'object') {
					const merged = [
						...(shipmentsPayload.pending || []),
						...(shipmentsPayload.in_transit || []),
						...(shipmentsPayload.completed || []),
						...(shipmentsPayload.delayed || []),
						...(shipmentsPayload.cancelled || []),
					];
					setShipments(merged);
				} else {
					setShipments([]);
				}
				setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : alertsRes.data?.alerts || []);
				setQuoteRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
			} catch {
				setShipments([]);
				setAlerts([]);
				setQuoteRequests([]);
				setError('Unable to load sender orders.');
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const orders = useMemo(() => shipments.map(normalizeShipment), [shipments]);
	const activeOrders = useMemo(() => orders.filter((item) => !['delivered', 'cancelled'].includes(item.status)), [orders]);
	const delayedOrders = useMemo(
		() => orders.filter((item) => item.status === 'delayed' || Number(item.actual_delay_hours || 0) > 0),
		[orders],
	);
	const deliveredOrders = useMemo(
		() => orders.filter((item) => item.status === 'delivered'),
		[orders],
	);
	const openQuoteRequests = useMemo(
		() => quoteRequests.filter((request) => !['accepted', 'cancelled', 'converted'].includes(String(request.status || '').toLowerCase())),
		[quoteRequests],
	);
	const orderAlerts = useMemo(
		() => alerts.filter((alert) => orders.some((order) => order.shipment_id === alert.shipment_id)),
		[alerts, orders],
	);

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
					<h1 className="page-title">Sender Orders</h1>
					<p className="page-subtitle">Create orders, track every shipment, and watch delayed deliveries.</p>
				</div>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					{delayedOrders.length > 0 ? <Badge level="high">{delayedOrders.length} delayed</Badge> : <Badge level="low">All clear</Badge>}
					<button type="button" className="btn-primary" onClick={() => navigate('/shipper/create')}>
						<PackagePlus size={16} />
						Create Order
					</button>
				</div>
			</div>

			{error ? (
				<div className="card" style={{ marginBottom: 14 }}>
					<strong>{error}</strong>
					<div className="page-subtitle">Check the backend connection and try again.</div>
				</div>
			) : null}

			<div className="card" style={{ marginBottom: 20 }}>
				<h2 className="section-title">Sender Workflow Sections</h2>
				<div className="grid-three" style={{ marginTop: 10 }}>
					<div className="card" style={{ padding: 12 }}>
						<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Step 1</div>
						<div style={{ fontWeight: 700, marginBottom: 6 }}>Select From and To</div>
						<div className="page-subtitle">Choose origin and destination ports when creating the order.</div>
					</div>
					<div className="card" style={{ padding: 12 }}>
						<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Step 2</div>
						<div style={{ fontWeight: 700, marginBottom: 6 }}>Broadcast For Quotes</div>
						<div className="page-subtitle">Send your request to matching logistics providers and wait for offers.</div>
					</div>
					<div className="card" style={{ padding: 12 }}>
						<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Step 3</div>
						<div style={{ fontWeight: 700, marginBottom: 6 }}>Negotiate Then Confirm</div>
						<div className="page-subtitle">Use Chat to negotiate offers, accept one, and move it to consignments.</div>
					</div>
				</div>
				<div style={{ marginTop: 12 }}>
					<button type="button" className="btn-primary" onClick={() => navigate('/shipper/create')}>
						<PackagePlus size={16} />
						Open Create Order
					</button>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
				<StatCard icon={Package} label="All Orders" value={orders.length} subtitle="Current and historical shipments" />
				<StatCard icon={Truck} label="Active Orders" value={activeOrders.length} subtitle="Still in transit or pending" />
				<StatCard icon={Clock3} label="Delayed Orders" value={delayedOrders.length} subtitle="Need attention now" />
				<StatCard icon={ShieldAlert} label="Open Quotes" value={openQuoteRequests.length} subtitle="Waiting for offer decision" />
			</div>

			{openQuoteRequests.length > 0 ? (
				<div className="card" style={{ marginBottom: 20 }}>
					<h2 className="section-title">Open Quote Requests</h2>
					<p className="page-subtitle" style={{ marginBottom: 10 }}>You have {openQuoteRequests.length} active requests. Continue in Chat to review offers.</p>
					<button type="button" className="btn-primary" onClick={() => navigate('/shipper/chat')}>
						Open Negotiation Chat
					</button>
				</div>
			) : null}

			{delayedOrders.length > 0 ? (
				<div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
					<div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
						<AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
						<div>
							<h3 className="section-title" style={{ marginBottom: 6 }}>Delay Watch</h3>
							<p className="page-subtitle">These orders are delayed. Your shipment detail page will also show live alerts for them.</p>
						</div>
					</div>
					<div className="grid-two" style={{ marginTop: 14 }}>
						{delayedOrders.map((shipment) => (
							<div key={shipment.shipment_id} className="card" style={{ padding: 14 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
									<div>
										<div className="mono" style={{ fontWeight: 700 }}>{shipment.tracking_number}</div>
										<div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{shipment.origin} to {shipment.destination}</div>
									</div>
									<Badge level="high">Delayed</Badge>
								</div>
								<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
									{Number(shipment.actual_delay_hours || 0).toFixed(1)}h delayed{shipment.current_risk_level ? ` · ${shipment.current_risk_level} risk` : ''}
								</div>
								<button type="button" className="btn-outline" onClick={() => navigate(`/shipper/shipments/${shipment.shipment_id}`)}>
									View order details
								</button>
							</div>
						))}
					</div>
				</div>
			) : null}

			<div style={{ marginBottom: 20 }}>
				<h2 className="section-title">Current Orders</h2>
				{activeOrders.length ? (
					<div className="grid-two">
						{activeOrders.map((shipment) => (
							<ShipmentCard
								key={shipment.shipment_id}
								shipment={shipment}
								actionLabel="Details"
								onTrack={(shipmentId) => navigate(`/shipper/shipments/${shipmentId}`)}
							/>
						))}
					</div>
				) : (
					<EmptyState
						icon={Package}
						title="No active orders"
						description="Create a shipment to start tracking current orders."
						action={
							<button type="button" className="btn-primary" onClick={() => navigate('/shipper/create')}>
								Create Order
							</button>
						}
					/>
				)}
			</div>

			<div>
				<h2 className="section-title">All Orders</h2>
				{orders.length ? (
					<ShipmentTable
						shipments={orders}
						hideScore={false}
						onTrack={(shipmentId) => navigate(`/shipper/shipments/${shipmentId}`)}
					/>
				) : (
					<EmptyState
						icon={RotateCw}
						title="No orders yet"
						description="Your sender orders will appear here after creation."
						action={
							<button type="button" className="btn-primary" onClick={() => navigate('/shipper/create')}>
								Create Order
							</button>
						}
					/>
				)}
			</div>

			{deliveredOrders.length > 0 ? (
				<div style={{ marginTop: 20 }}>
					<h2 className="section-title">Delivered Orders</h2>
					<div className="grid-two">
						{deliveredOrders.slice(0, 4).map((shipment) => (
							<div key={shipment.shipment_id} className="card" style={{ padding: 14 }}>
								<div className="mono" style={{ fontWeight: 700, marginBottom: 4 }}>{shipment.tracking_number}</div>
								<div className="page-subtitle" style={{ marginBottom: 8 }}>{shipment.origin} to {shipment.destination}</div>
								<div style={{ display: 'flex', gap: 8 }}>
									<button
										type="button"
										className="btn-outline"
										onClick={() => navigate(`/shipper/spending?tab=ratings&shipment=${shipment.shipment_id}`)}
									>
										Rate Carrier
									</button>
									<button
										type="button"
										className="btn-outline"
										onClick={() => navigate('/shipper/spending')}
									>
										View Invoice
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			) : null}

			{orderAlerts.length > 0 ? (
				<div style={{ marginTop: 20 }}>
					<h2 className="section-title">Latest Shipment Notifications</h2>
					<div className="grid-two">
						{orderAlerts.slice(0, 4).map((alert) => (
							<div key={alert.alert_id} className="card" style={{ padding: 14 }}>
								<div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{alert.alert_type}</div>
								<div style={{ fontWeight: 600, marginBottom: 8 }}>{alert.message}</div>
								<button type="button" className="btn-outline" onClick={() => alert.shipment_id && navigate(`/shipper/shipments/${alert.shipment_id}`)}>
									Open order
								</button>
							</div>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
