import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';

// ── CSS — uses only CSS variables so light/dark theme toggle works ─────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@700&family=JetBrains+Mono:wght@400;500&display=swap');
.mc *{box-sizing:border-box;}
.mc{font-family:'Space Grotesk',sans-serif;color:var(--text-primary,#F0F4FF);padding:20px 24px 24px;}
.stat-row{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:16px;}
.scard{background:var(--bg-surface,#0C1424);border:1px solid var(--border-default,#1A2A45);border-radius:10px;padding:14px 16px;position:relative;overflow:hidden;transition:border-color .2s;}
.scard:hover{border-color:rgba(0,212,180,.35);}
.scard::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
.sval{font-family:'Orbitron',monospace;font-size:20px;font-weight:700;line-height:1.2;}
.slbl{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted,#8A9BB5);margin-bottom:6px;}
.ssub{font-size:10px;color:var(--text-muted,#8A9BB5);opacity:.7;margin-top:4px;}
.map-wrap{background:var(--bg-surface,#0C1424);border:1px solid var(--border-default,#1A2A45);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;margin-bottom:14px;}
.map-toolbar{padding:10px 14px;border-bottom:1px solid var(--border-default,#1A2A45);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.mode-btn{padding:4px 11px;border-radius:16px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid var(--border-default,#1A2A45);background:transparent;color:var(--text-muted,#8A9BB5);font-family:'Space Grotesk',sans-serif;transition:all .15s;}
.mode-btn.on{background:rgba(0,212,180,.12);color:#00D4B4;border-color:#00D4B4;}
.bottom-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;}
.alert-panel{background:var(--bg-surface,#0C1424);border:1px solid var(--border-default,#1A2A45);border-radius:10px;overflow:hidden;}
.qa-panel{background:var(--bg-surface,#0C1424);border:1px solid var(--border-default,#1A2A45);border-radius:10px;padding:12px 14px;width:260px;}
.rp-head{padding:9px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-default,#1A2A45);background:var(--bg-elevated,rgba(0,0,0,.04));}
.rp-title{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-muted,#8A9BB5);}
.aitem{display:flex;gap:10px;align-items:flex-start;padding:8px 14px;cursor:pointer;border-bottom:1px solid var(--border-default,#1A2A45);transition:background .15s;}
.aitem:last-child{border-bottom:none;}
.aitem:hover{background:rgba(0,212,180,.04);}
.mc-chip{display:inline-flex;align-items:center;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}
.qa-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;}
.qa-btn{text-align:center;padding:10px 8px;background:var(--bg-base,#060C18);border:1px solid var(--border-default,#1A2A45);border-radius:8px;cursor:pointer;transition:all .15s;font-family:'Space Grotesk',sans-serif;}
.qa-btn:hover{border-color:#00D4B4;background:rgba(0,212,180,.06);}
@keyframes mcpulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.ldot{width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;animation:mcpulse 2s infinite;}
`;

const RC = {critical:'#EF4444',high:'#F97316',medium:'#F59E0B',low:'#10B981'};
const rc = l => RC[String(l||'').toLowerCase()] || '#8A9BB5';
const fmt = s => s ? s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '—';
const ago = iso => { const d=Math.floor((Date.now()-new Date(iso))/1000); if(d<60)return`${d}s ago`; if(d<3600)return`${Math.floor(d/60)}m ago`; return`${Math.floor(d/3600)}h ago`; };

const FB_STATS = {active_shipments:0,critical_count:0,high_risk_count:0,on_time_percentage:0,delayed_count:0,revenue_at_risk:0};
const FB_ALERTS = [
  {alert_id:'a1',severity:'critical',message:'Storm detected on route',shipment:'—',location:'North Atlantic',created_at:new Date(Date.now()-120000).toISOString()},
  {alert_id:'a2',severity:'high',message:'Port congestion increased',shipment:'—',location:'Port of Dubai',created_at:new Date(Date.now()-300000).toISOString()},
  {alert_id:'a3',severity:'medium',message:'Traffic jam on NH-48',shipment:'—',location:'Delhi, India',created_at:new Date(Date.now()-900000).toISOString()},
];

// Detect current theme from document attribute
function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(document.documentElement.getAttribute('data-theme') || 'dark'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export default function MissionControl({ user }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState(FB_STATS);
  const [ships, setShips] = useState([]);
  const [alerts, setAlerts] = useState(FB_ALERTS);
  const [dummy, setDummy] = useState(true);
  const [mode, setMode] = useState('all');
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, shRes, aRes] = await Promise.allSettled([
          api.get(ENDPOINTS.MANAGER_SUMMARY),
          api.get(ENDPOINTS.ALL_SHIPMENTS),
          api.get(ENDPOINTS.ACTIVE_ALERTS),
        ]);
        let gotReal = false;
        if (sRes.status === 'fulfilled' && sRes.value?.data) {
          const d = sRes.value.data;
          setStats({
            active_shipments:    d.active_shipments ?? 0,
            critical_count:      d.critical_count ?? d.high_risk_count ?? 0,
            high_risk_count:     d.high_risk_count ?? 0,
            on_time_percentage:  d.on_time_percentage ?? 0,
            delayed_count:       d.delayed_count ?? 0,
            revenue_at_risk:     d.revenue_at_risk ?? d.financial_saved_usd ?? 0,
          });
          gotReal = true;
        }
        if (shRes.status === 'fulfilled' && shRes.value?.data?.length) {
          setShips(shRes.value.data);
          gotReal = true;
        }
        if (aRes.status === 'fulfilled' && aRes.value?.data?.length) {
          setAlerts(aRes.value.data);
        }
        if (gotReal) setDummy(false);
      } catch {}
    })();
  }, []);

  const statCards = [
    { l: 'Total Active',     v: stats.active_shipments,                                  s: 'Active shipments',      c: '#00D4B4' },
    { l: 'Critical Risk',    v: stats.critical_count,                                    s: 'Needs immediate action', c: '#EF4444' },
    { l: 'High Risk',        v: stats.high_risk_count,                                   s: 'Flagged shipments',     c: '#F97316' },
    { l: 'On-Time Rate',     v: `${Number(stats.on_time_percentage).toFixed(1)}%`,        s: 'Delivery performance',  c: '#10B981' },
    { l: 'Delayed',          v: stats.delayed_count,                                     s: 'Behind schedule',       c: '#F59E0B' },
    { l: 'Revenue at Risk',  v: `$${(Number(stats.revenue_at_risk)/1e6).toFixed(2)}M`,   s: 'Exposure this week',    c: '#8B5CF6' },
  ];

  // Map tile — switches with theme
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const tileAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

  const quickActions = [
    { icon: '📦', label: 'New Consignment', onClick: () => navigate('/manager?tab=requests') },
    { icon: '⚡', label: 'ML Analysis',     onClick: () => navigate('/manager?tab=consignments') },
    { icon: '👤', label: 'Add Driver',      onClick: () => navigate('/manager?tab=drivers') },
    { icon: '🚢', label: 'Fleet',           onClick: () => navigate('/manager?tab=fleet') },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="mc">
        {/* Stats Row */}
        <div className="stat-row">
          {statCards.map(s => (
            <div key={s.l} className="scard" style={{ borderColor: `${s.c}33` }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.c},transparent)` }} />
              <div className="slbl">{s.l}</div>
              <div className="sval" style={{ color: s.c }}>{s.v}</div>
              <div className="ssub">{s.s}</div>
            </div>
          ))}
        </div>

        {/* Map — full width */}
        <div className="map-wrap">
          <div className="map-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ldot" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Live Fleet Map</span>
              {dummy && (
                <span style={{ fontSize: 9, color: '#F59E0B', padding: '2px 7px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 6 }}>
                  DEMO — Backend offline
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['all', '🌐 All'], ['sea', '⚓ Sea'], ['land', '🛣️ Land'], ['air', '✈️ Air']].map(([m, l]) => (
                <button key={m} className={`mode-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 420, position: 'relative' }}>
            <MapContainer center={[20, 60]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false} ref={mapRef}>
              <TileLayer url={tileUrl} attribution={tileAttr} maxZoom={18} />
              {ships.map(s => {
                const wp = s.route_waypoints || [];
                const pos = wp.map(p => [Number(p.lat), Number(p.lng)]).filter(p => p[0] && p[1]);
                const color = rc(s.current_risk_level);
                const lat = s.current_latitude ? Number(s.current_latitude) : pos[Math.floor(pos.length / 2)]?.[0];
                const lng = s.current_longitude ? Number(s.current_longitude) : pos[Math.floor(pos.length / 2)]?.[1];
                return (
                  <span key={s.shipment_id}>
                    {pos.length > 1 && <Polyline positions={pos} pathOptions={{ color, weight: 2.5, opacity: 0.85 }} />}
                    {lat && lng && (
                      <CircleMarker center={[lat, lng]} radius={8}
                        pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 0.95, weight: 2 }}
                        eventHandlers={{ click: () => navigate(`/manager/shipments/${s.shipment_id}`) }}
                      >
                        <Tooltip direction="top" offset={[0, -8]}>
                          <strong>{s.tracking_number}</strong><br />
                          {s.origin_port_name} → {s.destination_port_name}<br />
                          {String(s.current_risk_level || '').toUpperCase()} · Score {s.current_risk_score}
                        </Tooltip>
                      </CircleMarker>
                    )}
                  </span>
                );
              })}
            </MapContainer>
            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 10, background: isDark ? 'rgba(6,12,24,.88)' : 'rgba(255,255,255,.88)', padding: '5px 12px', borderRadius: 8, fontSize: 10, zIndex: 1000, backdropFilter: 'blur(4px)', color: isDark ? '#ccc' : '#333' }}>
              {[['Critical', '#EF4444'], ['High', '#F97316'], ['Medium', '#F59E0B'], ['Low', '#10B981']].map(([l, c]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: c, borderRadius: '50%', display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row — Alerts feed + Quick Actions */}
        <div className="bottom-row">
          {/* Alerts Feed */}
          <div className="alert-panel">
            <div className="rp-head">
              <span className="rp-title">🚨 Alerts Feed</span>
              <button style={{ fontSize: 10, color: '#00D4B4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/manager?tab=alerts')}>View all →</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px' }}>
              {alerts.slice(0, 6).map(a => (
                <div key={a.alert_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', background: 'var(--bg-base,#060C18)', border: `1px solid ${rc(a.severity)}44`, borderRadius: 8, cursor: 'pointer', fontSize: 11 }}>
                  <span style={{ width: 6, height: 6, background: rc(a.severity), borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary,#F0F4FF)' }}>{a.message}</span>
                  <span style={{ color: 'var(--text-muted,#8A9BB5)', fontSize: 9 }}>{ago(a.created_at)}</span>
                  <span className="mc-chip" style={{ background: `${rc(a.severity)}22`, color: rc(a.severity) }}>{a.severity}</span>
                </div>
              ))}
              {alerts.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted,#8A9BB5)', padding: '4px 0' }}>✓ No active alerts</div>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="qa-panel">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted,#8A9BB5)' }}>Quick Actions</div>
            <div className="qa-grid">
              {quickActions.map(q => (
                <div key={q.label} className="qa-btn" onClick={q.onClick}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{q.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary,#F0F4FF)' }}>{q.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
