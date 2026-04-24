import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { api } from '../../config/api';
import MLPanel from './MLPanel';
import { ENDPOINTS } from '../../config/endpoints';
import { normalizeShipment } from '../../utils/shipmentView';

const C = {
  bg: '#0a0f1a', panel: '#111827', border: '#1e2d45',
  teal: '#00d4b4', amber: '#f59e0b', red: '#ef4444',
  green: '#10b981', white: '#f0f4ff', gray: '#8a9bb5', dim: '#4a5f7a',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  .ct-wrap{display:flex;height:100%;background:${C.bg};color:${C.white};font-family:'Space Grotesk',sans-serif;overflow:hidden;}
  .ct-sidebar{width:280px;flex-shrink:0;background:${C.panel};border-right:1px solid ${C.border};display:flex;flex-direction:column;overflow:hidden;}
  .ct-map{flex:1;position:relative;min-width:0;min-height:0;}
  .ct-detail{width:320px;flex-shrink:0;background:${C.panel};border-left:1px solid ${C.border};overflow-y:auto;}
  .ct-search{padding:12px;border-bottom:1px solid ${C.border};}
  .ct-search input{width:100%;background:#1a2640;border:1px solid ${C.border};border-radius:8px;padding:8px 12px;color:${C.white};font-size:12px;outline:none;}
  .ct-search input::placeholder{color:${C.dim};}
  .ct-filters{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid ${C.border};flex-wrap:wrap;}
  .ct-filter{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid ${C.border};background:transparent;color:${C.gray};transition:all .2s;}
  .ct-filter.active{background:${C.teal};color:#000;border-color:${C.teal};}
  .ct-list{flex:1;overflow-y:auto;padding:8px;}
  .ct-card{padding:12px;border-radius:8px;border:1px solid ${C.border};margin-bottom:8px;cursor:pointer;transition:all .2s;background:transparent;}
  .ct-card:hover{border-color:rgba(0,212,180,.4);background:rgba(0,212,180,.04);}
  .ct-card.active{border-color:${C.teal};background:rgba(0,212,180,.08);}
  .ct-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;}
  .ct-badge.transit{background:rgba(0,212,180,.15);color:${C.teal};}
  .ct-badge.delayed{background:rgba(245,158,11,.15);color:${C.amber};}
  .ct-badge.delivered{background:rgba(16,185,129,.15);color:${C.green};}
  .ct-badge.pending{background:rgba(139,155,181,.15);color:${C.gray};}
  .ct-progress{height:3px;background:#1a2640;border-radius:2px;margin:6px 0;}
  .ct-progress-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,${C.teal},#22d3ee);}
  .ct-detail-header{padding:16px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;}
  .ct-detail-section{padding:14px 16px;border-bottom:1px solid ${C.border};}
  .ct-detail-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px;}
  .ct-detail-label{color:${C.gray};}
  .ct-detail-val{font-weight:600;color:${C.white};}
  .ct-route-bar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid ${C.border};}
  .ct-port{text-align:center;}
  .ct-port-code{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${C.white};}
  .ct-port-city{font-size:10px;color:${C.gray};}
  .ct-route-line{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;}
  .ct-route-track{width:100%;height:4px;background:#1a2640;border-radius:2px;position:relative;}
  .ct-route-dot{width:10px;height:10px;border-radius:50%;background:${C.teal};position:absolute;top:-3px;transform:translateX(-50%);box-shadow:0 0 8px ${C.teal};}
  .ct-status-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:0;border-bottom:1px solid ${C.border};}
  .ct-status-cell{padding:10px 8px;text-align:center;border-right:1px solid ${C.border};cursor:pointer;}
  .ct-status-cell:last-child{border-right:none;}
  .ct-status-num{font-size:20px;font-weight:700;}
  .ct-status-lbl{font-size:9px;color:${C.gray};text-transform:uppercase;}
  .ct-mono{font-family:'JetBrains Mono',monospace;}
  .ct-timeline-item{display:flex;gap:10px;padding:8px 0;}
  .ct-timeline-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
  .ct-timeline-line{width:1px;background:${C.border};margin:0 auto;}
  .leaflet-container{background:#0a0f1a!important;}
`;

function riskColor(level) {
  return { critical: C.red, high: C.amber, medium: C.amber, low: C.green }[level] || C.gray;
}
function badgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('transit')) return 'transit';
  if (s.includes('delay')) return 'delayed';
  if (s.includes('deliver')) return 'delivered';
  return 'pending';
}
function fmtStatus(s) { return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function fmtDate(iso) { try { return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso || '—'; } }

// Demo shipments for when backend is offline
const DEMO = [
  { shipment_id: 'demo-1', tracking_number: 'CTK-7291-XRAY', current_status: 'in_transit', current_risk_level: 'medium', current_risk_score: 54, origin_port_name: 'Istanbul', destination_port_name: 'New York', departure_time: '2025-07-20T08:00:00Z', expected_arrival: '2025-07-22T16:00:00Z', shipper_name: 'Turkish Cargo', vessel_name: 'MSK ULTRA', cargo_type: 'standard', cargo_description: 'Electronics', declared_value: 45000, weight_kg: 4520, quantity: 84, current_latitude: 41.0, current_longitude: 28.5, route_waypoints: [{ lat: 41.0, lng: 28.5 }, { lat: 40.7, lng: -74.0 }] },
  { shipment_id: 'demo-2', tracking_number: 'CTK-4418-ZULU', current_status: 'in_transit', current_risk_level: 'low', current_risk_score: 21, origin_port_name: 'Shanghai', destination_port_name: 'Rotterdam', departure_time: '2025-08-01T06:00:00Z', expected_arrival: '2025-08-03T14:00:00Z', shipper_name: 'Maersk Line', vessel_name: 'MSK ULTRA', cargo_type: 'standard', cargo_description: 'Auto Parts', declared_value: 120000, weight_kg: 24000, quantity: 2, current_latitude: 31.2, current_longitude: 121.5, route_waypoints: [{ lat: 31.2, lng: 121.5 }, { lat: 51.9, lng: 4.5 }] },
  { shipment_id: 'demo-3', tracking_number: 'CTK-9934-FOXT', current_status: 'delayed', current_risk_level: 'high', current_risk_score: 78, origin_port_name: 'Memphis', destination_port_name: 'London', departure_time: '2025-07-21T10:00:00Z', expected_arrival: '2025-07-23T18:00:00Z', shipper_name: 'FedEx Express', vessel_name: 'FDX-2208', cargo_type: 'pharmaceutical', cargo_description: 'Medical Supplies', declared_value: 89000, weight_kg: 890, quantity: 12, current_latitude: 35.1, current_longitude: -90.0, route_waypoints: [{ lat: 35.1, lng: -90.0 }, { lat: 51.5, lng: -0.1 }] },
  { shipment_id: 'demo-4', tracking_number: 'CTK-1155-ECHO', current_status: 'in_transit', current_risk_level: 'low', current_risk_score: 18, origin_port_name: 'Munich', destination_port_name: 'Warsaw', departure_time: '2025-07-21T08:00:00Z', expected_arrival: '2025-07-22T16:00:00Z', shipper_name: 'DB Schenker', receiver_name: 'Polish Motors', vessel_name: 'DBS-TRK44', cargo_type: 'standard', cargo_description: 'Auto Parts', declared_value: 32000, weight_kg: 1200, quantity: 6, current_latitude: 48.8, current_longitude: 14.2, route_waypoints: [{ lat: 48.1, lng: 11.6 }, { lat: 48.8, lng: 14.2 }, { lat: 52.2, lng: 21.0 }] },
];

function ShipmentCard({ s, active, onClick }) {
  const sv = normalizeShipment ? normalizeShipment(s) : s;
  const pct = Math.round(Math.min(98, Math.max(5, 100 - (s.current_risk_score || 30))));
  return (
    <div className={`ct-card${active ? ' active' : ''}`} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span className="ct-mono" style={{ fontSize: 11, color: C.teal }}>{s.tracking_number}</span>
        <span className={`ct-badge ${badgeClass(s.current_status)}`}>{fmtStatus(s.current_status)}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.shipper_name || s.origin_port_name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.gray, marginBottom: 6 }}>
        <span>{s.origin_port_name} → {s.destination_port_name}</span>
        <span>{s.vessel_name || '—'}</span>
      </div>
      <div className="ct-progress"><div className="ct-progress-fill" style={{ width: `${pct}%` }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.dim }}>
        <span>ETA {fmtDate(s.expected_arrival)}</span>
        {s.weight_kg && <span>⚖ {Number(s.weight_kg).toLocaleString()} kg</span>}
        {s.quantity && <span>📦 {s.quantity} pcs</span>}
      </div>
    </div>
  );
}

function DetailPanel({ s, onClose, onViewDetails }) {
  if (!s) return null;
  const pct = Math.round(Math.min(98, Math.max(5, 100 - (s.current_risk_score || 30))));
  const originCode = String(s.origin_port_name || '').slice(0, 3).toUpperCase();
  const destCode = String(s.destination_port_name || '').slice(0, 3).toUpperCase();
  const timeline = [
    { label: 'Shipment Created', done: true },
    { label: 'Picked Up', done: ['in_transit', 'at_port', 'delayed', 'delivered'].includes(s.current_status) },
    { label: 'In Transit', done: ['in_transit', 'delayed', 'at_port', 'delivered'].includes(s.current_status), active: s.current_status === 'in_transit' },
    { label: 'At Port / Customs', done: ['at_port', 'delivered'].includes(s.current_status) },
    { label: 'Out for Delivery', done: s.current_status === 'delivered' },
    { label: 'Delivered', done: s.current_status === 'delivered' },
  ];
  return (
    <div className="ct-detail">
      <div className="ct-detail-header">
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.gray }}>{s.cargo_type?.replace(/_/g, ' ') || 'Freight'}</span>
            <span className={`ct-badge ${badgeClass(s.current_status)}`}>{fmtStatus(s.current_status)}</span>
          </div>
          <div className="ct-mono" style={{ fontSize: 15, fontWeight: 700 }}>{s.tracking_number}</div>
          <div style={{ fontSize: 11, color: C.dim }}>{s.shipper_name} · {s.vessel_name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.gray, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Route bar */}
      <div className="ct-route-bar">
        <div className="ct-port">
          <div className="ct-port-code">{originCode}</div>
          <div className="ct-port-city">{s.origin_port_name}</div>
        </div>
        <div className="ct-route-line">
          <div className="ct-route-track">
            <div className="ct-route-dot" style={{ left: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 10, color: C.teal }}>{pct}% complete</div>
        </div>
        <div className="ct-port">
          <div className="ct-port-code">{destCode}</div>
          <div className="ct-port-city">{s.destination_port_name}</div>
        </div>
      </div>

      {/* ETA + Departed */}
      <div className="ct-detail-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>⏱ ETA</div><div style={{ fontWeight: 700 }}>{fmtDate(s.expected_arrival)}</div></div>
          <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>🛫 Departed</div><div style={{ fontWeight: 700 }}>{fmtDate(s.departure_time)}</div></div>
          {s.weight_kg && <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>⚖ Weight</div><div style={{ fontWeight: 700 }}>{Number(s.weight_kg).toLocaleString()} kg</div></div>}
          {s.quantity && <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>📦 Pieces</div><div style={{ fontWeight: 700 }}>{s.quantity} pcs</div></div>}
        </div>
      </div>

      {/* Route Cost & Distance */}
      {(s.route_distance_km || s.route_duration_hr || s.route_fuel_cost) && (
        <div className="ct-detail-section">
          <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Route Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {s.route_distance_km && <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>📏 Distance</div><div style={{ fontWeight: 700 }}>{Number(s.route_distance_km).toLocaleString()} km</div></div>}
            {s.route_duration_hr && <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>⏳ Duration</div><div style={{ fontWeight: 700 }}>{Number(s.route_duration_hr).toFixed(0)} hrs</div></div>}
            {s.route_fuel_cost && <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>⛽ Fuel Cost</div><div style={{ fontWeight: 700, color: C.amber }}>${Number(s.route_fuel_cost).toLocaleString()}</div></div>}
            {s.declared_value && <div><div style={{ fontSize: 10, color: C.gray, marginBottom: 4 }}>💰 Cargo Value</div><div style={{ fontWeight: 700, color: C.teal }}>${Number(s.declared_value).toLocaleString()}</div></div>}
          </div>
        </div>
      )}

      {/* Parties */}
      <div className="ct-detail-section">
        <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Parties</div>
        {[['Shipper', s.shipper_name], ['Consignee', s.receiver_name], ['Description', s.cargo_description], ['Vessel', s.vessel_name], ['Manager', s.manager_name]].filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="ct-detail-row">
            <span className="ct-detail-label">{k}</span>
            <span className="ct-detail-val">{v}</span>
          </div>
        ))}
        {s.declared_value && <div className="ct-detail-row"><span className="ct-detail-label">Value</span><span className="ct-detail-val">${Number(s.declared_value).toLocaleString()}</span></div>}
        {s.current_risk_score != null && (
          <div className="ct-detail-row">
            <span className="ct-detail-label">Risk Score</span>
            <span style={{ fontWeight: 700, color: riskColor(s.current_risk_level) }}>{Number(s.current_risk_score).toFixed(1)} · {String(s.current_risk_level || '').toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* ML Analysis — fetches live from backend */}
      <MLPanel shipment={s} />

      {/* Tracking timeline */}
      <div className="ct-detail-section">
        <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>Tracking Timeline</div>
        {timeline.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < timeline.length - 1 ? 0 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: step.done ? C.teal : step.active ? C.amber : C.border, flexShrink: 0, border: step.active ? `2px solid ${C.amber}` : 'none', boxShadow: step.done ? `0 0 6px ${C.teal}` : 'none' }} />
              {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: step.done ? C.teal : C.border, minHeight: 20 }} />}
            </div>
            <div style={{ paddingBottom: 12, fontSize: 12 }}>
              <div style={{ fontWeight: step.active ? 700 : 500, color: step.done ? C.white : C.dim }}>{step.label}</div>
              {step.active && <div style={{ fontSize: 10, color: C.teal }}>Current Location</div>}
            </div>
          </div>
        ))}
      </div>

      {/* View Full Details button */}
      {onViewDetails && !String(s.shipment_id || '').startsWith('demo-') && (
        <div className="ct-detail-section" style={{ borderBottom: 'none' }}>
          <button onClick={() => onViewDetails(s.shipment_id)} style={{ width: '100%', background: `linear-gradient(135deg, ${C.teal}, #22d3ee)`, color: '#000', fontWeight: 700, fontSize: 13, padding: '12px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", transition: 'all .2s' }}>
            View Full Details →
          </button>
        </div>
      )}
    </div>
  );
}

