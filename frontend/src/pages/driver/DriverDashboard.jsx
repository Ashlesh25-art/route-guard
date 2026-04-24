import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';

const T = {
	navy:'#080E1A', card:'#0D1526', border:'#1A2A45',
	teal:'#00D4B4', cyan:'#22D3EE', amber:'#F59E0B',
	red:'#EF4444', green:'#10B981', white:'#F0F4FF',
	gray:'#8A9BB5', grayDim:'#4A5F7A',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500&display=swap');
  .mono{font-family:'JetBrains Mono',monospace}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes countUp{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .live-dot{width:8px;height:8px;background:${T.green};border-radius:50%;animation:pulse 2s infinite;display:inline-block}
  .kpi-card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;overflow:hidden;animation:countUp .6s ease both;position:relative}
  .kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
  .kpi-card.teal::before{background:linear-gradient(90deg,${T.teal},transparent)}
  .kpi-card.amber::before{background:linear-gradient(90deg,${T.amber},transparent)}
  .kpi-card.green::before{background:linear-gradient(90deg,${T.green},transparent)}
  .kpi-card.red::before{background:linear-gradient(90deg,${T.red},transparent)}
  .chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
  .chip-teal{background:rgba(0,212,180,.15);color:${T.teal};border:1px solid rgba(0,212,180,.3)}
  .chip-amber{background:rgba(245,158,11,.15);color:${T.amber};border:1px solid rgba(245,158,11,.3)}
  .chip-red{background:rgba(239,68,68,.15);color:${T.red};border:1px solid rgba(239,68,68,.3)}
  .chip-green{background:rgba(16,185,129,.15);color:${T.green};border:1px solid rgba(16,185,129,.3)}
  .btn-primary{background:linear-gradient(135deg,${T.teal},${T.cyan});color:#000;font-weight:700;font-size:13px;padding:10px 22px;border:none;border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,212,180,.35)}
  .btn-ghost{background:transparent;color:${T.teal};font-weight:600;font-size:13px;padding:9px 20px;border:1px solid ${T.teal};border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif}
  .btn-ghost:hover{background:rgba(0,212,180,.08)}
  .card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;transition:all .2s}
  .card:hover{border-color:rgba(0,212,180,.28)}
  .alert-card{background:${T.card};border:1px solid ${T.red};border-radius:8px;padding:14px}
  .section-label{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${T.grayDim};margin-bottom:12px}
  .number-big{font-family:'Orbitron',monospace;font-size:28px;font-weight:700}
`;

const fmtStatus = s => s ? s.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) : '—';
const fmtDate = iso => { if(!iso) return '—'; try{ return new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }catch{ return iso; }};

const Chip = ({ label, variant='teal', dot=false }) => (
	<div className={`chip chip-${variant}`}>
		{dot && <span style={{width:6,height:6,background:'currentColor',borderRadius:'50%',display:'inline-block'}}/>}
		{label}
	</div>
);

const InfoRow = ({ k, v }) => (
	<div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${T.border}`,fontSize:13}}>
		<span style={{color:T.gray}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
	</div>
);

