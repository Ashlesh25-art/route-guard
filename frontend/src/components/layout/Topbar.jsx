import { Bell, Settings, Sun, Moon, User, LogOut, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Badge from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';

const PATH_TITLES = [
	{ test: (p) => p === '/manager',                                title: 'Manager Control Center' },
	{ test: (p) => p.includes('/manager/ports'),                    title: 'Global Port Status' },
	{ test: (p) => p.includes('/manager/analytics'),                title: 'Analytics' },
	{ test: (p) => p.includes('/manager/shipments/'),               title: 'Shipment Detail' },
	{ test: (p) => p === '/shipper' || p === '/shipper/orders',     title: 'Sender Orders' },
	{ test: (p) => p.includes('/shipper/create'),                   title: 'Create Order' },
	{ test: (p) => p.includes('/shipper/shipments/'),               title: 'Track Shipment' },
	{ test: (p) => p === '/driver',                                 title: 'Driver Dashboard' },
	{ test: (p) => p === '/driver/assignment',                      title: 'Active Assignment' },
	{ test: (p) => p === '/driver/details',                         title: 'Order Details' },
	{ test: (p) => p === '/driver/navigation',                      title: 'Navigation' },
	{ test: (p) => p === '/driver/alerts',                          title: 'Alerts' },
	{ test: (p) => p === '/driver/chat',                            title: 'Chat' },
	{ test: (p) => p === '/driver/emergency',                       title: 'Emergency' },
	{ test: (p) => p === '/driver/profile',                         title: 'Profile' },
	{ test: (p) => p.includes('/driver/status'),                    title: 'Status Update' },
	{ test: (p) => p === '/receiver',                               title: 'Incoming Shipments' },
	{ test: (p) => p === '/receiver/track' || p === '/receiver/search-monitor', title: 'Search & Monitor' },
	{ test: (p) => p === '/receiver/alerts',                        title: 'Alerts' },
	{ test: (p) => p.includes('/receiver/shipments/') && p.includes('/confirm'), title: 'Confirm Delivery' },
	{ test: (p) => p.includes('/receiver/shipments/'),              title: 'Track Shipment' },
];
function getTitle(p) { return PATH_TITLES.find(i => i.test(p))?.title || 'RouteGuard'; }

const RC = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981' };
const rc = l => RC[String(l || '').toLowerCase()] || '#8A9BB5';
const ago = iso => {
	const d = Math.floor((Date.now() - new Date(iso)) / 1000);
	if (d < 60) return `${d}s ago`;
	if (d < 3600) return `${Math.floor(d / 60)}m ago`;
	return `${Math.floor(d / 3600)}h ago`;
};

function initials(name = '') {
	const p = name.split(' ').filter(Boolean);
	if (!p.length) return 'RG';
	if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
	return `${p[0][0]}${p[1][0]}`.toUpperCase();
}

// ── Notification Dropdown ─────────────────────────────────────────────────────
function NotificationDropdown({ onClose }) {
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const res = await api.get(ENDPOINTS.ACTIVE_ALERTS);
				setAlerts(res.data || []);
			} catch {
				setAlerts([
					{ alert_id: 'f1', severity: 'critical', message: 'Storm detected on route', created_at: new Date(Date.now() - 120000).toISOString() },
					{ alert_id: 'f2', severity: 'high',     message: 'Port congestion increased', created_at: new Date(Date.now() - 300000).toISOString() },
					{ alert_id: 'f3', severity: 'medium',   message: 'Traffic jam on NH-48', created_at: new Date(Date.now() - 900000).toISOString() },
				]);
			} finally { setLoading(false); }
		})();
	}, []);

	return (
		<div style={{
			position: 'absolute', top: '100%', right: 0, marginTop: 8,
			width: 340, background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
			borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.4)', zIndex: 9999, overflow: 'hidden',
		}}>
			<div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>🚨 Alerts</span>
				<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alerts.length} active</span>
			</div>
			<div style={{ maxHeight: 320, overflowY: 'auto' }}>
				{loading && <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</div>}
				{!loading && alerts.length === 0 && (
					<div style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>✓ No active alerts</div>
				)}
				{alerts.map(a => (
					<div key={a.alert_id} onClick={onClose} style={{
						display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
						cursor: 'pointer', transition: 'background .15s', borderLeft: `3px solid ${rc(a.severity)}`,
					}}
					onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
					onMouseLeave={e => e.currentTarget.style.background = ''}
					>
						<span style={{ width: 8, height: 8, background: rc(a.severity), borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{a.message}</div>
							{a.tracking_number && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.tracking_number}</div>}
						</div>
						<div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{ago(a.created_at)}</div>
					</div>
				))}
			</div>
			<div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)' }}>
				<button onClick={onClose} style={{ width: '100%', padding: '7px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
					View All Alerts →
				</button>
			</div>
		</div>
	);
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ user, onClose, logout, theme, toggleTheme }) {
	return (
		<div style={{
			position: 'absolute', top: '100%', right: 0, marginTop: 8,
			width: 220, background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
			borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.4)', zIndex: 9999, overflow: 'hidden',
		}}>
			{/* User info */}
			<div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
				<div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 }}>
					{initials(user?.name)}
				</div>
				<div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name || 'Operator'}</div>
				<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email || ''}</div>
				<Badge level="medium" size="sm" style={{ marginTop: 4 }}>{user?.role || 'user'}</Badge>
			</div>

			{/* Actions */}
			<div style={{ padding: '8px' }}>
				<button onClick={toggleTheme} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
					onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
					onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
				>
					{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
					{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
				</button>

				<button onClick={() => { logout(); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#EF4444', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
					onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
					onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
				>
					<LogOut size={15} />
					Sign Out
				</button>
			</div>
		</div>
	);
}

export default function Topbar() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const { newAlerts } = useSocket();
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
	const [notifOpen, setNotifOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);
	const notifRef = useRef(null);
	const profileRef = useRef(null);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}, [theme]);

	const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');

	// Close dropdowns on outside click
	useEffect(() => {
		const handler = (e) => {
			if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
			if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const alertCount = newAlerts.length || 0;

	return (
		<header className="topbar">
			<h2 className="topbar__title">{getTitle(location.pathname)}</h2>

			<div className="topbar__live">
				<span className="topbar__dot" />
				LIVE MONITORING
			</div>

			<div className="topbar__right">
				{/* Notifications Bell */}
				<div ref={notifRef} style={{ position: 'relative' }}>
					<button
						type="button"
						className="topbar__icon-btn"
						aria-label="Notifications"
						onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
					>
						<Bell size={16} />
						{alertCount > 0 && <span className="topbar__badge">{alertCount}</span>}
					</button>
					{notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
				</div>

				{/* Theme toggle removed from here — it's in profile dropdown */}

				{/* Profile */}
				<div ref={profileRef} style={{ position: 'relative' }}>
					<button
						type="button"
						className="topbar__icon-btn"
						style={{ width: 'auto', padding: '0 10px', gap: 8, display: 'flex', alignItems: 'center' }}
						onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
					>
						<div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0 }}>
							{initials(user?.name)}
						</div>
						<div style={{ textAlign: 'left' }}>
							<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.name || 'Operator'}</div>
							<Badge level="medium" size="sm">{user?.role || 'user'}</Badge>
						</div>
						<ChevronDown size={13} style={{ color: 'var(--text-muted)', transition: 'transform .2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
					</button>
					{profileOpen && (
						<ProfileDropdown
							user={user}
							onClose={() => setProfileOpen(false)}
							logout={logout}
							theme={theme}
							toggleTheme={toggleTheme}
						/>
					)}
				</div>
			</div>
		</header>
	);
}
