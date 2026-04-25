import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MissionControl from './MissionControl';
import AnalyticsPage from './AnalyticsPage';
import AlertCenter from './AlertCenter';
import ConsignmentRequests from './ConsignmentRequests';
import DriverManagement from './DriverManagement';
import FleetManagement from './FleetManagement';
import CargoTrackMap from '../../components/map/CargoTrackMap';

function Placeholder({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, color: 'var(--text-muted, #8A9BB5)', fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ fontSize: 48 }}>{icon}</div>
      <h2 style={{ color: 'var(--text-primary, #F0F4FF)', fontSize: 20, fontWeight: 700 }}>{title}</h2>
      <p style={{ fontSize: 14 }}>{desc || 'Coming soon.'}</p>
    </div>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const isMap = tab === 'shipments';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMap ? 'calc(100vh - 56px)' : 'auto' }}>
      {tab === 'dashboard'    && <MissionControl user={user} />}
      {tab === 'shipments'    && <div style={{ flex: 1, minHeight: 0 }}><CargoTrackMap /></div>}
      {tab === 'alerts'       && <AlertCenter />}
      {tab === 'requests'     && <ConsignmentRequests />}
      {tab === 'consignments' && <Placeholder icon="📦" title="Active Consignments" desc="Track all shipments with status filters and detail views." />}
      {tab === 'drivers'      && <DriverManagement />}
      {tab === 'fleet'        && <FleetManagement />}
      {tab === 'analytics'    && <AnalyticsPage embedded />}
    </div>
  );
}
