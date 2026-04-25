import { useCallback, useEffect, useState } from 'react';
import { Anchor, Ship, Plus, RefreshCw, Search, UserCheck, Wrench, User, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../config/api';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

/* ── scoped styles ─────────────────────────────────────────────── */
const css = `
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.fm-fade{animation:fadeUp .2s ease both;}
.fm-ghost{background:transparent;color:var(--text-muted,#6b7280);border:1px solid var(--border-default,#1e2d45);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:6px;}
.fm-ghost:hover{border-color:#00d4b4;color:#00d4b4;}
.fm-action{background:linear-gradient(135deg,#00d4b4,#22d3ee);color:#000;font-weight:700;font-size:12px;padding:8px 16px;border:none;border-radius:8px;cursor:pointer;transition:all .2s;font-family:inherit;display:inline-flex;align-items:center;gap:6px;}
.fm-action:hover{transform:translateY(-1px);opacity:.9;}
.fm-action:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.fm-filter{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border-default,#1e2d45);background:var(--bg-elevated,#0d1526);color:var(--text-secondary);transition:all .15s;font-family:inherit;}
.fm-filter:hover,.fm-filter.active{background:rgba(0,212,180,.12);color:#00d4b4;border-color:#00d4b4;}
`;

function Chip({ children, color = '#00d4b4' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', background: `${color}18`, color, border: `1px solid ${color}40` }}>{children}</span>;
}

const STATUS_CFG = {
  active:         { color: '#00d4b4', label: 'Active' },
  docked:         { color: '#3b82f6', label: 'Docked' },
  maintenance:    { color: '#f59e0b', label: 'Maintenance' },
  decommissioned: { color: '#6b7280', label: 'Decommissioned' },
};

/* ── Add Vessel Modal ─────────────────────────────────── */
function AddVesselModal({ onClose, onAdded }) {
  const [f, setF] = useState({ vessel_name: '', vessel_type: 'container', flag_country: '', imo_number: '', mmsi_number: '', gross_tonnage: '', deadweight: '', max_speed: '', built_year: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.post('/manager/fleet/vessels', {
        ...f,
        gross_tonnage: f.gross_tonnage ? Number(f.gross_tonnage) : null,
        deadweight: f.deadweight ? Number(f.deadweight) : null,
        max_speed: f.max_speed ? Number(f.max_speed) : null,
        built_year: f.built_year ? Number(f.built_year) : null,
      });
      onAdded(data); onClose();
    } catch (e) { setError(e?.response?.data?.detail || e.message || 'Failed'); }
    finally { setLoading(false); }
  }
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="card fm-fade" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,.12)', display: 'grid', placeItems: 'center' }}>
            <Ship size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Add New Vessel</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Register a vessel in the fleet</div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="full">
              <label className="label">Vessel Name *</label>
              <input className="input" required value={f.vessel_name} onChange={e => set('vessel_name', e.target.value)} placeholder="MV Atlantic Star" />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="select" value={f.vessel_type} onChange={e => set('vessel_type', e.target.value)}>
                {['container', 'bulk', 'tanker', 'reefer', 'roro', 'general'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Flag Country</label>
              <input className="input" value={f.flag_country} onChange={e => set('flag_country', e.target.value)} placeholder="Panama" />
            </div>
            <div>
              <label className="label">IMO Number</label>
              <input className="input" value={f.imo_number} onChange={e => set('imo_number', e.target.value)} placeholder="IMO 9999999" />
            </div>
            <div>
              <label className="label">MMSI</label>
              <input className="input" value={f.mmsi_number} onChange={e => set('mmsi_number', e.target.value)} placeholder="123456789" />
            </div>
            <div>
              <label className="label">Gross Tonnage</label>
              <input className="input" type="number" value={f.gross_tonnage} onChange={e => set('gross_tonnage', e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label className="label">Deadweight</label>
              <input className="input" type="number" value={f.deadweight} onChange={e => set('deadweight', e.target.value)} placeholder="65000" />
            </div>
            <div>
              <label className="label">Max Speed (kn)</label>
              <input className="input" type="number" value={f.max_speed} onChange={e => set('max_speed', e.target.value)} placeholder="22" />
            </div>
            <div>
              <label className="label">Built Year</label>
              <input className="input" type="number" value={f.built_year} onChange={e => set('built_year', e.target.value)} placeholder="2018" />
            </div>
          </div>

          {error && <div style={{ marginTop: 12, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '9px 13px', color: '#fca5a5', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="fm-action" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
              <Ship size={14} />{loading ? 'Adding…' : 'Add Vessel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Assign Driver Modal ──────────────────────────────── */
function AssignDriverModal({ vessel, onClose, onAssigned }) {
  const [drivers, setDrivers] = useState([]);
  const [sel, setSel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/manager/fleet/available-drivers')
      .then(r => setDrivers(r.data || []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, []);

  async function assign() {
    if (!sel) return; setSaving(true); setError('');
    try {
      await api.patch(`/manager/fleet/vessels/${vessel.fleet_id}/assign-driver`, { driver_id: sel });
      onAssigned(vessel.fleet_id, sel, drivers.find(d => d.user_id === sel)?.full_name);
      onClose();
    } catch (e) { setError(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="card fm-fade" style={{ width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,180,.12)', display: 'grid', placeItems: 'center' }}>
            <UserCheck size={16} style={{ color: '#00d4b4' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Assign Captain / Driver</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{vessel.name} — only available drivers shown</div>
          </div>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 20 }}><Spinner size="md" /></div> : drivers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>No available drivers right now</div>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {drivers.map(d => (
              <label key={d.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `1px solid ${sel === d.user_id ? '#00d4b4' : 'var(--border-default)'}`, background: sel === d.user_id ? 'rgba(0,212,180,.06)' : 'var(--bg-elevated)', cursor: 'pointer', transition: 'all .15s' }}>
                <input type="radio" name="driver" value={d.user_id} checked={sel === d.user_id} onChange={() => setSel(d.user_id)} style={{ accentColor: '#00d4b4' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.country}{d.company_name ? ` · ${d.company_name}` : ''}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="fm-action" disabled={!sel || saving} onClick={assign} style={{ flex: 2, justifyContent: 'center' }}>
            <UserCheck size={14} />{saving ? 'Assigning…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Vessel Row ───────────────────────────────────────── */
function VesselRow({ vessel, onAssign, onStatus }) {
  const s = STATUS_CFG[vessel.status] || STATUS_CFG.docked;
  const [busy, setBusy] = useState(false);

  async function cycleStatus() {
    const next = { docked: 'active', active: 'maintenance', maintenance: 'docked', decommissioned: 'docked' }[vessel.status] || 'docked';
    setBusy(true);
    try { await api.patch(`/manager/fleet/vessels/${vessel.fleet_id}/status`, { new_status: next }); onStatus(vessel.fleet_id, next); }
    catch {} finally { setBusy(false); }
  }

  return (
    <div className="fm-fade" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: '16px 18px', marginBottom: 8, transition: 'all .15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Icon */}
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${s.color}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Ship size={20} style={{ color: s.color }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{vessel.name}</span>
              <Chip color={s.color}>{s.label}</Chip>
              {vessel.is_in_transit && <Chip color="#3b82f6">In Transit</Chip>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {(vessel.subtype || '').toUpperCase()} · Flag: {vessel.flag_country || '—'} · IMO: {vessel.imo_number || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {vessel.capacity} · Built: {vessel.built_year || '—'}
            </div>
            {vessel.assigned_driver_name ? (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#00d4b4' }}>
                <CheckCircle2 size={13} /> Captain: <strong>{vessel.assigned_driver_name}</strong>
              </div>
            ) : (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f59e0b' }}>
                <AlertTriangle size={13} /> No captain assigned
              </div>
            )}
            {vessel.current_shipment_tracking && (
              <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#3b82f6' }}>
                <Package size={11} /> {vessel.current_shipment_tracking}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="fm-ghost" onClick={cycleStatus} disabled={busy}>
            <Wrench size={12} />{busy ? '…' : 'Status'}
          </button>
          <button className="fm-ghost" onClick={() => onAssign(vessel)} style={{ borderColor: 'rgba(0,212,180,.3)', color: '#00d4b4' }}>
            <User size={12} />Assign
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function FleetManagement() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [assignV, setAssignV] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setVessels((await api.get('/manager/fleet')).data?.vessels || []); }
    catch { setError('Could not load fleet.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleAdded(nv) {
    setVessels(p => [{ fleet_id: nv.fleet_id, fleet_type: 'vessel', name: nv.name, subtype: 'general', capacity: '—', flag_country: '—', imo_number: '—', built_year: '—', status: 'docked', is_in_transit: false, assigned_driver_name: null, current_shipment_tracking: null }, ...p]);
  }
  function handleAssigned(fid, did, dn) { setVessels(p => p.map(v => v.fleet_id === fid ? { ...v, assigned_driver_id: did, assigned_driver_name: dn } : v)); }
  function handleStatus(fid, ns) { setVessels(p => p.map(v => v.fleet_id === fid ? { ...v, status: ns } : v)); }

  const q = search.toLowerCase();
  const shown = vessels.filter(v => {
    const ms = !q || v.name.toLowerCase().includes(q) || (v.flag_country || '').toLowerCase().includes(q);
    const mf = filter === 'all' || v.status === filter || (filter === 'assigned' && v.assigned_driver_name) || (filter === 'unassigned' && !v.assigned_driver_name);
    return ms && mf;
  });

  const stats = {
    total: vessels.length,
    active: vessels.filter(v => v.status === 'active').length,
    transit: vessels.filter(v => v.is_in_transit).length,
    maint: vessels.filter(v => v.status === 'maintenance').length,
    nocapt: vessels.filter(v => !v.assigned_driver_name).length,
  };

  if (loading) return <div style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}><Spinner size="lg" /></div>;

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Anchor size={24} style={{ color: '#00d4b4' }} />Fleet Management
          </h1>
          <p className="page-subtitle">Manage vessels, assign captains, and track fleet status</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="fm-ghost" onClick={load}><RefreshCw size={13} />Refresh</button>
          <button className="fm-action" onClick={() => setShowAdd(true)}><Plus size={14} />Add Vessel</button>
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Vessels',  v: stats.total,   col: '#00d4b4', Icon: Ship },
          { label: 'Active',         v: stats.active,  col: '#22c55e', Icon: CheckCircle2 },
          { label: 'In Transit',     v: stats.transit, col: '#3b82f6', Icon: Anchor },
          { label: 'Maintenance',    v: stats.maint,   col: '#f59e0b', Icon: Wrench },
          { label: 'No Captain',     v: stats.nocapt,  col: '#ef4444', Icon: AlertTriangle },
        ].map(({ label, v, col, Icon }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${col}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={16} style={{ color: col }} />
              <span style={{ fontSize: 24, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vessels…"
          className="input" style={{ width: 200, padding: '7px 14px', fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'docked', label: 'Docked' },
            { key: 'maintenance', label: 'Maintenance' }, { key: 'assigned', label: 'Assigned' }, { key: 'unassigned', label: 'Unassigned' },
          ].map(f => (
            <button key={f.key} className={`fm-filter${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{shown.length} vessel{shown.length !== 1 ? 's' : ''}</div>
      </div>

      {/* ── Error ── */}
      {error && <div style={{ color: '#ef4444', padding: 20, textAlign: 'center' }}>{error}</div>}

      {/* ── Vessel List ── */}
      {shown.length === 0 ? (
        <EmptyState icon={Ship} title="No vessels found" description={search ? 'Try a different name' : 'Add your first vessel with the button above.'} />
      ) : (
        <div>{shown.map(v => <VesselRow key={v.fleet_id} vessel={v} onAssign={setAssignV} onStatus={handleStatus} />)}</div>
      )}

      {showAdd && <AddVesselModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {assignV && <AssignDriverModal vessel={assignV} onClose={() => setAssignV(null)} onAssigned={handleAssigned} />}
    </div>
  );
}
