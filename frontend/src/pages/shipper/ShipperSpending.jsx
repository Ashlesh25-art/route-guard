import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Download, Star, Receipt } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { normalizeShipment } from '../../utils/shipmentView';

function RatingModal({ shipment, onClose }) {
	const [overall, setOverall] = useState(5);
	const [onTime, setOnTime] = useState(5);
	const [communication, setCommunication] = useState(4);
	const [condition, setCondition] = useState(5);
	const [comment, setComment] = useState('');

	if (!shipment) return null;

	return (
		<div className="modal-overlay">
			<div className="modal-card" style={{ maxWidth: 620 }}>
				<div className="modal-card__header">
					<h3>Rate Carrier</h3>
					<p className="page-subtitle">{shipment.tracking_number} • {shipment.assigned_vessel || shipment.vessel_name || 'Carrier'}</p>
				</div>
				<div className="modal-card__body" style={{ display: 'grid', gap: 12 }}>
					{[
						['Overall', overall, setOverall],
						['On-Time Delivery', onTime, setOnTime],
						['Communication', communication, setCommunication],
						['Cargo Condition', condition, setCondition],
					].map(([label, value, setter]) => (
						<div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span>{label}</span>
							<div style={{ display: 'flex', gap: 6 }}>
								{[1, 2, 3, 4, 5].map((num) => (
									<button
										key={num}
										type="button"
										onClick={() => setter(num)}
										style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
									>
										<Star size={17} fill={num <= value ? '#f59e0b' : 'none'} color="#f59e0b" />
									</button>
								))}
							</div>
						</div>
					))}
					<div>
						<label className="label">Comments</label>
						<textarea
							className="textarea"
							placeholder="Share your delivery experience..."
							value={comment}
							onChange={(e) => setComment(e.target.value)}
						/>
					</div>
				</div>
				<div className="modal-card__footer">
					<button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
					<button type="button" className="btn-primary" onClick={onClose}>Submit Review</button>
				</div>
			</div>
		</div>
	);
}

export default function ShipperSpending() {
	const [searchParams] = useSearchParams();
	const preselectShipment = searchParams.get('shipment');
	const [loading, setLoading] = useState(true);
	const [shipments, setShipments] = useState([]);
	const [ratingTarget, setRatingTarget] = useState(null);

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

	const delivered = useMemo(
		() => shipments.filter((item) => item.status === 'delivered'),
		[shipments],
	);
	const totalSpent = useMemo(
		() => shipments.reduce((sum, item) => sum + Number(item.declared_value || 0), 0),
		[shipments],
	);

	useEffect(() => {
		if (!preselectShipment || !delivered.length) return;
		const found = delivered.find((item) => item.shipment_id === preselectShipment);
		if (found) setRatingTarget(found);
	}, [preselectShipment, delivered]);

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
					<h1 className="page-title">Spending & Invoices</h1>
					<p className="page-subtitle">Track monthly shipping spend and download shipment invoices.</p>
				</div>
			</div>
			<div className="grid-three" style={{ marginBottom: 16 }}>
				<div className="card" style={{ borderTop: '3px solid var(--accent-primary)' }}>
					<div className="page-subtitle">Total Spent</div>
					<div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>${totalSpent.toLocaleString()}</div>
				</div>
				<div className="card" style={{ borderTop: '3px solid #22c55e' }}>
					<div className="page-subtitle">Total Shipments</div>
					<div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{shipments.length}</div>
				</div>
				<div className="card" style={{ borderTop: '3px solid #f59e0b' }}>
					<div className="page-subtitle">Delivered</div>
					<div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{delivered.length}</div>
				</div>
			</div>

			{shipments.length === 0 ? (
				<EmptyState icon={DollarSign} title="No invoice data yet" description="Spending and invoices appear after your first shipment." />
			) : (
				<div className="card">
					<div style={{ display: 'grid', gap: 10 }}>
						{shipments.map((item) => (
							<div
								key={item.shipment_id}
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									gap: 10,
									alignItems: 'center',
									padding: 12,
									background: 'var(--bg-elevated)',
									border: '1px solid var(--border-subtle)',
									borderRadius: 8,
								}}
							>
								<div>
									<div className="mono" style={{ fontWeight: 700 }}>{item.tracking_number}</div>
									<div className="page-subtitle">{item.origin} to {item.destination}</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div style={{ fontWeight: 700 }}>${Number(item.declared_value || 0).toLocaleString()}</div>
									<div className="page-subtitle">{item.status.replace(/_/g, ' ')}</div>
								</div>
								<div style={{ display: 'flex', gap: 8 }}>
									<button type="button" className="btn-outline" style={{ padding: '8px 10px' }}>
										<Download size={14} />
										Invoice
									</button>
									{item.status === 'delivered' ? (
										<button type="button" className="btn-primary" style={{ padding: '8px 10px' }} onClick={() => setRatingTarget(item)}>
											<Star size={14} />
											Rate Carrier
										</button>
									) : (
										<button type="button" className="btn-outline" style={{ padding: '8px 10px' }}>
											<Receipt size={14} />
											Pending
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<RatingModal shipment={ratingTarget} onClose={() => setRatingTarget(null)} />
		</div>
	);
}
