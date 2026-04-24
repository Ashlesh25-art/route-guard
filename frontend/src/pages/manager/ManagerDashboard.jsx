import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import CargoTrackMap from '../../components/map/CargoTrackMap';
import DemoModeBanner from '../../components/ui/DemoModeBanner';
import Spinner from '../../components/ui/Spinner';

// ── Theme ────────────────────────────────────────────────────────────────────
const T = {
	navy: '#080E1A',
	card: '#0D1526',
	border: '#1A2A45',
	teal: '#00D4B4',
	cyan: '#22D3EE',
	amber: '#F59E0B',
	red: '#EF4444',
	green: '#10B981',
	white: '#F0F4FF',
	gray: '#8A9BB5',
	grayDim: '#4A5F7A',
};

// ── Inline CSS ────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  .mono{font-family:'JetBrains Mono',monospace;}
  .orb{font-family:'Orbitron',monospace;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
  @keyframes countUp{from{opacity:0;transform:scale(0.85);}to{opacity:1;transform:scale(1);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  .card-animate{animation:fadeUp 0.5s ease both;}
  .live-dot{width:8px;height:8px;background:${T.green};border-radius:50%;animation:pulse 2s infinite;display:inline-block;}
  .kpi-card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;overflow:hidden;animation:countUp .6s ease both;position:relative;}
  .kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
  .kpi-card.teal::before{background:linear-gradient(90deg,${T.teal},transparent);}
  .kpi-card.amber::before{background:linear-gradient(90deg,${T.amber},transparent);}
  .kpi-card.green::before{background:linear-gradient(90deg,${T.green},transparent);}
  .kpi-card.red::before{background:linear-gradient(90deg,${T.red},transparent);}
  .chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;}
  .chip-teal{background:rgba(0,212,180,.15);color:${T.teal};border:1px solid rgba(0,212,180,.3);}
  .chip-amber{background:rgba(245,158,11,.15);color:${T.amber};border:1px solid rgba(245,158,11,.3);}
  .chip-red{background:rgba(239,68,68,.15);color:${T.red};border:1px solid rgba(239,68,68,.3);}
  .chip-green{background:rgba(16,185,129,.15);color:${T.green};border:1px solid rgba(16,185,129,.3);}
  .chip-gray{background:rgba(138,155,181,.1);color:${T.gray};border:1px solid rgba(138,155,181,.2);}
  .btn-primary{background:linear-gradient(135deg,${T.teal},${T.cyan});color:#000;font-weight:700;font-size:13px;padding:10px 22px;border:none;border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif;}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,212,180,.35);}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .btn-ghost{background:transparent;color:${T.teal};font-weight:600;font-size:13px;padding:9px 20px;border:1px solid ${T.teal};border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif;}
  .btn-ghost:hover{background:rgba(0,212,180,.08);}
  .card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;transition:all .2s;}
  .card:hover{border-color:rgba(0,212,180,.28);}
  .alert-card{background:${T.card};border:1px solid ${T.red};border-radius:8px;padding:14px;}
  .risk-dot{width:10px;height:10px;background:${T.red};border-radius:50%;animation:pulse 1.5s infinite;}
  .section-label{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${T.grayDim};margin-bottom:12px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .number-big{font-family:'Orbitron',monospace;font-size:28px;font-weight:700;}
  .progress-bar{height:6px;background:${T.border};border-radius:3px;overflow:hidden;}
  .progress-fill{height:100%;background:linear-gradient(90deg,${T.teal},${T.cyan});transition:width 0.5s ease;}
  .empty-state{text-align:center;padding:40px 20px;color:${T.gray};}
`;

// ── Tiny Icon SVG ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor' }) => {
	const icons = {
		activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
		truck: <><rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
		user: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z" />,
		alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
		zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
		clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
		check: <polyline points="20 6 9 17 4 12" />,
		package: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></>,
		refresh: <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></>,
		route: <><circle cx="12" cy="12" r="10" /><polyline points="12 8 12 12 15 15" /></>,
	};
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			{icons[name]}
		</svg>
	);
};

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const Chip = ({ label, variant = 'teal', dot = false }) => (
	<span className={`chip chip-${variant}`}>
		{dot && <span style={{ width: 6, height: 6, background: 'currentColor', borderRadius: '50%', display: 'inline-block' }} />}
		{label}
	</span>
);

const KpiCard = ({ label, value, sub, variant = 'teal', icon, delay = 0 }) => (
	<div className={`kpi-card ${variant}`} style={{ animationDelay: `${delay}ms` }}>
		<div style={{ display: 'flex', justifyContent: 'space-between' }}>
			<div>
				<div style={{ fontSize: 11, color: T.gray, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
				<div className="number-big" style={{ color: variant === 'teal' ? T.teal : variant === 'amber' ? T.amber : variant === 'green' ? T.green : T.red }}>{value}</div>
				<div style={{ fontSize: 12, color: T.gray, marginTop: 6 }}>{sub}</div>
			</div>
			<Icon name={icon} size={20} color={variant === 'teal' ? T.teal : variant === 'amber' ? T.amber : variant === 'green' ? T.green : T.red} />
		</div>
	</div>
);

// ── Nav Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
	{ id: 'dashboard', label: 'Control Tower', icon: 'activity' },
	{ id: 'shipments', label: 'Live Shipments', icon: 'truck' },
	{ id: 'consignments', label: 'Consignments', icon: 'package' },
	{ id: 'drivers', label: 'Driver Pool', icon: 'user' },
	{ id: 'optimize', label: 'AI Optimizer', icon: 'zap' },
	{ id: 'alerts', label: 'Risk Alerts', icon: 'alert' },
];

const NavTabs = ({ activeTab, onTabChange }) => (
	<div style={{ display: 'flex', gap: 8, padding: '16px 32px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
		{TABS.map((tab) => {
			const active = activeTab === tab.id;
			return (
				<button
					key={tab.id}
					id={`tab-${tab.id}`}
					onClick={() => onTabChange(tab.id)}
					style={{
						display: 'flex', alignItems: 'center', gap: 8,
						padding: '10px 16px',
						border: active ? `2px solid ${T.teal}` : `1px solid ${T.border}`,
						background: active ? `rgba(0,212,180,.1)` : 'transparent',
						color: active ? T.teal : T.gray,
						borderRadius: 8, cursor: 'pointer', fontSize: 12,
						fontWeight: active ? 700 : 500, transition: 'all 0.2s',
						fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap',
					}}
				>
					<Icon name={tab.icon} size={14} color="currentColor" />
					{tab.label}
				</button>
			);
		})}
	</div>
);

// ── DUMMY FALLBACKS (used only when backend unreachable) ──────────────────────
const DUMMY_SUMMARY = {
	active_shipments: 14, high_risk_count: 3, delayed_count: 2,
	on_time_percentage: 87.3, total_drivers: 26, active_drivers: 23,
	rerouted_this_week: 4, financial_saved_usd: 244000,
};
const DUMMY_SHIPMENTS = [
	{ shipment_id: 'demo-1', tracking_number: 'ORD-2842', current_status: 'pending', current_risk_level: 'high', current_risk_score: 78, origin_port_id: null, destination_port_id: null, _origin: 'Mumbai', _dest: 'Aurangabad' },
	{ shipment_id: 'demo-2', tracking_number: 'ORD-2841', current_status: 'in_transit', current_risk_level: 'medium', current_risk_score: 54, origin_port_id: null, destination_port_id: null, _origin: 'Pune', _dest: 'Nashik' },
	{ shipment_id: 'demo-3', tracking_number: 'ORD-2843', current_status: 'in_transit', current_risk_level: 'low', current_risk_score: 21, origin_port_id: null, destination_port_id: null, _origin: 'Bangalore', _dest: 'Hyderabad' },
];
const DUMMY_DRIVERS = [
	{ user_id: 'd1', full_name: 'Ravi Naik', status: 'available', active_shipments: 0, phone_number: '+91-9820000001' },
	{ user_id: 'd2', full_name: 'Suresh Mehta', status: 'en-route', active_shipments: 2, phone_number: '+91-9820000002' },
	{ user_id: 'd3', full_name: 'Pradeep Rao', status: 'en-route', active_shipments: 1, phone_number: '+91-9820000003' },
];
const DUMMY_ALERTS = [
	{ alert_id: 'a1', severity: 'critical', message: 'Traffic Congestion on MH-48 — ORD-2841 ETA +45 min', tracking_number: 'ORD-2841', created_at: new Date().toISOString(), is_resolved: false },
	{ alert_id: 'a2', severity: 'high', message: 'Weather Alert: Heavy rain in Nashik region', tracking_number: 'ORD-2841', created_at: new Date().toISOString(), is_resolved: false },
	{ alert_id: 'a3', severity: 'medium', message: 'Low Fuel Warning — Driver Pradeep, 12% remaining', tracking_number: 'ORD-2840', created_at: new Date().toISOString(), is_resolved: false },
];

// ── RISK helpers ──────────────────────────────────────────────────────────────
function riskVariant(level) {
	if (!level) return 'gray';
	const l = String(level).toLowerCase();
	if (l === 'critical' || l === 'high') return 'red';
	if (l === 'medium') return 'amber';
	return 'teal';
}
function statusVariant(s) {
	const m = { in_transit: 'teal', pending: 'amber', delayed: 'red', at_port: 'cyan', picked_up: 'green' };
	return m[s] || 'gray';
}
function fmtStatus(s) {
	return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}
function timeAgo(iso) {
	const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	return `${Math.floor(diff / 3600)}h ago`;
}

// ── Control Tower Screen ──────────────────────────────────────────────────────
const ControlTower = ({ summary, shipments, usingDummy, onTabChange, onViewShipment }) => {
	const highRiskShipments = shipments.filter(
		(s) => ['high', 'critical'].includes(String(s.current_risk_level || '').toLowerCase())
	).slice(0, 3);

	return (
		<div style={{ animation: 'fadeUp 0.4s ease' }}>
			{/* Header */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
				<div>
					<h1 style={{ fontSize: 20, fontWeight: 700, color: T.white }}>Logistics Control Tower</h1>
					<div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>Real-time fleet & shipment orchestration</div>
				</div>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<span className="live-dot" />
					<span style={{ fontSize: 11, color: T.gray }}>Live · {summary.active_shipments} shipments tracked</span>
				</div>
			</div>

			{/* KPI Row */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
				<KpiCard label="Active Shipments" value={summary.active_shipments} sub={`${summary.delayed_count} delayed`} variant="teal" icon="package" delay={0} />
				<KpiCard label="Fleet Utilization" value={`${summary.active_drivers}/${summary.total_drivers}`} sub={`${summary.on_time_percentage}% on time`} variant="green" icon="truck" delay={100} />
				<KpiCard label="High Risk" value={summary.high_risk_count} sub="Needs attention" variant={summary.high_risk_count > 0 ? 'red' : 'teal'} icon="alert" delay={200} />
				<KpiCard label="Saved This Week" value={`$${(summary.financial_saved_usd / 1000).toFixed(0)}K`} sub={`${summary.rerouted_this_week} reroutes`} variant="amber" icon="zap" delay={300} />
			</div>

			{/* High Risk Shipments + Quick Actions */}
			<div className="grid-2">
				<div>
					<div className="section-label">Shipments Needing Attention</div>
					{highRiskShipments.length === 0 ? (
						<div className="card empty-state">
							<Icon name="check" size={24} color={T.green} />
							<div style={{ marginTop: 8, color: T.green, fontWeight: 600 }}>All shipments nominal</div>
						</div>
					) : highRiskShipments.map((s, i) => (
						<div key={s.shipment_id} className="card card-animate" style={{ marginBottom: 10, cursor: 'pointer', animationDelay: `${i * 80}ms` }} onClick={() => onViewShipment ? onViewShipment(s.shipment_id) : onTabChange('shipments')}>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
								<span className="mono" style={{ fontSize: 11, color: T.grayDim }}>{s.tracking_number}</span>
								<Chip label={String(s.current_risk_level || 'unknown').toUpperCase()} variant={riskVariant(s.current_risk_level)} dot />
							</div>
							<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Risk Score: {s.current_risk_score ?? '—'}</div>
							<div style={{ fontSize: 12, color: T.gray }}>{s.origin_port_name || '—'} → {s.destination_port_name || '—'}</div>
							<div style={{ fontSize: 11, color: T.grayDim, marginTop: 4 }}>Status: {fmtStatus(s.current_status)}{s.vessel_name ? ` · ${s.vessel_name}` : ''}</div>
						</div>
					))}
				</div>

				<div>
					<div className="section-label">Quick Actions</div>
					{[
						{ icon: 'truck', title: 'View Live Shipments', detail: `${summary.active_shipments} active shipments in transit`, tab: 'shipments' },
						{ icon: 'alert', title: 'Check Risk Alerts', detail: `${summary.high_risk_count} high-risk shipments flagged`, tab: 'alerts' },
						{ icon: 'zap', title: 'AI Optimizer', detail: 'ML-powered reroute recommendations', tab: 'optimize' },
					].map((r, i) => (
						<div key={i} className="card card-animate" style={{ marginBottom: 10, borderLeft: `3px solid ${T.teal}`, cursor: 'pointer', animationDelay: `${i * 80}ms` }} onClick={() => onTabChange(r.tab)}>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
								<Icon name={r.icon} size={14} color={T.teal} />
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
									<div style={{ fontSize: 12, color: T.gray }}>{r.detail}</div>
								</div>
								<Icon name="route" size={14} color={T.grayDim} />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

// ── Live Shipments Screen — CargoTrack Map View ───────────────────────────────
const LiveShipmentsScreen = ({ shipments, loading }) => {
	if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Spinner size="lg" /></div>;
	return <CargoTrackMap initialShipments={shipments.length ? shipments : undefined} />;
};

// ── Driver Pool Screen ────────────────────────────────────────────────────────
const DriverPoolScreen = ({ drivers, loading, onDriverAdded }) => {
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
	const [creating, setCreating] = useState(false);
	const [formMsg, setFormMsg] = useState('');

	const handleCreate = async () => {
		if (!formData.name || !formData.email || !formData.password) { setFormMsg('Name, email & password required'); return; }
		setCreating(true); setFormMsg('');
		try {
			await api.post(ENDPOINTS.REGISTER, {
				full_name: formData.name,
				email: formData.email,
				password: formData.password,
				role: 'driver',
				phone_number: formData.phone || undefined,
			});
			setFormMsg('✅ Driver created!');
			setFormData({ name: '', email: '', phone: '', password: '' });
			setShowForm(false);
			if (onDriverAdded) onDriverAdded();
		} catch (err) {
			setFormMsg(`❌ ${err?.response?.data?.detail || 'Failed to create driver'}`);
		} finally { setCreating(false); }
	};

	if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><Spinner size="lg" /></div>;
	return (
		<div style={{ animation: 'fadeUp 0.4s ease' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
				<div>
					<h1 style={{ fontSize: 20, fontWeight: 700, color: T.white }}>Driver Pool</h1>
					<div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>Manage and monitor your fleet</div>
				</div>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<Chip label={`${drivers.length} Drivers`} variant="teal" />
					<button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => setShowForm(!showForm)}>
						{showForm ? '✕ Cancel' : '+ Add Driver'}
					</button>
				</div>
			</div>

			{/* Add Driver Form */}
			{showForm && (
				<div className="card" style={{ marginBottom: 20, borderLeft: `3px solid ${T.teal}`, animation: 'fadeUp 0.2s ease' }}>
					<div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: T.teal }}>Create Driver Account</div>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
						{[
							{ key: 'name', label: 'Full Name', placeholder: 'John Doe' },
							{ key: 'email', label: 'Email', placeholder: 'driver@routeguard.com' },
							{ key: 'phone', label: 'Phone', placeholder: '+91...' },
							{ key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
						].map(f => (
							<div key={f.key}>
								<div style={{ fontSize: 10, color: T.gray, marginBottom: 4 }}>{f.label}</div>
								<input
									type={f.type || 'text'}
									value={formData[f.key]}
									onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
									placeholder={f.placeholder}
									style={{
										width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
										background: T.navy, color: T.white, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
									}}
								/>
							</div>
						))}
						<button className="btn-primary" style={{ padding: '8px 20px', fontSize: 12 }} onClick={handleCreate} disabled={creating}>
							{creating ? 'Creating…' : '✓ Create'}
						</button>
					</div>
					{formMsg && <div style={{ marginTop: 8, fontSize: 12, color: formMsg.startsWith('✅') ? T.green : T.red }}>{formMsg}</div>}
				</div>
			)}

			{drivers.length === 0 ? (
				<div className="card empty-state">
					<Icon name="user" size={32} color={T.grayDim} />
					<div style={{ marginTop: 12, fontSize: 14 }}>No drivers found — click "Add Driver" to create one</div>
				</div>
			) : (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
					{drivers.map((d, i) => {
						const dName = d.full_name || d.name || 'Unknown';
						const dRole = d.role?.value || d.role || '';
						return (
							<div key={d.user_id} className="card card-animate" style={{ animationDelay: `${i * 80}ms` }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
									<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
										<div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,212,180,0.1)', border: `1px solid ${T.teal}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: T.teal }}>
											{dName.charAt(0)}
										</div>
										<div>
											<div style={{ fontSize: 14, fontWeight: 700 }}>{dName}</div>
											<div style={{ fontSize: 11, color: T.gray }}>{d.email || d.phone_number || 'No contact'}</div>
										</div>
									</div>
									<Chip label={dRole === 'driver' ? 'Driver' : fmtStatus(dRole)} variant={d.status === 'en-route' ? 'teal' : 'green'} dot />
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.gray, marginTop: 8 }}>
									<span>Active Shipments: <strong style={{ color: T.white }}>{d.active_shipments ?? 0}</strong></span>
									{d.company_name && <span>{d.company_name}</span>}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ── AI Optimizer Screen ───────────────────────────────────────────────────────
