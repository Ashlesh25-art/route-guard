import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import CargoTrackMap from '../../components/map/CargoTrackMap';
import Spinner from '../../components/ui/Spinner';

export default function TrackShipment() {
	const navigate = useNavigate();
	const { id } = useParams();
	const [shipment, setShipment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetch_ = async () => {
			setLoading(true);
			try {
				const res = await api.get(ENDPOINTS.SHIPMENT_DETAIL(id));
				setShipment(res.data);
			} catch {
				setError('Unable to load shipment tracking.');
			} finally {
				setLoading(false);
			}
		};
		fetch_();
	}, [id]);

	if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><Spinner size="lg" /></div>;

	if (error || !shipment) {
		return (
			<div style={{ padding: 32 }}>
				<div style={{ color: '#ef4444', marginBottom: 12 }}>{error || 'Shipment not found'}</div>
				<button onClick={() => navigate('/receiver')} style={{ background: 'transparent', border: '1px solid #1e2d45', color: '#00d4b4', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
			</div>
		);
	}

	return (
		<div style={{ height: '100vh', margin: '-24px -32px' }}>
			<CargoTrackMap initialShipments={[shipment]} initialSelected={shipment} />
		</div>
	);
}
