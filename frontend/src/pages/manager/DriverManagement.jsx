import { useCallback, useEffect, useState } from 'react';
import { Truck, UserPlus, Users, Shield, Mail, Phone, MapPin, Package, RefreshCw, Search, UserCheck, UserX, Globe, ChevronRight } from 'lucide-react';
import { api } from '../../config/api';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

/* ── scoped styles ─────────────────────────────────────────────── */
const css = `
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.dm-fade{animation:fadeUp .2s ease both;}
.dm-ghost{background:transparent;color:var(--text-muted,#6b7280);border:1px solid var(--border-default,#1e2d45);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:6px;}
.dm-ghost:hover{border-color:#00d4b4;color:#00d4b4;}
.dm-action{background:linear-gradient(135deg,#00d4b4,#22d3ee);color:#000;font-weight:700;font-size:12px;padding:8px 16px;border:none;border-radius:8px;cursor:pointer;transition:all .2s;font-family:inherit;display:inline-flex;align-items:center;gap:6px;}
.dm-action:hover{transform:translateY(-1px);opacity:.9;}
.dm-action:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.dm-filter{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border-default,#1e2d45);background:var(--bg-elevated,#0d1526);color:var(--text-secondary);transition:all .15s;font-family:inherit;}
.dm-filter:hover,.dm-filter.active{background:rgba(0,212,180,.12);color:#00d4b4;border-color:#00d4b4;}
`;

function Chip({ children, color = '#00d4b4' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', background: `${color}18`, color, border: `1px solid ${color}40` }}>{children}</span>;
}

const STATUS_CFG = {
  'en-route':  { color: '#3b82f6', label: 'En Route' },
  'available': { color: '#00d4b4', label: 'Available' },
  'inactive':  { color: '#6b7280', label: 'Inactive' },
};

/* ── Add Driver Modal ─────────────────────────────────── */
function AddDriverModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: '', email: '', password: 'RouteGuard2024!',
    phone_number: '', country: '', company_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.post('/manager/drivers', form);
      onCreated(data); onClose();
    } catch (e) { setError(e?.response?.data?.detail || e.message || 'Failed'); }
    finally { setLoading(false); }
  }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="card dm-fade" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,212,180,.12)', display: 'grid', placeItems: 'center' }}>
            <UserPlus size={18} style={{ color: '#00d4b4' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Add Driver Account</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Create a new driver portal access</div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="full">
              <label className="label">Full Name *</label>
              <input className="input" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="James Okafor" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="james@routeguard.io" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="+44 20 7946 0958" />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Nigeria" />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="RouteGuard Logistics" />
            </div>
            <div className="full">
              <label className="label">Temp Password</label>
              <input className="input" value={form.password} onChange={e => set('password', e.target.value)} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>Driver will change on first login.</span>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '9px 13px', color: '#fca5a5', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="dm-action" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
              <UserPlus size={14} />{loading ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Driver Row ───────────────────────────────────────── */
function DriverRow({ driver, onToggle }) {
  const s = STATUS_CFG[driver.status] || STATUS_CFG.inactive;
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try { await api.patch(`/manager/drivers/${driver.user_id}/toggle-active`); onToggle(driver.user_id); }
    catch {} finally { setBusy(false); }
  }

  return (
    <div className="dm-fade" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14, transition: 'all .15s' }}>
      {/* Avatar */}
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
        {driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{driver.full_name}</span>
          <Chip color={s.color}>{s.label}</Chip>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
          {driver.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{driver.email}</span>}
          {driver.phone_number && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{driver.phone_number}</span>}
          {driver.country && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={11} />{driver.country}</span>}
          {driver.active_shipments > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6' }}><Package size={11} />{driver.active_shipments} active</span>
          )}
        </div>
        {driver.company_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{driver.company_name}</div>}
      </div>

      {/* Toggle */}
      <button onClick={toggle} disabled={busy} className="dm-ghost" style={{
        borderColor: driver.is_active ? 'rgba(239,68,68,.3)' : 'rgba(0,212,180,.3)',
        color: driver.is_active ? '#fca5a5' : '#00d4b4',
      }}>
        {driver.is_active ? <><UserX size={13} />Deactivate</> : <><UserCheck size={13} />Activate</>}
      </button>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDrivers((await api.get('/manager/drivers/all')).data || []); }
    catch { setError('Could not load drivers.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleToggle(uid) {
    setDrivers(prev => prev.map(d => d.user_id === uid
      ? { ...d, is_active: !d.is_active, status: !d.is_active ? 'available' : 'inactive' }
      : d
    ));
  }

  function handleCreated(nd) {
    setDrivers(prev => [{ user_id: nd.user_id, full_name: nd.full_name, email: nd.email, phone_number: '', country: '', company_name: '', is_active: true, active_shipments: 0, status: 'available' }, ...prev]);
  }

  const q = search.toLowerCase();
  const shown = drivers.filter(d => {
    const matchSearch = !q || d.full_name.toLowerCase().includes(q) || (d.email || '').toLowerCase().includes(q) || (d.country || '').toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === 'available') return d.is_active && d.status !== 'en-route';
    if (filter === 'en-route') return d.status === 'en-route';
    if (filter === 'inactive') return !d.is_active;
    return true;
  });

  const counts = {
    all: drivers.length,
    available: drivers.filter(d => d.is_active && d.status !== 'en-route').length,
    'en-route': drivers.filter(d => d.status === 'en-route').length,
    inactive: drivers.filter(d => !d.is_active).length,
  };

  if (loading) return <div style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}><Spinner size="lg" /></div>;

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: '#00d4b4' }} />Driver Management
          </h1>
          <p className="page-subtitle">Manage drivers, activate accounts, and track assignments</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="dm-ghost" onClick={load}><RefreshCw size={13} />Refresh</button>
          <button className="dm-action" onClick={() => setShowAdd(true)}><UserPlus size={14} />Add Driver</button>
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Drivers', v: counts.all,          col: '#00d4b4', Icon: Users },
          { label: 'Available',     v: counts.available,     col: '#22c55e', Icon: UserCheck },
          { label: 'En Route',      v: counts['en-route'],   col: '#3b82f6', Icon: Truck },
          { label: 'Inactive',      v: counts.inactive,      col: '#f97316', Icon: Shield },
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drivers…"
          className="input" style={{ width: 200, padding: '7px 14px', fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all',       label: 'All' },
            { key: 'available', label: `Available (${counts.available})` },
            { key: 'en-route',  label: `En Route (${counts['en-route']})` },
            { key: 'inactive',  label: `Inactive (${counts.inactive})` },
          ].map(f => (
            <button key={f.key} className={`dm-filter${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{shown.length} driver{shown.length !== 1 ? 's' : ''}</div>
      </div>

      {/* ── Error ── */}
      {error && <div style={{ color: '#ef4444', padding: 20, textAlign: 'center' }}>{error}</div>}

      {/* ── Driver List ── */}
      {shown.length === 0 ? (
        <EmptyState icon={Users} title="No drivers found" description={search ? 'Try a different search term' : 'Add your first driver with the button above.'} />
      ) : (
        <div>
          {shown.map(d => <DriverRow key={d.user_id} driver={d} onToggle={handleToggle} />)}
        </div>
      )}

      {showAdd && <AddDriverModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </div>
  );
}