const AIOptimizerScreen = ({ shipments, loading }) => {
	const [predictions, setPredictions] = useState({});
	const [running, setRunning] = useState({});

	const runPrediction = useCallback(async (shipmentId) => {
		// Guard: never call ML on dummy/demo shipment IDs
		if (String(shipmentId).startsWith('demo-')) {
			setPredictions(prev => ({ ...prev, [shipmentId]: { error: true, demo: true } }));
			return;
		}
		setRunning(prev => ({ ...prev, [shipmentId]: true }));
		try {
			const res = await api.get(ENDPOINTS.ML_PREDICTION(shipmentId));
			setPredictions(prev => ({ ...prev, [shipmentId]: res.data }));
		} catch {
			setPredictions(prev => ({ ...prev, [shipmentId]: { error: true } }));
		} finally {
			setRunning(prev => ({ ...prev, [shipmentId]: false }));
		}
	}, []);

	const [approving, setApproving] = useState({});
	const approveReroute = useCallback(async (shipmentId, routeId) => {
		setApproving(prev => ({ ...prev, [routeId]: true }));
		try {
			await api.post(`${ENDPOINTS.APPROVE_REROUTE(shipmentId)}?route_id=${routeId}`);
			setPredictions(prev => {
				const p = { ...prev[shipmentId] };
				if (p.alternate_routes) {
					p.alternate_routes = p.alternate_routes.map(r =>
						r.route_id === routeId ? { ...r, _approved: true } : r
					);
				}
				return { ...prev, [shipmentId]: p };
			});
		} catch {
			// silent
		} finally {
			setApproving(prev => ({ ...prev, [routeId]: false }));
		}
	}, []);

	if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><Spinner size="lg" /></div>;

	const candidates = shipments.filter(s => s.current_status !== 'delivered' && s.current_status !== 'cancelled');
	const highRisk = candidates.filter(s => ['high', 'critical'].includes(String(s.current_risk_level || '').toLowerCase()));

	const runAll = async () => {
		for (const s of candidates.filter(c => !predictions[c.shipment_id])) {
			if (String(s.shipment_id).startsWith('demo-')) continue;
			await runPrediction(s.shipment_id);
		}
	};

	return (
		<div style={{ animation: 'fadeUp 0.4s ease' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
				<div>
					<h1 style={{ fontSize: 20, fontWeight: 700, color: T.white }}>AI Optimizer</h1>
					<div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>ML-powered route & reroute intelligence — real XGBoost, RF & GB models</div>
				</div>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<Chip label={`${candidates.length} Active`} variant="teal" />
					{highRisk.length > 0 && <Chip label={`${highRisk.length} High Risk`} variant="red" />}
					<button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={runAll}>⚡ Run All ML</button>
				</div>
			</div>

			{/* Model Stats Bar */}
			<div className="card" style={{ marginBottom: 20, borderLeft: `3px solid ${T.teal}` }}>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
					{[
						{ label: 'XGBoost R²', value: '96.48%', color: T.teal },
						{ label: 'RF Delay MAE', value: '2.97h', color: T.cyan },
						{ label: 'GB Reroute Acc.', value: '99.85%', color: T.green },
						{ label: 'Training Rows', value: '298K+', color: T.amber },
					].map(m => (
						<div key={m.label}>
							<div style={{ fontSize: 11, color: T.gray }}>{m.label}</div>
							<div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.value}</div>
						</div>
					))}
				</div>
			</div>

			{candidates.length === 0 ? (
				<div className="card empty-state">
					<Icon name="check" size={32} color={T.green} />
					<div style={{ marginTop: 12, color: T.green, fontWeight: 600 }}>No shipments need optimization right now</div>
				</div>
			) : candidates.map((s, i) => {
				const pred = predictions[s.shipment_id];
				const isRunning = running[s.shipment_id];
				return (
					<div key={s.shipment_id} className="card card-animate" style={{ marginBottom: 16, animationDelay: `${i * 80}ms` }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
								<span className="mono" style={{ fontSize: 12, color: T.teal }}>{s.tracking_number}</span>
								<Chip label={String(s.current_risk_level || '').toUpperCase()} variant={riskVariant(s.current_risk_level)} dot />
							</div>
							{!pred && (
								<button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => runPrediction(s.shipment_id)} disabled={isRunning}>
									{isRunning ? 'Running ML…' : '⚡ Run ML Analysis'}
								</button>
							)}
						</div>

						{pred && !pred.error && (
							<div>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
									<div className="card" style={{ padding: 12 }}>
										<div style={{ fontSize: 11, color: T.gray }}>Risk Score</div>
										<div style={{ fontSize: 18, fontWeight: 700, color: T.red }}>{pred.model_outputs?.risk_score ?? '—'}</div>
									</div>
									<div className="card" style={{ padding: 12 }}>
										<div style={{ fontSize: 11, color: T.gray }}>Predicted Delay</div>
										<div style={{ fontSize: 18, fontWeight: 700, color: T.amber }}>{pred.model_outputs?.predicted_delay_hr ?? 0}h</div>
									</div>
									<div className="card" style={{ padding: 12 }}>
										<div style={{ fontSize: 11, color: T.gray }}>Decision</div>
										<div style={{ fontSize: 18, fontWeight: 700, color: pred.model_outputs?.reroute_decision === 'REROUTE' ? T.red : T.green }}>
											{pred.model_outputs?.reroute_decision ?? '—'}
										</div>
									</div>
								</div>
								{pred.alternate_routes?.length > 0 && (
									<div>
										<div className="section-label">Alternate Routes</div>
										{pred.alternate_routes.slice(0, 3).map((r) => (
											<div key={r.route_id} className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${r.recommended ? T.green : T.border}`, padding: '10px 14px' }}>
												<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
													<div>
														<div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
														<div style={{ fontSize: 11, color: T.gray }}>Extra cost: ${Number(r.extra_cost_usd).toFixed(0)} · Delay: {Number(r.delay_hours).toFixed(1)}h</div>
													</div>
													<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
														{r.recommended && <Chip label="Recommended" variant="green" />}
														{r._approved ? (
															<Chip label="Approved ✓" variant="green" />
														) : (
															<button className="btn-primary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => approveReroute(s.shipment_id, r.route_id)} disabled={approving[r.route_id]}>
																{approving[r.route_id] ? '…' : 'Approve'}
															</button>
														)}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
								{pred.financial_impact && (
									<div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: T.gray }}>
										<span>Expected loss avoided: <strong style={{ color: T.green }}>${Number(pred.financial_impact.net_saving_usd).toLocaleString()}</strong></span>
									</div>
								)}
							</div>
						)}
						{pred?.error && (
							<div style={{ fontSize: 12, color: pred.demo ? T.amber : T.red }}>
								{pred.demo
									? '⚠ Connect backend to run real ML analysis on live shipments.'
									: 'Failed to get ML prediction. Backend may be unreachable or shipment has no route yet.'}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

// ── Risk Alerts Screen ────────────────────────────────────────────────────────
const RiskAlertsScreen = ({ alerts, loading, onResolve }) => {
	const [resolving, setResolving] = useState({});

	const handleResolve = async (alertId) => {
		setResolving(prev => ({ ...prev, [alertId]: true }));
		await onResolve(alertId);
		setResolving(prev => ({ ...prev, [alertId]: false }));
	};

	if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><Spinner size="lg" /></div>;

	const severityColor = (sev) => {
		const s = String(sev || '').toLowerCase();
		if (s === 'critical') return T.red;
		if (s === 'high') return T.amber;
		if (s === 'medium') return T.amber;
		return T.gray;
	};

	return (
		<div style={{ animation: 'fadeUp 0.4s ease' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
				<div>
					<h1 style={{ fontSize: 20, fontWeight: 700, color: T.white }}>Risk Alerts</h1>
					<div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>Monitor and resolve operational risks</div>
				</div>
				<Chip label={`${alerts.length} Unresolved`} variant={alerts.length > 0 ? 'red' : 'green'} />
			</div>

			{alerts.length === 0 ? (
				<div className="card empty-state">
					<Icon name="check" size={32} color={T.green} />
					<div style={{ marginTop: 12, color: T.green, fontWeight: 600 }}>No unresolved alerts — all clear!</div>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 12 }}>
					{alerts.map((a, i) => (
						<div key={a.alert_id} className="card card-animate" style={{
							borderLeft: `4px solid ${severityColor(a.severity)}`,
							background: String(a.severity).toLowerCase() === 'critical' ? 'rgba(239,68,68,.06)' : String(a.severity).toLowerCase() === 'high' ? 'rgba(245,158,11,.06)' : `rgba(26,42,69,.4)`,
							animationDelay: `${i * 60}ms`,
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div style={{ flex: 1 }}>
									<div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
										<span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: severityColor(a.severity) }}>{a.severity}</span>
										{a.tracking_number && <span className="mono" style={{ fontSize: 10, color: T.grayDim }}>{a.tracking_number}</span>}
									</div>
									<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.message}</div>
									<div style={{ fontSize: 11, color: T.grayDim }}>{timeAgo(a.created_at)}</div>
								</div>
								<button
									className="btn-primary"
									style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 10 }}
									onClick={() => handleResolve(a.alert_id)}
									disabled={resolving[a.alert_id]}
									id={`resolve-alert-${a.alert_id}`}
								>
									{resolving[a.alert_id] ? 'Resolving…' : 'Resolve'}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// ── Consignments Screen ───────────────────────────────────────────────────────
const CONSIGNMENT_FILTERS = ['all', 'created', 'picked_up', 'in_transit', 'at_port', 'delayed', 'delivered'];
const ConsignmentsScreen = ({ shipments, drivers, loading, onViewShipment, onAccept, onAssign }) => {
	const [filter, setFilter] = useState('all');
	const [accepting, setAccepting] = useState({});
	const [assigningId, setAssigningId] = useState(null);
	const [selDriver, setSelDriver] = useState('');
	const [selVessel, setSelVessel] = useState('');
	const [saving, setSaving] = useState(false);

	const filtered = shipments.filter(s => filter === 'all' || s.current_status === filter);

	const handleAccept = async (shipmentId) => {
		setAccepting(p => ({ ...p, [shipmentId]: true }));
		try { await onAccept(shipmentId); } catch {} finally { setAccepting(p => ({ ...p, [shipmentId]: false })); }
	};

	const handleAssign = async (shipmentId) => {
		if (!selDriver && !selVessel) return;
		setSaving(true);
		try {
			await onAssign(shipmentId, selDriver, selVessel);
			setAssigningId(null);
			setSelDriver('');
			setSelVessel('');
		} catch {} finally { setSaving(false); }
	};

	const availableDrivers = (drivers || []).filter(d => {
		const role = d.role?.value || d.role || '';
		return role === 'driver';
	});

	if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><Spinner size="lg" /></div>;

	return (
		<div style={{ animation: 'fadeUp 0.4s ease' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
				<div>
					<h1 style={{ fontSize: 20, fontWeight: 700, color: T.white }}>Consignments</h1>
					<div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>Track, accept, assign drivers & manage shipments</div>
				</div>
				<Chip label={`${shipments.length} Total`} variant="teal" />
			</div>

			{/* Status filter pills */}
			<div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
				{CONSIGNMENT_FILTERS.map(f => {
					const cnt = f === 'all' ? shipments.length : shipments.filter(s => s.current_status === f).length;
					const active = filter === f;
					return (
						<button key={f} onClick={() => setFilter(f)} style={{
							padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
							border: active ? `2px solid ${T.teal}` : `1px solid ${T.border}`,
							background: active ? 'rgba(0,212,180,.12)' : 'transparent',
							color: active ? T.teal : T.gray, fontFamily: "'Space Grotesk', sans-serif", transition: 'all .2s',
						}}>
							{fmtStatus(f)} <span style={{ opacity: .6, marginLeft: 4 }}>{cnt}</span>
						</button>
					);
				})}
			</div>

			{filtered.length === 0 ? (
				<div className="card empty-state"><Icon name="package" size={32} color={T.grayDim} /><div style={{ marginTop: 12, fontSize: 14 }}>No consignments match this filter</div></div>
			) : (
				<div style={{ display: 'grid', gap: 12 }}>
					{filtered.map((s, i) => (
						<div key={s.shipment_id}>
							<div className="card card-animate" style={{ animationDelay: `${i * 50}ms`, cursor: 'pointer', borderLeft: `3px solid ${s.current_risk_level === 'critical' ? T.red : s.current_risk_level === 'high' ? T.amber : T.teal}` }} onClick={() => onViewShipment(s.shipment_id)}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
									<div style={{ flex: 1 }}>
										<div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
											<span className="mono" style={{ fontSize: 12, color: T.teal }}>{s.tracking_number}</span>
											<Chip label={fmtStatus(s.current_status)} variant={riskVariant(s.current_risk_level)} />
										</div>
										<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.origin_port_name || '—'} → {s.destination_port_name || '—'}</div>
										<div style={{ fontSize: 11, color: T.gray }}>
											{s.shipper_name && <span>Shipper: {s.shipper_name} · </span>}
											{s.cargo_type && <span>{fmtStatus(s.cargo_type)} · </span>}
											{s.declared_value && <span>${Number(s.declared_value).toLocaleString()} · </span>}
											Risk: {s.current_risk_score ?? '—'}
										</div>
										{/* Show assigned resources */}
										<div style={{ fontSize: 11, color: T.grayDim, marginTop: 4 }}>
											{s.driver_name ? <span style={{ color: T.green }}>🚛 {s.driver_name}</span> : <span style={{ color: T.amber }}>⚠ No driver</span>}
											{s.vessel_name && <span style={{ marginLeft: 8 }}>🚢 {s.vessel_name}</span>}
										</div>
									</div>
									<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
										{s.current_status === 'created' && (
											<button className="btn-primary" style={{ padding: '6px 16px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleAccept(s.shipment_id); }} disabled={accepting[s.shipment_id]}>
												{accepting[s.shipment_id] ? 'Accepting…' : '✓ Accept'}
											</button>
										)}
										{!s.driver_name && s.current_status !== 'delivered' && (
											<button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, color: T.amber }} onClick={(e) => { e.stopPropagation(); setAssigningId(assigningId === s.shipment_id ? null : s.shipment_id); setSelDriver(''); setSelVessel(''); }}>
												{assigningId === s.shipment_id ? '✕ Close' : '⚡ Assign'}
											</button>
										)}
										<button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onViewShipment(s.shipment_id); }}>Details →</button>
									</div>
								</div>
							</div>

							{/* Inline Assignment Panel */}
							{assigningId === s.shipment_id && (
								<div className="card" style={{ marginTop: -1, borderTop: `2px solid ${T.teal}`, borderRadius: '0 0 12px 12px', padding: '16px 20px', animation: 'fadeUp 0.2s ease' }}>
									<div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.teal }}>Assign Resources — {s.tracking_number}</div>
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
										{/* Route Info */}
										<div>
											<div style={{ fontSize: 10, color: T.gray, marginBottom: 4 }}>ROUTE</div>
											<div style={{ fontSize: 12, color: T.white, fontWeight: 600 }}>{s.origin_port_name || '—'}</div>
											<div style={{ fontSize: 10, color: T.grayDim }}>↓ {s.route_distance_km ? `${s.route_distance_km} km` : '—'} · {s.route_duration_hr ? `${s.route_duration_hr}h` : '—'}</div>
											<div style={{ fontSize: 12, color: T.white, fontWeight: 600 }}>{s.destination_port_name || '—'}</div>
										</div>

										{/* Driver Select */}
										<div>
											<div style={{ fontSize: 10, color: T.gray, marginBottom: 4 }}>DRIVER</div>
											<select value={selDriver} onChange={e => setSelDriver(e.target.value)} style={{
												width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
												background: T.navy, color: T.white, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
											}}>
												<option value="">— Select Driver —</option>
												{availableDrivers.map(d => (
													<option key={d.user_id} value={d.user_id}>{d.name} ({d.email})</option>
												))}
											</select>
										</div>

										{/* Vessel Select */}
										<div>
											<div style={{ fontSize: 10, color: T.gray, marginBottom: 4 }}>VESSEL</div>
											<select value={selVessel} onChange={e => setSelVessel(e.target.value)} style={{
												width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
												background: T.navy, color: T.white, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
											}}>
												<option value="">— Select Vessel —</option>
												<option value="auto">Auto-assign Best Available</option>
											</select>
										</div>

										{/* Assign Button */}
										<button className="btn-primary" style={{ padding: '8px 20px', fontSize: 12 }} disabled={saving || (!selDriver && !selVessel)} onClick={() => handleAssign(s.shipment_id)}>
											{saving ? 'Saving…' : '✓ Assign'}
										</button>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const initialTab = searchParams.get('tab');
	const [activeTab, setActiveTab] = useState(
		TABS.some((t) => t.id === initialTab) ? initialTab : 'dashboard'
	);
	const [usingDummy, setUsingDummy] = useState(true);

	const handleTabChange = useCallback((nextTab) => {
		const safeTab = TABS.some((t) => t.id === nextTab) ? nextTab : 'dashboard';
		setActiveTab(safeTab);
		if (safeTab === 'dashboard') {
			setSearchParams({}, { replace: true });
			return;
		}
		setSearchParams({ tab: safeTab }, { replace: true });
	}, [setSearchParams]);

	// Data state
	const [summary, setSummary] = useState(DUMMY_SUMMARY);
	const [shipments, setShipments] = useState(DUMMY_SHIPMENTS);
	const [drivers, setDrivers] = useState(DUMMY_DRIVERS);
	const [alerts, setAlerts] = useState(DUMMY_ALERTS);

	// Loading state per section
	const [loadingShipments, setLoadingShipments] = useState(false);
	const [loadingDrivers, setLoadingDrivers] = useState(false);
	const [loadingAlerts, setLoadingAlerts] = useState(false);

	// Manager dashboard is always dark — force it regardless of stored theme
	useEffect(() => {
		document.documentElement.setAttribute('data-theme', 'dark');
		document.documentElement.style.background = T.navy;
		document.body.style.background = T.navy;
		return () => {
			// Restore on unmount
			const stored = localStorage.getItem('theme') || 'dark';
			document.documentElement.setAttribute('data-theme', stored);
			document.documentElement.style.background = '';
			document.body.style.background = '';
		};
	}, []);

	useEffect(() => {
		const tabFromUrl = searchParams.get('tab');
		const safeTab = TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'dashboard';
		if (safeTab !== activeTab) {
			setActiveTab(safeTab);
		}
	}, [activeTab, searchParams]);

	// Lock/unlock parent scroll when map tab is active
	useEffect(() => {
		const contentEl = document.querySelector('.app-shell__content');
		if (!contentEl) return;
		if (activeTab === 'shipments') {
			contentEl.style.overflow = 'hidden';
			contentEl.style.padding = '0';
		} else {
			contentEl.style.overflow = '';
			contentEl.style.padding = '';
		}
		return () => {
			contentEl.style.overflow = '';
			contentEl.style.padding = '';
		};
	}, [activeTab]);

	useEffect(() => {
		const init = async () => {
			try {
				const [summaryRes, shipmentsRes] = await Promise.all([
					api.get(ENDPOINTS.MANAGER_SUMMARY),
					api.get(ENDPOINTS.ALL_SHIPMENTS),
				]);
				setSummary(summaryRes.data);
				setShipments(shipmentsRes.data || []);
				setUsingDummy(false);
			} catch {
				// backend unreachable — keep dummy data, banner stays visible
			}
		};
		init();
	}, []);

	// Lazy-load drivers when Driver Pool tab opens
	useEffect(() => {
		if (!['drivers', 'consignments'].includes(activeTab) || !usingDummy === false && drivers !== DUMMY_DRIVERS) return;
		if (usingDummy) return; // still on dummy, skip
		const fetchDrivers = async () => {
			setLoadingDrivers(true);
			try {
				const res = await api.get(ENDPOINTS.MANAGER_DRIVERS);
				setDrivers(res.data || []);
			} catch {
				// keep existing
			} finally {
				setLoadingDrivers(false);
			}
		};
		fetchDrivers();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab]);

	// Lazy-load alerts when Alerts tab opens
	useEffect(() => {
		if (activeTab !== 'alerts') return;
		const fetchAlerts = async () => {
			setLoadingAlerts(true);
			try {
				const res = await api.get(ENDPOINTS.ACTIVE_ALERTS);
				setAlerts(res.data || []);
				setUsingDummy(false);
			} catch {
				// keep existing
			} finally {
				setLoadingAlerts(false);
			}
		};
		fetchAlerts();
	}, [activeTab]);

	// Refresh shipments when Shipments or Optimizer tab opens
	useEffect(() => {
		if (!['shipments', 'optimize', 'consignments'].includes(activeTab)) return;
		if (usingDummy) return;
		const fetchShipments = async () => {
			setLoadingShipments(true);
			try {
				const res = await api.get(ENDPOINTS.ALL_SHIPMENTS);
				setShipments(res.data || []);
			} catch {
				// keep
			} finally {
				setLoadingShipments(false);
			}
		};
		fetchShipments();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab]);

	// Resolve alert handler
	const handleResolve = useCallback(async (alertId) => {
		try {
			await api.put(ENDPOINTS.RESOLVE_ALERT(alertId), {});
			setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
		} catch {
			// silent fail
		}
	}, []);

	return (
		<>
			<style>{css}</style>
			<DemoModeBanner usingDummy={usingDummy} />
			<div style={{ color: T.white, width: '100%', background: T.navy, fontFamily: "'Space Grotesk', sans-serif", display: 'flex', flexDirection: 'column', height: activeTab === 'shipments' ? '100%' : 'auto', minHeight: activeTab === 'shipments' ? 0 : '100vh' }}>
				<NavTabs activeTab={activeTab} onTabChange={handleTabChange} />

				{/* Map tab: full bleed — no padding wrapper */}
				{activeTab === 'shipments' && (
					<div style={{ flex: 1, minHeight: 0 }}>
						<LiveShipmentsScreen shipments={shipments} loading={loadingShipments} />
					</div>
				)}

				{/* All other tabs: padded content area */}
				{activeTab !== 'shipments' && (
					<div style={{ padding: '24px 32px 40px' }}>
						{activeTab === 'dashboard' && (
							<ControlTower summary={summary} shipments={shipments} usingDummy={usingDummy} onTabChange={handleTabChange} onViewShipment={(id) => navigate(`/manager/shipments/${id}`)} />
						)}
						{activeTab === 'drivers' && (
							<DriverPoolScreen drivers={drivers} loading={loadingDrivers} onDriverAdded={async () => { try { const res = await api.get(ENDPOINTS.MANAGER_DRIVERS); setDrivers(res.data || []); } catch {} }} />
						)}
						{activeTab === 'consignments' && (
						<ConsignmentsScreen
							shipments={shipments}
							drivers={drivers}
							loading={loadingShipments}
							onViewShipment={(id) => navigate(`/manager/shipments/${id}`)}
							onAccept={async (id) => { try { await api.put(ENDPOINTS.UPDATE_STATUS(id), { new_status: 'picked_up' }); setShipments(prev => prev.map(s => s.shipment_id === id ? { ...s, current_status: 'picked_up' } : s)); } catch {} }}
							onAssign={async (id, driverId, vesselId) => {
								const params = new URLSearchParams();
								if (driverId) params.append('driver_id', driverId);
								if (vesselId && vesselId !== 'auto') params.append('vessel_id', vesselId);
								await api.post(`${ENDPOINTS.ASSIGN_RESOURCES(id)}?${params.toString()}`);
								// Refresh to show updated assignment
								try { const res = await api.get(ENDPOINTS.ALL_SHIPMENTS); setShipments(res.data || []); } catch {}
							}}
						/>
					)}
						{activeTab === 'optimize' && (
							<AIOptimizerScreen shipments={shipments} loading={loadingShipments} />
						)}
						{activeTab === 'alerts' && (
							<RiskAlertsScreen alerts={alerts} loading={loadingAlerts} onResolve={handleResolve} />
						)}
					</div>
				)}
			</div>
		</>
	);
}

