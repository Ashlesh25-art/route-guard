import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, FileWarning, Upload, FolderOpen } from 'lucide-react';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { normalizeShipment } from '../../utils/shipmentView';

function requiredDocs(shipment) {
	return [
		{ key: 'invoice', label: 'Commercial Invoice', status: 'uploaded' },
		{ key: 'packing', label: 'Packing List', status: 'uploaded' },
		{
			key: 'origin',
			label: 'Certificate of Origin',
			status: shipment.status === 'delivered' ? 'uploaded' : 'missing',
		},
		{ key: 'insurance', label: 'Insurance Certificate', status: 'optional' },
	];
}

export default function ShipperDocuments() {
	const [loading, setLoading] = useState(true);
	const [shipments, setShipments] = useState([]);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const res = await api.get(ENDPOINTS.CONSIGNMENTS).catch(() => api.get(ENDPOINTS.MY_SHIPMENTS));
				const rows = Array.isArray(res.data) ? res.data : [];
				setShipments(rows.map(normalizeShipment));
			} catch {
				setShipments([]);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const rows = useMemo(
		() =>
			shipments.slice(0, 8).map((shipment) => ({
				shipment,
				docs: requiredDocs(shipment),
			})),
		[shipments],
	);

	if (loading) {
		return (
			<div className="card" style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Document Center</h1>
					<p className="page-subtitle">Upload and track required shipment documents for customs clearance.</p>
				</div>
			</div>

			{rows.length === 0 ? (
				<EmptyState
					icon={FolderOpen}
					title="No consignments found"
					description="Your shipment documents will appear here after creating orders."
				/>
			) : (
				<div className="grid-two">
					{rows.map(({ shipment, docs }) => (
						<div key={shipment.shipment_id} className="card" style={{ padding: 14 }}>
							<div style={{ marginBottom: 10 }}>
								<div className="mono" style={{ fontWeight: 700 }}>
									{shipment.tracking_number}
								</div>
								<div className="page-subtitle">
									{shipment.origin} to {shipment.destination}
								</div>
							</div>
							<div style={{ display: 'grid', gap: 8 }}>
								{docs.map((doc) => (
									<div
										key={doc.key}
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											padding: '10px 12px',
											borderRadius: 8,
											border: '1px solid var(--border-subtle)',
											background: 'var(--bg-elevated)',
										}}
									>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											{doc.status === 'uploaded' ? (
												<FileCheck2 size={15} color="#22c55e" />
											) : doc.status === 'missing' ? (
												<FileWarning size={15} color="#f59e0b" />
											) : (
												<Upload size={15} color="var(--text-secondary)" />
											)}
											<span style={{ fontSize: 13 }}>{doc.label}</span>
										</div>
										<button type="button" className="btn-outline" style={{ padding: '6px 10px', fontSize: 12 }}>
											{doc.status === 'uploaded' ? 'View' : 'Upload'}
										</button>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