const NavTabs = ({ activeTab, setActiveTab, navigate }) => {
	const tabs = [
		{ id:'dashboard', label:'My Tasks', path:'/driver/my-tasks' },
		{ id:'pickup', label:'Shipment Details', path:'/driver/pickup' },
		{ id:'navigate', label:'Update Status', path:'/driver/navigate' },
		{ id:'alerts', label:'Alerts', path:'/driver/alerts' },
	];
	return (
		<div style={{display:'flex',gap:8,marginBottom:24,borderBottom:`1px solid ${T.border}`}}>
			{tabs.map(tab=>(
				<button key={tab.id} onClick={()=>{setActiveTab(tab.id);navigate&&navigate(tab.path)}}
					style={{padding:'12px 18px',background:activeTab===tab.id?T.card:'transparent',color:activeTab===tab.id?T.teal:T.gray,border:`1px solid ${activeTab===tab.id?T.teal:'transparent'}`,borderRadius:'8px 8px 0 0',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .2s',fontFamily:"'Space Grotesk',sans-serif"}}>
					{tab.label}
				</button>
			))}
		</div>
	);
};

/* ─── My Tasks (Dashboard) ─────────────────────────────────────────── */
const DriverMainDashboard = ({ setTab, assignment, allShipments, loading }) => {
	const deliveredCount = allShipments.filter(s=>s.current_status==='delivered').length;
	const activeCount = allShipments.filter(s=>!['delivered','cancelled'].includes(s.current_status)).length;

	const chipVariant = s => {
		if(s==='delivered') return 'green'; if(s==='delayed') return 'red';
		if(['in_transit','picked_up'].includes(s)) return 'teal'; return 'amber';
	};

	return (
		<div style={{animation:'fadeUp 0.5s ease'}}>
			<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
				<div>
					<div style={{fontSize:12,color:T.gray}}>Welcome back,</div>
					<h1 style={{fontSize:22,fontWeight:700,margin:'4px 0 0'}}>{assignment?.driver_name||'Driver'} 👋</h1>
				</div>
				<div style={{display:'flex',alignItems:'center',gap:8}}>
					<span className="live-dot"/><span style={{fontSize:11,color:T.gray}}>Live</span>
				</div>
			</div>

			<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
				<div className="kpi-card teal"><div className="number-big" style={{color:T.teal,fontSize:24}}>{activeCount}</div><div style={{fontSize:11,color:T.gray,marginTop:4}}>Active</div></div>
				<div className="kpi-card green"><div className="number-big" style={{color:T.green,fontSize:24}}>{deliveredCount}</div><div style={{fontSize:11,color:T.gray,marginTop:4}}>Delivered</div></div>
				<div className="kpi-card amber"><div className="number-big" style={{color:T.amber,fontSize:24}}>{allShipments.length}</div><div style={{fontSize:11,color:T.gray,marginTop:4}}>Total</div></div>
			</div>

			{assignment ? (
				<div className="card" style={{background:'linear-gradient(135deg,rgba(0,212,180,0.1),rgba(0,212,180,0.03))',border:'1px solid rgba(0,212,180,0.3)',marginBottom:16,textAlign:'center',padding:28}}>
					<Chip label="● Active Assignment" variant="teal"/>
					<div className="mono" style={{fontSize:18,fontWeight:700,margin:'12px 0 6px'}}>{assignment.tracking_number}</div>
					<div style={{fontSize:13,color:T.gray,marginBottom:4,lineHeight:1.6}}>
						{assignment.cargo_description||fmtStatus(assignment.cargo_type)}<br/>
						{assignment.origin_port_name} → {assignment.destination_port_name}
					</div>
					<Chip label={fmtStatus(assignment.current_status)} variant={chipVariant(assignment.current_status)} dot/>
					<div style={{marginTop:16,display:'flex',gap:10}}>
						<button className="btn-ghost" style={{flex:1}} onClick={()=>setTab('pickup')}>View Details</button>
						<button className="btn-primary" style={{flex:1}} onClick={()=>setTab('navigate')}>Update Status</button>
					</div>
				</div>
			) : (
				<div className="card" style={{textAlign:'center',padding:28,marginBottom:16}}>
					<div style={{fontSize:32,marginBottom:8}}>📦</div>
					<div style={{fontSize:14,color:T.gray}}>No active assignment right now</div>
					<div style={{fontSize:12,color:T.grayDim,marginTop:4}}>Assigned shipments with status picked_up/in_transit will appear here</div>
				</div>
			)}

			{/* All shipments list */}
			<div className="card">
				<div className="section-label">All My Shipments</div>
				{loading ? <div style={{display:'flex',justifyContent:'center',padding:20}}><Spinner size={20}/></div> :
				allShipments.length===0 ? <div style={{textAlign:'center',padding:20,color:T.gray}}>No shipments assigned</div> :
				<div style={{display:'flex',flexDirection:'column',gap:8}}>
					{allShipments.map(s=>(
						<div key={s.shipment_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,background:'rgba(0,0,0,0.2)',borderRadius:8}}>
							<div>
								<div className="mono" style={{fontSize:13,fontWeight:600,marginBottom:4}}>{s.tracking_number}</div>
								<Chip label={fmtStatus(s.current_status)} variant={chipVariant(s.current_status)} dot/>
							</div>
							<div style={{textAlign:'right',fontSize:12,color:T.gray}}>{fmtDate(s.expected_arrival)}</div>
						</div>
					))}
				</div>}
			</div>
		</div>
	);
};

/* ─── Route Map ────────────────────────────────────────────────────── */
const RouteMap = ({ assignment }) => {
	const waypoints = assignment.route_waypoints || [];
	const currentPos = assignment.current_latitude && assignment.current_longitude
		? [Number(assignment.current_latitude), Number(assignment.current_longitude)] : null;
	
	if (!waypoints.length && !currentPos) return null;
	
	const positions = waypoints.map(p => [Number(p.lat), Number(p.lng)]);
	const center = currentPos || (positions.length ? positions[Math.floor(positions.length / 2)] : [20, 60]);

	return (
		<div className="card" style={{padding:0,overflow:'hidden',marginBottom:16,borderRadius:12}}>
			<div style={{padding:'14px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
				<span style={{fontSize:13,fontWeight:700}}>🗺 Live Route Map</span>
				{currentPos && <span className="chip chip-teal" style={{fontSize:10}}>● GPS Active</span>}
			</div>
			<div style={{height:280,marginTop:8}}>
				<MapContainer center={center} zoom={3} style={{height:'100%',width:'100%'}} scrollWheelZoom>
					<TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; OSM &copy; CARTO"/>
					{positions.length > 1 && <Polyline positions={positions} pathOptions={{color:'#22D3EE',weight:3,opacity:0.7,dashArray:'8 4'}}/>}
					{positions.length > 0 && (
						<CircleMarker center={positions[0]} radius={7} pathOptions={{color:'#10B981',fillColor:'#10B981',fillOpacity:1}}>
							<Tooltip direction="top" offset={[0,-8]}><strong>{assignment.origin_port_name || 'Origin'}</strong></Tooltip>
						</CircleMarker>
					)}
					{positions.length > 1 && (
						<CircleMarker center={positions[positions.length-1]} radius={7} pathOptions={{color:'#EF4444',fillColor:'#EF4444',fillOpacity:1}}>
							<Tooltip direction="top" offset={[0,-8]}><strong>{assignment.destination_port_name || 'Destination'}</strong></Tooltip>
						</CircleMarker>
					)}
					{currentPos && (
						<CircleMarker center={currentPos} radius={10} pathOptions={{color:'#facc15',fillColor:'#facc15',fillOpacity:0.9,weight:3}}>
							<Tooltip permanent direction="top" offset={[0,-14]}><strong>You are here</strong></Tooltip>
						</CircleMarker>
					)}
				</MapContainer>
			</div>
		</div>
	);
};

/* ─── Shipment Details (Pickup) ────────────────────────────────────── */
const DriverShipmentDetail = ({ assignment, setTab }) => {
	if (!assignment) return <div className="card" style={{textAlign:'center',padding:32,color:T.gray}}>No active assignment to view details for.</div>;

	const statusHistory = assignment.status_history || [];
	const isRerouted = assignment.is_rerouted;
	const rerouteCount = assignment.reroute_count || 0;

	return (
		<div style={{animation:'fadeUp 0.5s ease'}}>
			<h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>Shipment Details</h2>
			<div className="mono" style={{fontSize:13,color:T.teal,marginBottom:20}}>{assignment.tracking_number}</div>

			{/* Reroute Notification */}
			{isRerouted && (
				<div className="card" style={{marginBottom:16,padding:'14px 20px',background:'rgba(250,204,21,0.06)',border:'1px solid rgba(250,204,21,0.3)',borderLeft:'4px solid #facc15'}}>
					<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
						<div>
							<div style={{fontSize:14,fontWeight:700,color:'#facc15',marginBottom:2}}>⚡ Route Changed by Manager</div>
							<div style={{fontSize:12,color:T.gray}}>Your route has been updated {rerouteCount > 1 ? `${rerouteCount} times` : ''} — follow the new navigation path below</div>
						</div>
						<span className="chip chip-amber">Rerouted</span>
					</div>
				</div>
			)}

			{/* Route Map */}
			<RouteMap assignment={assignment} />

			{/* Route summary bar */}
			<div className="card" style={{marginBottom:16,padding:'16px 20px'}}>
				<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,flexWrap:'wrap'}}>
					<div style={{textAlign:'center'}}>
						<div style={{fontSize:11,color:T.grayDim}}>FROM</div>
						<div style={{fontSize:15,fontWeight:700,color:T.green}}>{assignment.origin_port_name}</div>
					</div>
					<div style={{display:'flex',alignItems:'center',gap:8,color:T.grayDim}}>
						<div style={{width:40,height:2,background:T.border}}/><span style={{fontSize:16}}>🚛</span><div style={{width:40,height:2,background:T.border}}/>
					</div>
					<div style={{textAlign:'center'}}>
						<div style={{fontSize:11,color:T.grayDim}}>TO</div>
						<div style={{fontSize:15,fontWeight:700,color:T.cyan}}>{assignment.destination_port_name}</div>
					</div>
				</div>
			</div>

			{/* Current position */}
			{assignment.current_latitude && assignment.current_longitude && (
				<div className="card" style={{marginBottom:16,padding:'14px 20px',background:'rgba(0,212,180,0.04)',border:'1px solid rgba(0,212,180,0.2)'}}>
					<div className="section-label">Current Position</div>
					<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
						<span className="mono" style={{fontSize:13}}>{Number(assignment.current_latitude).toFixed(4)}°N, {Number(assignment.current_longitude).toFixed(4)}°E</span>
						<span className="live-dot"/>
					</div>
				</div>
			)}

			<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
				<div className="card">
					<div className="section-label">Shipment Info</div>
					<InfoRow k="Status" v={<Chip label={fmtStatus(assignment.current_status)} variant="teal" dot/>}/>
					<InfoRow k="Departure" v={fmtDate(assignment.departure_time)}/>
					<InfoRow k="ETA" v={fmtDate(assignment.expected_arrival)}/>
					{assignment.vessel_name && <InfoRow k="Vessel" v={assignment.vessel_name}/>}
					{assignment.current_risk_level && <InfoRow k="Risk" v={<span style={{color:assignment.current_risk_level==='high'?T.red:T.green,fontWeight:700}}>{assignment.current_risk_level.toUpperCase()}</span>}/>}
				</div>
				<div className="card">
					<div className="section-label">Cargo Details</div>
					<InfoRow k="Type" v={fmtStatus(assignment.cargo_type)}/>
					{assignment.cargo_description && <InfoRow k="Description" v={assignment.cargo_description}/>}
					{assignment.weight_kg && <InfoRow k="Weight" v={`${assignment.weight_kg} kg`}/>}
					{assignment.declared_value!=null && <InfoRow k="Value" v={`$${Number(assignment.declared_value).toLocaleString()}`}/>}
					{assignment.cargo_sensitivity_score!=null && <InfoRow k="Sensitivity" v={<span className="mono">{Number(assignment.cargo_sensitivity_score).toFixed(1)}</span>}/>}
				</div>
			</div>

			<div className="card" style={{marginBottom:16}}>
				<div className="section-label">Team</div>
				<InfoRow k="Sender" v={assignment.shipper_name}/>
				<InfoRow k="Receiver" v={assignment.receiver_name}/>
				{assignment.manager_name && <InfoRow k="Manager" v={assignment.manager_name}/>}
			</div>

			{/* Timeline */}
			{statusHistory.length > 0 && (
				<div className="card" style={{marginBottom:16}}>
					<div className="section-label">Status Timeline</div>
					{statusHistory.map((h,i)=>(
						<div key={i} style={{display:'flex',gap:12,marginBottom:i<statusHistory.length-1?12:0}}>
							<div style={{width:10,height:10,borderRadius:'50%',background:T.teal,marginTop:4,flexShrink:0}}/>
							<div>
								<div style={{fontSize:13,fontWeight:600}}>{fmtStatus(h.status)}</div>
								<div style={{fontSize:11,color:T.gray}}>{fmtDate(h.timestamp)}{h.notes?` — ${h.notes}`:''}</div>
							</div>
						</div>
					))}
				</div>
			)}

			<button className="btn-primary" style={{width:'100%',padding:14}} onClick={()=>setTab('navigate')}>Update Status →</button>
		</div>
	);
};

/* ─── Update Status (Navigate) ─────────────────────────────────────── */
const DriverStatusUpdate = ({ assignment }) => {
	const navigate = useNavigate();
	const [form, setForm] = useState({ status:'in_transit', latitude:'', longitude:'', notes:'', reportIncident:false });
	const [saving, setSaving] = useState(false);
	const [geoLoading, setGeoLoading] = useState(false);

	if (!assignment) return <div className="card" style={{textAlign:'center',padding:32,color:T.gray}}>No active assignment to update.</div>;

	const STATUS_OPTIONS = [
		{value:'picked_up',label:'Picked Up',icon:'📦'},
		{value:'in_transit',label:'In Transit',icon:'🚛'},
		{value:'at_port',label:'At Port',icon:'⚓'},
		{value:'customs',label:'Customs Clearance',icon:'🛃'},
		{value:'delivered',label:'Delivered',icon:'✅'},
	];

	const getLocation = () => {
		if(!navigator.geolocation) return;
		setGeoLoading(true);
		navigator.geolocation.getCurrentPosition(
			pos => { setForm(p=>({...p, latitude:pos.coords.latitude.toFixed(6), longitude:pos.coords.longitude.toFixed(6)})); setGeoLoading(false); },
			() => { toast.error('Could not get location'); setGeoLoading(false); }
		);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if(!assignment?.shipment_id) return;
		setSaving(true);
		try {
			await api.put(ENDPOINTS.UPDATE_STATUS(assignment.shipment_id), {
				new_status: form.status,
				latitude: form.latitude ? Number(form.latitude) : undefined,
				longitude: form.longitude ? Number(form.longitude) : undefined,
				notes: form.notes || undefined,
			});
			if(form.reportIncident && form.notes.trim()) {
				await api.post(ENDPOINTS.REPORT_INCIDENT(assignment.shipment_id), null, {
					params: { incident_type:'driver_reported', description:form.notes.trim() }
				});
			}
			toast.success('Status updated successfully!');
			navigate('/driver');
		} catch(err) {
			toast.error(err?.response?.data?.detail || 'Failed to update status');
		} finally { setSaving(false); }
	};

	return (
		<div style={{animation:'fadeUp 0.5s ease',maxWidth:520,margin:'0 auto'}}>
			<h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>Update Status</h2>
			<div className="mono" style={{fontSize:13,color:T.teal,marginBottom:20}}>{assignment.tracking_number} — {assignment.origin_port_name} → {assignment.destination_port_name}</div>

			<div className="card" style={{marginBottom:16,background:'rgba(0,212,180,0.04)',border:'1px solid rgba(0,212,180,0.2)'}}>
				<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
					<div><div style={{fontSize:11,color:T.grayDim}}>CURRENT STATUS</div><div style={{fontSize:16,fontWeight:700,marginTop:4}}>{fmtStatus(assignment.current_status)}</div></div>
					<Chip label={fmtStatus(assignment.current_status)} variant="teal" dot/>
				</div>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="card" style={{marginBottom:16}}>
					<div className="section-label">New Status</div>
					<div style={{display:'flex',flexWrap:'wrap',gap:8}}>
						{STATUS_OPTIONS.map(opt=>(
							<button type="button" key={opt.value} onClick={()=>setForm(p=>({...p,status:opt.value}))}
								style={{flex:'1 0 auto',padding:'10px 14px',borderRadius:8,border:`1px solid ${form.status===opt.value?T.teal:T.border}`,background:form.status===opt.value?'rgba(0,212,180,0.1)':'transparent',color:form.status===opt.value?T.teal:T.gray,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif",transition:'all 0.2s'}}>
								{opt.icon} {opt.label}
							</button>
						))}
					</div>
				</div>

				<div className="card" style={{marginBottom:16}}>
					<div className="section-label">Location (optional)</div>
					<button type="button" className="btn-ghost" style={{width:'100%',marginBottom:12,fontSize:12}} onClick={getLocation} disabled={geoLoading}>
						{geoLoading ? 'Getting location...' : '📍 Use Current GPS Location'}
					</button>
					<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
						<input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))}
							style={{padding:'10px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.navy,color:T.white,fontSize:13,fontFamily:"'Space Grotesk',sans-serif"}}/>
						<input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))}
							style={{padding:'10px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.navy,color:T.white,fontSize:13,fontFamily:"'Space Grotesk',sans-serif"}}/>
					</div>
				</div>

				<div className="card" style={{marginBottom:16}}>
					<div className="section-label">Notes</div>
					<textarea placeholder="Traffic, weather, incidents..." value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3}
						style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.navy,color:T.white,fontSize:13,fontFamily:"'Space Grotesk',sans-serif",resize:'vertical'}}/>
					<label style={{display:'flex',alignItems:'center',gap:8,marginTop:10,fontSize:12,color:T.gray,cursor:'pointer'}}>
						<input type="checkbox" checked={form.reportIncident} onChange={e=>setForm(p=>({...p,reportIncident:e.target.checked}))} style={{accentColor:T.teal}}/>
						Also report as incident (alerts manager)
					</label>
				</div>

				<button type="submit" className="btn-primary" style={{width:'100%',padding:14}} disabled={saving}>
					{saving ? 'Submitting...' : `Update to ${fmtStatus(form.status)}`}
				</button>
			</form>
		</div>
	);
};