export default function CargoTrackMap({ initialShipments, initialSelected }) {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState(initialShipments || DEMO);
  const [selected, setSelected] = useState(initialSelected || null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Fetch live shipments if none passed
  useEffect(() => {
    if (initialShipments) { setShipments(initialShipments); return; }
    api.get(ENDPOINTS.ALL_SHIPMENTS).then(r => { if (r.data?.length) setShipments(r.data); }).catch(() => {});
  }, [initialShipments]);

  useEffect(() => { if (initialSelected) setSelected(initialSelected); }, [initialSelected]);

  const FILTERS = ['all', 'in_transit', 'picked_up', 'delayed', 'at_port', 'delivered'];
  const filtered = shipments.filter(s => {
    const matchF = filter === 'all' || String(s.current_status) === filter;
    const matchS = !search || s.tracking_number?.toLowerCase().includes(search.toLowerCase()) || s.shipper_name?.toLowerCase().includes(search.toLowerCase()) || s.origin_port_name?.toLowerCase().includes(search.toLowerCase()) || s.destination_port_name?.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const counts = { all: shipments.length, in_transit: shipments.filter(s => s.current_status === 'in_transit').length, picked_up: shipments.filter(s => s.current_status === 'picked_up').length, delayed: shipments.filter(s => s.current_status === 'delayed').length, at_port: shipments.filter(s => s.current_status === 'at_port').length, delivered: shipments.filter(s => s.current_status === 'delivered').length };
  const mapCenter = selected?.current_latitude ? [Number(selected.current_latitude), Number(selected.current_longitude)] : [20, 10];

  return (
    <>
      <style>{css}</style>
      <div className="ct-wrap">
        {/* LEFT SIDEBAR */}
        <div className="ct-sidebar">
          <div className="ct-search">
            <input placeholder="Search tracking #, port, carrier…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderBottom: `1px solid ${C.border}` }}>
            {[{ k: 'all', l: 'All' }, { k: 'in_transit', l: 'Transit' }, { k: 'picked_up', l: 'Pickup' }, { k: 'delayed', l: 'Delayed' }, { k: 'at_port', l: 'Port' }, { k: 'delivered', l: 'Done' }].map(({ k, l }) => (
              <button key={k} className={`ct-filter${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
                {l} <span style={{ opacity: .7 }}>{counts[k]}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 12px', fontSize: 11, color: C.dim }}>{filtered.length} shipments</div>
          <div className="ct-list">
            {filtered.map(s => (
              <ShipmentCard key={s.shipment_id} s={s} active={selected?.shipment_id === s.shipment_id} onClick={() => setSelected(s)} />
            ))}
          </div>
        </div>

        {/* MAP */}
        <div className="ct-map">
          <MapContainer center={mapCenter} zoom={selected ? 4 : 2} style={{ height: '100%', width: '100%' }} key={selected?.shipment_id || 'world'}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap © CARTO" />
            {filtered.map(s => {
              if (!s.route_waypoints?.length) return null;
              const positions = s.route_waypoints.map(p => [p.lat, p.lng]);
              const isActive = selected?.shipment_id === s.shipment_id;
              const color = riskColor(s.current_risk_level);
              return (
                <g key={s.shipment_id}>
                  <Polyline positions={positions} pathOptions={{ color: isActive ? C.teal : color, weight: isActive ? 3 : 1.5, opacity: isActive ? 1 : 0.5, dashArray: s.current_status === 'delayed' ? '6,4' : null }} eventHandlers={{ click: () => setSelected(s) }} />
                  {s.current_latitude && (
                    <CircleMarker center={[s.current_latitude, s.current_longitude]} radius={isActive ? 10 : 7} pathOptions={{ color: isActive ? C.teal : color, fillColor: isActive ? C.teal : color, fillOpacity: 0.9, weight: isActive ? 3 : 1 }} eventHandlers={{ click: () => setSelected(s) }}>
                      <Tooltip permanent={isActive} direction="top" offset={[0, -10]}>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{s.tracking_number}</span>
                      </Tooltip>
                    </CircleMarker>
                  )}
                  {positions[0] && <CircleMarker center={positions[0]} radius={5} pathOptions={{ color: C.green, fillColor: C.green, fillOpacity: 1, weight: 1 }} />}
                  {positions[positions.length - 1] && <CircleMarker center={positions[positions.length - 1]} radius={5} pathOptions={{ color: C.gray, fillColor: C.gray, fillOpacity: 1, weight: 1 }} />}
                </g>
              );
            })}
          </MapContainer>
        </div>

        {/* RIGHT DETAIL PANEL */}
        {selected && <DetailPanel s={selected} onClose={() => setSelected(null)} onViewDetails={(id) => navigate(`/manager/shipments/${id}`)} />}
      </div>
    </>
  );
}
