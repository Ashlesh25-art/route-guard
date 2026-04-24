import { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, MapPin, Package, Clock, User, Ship, Truck, CheckCircle2, CircleDot, Circle, Shield, Anchor, ClipboardCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';

function fmtStatus(s) {
	return s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}
function fmtDate(iso) {
	if (!iso) return '—';
	try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}
function fmtRelativeDate(iso) {
	if (!iso) return '';
	try {
		const diffMins = Math.floor((new Date() - new Date(iso)) / 60000);
		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHrs = Math.floor(diffMins / 60);
		if (diffHrs < 24) return `${diffHrs}h ago`;
		return `${Math.floor(diffHrs / 24)}d ago`;
	} catch { return ''; }
}

const STATUS_SEQUENCE = ['created', 'picked_up', 'in_transit', 'at_port', 'customs', 'delivered'];
const STATUS_META = {
	created: { label: 'Order Created', icon: Package, color: '#94a3b8', desc: 'Shipment order was placed by sender' },
	picked_up: { label: 'Picked Up', icon: Truck, color: '#3b82f6', desc: 'Package collected from sender' },
	in_transit: { label: 'In Transit', icon: Ship, color: '#0ea5e9', desc: 'Shipment is on the way to you' },
	at_port: { label: 'At Port', icon: Anchor, color: '#f59e0b', desc: 'Arrived at destination port' },
	customs: { label: 'Customs Clearance', icon: Shield, color: '#a855f7', desc: 'Going through customs' },
	delivered: { label: 'Delivered', icon: CheckCircle2, color: '#22c55e', desc: 'Package delivered to you' },
	delayed: { label: 'Delayed', icon: AlertTriangle, color: '#ef4444', desc: 'Shipment is delayed' },
	cancelled: { label: 'Cancelled', icon: Circle, color: '#6b7280', desc: 'Shipment was cancelled' },
};

function riskColor(level) {
	const l = String(level || '').toLowerCase();
	if (l === 'critical') return '#ef4444';
	if (l === 'high') return '#f97316';
	if (l === 'medium') return '#eab308';
	return '#22c55e';
}

/* ── Route Map ─────────────────────────────────────────────────────────── */
function RouteMap({ shipment }) {
	const waypoints = shipment.route_waypoints || [];
	if (!waypoints.length) return null;
	const positions = waypoints.map(p => [Number(p.lat), Number(p.lng)]);
	const currentPos = shipment.current_latitude && shipment.current_longitude
		? [Number(shipment.current_latitude), Number(shipment.current_longitude)] : null;
	const center = currentPos || positions[Math.floor(positions.length / 2)];

	return (
		<div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
			<div style={{ padding: '16px 20px 0', fontSize: 14, fontWeight: 700 }}>Live Route Map</div>
			<div style={{ height: 260, marginTop: 12 }}>
				<MapContainer center={center} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
					<TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; OSM &copy; CARTO" />
					<Polyline positions={positions} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.8, dashArray: '8 4' }} />
					<CircleMarker center={positions[0]} radius={7} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }}>
						<Tooltip direction="top" offset={[0, -8]}><strong>{shipment.origin_port_name || 'Origin'}</strong></Tooltip>
					</CircleMarker>
					<CircleMarker center={positions[positions.length - 1]} radius={7} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}>
						<Tooltip direction="top" offset={[0, -8]}><strong>{shipment.destination_port_name || 'Destination'}</strong></Tooltip>
					</CircleMarker>
					{currentPos && (
						<CircleMarker center={currentPos} radius={10} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3 }}>
							<Tooltip permanent direction="top" offset={[0, -12]}><strong>Current Position</strong></Tooltip>
						</CircleMarker>
					)}
				</MapContainer>
			</div>
		</div>
	);
}

/* ── Timeline Step ─────────────────────────────────────────────────────── */
function TimelineStep({ status, label, description, timestamp, notes, updatedBy, isCompleted, isCurrent, isLast, color }) {
	const StepIcon = STATUS_META[status]?.icon || CircleDot;
	return (
		<div style={{ display: 'flex', gap: 16, minHeight: isLast ? 'auto' : 72 }}>
			<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
				<div style={{
					width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
					background: isCompleted || isCurrent ? `${color}18` : 'var(--bg-elevated)',
					border: `2px solid ${isCompleted || isCurrent ? color : 'var(--border-default)'}`,
					color: isCompleted || isCurrent ? color : 'var(--text-muted)',
					boxShadow: isCurrent ? `0 0 12px ${color}40` : 'none',
					animation: isCurrent ? 'pulse 2s infinite' : 'none',
				}}>
					<StepIcon size={16} />
				</div>
				{!isLast && <div style={{ width: 2, flex: 1, marginTop: 4, background: isCompleted ? `linear-gradient(180deg, ${color}, ${color}60)` : 'var(--border-default)', borderRadius: 1 }} />}
			</div>
			<div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
					<span style={{ fontSize: 14, fontWeight: 700, color: isCompleted || isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
					{isCurrent && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: `${color}20`, color, fontWeight: 700, textTransform: 'uppercase' }}>Current</span>}
				</div>
				<div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{description}</div>
				{timestamp && (
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
						<Clock size={11} /><span>{fmtDate(timestamp)}</span><span style={{ color: 'var(--text-muted)' }}>• {fmtRelativeDate(timestamp)}</span>
					</div>
				)}
				{notes && notes !== 'Order created' && (
					<div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', borderLeft: `3px solid ${color}` }}>
						{notes}{updatedBy && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {updatedBy}</span>}
					</div>
				)}
			</div>
		</div>
	);
}