/* ─── Alerts ───────────────────────────────────────────────────────── */
const DriverAlertsScreen = () => {
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try { setAlerts((await api.get(ENDPOINTS.ACTIVE_ALERTS)).data || []); }
			catch { /* empty */ }
			finally { setLoading(false); }
		})();
	}, []);

	if (loading) return <div style={{display:'grid',placeItems:'center',height:200}}><Spinner size="lg"/></div>;

	const severityColor = s => ({critical:T.red,high:T.amber,medium:T.amber})[String(s||'').toLowerCase()]||T.gray;

	return (
		<div style={{animation:'fadeUp 0.5s ease'}}>
			<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
				<h2 style={{fontSize:20,fontWeight:700,margin:0}}>Alerts</h2>
				{alerts.length>0 && <span className="chip chip-red">{alerts.length} Active</span>}
			</div>
			{alerts.length===0 ? (
				<div className="card" style={{textAlign:'center',padding:32,color:T.gray}}>
					<div style={{fontSize:32,marginBottom:8}}>✅</div>
					<div style={{fontWeight:600,color:T.green}}>No active alerts</div>
				</div>
			) : alerts.map(a=>(
				<div key={a.alert_id} className="alert-card" style={{marginBottom:12,borderColor:severityColor(a.severity)}}>
					<div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}>
						<div style={{fontSize:13,fontWeight:700,color:severityColor(a.severity)}}>⚠ {String(a.severity).toUpperCase()}</div>
						{a.tracking_number && <span className="mono" style={{fontSize:10,color:T.grayDim}}>{a.tracking_number}</span>}
					</div>
					<div style={{fontSize:12,color:T.gray}}>{a.message}</div>
				</div>
			))}
		</div>
	);
};

