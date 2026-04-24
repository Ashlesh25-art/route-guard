import CargoTrackMap from '../../components/map/CargoTrackMap';

export default function ShipperLiveMap() {
	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Live Map</h1>
					<p className="page-subtitle">Track only your active consignments in real time.</p>
				</div>
			</div>
			<div
				className="card"
				style={{
					padding: 0,
					overflow: 'hidden',
					border: '1px solid var(--border-default)',
					background:
						'linear-gradient(145deg, rgba(13, 24, 48, 0.7) 0%, rgba(8, 18, 38, 0.88) 100%)',
				}}
			>
				<div style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>
					<CargoTrackMap mode="shipper" />
				</div>
			</div>
		</div>
	);
}
