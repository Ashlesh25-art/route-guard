import {
	Anchor,
	BarChart3,
	Bell,
	CheckCircle,
	FileText,
	LayoutDashboard,
	LogOut,
	MapPin,
	MessageSquare,
	Package,
	PackageCheck,
	PackagePlus,
	Truck,
	Wallet,
} from 'lucide-react';

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Badge from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';

const ICON_MAP = {
	LayoutDashboard,
	Anchor,
	BarChart3,
	Bell,
	Package,
	PackagePlus,
	MessageSquare,
	Truck,
	CheckCircle,
	PackageCheck,
	FileText,
	Wallet,
	MapPin,
};

const NAV_CONFIG = {
	manager: [
		{ label: 'Mission Control',      icon: 'LayoutDashboard', path: '/manager',                  section: 'OVERVIEW' },
		{ label: 'Offer Console',        icon: 'MessageSquare',    path: '/manager/offers',           section: null },
		{ label: 'Live Map',             icon: 'Anchor',          path: '/manager?tab=shipments',     section: null },
		{ label: 'Alerts Center',        icon: 'Bell',            path: '/manager?tab=alerts',        section: null, badge: '4' },
		{ label: 'Consignment Requests', icon: 'PackagePlus',     path: '/manager?tab=requests',      section: 'OPERATIONS', badge: '3' },
		{ label: 'Active Consignments',  icon: 'Package',         path: '/manager?tab=consignments',  section: null },
		{ label: 'Driver Management',    icon: 'Truck',           path: '/manager?tab=drivers',       section: 'RESOURCES' },
		{ label: 'Fleet Management',     icon: 'CheckCircle',     path: '/manager?tab=fleet',         section: null },
		{ label: 'Analytics',            icon: 'BarChart3',       path: '/manager?tab=analytics',     section: 'INSIGHTS' },
	],
	shipper: [
		{ label: 'Consignments', icon: 'Package', path: '/shipper' },
		{ label: 'Create Order', icon: 'PackagePlus', path: '/shipper/create' },
		{ label: 'Live Map', icon: 'Anchor', path: '/shipper/live-map' },
		{ label: 'Chat', icon: 'MessageSquare', path: '/shipper/chat' },
		{ label: 'Alerts', icon: 'Bell', path: '/shipper/alerts' },
		{ label: 'Documents', icon: 'FileText', path: '/shipper/documents' },
		{ label: 'Spending', icon: 'Wallet', path: '/shipper/spending' },
		{ label: 'Addresses', icon: 'MapPin', path: '/shipper/addresses' },
	],
	driver: [
		{ label: 'My Assignment', icon: 'Truck', path: '/driver' },
		{ label: 'Update Status', icon: 'CheckCircle', path: '/driver/status' },
		{ label: 'My Tasks', icon: 'Package', path: '/driver/my-tasks' },
		{ label: 'Pickup Details', icon: 'PackagePlus', path: '/driver/pickup' },
		{ label: 'Navigation', icon: 'Truck', path: '/driver/navigate' },
		{ label: 'Alerts', icon: 'Bell', path: '/driver/alerts' },
	],
	receiver: [
		{ label: 'Incoming', icon: 'PackageCheck', path: '/receiver' },
		{ label: 'Create Order', icon: 'PackagePlus', path: '/receiver/create-order' },
		{ label: 'Track Shipment', icon: 'Truck', path: '/receiver/track' },
		{ label: 'Alerts', icon: 'Bell', path: '/receiver/alerts' },
	],
};

function initials(name = '') {
	const parts = name.split(' ').filter(Boolean);
	if (!parts.length) return 'RG';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function ChatButton() {
	const [open, setOpen] = useState(false);
	const [msgs, setMsgs] = useState([
		{ id: 1, me: false, text: 'How is the delivery progressing?', time: '2:30 PM' },
		{ id: 2, me: true,  text: 'On schedule, ETA in 2 hours',       time: '2:32 PM' },
		{ id: 3, me: false, text: 'Traffic alert on NH-48, take bypass?', time: '2:45 PM' },
	]);
	const [draft, setDraft] = useState('');
	const send = () => {
		if (!draft.trim()) return;
		setMsgs(p => [...p, { id: p.length + 1, me: true, text: draft, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
		setDraft('');
	};
	return (
		<>
			<button type="button" onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, width: '100%', transition: 'all .15s' }}
				onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
				onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
			>
				<MessageSquare size={15} />
				Direct Chat
			</button>
			{open && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', zIndex: 2000, paddingLeft: 256, paddingBottom: 0 }}>
					<div style={{ background: 'var(--bg-surface)', width: 360, height: 500, borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', borderTop: '2px solid #00D4B4', boxShadow: '0 -8px 32px rgba(0,0,0,.4)' }}>
						<div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>💬 Direct Communication</span>
							<button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 20, lineHeight: 1 }}>×</button>
						</div>
						<div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
							{msgs.map(m => (
								<div key={m.id} style={{ display: 'flex', flexDirection: m.me ? 'row-reverse' : 'row', gap: 8 }}>
									<div style={{ background: m.me ? '#00D4B4' : 'var(--bg-elevated)', color: m.me ? '#000' : 'var(--text-primary)', padding: '8px 12px', borderRadius: 8, maxWidth: 240, fontSize: 13, wordWrap: 'break-word' }}>
										{m.text}
										<div style={{ fontSize: 10, marginTop: 3, opacity: .6 }}>{m.time}</div>
									</div>
								</div>
							))}
						</div>
						<div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
							<input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type message…" style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
							<button onClick={send} style={{ background: '#00D4B4', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', color: '#000', fontWeight: 600, fontSize: 12 }}>Send</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default function Sidebar() {
	const { user, logout } = useAuth();
	const navItems = NAV_CONFIG[user?.role] || [];

	return (
		<aside className="sidebar">
			<div className="sidebar__brand">
				<h1>RouteGuard</h1>
				<p>Dynamic Coordination</p>
			</div>

			<nav className="sidebar__nav">
			{navItems.map((item) => {
				const Icon = ICON_MAP[item.icon];
				return (
					<div key={item.path}>
						{item.section && (
							<div style={{fontSize:9,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted,#4A5F7A)',padding:'12px 16px 4px',fontFamily:"'Space Grotesk',sans-serif"}}>
								{item.section}
							</div>
						)}
						<NavLink
							to={item.path}
							key={item.path}
							end={item.path === `/${user?.role}`}
							className={({ isActive }) =>
								`sidebar__nav-link${isActive ? ' active' : ''}`
							}
							style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}
						>
							<span style={{display:'flex',alignItems:'center',gap:8}}>
								<Icon size={16} />
								<span>{item.label}</span>
							</span>
							{item.badge && (
								<span style={{background:'rgba(239,68,68,.2)',color:'#EF4444',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:10,minWidth:18,textAlign:'center'}}>
									{item.badge}
								</span>
							)}
						</NavLink>
					</div>
				);
			})}
		</nav>

			<div className="sidebar__footer">
				<div className="sidebar__user">
					<div className="sidebar__avatar">{initials(user?.name)}</div>
					<div style={{flex:1,minWidth:0}}>
						<div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name || 'RouteGuard User'}</div>
						<Badge level="low" size="sm">{user?.role || 'user'}</Badge>
					</div>
				</div>
				{user?.role === 'driver' && (
					<ChatButton />
				)}
				<button type="button" className="btn-outline" onClick={logout} style={{display:'flex',alignItems:'center',gap:8}}>
					<LogOut size={16} />
					Sign Out
				</button>
			</div>
		</aside>
	);
}