function InfoRow({ label, value, mono }) {
	return (
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
			<span style={{ color: 'var(--text-secondary)' }}>{label}</span>
			<span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value ?? '—'}</span>
		</div>
	);
}

/* ── Main Component ────────────────────────────────────────────────────── */
export default function ReceiverOrderDetail() {
	const navigate = useNavigate();
	const { id } = useParams();
	const [shipment, setShipment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		(async () => {
			setLoading(true);
			try { setShipment((await api.get(ENDPOINTS.SHIPMENT_DETAIL(id))).data); }
			catch { setError('Unable to load shipment details.'); }
			finally { setLoading(false); }
		})();
	}, [id]);

	if (loading) return <div className="card" style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}><Spinner size="lg" /></div>;
	if (error || !shipment) return (
		<div className="card" style={{ textAlign: 'center', padding: 40 }}>
			<div style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>{error || 'Shipment not found'}</div>
			<button className="btn-outline" onClick={() => navigate('/receiver')}>← Back</button>
		</div>
	);

	const currentStatus = shipment.current_status || 'created';
	const statusHistory = shipment.status_history || [];
	const historyMap = {};
	for (const h of statusHistory) historyMap[h.status] = h;

	const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
	const isDelayed = currentStatus === 'delayed';
	const canConfirm = ['at_port', 'customs', 'delivered', 'in_transit'].includes(currentStatus);

	const timelineItems = STATUS_SEQUENCE.map((status, idx) => {
		const meta = STATUS_META[status] || {};
		const historyEntry = historyMap[status];
		const isCompleted = currentIndex >= 0 ? idx < currentIndex : false;
		const isCurrent = isDelayed ? status === 'in_transit' : status === currentStatus;
		return {
			status, label: meta.label || fmtStatus(status), description: meta.desc || '', color: meta.color || '#94a3b8',
			timestamp: historyEntry?.timestamp || null, notes: historyEntry?.notes || null, updatedBy: historyEntry?.updated_by || null,
			isCompleted: isCompleted || (status === 'created'), isCurrent,
		};
	});

	if (isDelayed) {
		const delayEntry = historyMap['delayed'];
		const insertIdx = timelineItems.findIndex(t => t.isCurrent);
		if (insertIdx >= 0) {
			timelineItems.splice(insertIdx + 1, 0, {
				status: 'delayed', label: STATUS_META.delayed.label,
				description: `Shipment delayed${shipment.actual_delay_hours ? ` by ${Number(shipment.actual_delay_hours).toFixed(1)} hours` : ''}`,
				color: STATUS_META.delayed.color, timestamp: delayEntry?.timestamp || null,
				notes: delayEntry?.notes || null, updatedBy: delayEntry?.updated_by || null,
				isCompleted: false, isCurrent: true,
			});
			timelineItems[insertIdx].isCurrent = false;
			timelineItems[insertIdx].isCompleted = true;
		}
	}

	// ETA calculation
	const eta = shipment.expected_arrival ? new Date(shipment.expected_arrival) : null;
	const now = new Date();
	let etaText = '—';
	if (currentStatus === 'delivered') etaText = 'Delivered';
	else if (eta) {
		const diffH = Math.round((eta - now) / 3600000);
		if (diffH < 0) etaText = `${Math.abs(diffH)}h overdue`;
		else if (diffH < 24) etaText = `~${diffH}h remaining`;
		else etaText = `~${Math.round(diffH / 24)}d remaining`;
	}

	return (
		<div style={{ animation: 'fadeIn 0.4s ease' }}>
			{/* Header */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
				<div>
					<button className="btn-outline" onClick={() => navigate('/receiver')} style={{ marginBottom: 12, fontSize: 12, padding: '6px 14px' }}>
						<ArrowLeft size={14} /> Back to Incoming
					</button>
					<h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Receiving Order</h1>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
						<span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>{shipment.tracking_number}</span>
						<span style={{
							fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase',
							background: `${STATUS_META[currentStatus]?.color || '#94a3b8'}18`,
							color: STATUS_META[currentStatus]?.color || '#94a3b8',
							border: `1px solid ${STATUS_META[currentStatus]?.color || '#94a3b8'}40`,
						}}>{fmtStatus(currentStatus)}</span>
						{shipment.current_risk_level && (
							<span style={{
								fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase',
								background: `${riskColor(shipment.current_risk_level)}18`,
								color: riskColor(shipment.current_risk_level),
								border: `1px solid ${riskColor(shipment.current_risk_level)}40`,
							}}>{shipment.current_risk_level} risk</span>
						)}
					</div>
				</div>
				{/* ETA card */}
				<div style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.08)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)', textAlign: 'center' }}>
					<div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Estimated Arrival</div>
					<div className="mono" style={{ fontSize: 15, fontWeight: 700, color: currentStatus === 'delivered' ? '#22c55e' : '#3b82f6' }}>{etaText}</div>
					{eta && currentStatus !== 'delivered' && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(shipment.expected_arrival)}</div>}
				</div>
			</div>

			{/* Route Summary Bar */}
			<div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
					<div style={{ textAlign: 'center' }}>
						<div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>FROM</div>
						<div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>
							<MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{shipment.origin_port_name}
						</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
						<div style={{ width: 60, height: 2, background: 'var(--border-default)' }} />
						<Ship size={20} style={{ color: 'var(--accent-primary)' }} />
						<div style={{ width: 60, height: 2, background: 'var(--border-default)' }} />
					</div>
					<div style={{ textAlign: 'center' }}>
						<div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TO (You)</div>
						<div style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6' }}>
							<MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{shipment.destination_port_name}
						</div>
					</div>
				</div>
			</div>

			{/* Confirm Delivery CTA */}
			{canConfirm && currentStatus !== 'delivered' && (
				<div className="card" style={{ marginBottom: 16, padding: '16px 20px', borderLeft: '3px solid #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Ready to confirm delivery?</div>
						<div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Verify the shipment and confirm receipt</div>
					</div>
					<button className="btn-success" onClick={() => navigate(`/receiver/shipments/${id}/confirm`)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<ClipboardCheck size={16} /> Confirm Delivery
					</button>
				</div>
			)}

			{/* Main Grid */}
			<div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 16 }}>
				{/* LEFT — Timeline + Map */}
				<div>
					<div className="card" style={{ marginBottom: 16 }}>
						<div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
							<Clock size={18} style={{ color: 'var(--accent-primary)' }} /> Shipment Timeline
						</div>
						{timelineItems.map((item, idx) => <TimelineStep key={`${item.status}-${idx}`} {...item} isLast={idx === timelineItems.length - 1} />)}
					</div>
					<RouteMap shipment={shipment} />
				</div>

				{/* RIGHT — Details */}
				<div>
					<div className="card" style={{ marginBottom: 16 }}>
						<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
							<Package size={16} style={{ color: 'var(--accent-primary)' }} /> Shipment Information
						</div>
						<InfoRow label="Tracking Number" value={shipment.tracking_number} mono />
						<InfoRow label="Departure" value={fmtDate(shipment.departure_time)} />
						<InfoRow label="Expected Arrival" value={fmtDate(shipment.expected_arrival)} />
						{shipment.actual_arrival && <InfoRow label="Actual Arrival" value={fmtDate(shipment.actual_arrival)} />}
						{shipment.actual_delay_hours != null && Number(shipment.actual_delay_hours) > 0 && (
							<InfoRow label="Delay" value={<span style={{ color: 'var(--danger)' }}>{Number(shipment.actual_delay_hours).toFixed(1)}h</span>} />
						)}
						{shipment.current_risk_score != null && (
							<InfoRow label="Risk Score" value={<span style={{ color: riskColor(shipment.current_risk_level), fontWeight: 700 }}>{Number(shipment.current_risk_score).toFixed(1)}</span>} />
						)}
					</div>

					{(shipment.cargo_type || shipment.cargo_description) && (
						<div className="card" style={{ marginBottom: 16 }}>
							<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
								<Package size={16} style={{ color: '#f59e0b' }} /> Cargo Details
							</div>
							<InfoRow label="Type" value={fmtStatus(shipment.cargo_type)} />
							{shipment.cargo_description && <InfoRow label="Description" value={shipment.cargo_description} />}
							{shipment.declared_value != null && <InfoRow label="Declared Value" value={`$${Number(shipment.declared_value).toLocaleString()}`} />}
							{shipment.cargo_sensitivity_score != null && <InfoRow label="Sensitivity" value={<span className="mono" style={{ fontWeight: 700 }}>{Number(shipment.cargo_sensitivity_score).toFixed(1)}</span>} />}
						</div>
					)}

					<div className="card" style={{ marginBottom: 16 }}>
						<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
							<User size={16} style={{ color: '#a855f7' }} /> Parties
						</div>
						<InfoRow label="Sender" value={shipment.shipper_name} />
						<InfoRow label="Receiver (You)" value={shipment.receiver_name} />
						<InfoRow label="Manager" value={shipment.manager_name} />
						{shipment.driver_name && <InfoRow label="Driver" value={shipment.driver_name} />}
						{shipment.vessel_name && <InfoRow label="Vessel" value={shipment.vessel_name} />}
					</div>
				</div>
			</div>
		</div>
	);
}
