import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';

const fmt = s => s ? String(s).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '—';
const fmtDate = iso => { if(!iso) return '—'; try { return new Date(iso).toLocaleString(); } catch { return iso; } };
const riskClr = l => ({critical:'#ef4444',high:'#f97316',medium:'#eab308',low:'#22c55e'}[String(l||'').toLowerCase()]||'#22c55e');

const T = {
	navy:'#080E1A',card:'#0D1526',border:'#1A2A45',
	teal:'#00D4B4',cyan:'#22D3EE',amber:'#F59E0B',red:'#EF4444',
	green:'#10B981',white:'#F0F4FF',gray:'#8A9BB5',dim:'#4A5F7A',
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
.sd{color:${T.white};font-family:'Space Grotesk',sans-serif;}
.sd .card{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:20px;margin-bottom:14px;}
.sd .row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid ${T.border};font-size:13px;}
.sd .row:last-child{border-bottom:none;}
.sd .lbl{color:${T.gray};} .sd .val{font-weight:600;color:${T.white};}
.sd .mono{font-family:'JetBrains Mono',monospace;}
.sd .chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
.sd .c-red{background:rgba(239,68,68,.15);color:${T.red};border:1px solid rgba(239,68,68,.3);}
.sd .c-amb{background:rgba(245,158,11,.15);color:${T.amber};border:1px solid rgba(245,158,11,.3);}
.sd .c-grn{background:rgba(16,185,129,.15);color:${T.green};border:1px solid rgba(16,185,129,.3);}
.sd .c-tl{background:rgba(0,212,180,.15);color:${T.teal};border:1px solid rgba(0,212,180,.3);}
.sd .btn{background:linear-gradient(135deg,${T.teal},${T.cyan});color:#000;font-weight:700;font-size:12px;padding:8px 18px;border:none;border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Space Grotesk',sans-serif;}
.sd .btn:hover{transform:translateY(-1px);} .sd .btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.sd .btn-ghost{background:transparent;color:${T.teal};border:1px solid ${T.border};padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:'Space Grotesk',sans-serif;display:flex;align-items:center;gap:6px;transition:all .2s;}
.sd .btn-ghost:hover{border-color:${T.teal};background:rgba(0,212,180,.06);}
.sd .section{font-size:13px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.sd .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.sd .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.sd .metric{text-align:center;padding:14px;background:${T.navy};border:1px solid ${T.border};border-radius:10px;}
.sd .metric .v{font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;}
.sd .metric .l{font-size:10px;color:${T.gray};margin-top:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.sd .fade{animation:fadeUp .35s ease both;}
.leaflet-container{background:#0a0f1a!important;}
`;

function Row({ label, value }) {
	return <div className="row"><span className="lbl">{label}</span><span className="val">{value ?? '—'}</span></div>;
}

function chipClass(l) { return ({critical:'c-red',high:'c-red',medium:'c-amb',low:'c-grn',in_transit:'c-tl',picked_up:'c-grn',delayed:'c-red',at_port:'c-tl',delivered:'c-grn'})[String(l||'').toLowerCase()]||'c-amb'; }

function RouteMap({ shipment, prediction, approvedRouteId, hoveredRouteId, selectedRouteId }) {
	const wp = shipment.route_waypoints || [];
	if (!wp.length) return <div className="card fade" style={{textAlign:'center',color:T.dim,padding:40}}>No route data available</div>;

	const pos = wp.map(p => [Number(p.lat), Number(p.lng)]);
	const cur = shipment.current_latitude && shipment.current_longitude
		? [Number(shipment.current_latitude), Number(shipment.current_longitude)] : null;
	const center = cur || pos[Math.floor(pos.length / 2)];

	// Original route (shown as dashed when rerouted)
	const origWp = shipment.original_route_waypoints || [];
	const origPos = origWp.map(p => [Number(p.lat), Number(p.lng)]);

	// All alternate routes from ML prediction
	const altRoutes = prediction?.alternate_routes || [];

	// After approval: approved route becomes the highlighted one
	const isRerouted = shipment.is_rerouted;
	const hasAltRoutes = altRoutes.length > 0;

	return (
		<div className="card fade" style={{ padding: 0, overflow: 'hidden' }}>
			<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px 0 20px' }}>
				<div className="section" style={{margin:0}}>🗺️ Route Map</div>
				<div style={{display:'flex',gap:12,fontSize:11,flexWrap:'wrap'}}>
					<span style={{display:'flex',alignItems:'center',gap:4}}>
						<span style={{width:16,height:3,background:isRerouted?'#f97316':T.teal,borderRadius:2,display:'inline-block'}}/>
						{isRerouted ? 'Rerouted' : 'Active Route'}
					</span>
					{origPos.length > 0 && <span style={{display:'flex',alignItems:'center',gap:4}}>
						<span style={{width:16,height:3,background:T.dim,borderRadius:2,display:'inline-block',borderTop:'1px dashed '+T.dim}}/> Original
					</span>}
					{hasAltRoutes && <span style={{display:'flex',alignItems:'center',gap:4}}>
						<span style={{width:16,height:3,background:'#6b7280',borderRadius:2,display:'inline-block'}}/> Alternates
					</span>}
					{(hoveredRouteId || selectedRouteId) && <span style={{display:'flex',alignItems:'center',gap:4}}>
						<span style={{width:16,height:3,background:T.amber,borderRadius:2,display:'inline-block'}}/> Selected
					</span>}
					<span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,background:T.green,borderRadius:'50%',display:'inline-block'}}/> Origin</span>
					<span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,background:T.red,borderRadius:'50%',display:'inline-block'}}/> Destination</span>
				</div>
			</div>
			<div style={{ height: 360, marginTop: 10 }}>
				<MapContainer center={center} zoom={3} style={{height:'100%',width:'100%'}} scrollWheelZoom>
					<TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; OSM &copy; CARTO" />

					{/* Original route - dashed gray when rerouted */}
					{origPos.length > 0 && <Polyline positions={origPos} pathOptions={{ color: T.dim, weight: 2, opacity: 0.45, dashArray: '8 6' }} />}

					{/* All alternate routes as gray dotted lines */}
					{altRoutes.map(r => {
						const rPos = (r.waypoints || []).map(p => [Number(p.lat), Number(p.lng)]);
						if (rPos.length < 2) return null;
						const isApproved = approvedRouteId === r.route_id;
						const isSelected = selectedRouteId === r.route_id;
						const isHovered = hoveredRouteId === r.route_id;
						const highlight = isHovered || isSelected || isApproved;
						return (
							<Polyline
								key={r.route_id}
								positions={rPos}
								pathOptions={{
									color: isApproved ? '#f97316' : isSelected ? T.amber : isHovered ? '#fbbf24' : '#4b5563',
									weight: highlight ? 3 : 2,
									opacity: highlight ? 0.95 : 0.45,
									dashArray: isApproved ? undefined : '6 5',
								}}
							>
								{highlight && <Tooltip sticky>{r.name} — Risk {Number(r.risk_score).toFixed(1)}</Tooltip>}
							</Polyline>
						);
					})}

					{/* Active route - solid */}
					<Polyline positions={pos} pathOptions={{ color: isRerouted ? '#f97316' : T.teal, weight: 3, opacity: 0.9 }} />

					{/* Port markers */}
					<CircleMarker center={pos[0]} radius={7} pathOptions={{color:T.green,fillColor:T.green,fillOpacity:1,weight:2}}>
						<Tooltip direction="top" offset={[0,-8]}><strong>{shipment.origin_port_name||'Origin'}</strong></Tooltip>
					</CircleMarker>
					<CircleMarker center={pos[pos.length-1]} radius={7} pathOptions={{color:T.red,fillColor:T.red,fillOpacity:1,weight:2}}>
						<Tooltip direction="top" offset={[0,-8]}><strong>{shipment.destination_port_name||'Destination'}</strong></Tooltip>
					</CircleMarker>

					{/* Live position */}
					{cur && (
						<CircleMarker center={cur} radius={10} pathOptions={{color:T.teal,fillColor:T.teal,fillOpacity:.9,weight:3}}>
							<Tooltip permanent direction="top" offset={[0,-12]}><strong>{shipment.tracking_number} — Live</strong></Tooltip>
						</CircleMarker>
					)}
				</MapContainer>
			</div>
		</div>
	);
}

export default function ShipmentDetail() {
	const navigate = useNavigate();
	const { id } = useParams();
	const [shipment, setShipment] = useState(null);
	const [prediction, setPrediction] = useState(null);
	const [loading, setLoading] = useState(true);
	const [predLoading, setPredLoading] = useState(false);
	const [error, setError] = useState('');
	const [approvingRoute, setApprovingRoute] = useState(null);
	const [approvedRouteId, setApprovedRouteId] = useState(null);
	const [hoveredRouteId, setHoveredRouteId] = useState(null);
	const [selectedRouteId, setSelectedRouteId] = useState(null);

	useEffect(() => {
		(async () => {
			setLoading(true);
			try { setShipment((await api.get(ENDPOINTS.SHIPMENT_DETAIL(id))).data); }
			catch { setError('Unable to load shipment.'); }
			finally { setLoading(false); }
		})();
	}, [id]);

	const runPrediction = useCallback(async () => {
		setPredLoading(true);
		try { setPrediction((await api.get(ENDPOINTS.ML_PREDICTION(id))).data); }
		catch {} finally { setPredLoading(false); }
	}, [id]);

	const approveReroute = useCallback(async (routeId) => {
		setApprovingRoute(routeId);
		try {
			await api.post(`${ENDPOINTS.APPROVE_REROUTE(id)}?route_id=${routeId}`);
			setApprovedRouteId(routeId);
			setSelectedRouteId(routeId);
			// Re-fetch shipment so map gets the new active route waypoints
			try {
				const res = await api.get(ENDPOINTS.SHIPMENT_DETAIL(id));
				setShipment(res.data);
			} catch {}
		} catch {} finally { setApprovingRoute(null); }
	}, [id]);

	if (loading) return <div style={{display:'grid',placeItems:'center',minHeight:300}}><Spinner size="lg" /></div>;
	if (error || !shipment) return (
		<div className="sd"><style>{css}</style>
			<div className="card" style={{textAlign:'center',padding:40}}>
				<div style={{color:T.red,marginBottom:12}}>{error||'Shipment not found'}</div>
				<button className="btn-ghost" onClick={()=>navigate('/manager')}>← Back</button>
			</div>
		</div>
	);

	const mo = prediction?.model_outputs || {};
	const fi = prediction?.financial_impact || {};
	const altRoutes = prediction?.alternate_routes || [];
	const approvedAlt = altRoutes.find(r => r.route_id === approvedRouteId);

	return (
		<>
			<style>{css}</style>
			<div className="sd">
				{/* ─── HEADER ─── */}
				<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,paddingBottom:20,borderBottom:`1px solid ${T.border}`}}>
					<div>
						<button className="btn-ghost" onClick={()=>navigate('/manager?tab=consignments')}><ArrowLeft size={14}/> Consignments</button>
						<h1 className="mono" style={{fontSize:22,fontWeight:700,marginTop:10}}>{shipment.tracking_number}</h1>
						<div style={{fontSize:11,color:T.dim,marginTop:2}}>ID: {shipment.shipment_id}</div>
					</div>
					<div style={{display:'flex',gap:8,alignItems:'center'}}>
						<span className={`chip ${chipClass(shipment.current_status)}`}>{fmt(shipment.current_status)}</span>
						<span className={`chip ${chipClass(shipment.current_risk_level)}`}>{fmt(shipment.current_risk_level)} Risk</span>
						{shipment.is_rerouted && <span className="chip c-amb">Rerouted ×{shipment.reroute_count||1}</span>}
					</div>
				</div>

				{/* ─── MAP ─── */}
				<RouteMap
					shipment={shipment}
					prediction={prediction}
					approvedRouteId={approvedRouteId}
					hoveredRouteId={hoveredRouteId}
					selectedRouteId={selectedRouteId}
				/>

				{/* ─── REROUTE BANNER ─── */}
				{approvedAlt && (
					<div className="card fade" style={{borderLeft:`3px solid #f97316`,background:'rgba(249,115,22,.06)'}}>
						<div className="section" style={{color:'#f97316'}}>🔀 Route Changed</div>
						<div className="g3">
							<div><div style={{fontSize:10,color:T.gray}}>ORIGINAL ROUTE</div><div style={{fontSize:13,fontWeight:600}}>{shipment.origin_port_name} → {shipment.destination_port_name}</div><div style={{fontSize:11,color:T.dim}}>Risk: {shipment.current_risk_score ?? '—'} · Active route</div></div>
							<div><div style={{fontSize:10,color:T.gray}}>NEW ROUTE</div><div style={{fontSize:13,fontWeight:600,color:'#f97316'}}>{approvedAlt.name}</div><div style={{fontSize:11,color:T.dim}}>Risk: {Number(approvedAlt.risk_score).toFixed(1)} · +${Number(approvedAlt.extra_cost_usd).toFixed(0)}</div></div>
							<div><div style={{fontSize:10,color:T.gray}}>REASON</div><div style={{fontSize:13,fontWeight:600,color:T.green}}>ML Decision: {mo.reroute_decision}</div><div style={{fontSize:11,color:T.dim}}>Confidence: {mo.confidence_percent}% · Delay saved: {mo.predicted_delay_hr}h</div></div>
						</div>
					</div>
				)}

				<div className="g2">
					{/* ─── LEFT COLUMN ─── */}
					<div>
						{/* Risk + ML */}
						<div className="card fade" style={{borderLeft:`3px solid ${riskClr(shipment.current_risk_level)}`}}>
							<div className="section">🎯 Risk Assessment</div>
							<div className="g3" style={{marginBottom:14}}>
								<div className="metric"><div className="v" style={{color:riskClr(shipment.current_risk_level)}}>{shipment.current_risk_score!=null?Number(shipment.current_risk_score).toFixed(1):'—'}</div><div className="l">Risk Score</div></div>
								<div className="metric"><div className="v" style={{color:T.amber}}>{mo.predicted_delay_hr!=null?`${mo.predicted_delay_hr}h`:'—'}</div><div className="l">Predicted Delay</div></div>
								<div className="metric"><div className="v" style={{color:mo.reroute_decision==='REROUTE'?T.red:T.green}}>{mo.reroute_decision||'—'}</div><div className="l">ML Decision</div></div>
							</div>
							{!prediction && <button className="btn" onClick={runPrediction} disabled={predLoading}>{predLoading?'Running ML…':'⚡ Run ML Analysis'}</button>}
							{prediction && <div style={{fontSize:11,color:T.dim}}>Confidence: {mo.confidence_percent}% · Models: XGBoost + RF + GB</div>}
						</div>

						{/* Alternate Routes */}
						{altRoutes.length > 0 && (
							<div className="card fade">
								<div className="section">🔀 Alternate Routes ({altRoutes.length})</div>
								{altRoutes.map(r => {
							const isApproved = approvedRouteId === r.route_id;
							const isSelected = selectedRouteId === r.route_id;
							const isHovered = hoveredRouteId === r.route_id;
							const highlight = isSelected || isHovered;
							return (
								<div
									key={r.route_id}
									className="card"
									onMouseEnter={() => setHoveredRouteId(r.route_id)}
									onMouseLeave={() => setHoveredRouteId(null)}
									onClick={() => setSelectedRouteId(isSelected ? null : r.route_id)}
									style={{
										borderLeft: `3px solid ${isApproved ? '#f97316' : isSelected ? T.amber : isHovered ? '#fbbf2466' : T.border}`,
										padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
										background: isApproved ? 'rgba(249,115,22,.08)' : highlight ? 'rgba(245,158,11,.06)' : undefined,
										transition: 'all .15s ease',
									}}
								>
									<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
										<div>
											<div style={{fontSize:13,fontWeight:600,color:isApproved?'#f97316':isSelected?T.amber:'inherit'}}>
												{r.name}
												{isSelected && !isApproved && <span style={{fontSize:10,color:T.amber,marginLeft:6}}>← shown on map</span>}
											</div>
											<div style={{fontSize:11,color:T.gray}}>Risk: {Number(r.risk_score).toFixed(1)} · +${Number(r.extra_cost_usd).toFixed(0)} · +{Number(r.delay_hours ?? r.extra_time_hours ?? 0).toFixed(1)}h</div>
										</div>
										<div style={{display:'flex',gap:6,alignItems:'center'}}>
											{r.recommended && <span className="chip c-grn">Recommended</span>}
											{isApproved
												? <span className="chip c-grn">Active ✓</span>
												: <button
														className="btn"
														style={{padding:'5px 12px',fontSize:11}}
														onClick={e => { e.stopPropagation(); approveReroute(r.route_id); }}
														disabled={approvingRoute === r.route_id}
													>
														{approvingRoute === r.route_id ? '…' : 'Approve'}
													</button>
											}
										</div>
									</div>
								</div>
							);
						})}
							</div>
						)}

						{/* Financial */}
						{prediction?.financial_impact && (
							<div className="card fade">
								<div className="section">💰 Financial Impact</div>
								<Row label="Damage Probability" value={`${(fi.current_route_damage_probability*100).toFixed(1)}%`}/>
								<Row label="Expected Loss (current)" value={`$${Number(fi.current_route_expected_loss_usd).toLocaleString()}`}/>
								<Row label="Reroute Extra Cost" value={`$${Number(fi.recommended_route_extra_cost_usd).toLocaleString()}`}/>
								<Row label="Net Saving" value={<span style={{color:T.green,fontWeight:700}}>${Number(fi.net_saving_usd).toLocaleString()}</span>}/>
							</div>
						)}
					</div>

					{/* ─── RIGHT COLUMN ─── */}
					<div>
						{/* Route Info */}
						<div className="card fade">
							<div className="section">📦 Shipment Info</div>
							<Row label="Origin" value={shipment.origin_port_name}/>
							<Row label="Destination" value={shipment.destination_port_name}/>
							<Row label="Priority" value={fmt(shipment.priority_level)}/>
							<Row label="Expected Arrival" value={fmtDate(shipment.expected_arrival)}/>
							<Row label="Actual Arrival" value={fmtDate(shipment.actual_arrival)}/>
							<Row label="Rerouted" value={shipment.is_rerouted?`Yes (×${shipment.reroute_count})`:'No'}/>
							{shipment.actual_delay_hours!=null&&<Row label="Actual Delay" value={`${shipment.actual_delay_hours}h`}/>}
						</div>

						{/* Cargo */}
						{(shipment.cargo_type||shipment.cargo_description) && (
							<div className="card fade">
								<div className="section">📋 Cargo Details</div>
								<Row label="Type" value={fmt(shipment.cargo_type)}/>
								<Row label="Description" value={shipment.cargo_description}/>
								<Row label="Value" value={shipment.declared_value!=null?`$${Number(shipment.declared_value).toLocaleString()}`:null}/>
								<Row label="Weight" value={shipment.weight_kg?`${shipment.weight_kg} kg`:null}/>
								<Row label="Sensitivity" value={shipment.cargo_sensitivity_score}/>
							</div>
						)}

						{/* Team */}
						<div className="card fade">
							<div className="section">👥 Team</div>
							<Row label="Shipper" value={shipment.shipper_name}/>
							<Row label="Receiver" value={shipment.receiver_name}/>
							<Row label="Manager" value={shipment.manager_name}/>
							<Row label="Driver" value={shipment.driver_name||<span style={{color:T.amber}}>Not assigned</span>}/>
							<Row label="Vessel" value={shipment.vessel_name}/>
						</div>

						{/* Position */}
						{(shipment.current_latitude||shipment.current_longitude)&&(
							<div className="card fade">
								<div className="section">📍 Live Position</div>
								<Row label="Latitude" value={shipment.current_latitude}/>
								<Row label="Longitude" value={shipment.current_longitude}/>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