/* ─── Main Export ──────────────────────────────────────────────────── */
export default function DriverDashboard({ initialTab = 'dashboard' }) {
	const [activeTab, setActiveTab] = useState(initialTab);
	const [assignment, setAssignment] = useState(null);
	const [allShipments, setAllShipments] = useState([]);
	const [loading, setLoading] = useState(true);
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

	useEffect(() => {
		const seg = location.pathname.split('/')[2];
		const map = {'my-tasks':'dashboard','pickup':'pickup','navigate':'navigate','alerts':'alerts'};
		if(seg && map[seg]) setActiveTab(map[seg]);
	}, [location.pathname]);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const [assignRes, shipmentsRes] = await Promise.allSettled([
					api.get(ENDPOINTS.MY_ASSIGNMENT),
					api.get(ENDPOINTS.MY_SHIPMENTS),
				]);
				if(assignRes.status==='fulfilled') setAssignment(assignRes.value.data);
				if(shipmentsRes.status==='fulfilled') setAllShipments(Array.isArray(shipmentsRes.value.data)?shipmentsRes.value.data:[]);
			} catch { /* handled by allSettled */ }
			finally { setLoading(false); }
		};
		load();
	}, []);

	return (
		<>
			<style>{css}</style>
			<div style={{background:T.navy,minHeight:'100vh',width:'100%',color:T.white,fontFamily:"'Space Grotesk',sans-serif",padding:'32px 40px',overflow:'auto'}}>
				<NavTabs activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate}/>
				{activeTab==='dashboard' && <DriverMainDashboard setTab={setActiveTab} assignment={assignment} allShipments={allShipments} loading={loading}/>}
				{activeTab==='pickup' && <DriverShipmentDetail assignment={assignment} setTab={setActiveTab}/>}
				{activeTab==='navigate' && <DriverStatusUpdate assignment={assignment}/>}
				{activeTab==='alerts' && <DriverAlertsScreen/>}
			</div>
		</>
	);
}
