import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';

function formatDateTime(value) {
	if (!value) return 'N/A';
	try {
		return new Date(value).toLocaleString();
	} catch {
		return String(value);
	}
}

export default function ShipperChat() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [requests, setRequests] = useState([]);
	const [selectedRequestId, setSelectedRequestId] = useState('');
	const [offers, setOffers] = useState([]);
	const [messages, setMessages] = useState([]);
	const [messageBody, setMessageBody] = useState('');
	const [counterAmount, setCounterAmount] = useState('');

	const selectedRequest = useMemo(
		() => requests.find((item) => item.request_id === selectedRequestId) || null,
		[requests, selectedRequestId],
	);

	const loadRequests = async () => {
		const response = await api.get(ENDPOINTS.QUOTE_REQUESTS);
		const rows = Array.isArray(response.data) ? response.data : [];
		setRequests(rows);
		if (!selectedRequestId && rows.length > 0) {
			setSelectedRequestId(rows[0].request_id);
		}
		if (selectedRequestId && !rows.some((item) => item.request_id === selectedRequestId)) {
			setSelectedRequestId(rows[0]?.request_id || '');
		}
	};

	const loadThread = async (requestId) => {
		if (!requestId) {
			setOffers([]);
			setMessages([]);
			return;
		}
		const [offersRes, messagesRes] = await Promise.all([
			api.get(ENDPOINTS.QUOTE_OFFERS(requestId)),
			api.get(ENDPOINTS.QUOTE_MESSAGES(requestId)),
		]);
		setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
		setMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);
	};

	useEffect(() => {
		const run = async () => {
			setLoading(true);
			try {
				await loadRequests();
			} catch {
				toast.error('Unable to load quote requests.');
			} finally {
				setLoading(false);
			}
		};
		run();
	}, []);

	useEffect(() => {
		const run = async () => {
			if (!selectedRequestId) return;
			try {
				await loadThread(selectedRequestId);
			} catch {
				toast.error('Unable to load offers/messages for this request.');
			}
		};
		run();
	}, [selectedRequestId]);

	const handleSend = async () => {
		if (!selectedRequestId) return;
		if (!messageBody.trim() && !counterAmount) {
			toast.error('Enter a message or a counter amount.');
			return;
		}
		setSubmitting(true);
		try {
			await api.post(ENDPOINTS.QUOTE_MESSAGES(selectedRequestId), {
				message_type: counterAmount ? 'counter' : 'text',
				body: messageBody.trim() || null,
				counter_amount_usd: counterAmount ? Number(counterAmount) : null,
			});
			setMessageBody('');
			setCounterAmount('');
			await Promise.all([loadThread(selectedRequestId), loadRequests()]);
			toast.success('Message sent.');
		} catch (err) {
			toast.error(err?.response?.data?.detail || 'Unable to send message.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleAccept = async (offerId) => {
		try {
			const response = await api.post(ENDPOINTS.ACCEPT_OFFER(offerId));
			await Promise.all([loadThread(selectedRequestId), loadRequests()]);
			toast.success(`Offer accepted. Shipment ${response.data?.tracking_number || ''} created.`);
		} catch (err) {
			toast.error(err?.response?.data?.detail || 'Unable to accept offer.');
		}
	};

	const handleReject = async (offerId) => {
		try {
			await api.post(ENDPOINTS.REJECT_OFFER(offerId));
			await loadThread(selectedRequestId);
			toast.success('Offer rejected.');
		} catch (err) {
			toast.error(err?.response?.data?.detail || 'Unable to reject offer.');
		}
	};

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
					<h1 className="page-title">Sender Negotiation Console</h1>
					<p className="page-subtitle">Chat with logistics managers, compare offers, and accept the best one.</p>
				</div>
			</div>

			{requests.length === 0 ? (
				<EmptyState
					icon={MessageSquare}
					title="No quote requests yet"
					description="Create a new order request first, then offers and messages will show up here."
				/>
			) : (
				<div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
					<div className="card">
						<label className="label">Quote Request</label>
						<select className="select" value={selectedRequestId} onChange={(e) => setSelectedRequestId(e.target.value)}>
							{requests.map((item) => (
								<option key={item.request_id} value={item.request_id}>
									{item.request_id.slice(0, 8)}... ({String(item.status).toUpperCase()})
								</option>
							))}
						</select>
						{selectedRequest ? (
							<div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
								<div>Pickup: {selectedRequest.pickup_address}</div>
								<div>Weight: {selectedRequest.weight_kg || 'N/A'} kg</div>
								<div>Status: {String(selectedRequest.status).toUpperCase()}</div>
							</div>
						) : null}
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
						<div className="card">
							<h2 className="section-title">Offers</h2>
							{offers.length === 0 ? (
								<p className="page-subtitle">No offers yet for this request.</p>
							) : (
								<div style={{ display: 'grid', gap: 10 }}>
									{offers.map((offer) => (
										<div key={offer.offer_id} className="card" style={{ padding: 12 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>${offer.offered_amount_usd} {offer.currency}</div>
											<div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
												Pickup {formatDateTime(offer.estimated_pickup_at)} | Delivery {formatDateTime(offer.estimated_delivery_at)}
											</div>
											<div style={{ display: 'flex', gap: 8 }}>
												<button className="btn-primary" type="button" onClick={() => handleAccept(offer.offer_id)}>
													<ShieldCheck size={14} />
													Accept
												</button>
												<button className="btn-outline" type="button" onClick={() => handleReject(offer.offer_id)}>
													Reject
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="card">
							<h2 className="section-title">Messages</h2>
							<div style={{ maxHeight: 280, overflow: 'auto', marginBottom: 10 }}>
								{messages.length === 0 ? (
									<p className="page-subtitle">No messages yet.</p>
								) : (
									<div style={{ display: 'grid', gap: 8 }}>
										{messages.map((msg) => (
											<div key={msg.message_id} className="card" style={{ padding: 10 }}>
												<div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
													{String(msg.sender_user_id) === String(user?.user_id) ? 'You' : 'Manager'} | {msg.message_type} | {formatDateTime(msg.created_at)}
												</div>
												<div style={{ fontSize: 13, marginBottom: 4 }}>{msg.body || 'No text body'}</div>
												{msg.counter_amount_usd != null ? (
													<div style={{ fontSize: 12, fontWeight: 600 }}>
														Counter: ${msg.counter_amount_usd}
													</div>
												) : null}
											</div>
										))}
									</div>
								)}
							</div>

							<div className="grid-two">
								<div>
									<label className="label">Message</label>
									<textarea
										className="input"
										rows={3}
										value={messageBody}
										onChange={(e) => setMessageBody(e.target.value)}
										placeholder="Send negotiation note..."
									/>
								</div>
								<div>
									<label className="label">Counter Amount (USD)</label>
									<input
										className="input"
										type="number"
										min="0"
										step="0.01"
										value={counterAmount}
										onChange={(e) => setCounterAmount(e.target.value)}
										placeholder="Optional"
									/>
								</div>
							</div>
							<div style={{ marginTop: 10 }}>
								<button type="button" className="btn-primary" disabled={submitting} onClick={handleSend}>
									<Send size={14} />
									{submitting ? 'Sending...' : 'Send Message'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
