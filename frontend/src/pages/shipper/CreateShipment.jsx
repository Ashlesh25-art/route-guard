import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Anchor, Box, CheckCircle2, ChevronRight, Package, Ship, User, Navigation } from 'lucide-react';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';

const CARGO_SENSITIVITY = {
	standard: { label: 'Standard Dry', score: 35 },
	electronics: { label: 'Electronics', score: 65 },
	refrigerated: { label: 'Refrigerated', score: 74 },
	hazardous: { label: 'Hazardous', score: 88 },
	liquid_bulk: { label: 'Liquid Bulk', score: 50 },
	oversized: { label: 'Oversized', score: 60 },
	livestock: { label: 'Livestock', score: 80 },
	perishable: { label: 'Perishable', score: 70 },
	pharmaceutical: { label: 'Pharmaceutical', score: 82 },
};

const PRIORITY_BONUS = {
	low: 0,
	medium: 8,
	high: 14,
	urgent: 20,
};

const INITIAL_FORM = {
	origin_port_id: '',
	destination_port_id: '',
	receiver_id: '',
	assigned_manager_id: '',
	vessel_id: '',
	departure_time: '',
	expected_arrival: '',
	cargo_type: 'standard',
	cargo_description: '',
	weight_kg: '',
	volume_cbm: '',
	declared_value: '',
	insurance_value: '',
	priority: 'medium',
	special_instructions: '',
};

const STEPS = [
	{ label: 'Route & Parties', icon: Anchor, desc: 'Select ports, receiver and logistics' },
	{ label: 'Cargo Details', icon: Package, desc: 'Describe what you\'re shipping' },
	{ label: 'Review & Confirm', icon: CheckCircle2, desc: 'Verify and submit your order' },
];

export default function CreateShipment() {
	const navigate = useNavigate();
	const [step, setStep] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [formData, setFormData] = useState(INITIAL_FORM);
	const [ports, setPorts] = useState([]);
	const [receivers, setReceivers] = useState([]);
	const [managers, setManagers] = useState([]);
	const [vessels, setVessels] = useState([]);
	const [loadingData, setLoadingData] = useState(true);
	const [lookupError, setLookupError] = useState('');

	useEffect(() => {
		const loadData = async () => {
			setLoadingData(true);
			try {
				const [portsRes, receiversRes, managersRes, vesselsRes] = await Promise.all([
					api.get(ENDPOINTS.PORTS),
					api.get(ENDPOINTS.RECEIVERS),
					api.get(ENDPOINTS.MANAGERS),
					api.get(ENDPOINTS.VESSELS),
				]);
				const portItems = Array.isArray(portsRes.data) ? portsRes.data : [];
				const receiverItems = Array.isArray(receiversRes.data) ? receiversRes.data : [];
				const managerItems = Array.isArray(managersRes.data) ? managersRes.data : [];
				const vesselItems = Array.isArray(vesselsRes.data) ? vesselsRes.data : [];
				setPorts(portItems);
				setReceivers(receiverItems);
				setManagers(managerItems);
				setVessels(vesselItems);
				setFormData((prev) => ({
					...prev,
					origin_port_id: prev.origin_port_id || portItems[0]?.port_id || '',
					destination_port_id: prev.destination_port_id || portItems[1]?.port_id || '',
					receiver_id: prev.receiver_id || receiverItems[0]?.user_id || '',
					assigned_manager_id: prev.assigned_manager_id || managerItems[0]?.user_id || '',
				}));
			} catch {
				setLookupError('Unable to load form data. Check your connection.');
				setPorts([]);
				setReceivers([]);
				setManagers([]);
				setVessels([]);
			} finally {
				setLoadingData(false);
			}
		};
		loadData();
	}, []);

	const sensitivityScore = useMemo(() => {
		const cargoBase = CARGO_SENSITIVITY[formData.cargo_type]?.score || 40;
		const priorityBoost = PRIORITY_BONUS[formData.priority] || 0;
		return Math.min(100, cargoBase + priorityBoost);
	}, [formData.cargo_type, formData.priority]);

	const updateField = (key, value) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	const validateStep = () => {
		if (step === 1) {
			if (!formData.origin_port_id || !formData.destination_port_id || !formData.receiver_id || !formData.assigned_manager_id || !formData.departure_time || !formData.expected_arrival) {
				toast.error('Please complete all route and party fields.');
				return false;
			}
			if (formData.origin_port_id === formData.destination_port_id) {
				toast.error('Origin and destination ports must be different.');
				return false;
			}
		}
		if (step === 2) {
			if (!formData.cargo_description || !formData.weight_kg || !formData.declared_value) {
				toast.error('Please complete required cargo details.');
				return false;
			}
		}
		return true;
	};

	const next = () => {
		if (!validateStep()) return;
		setStep((prev) => Math.min(3, prev + 1));
	};

	const back = () => setStep((prev) => Math.max(1, prev - 1));

	const handleSubmit = async () => {
		setSubmitting(true);
		try {
			const payload = {
				origin_port_id: formData.origin_port_id,
				destination_port_id: formData.destination_port_id,
				departure_time: new Date(formData.departure_time).toISOString(),
				expected_arrival: new Date(formData.expected_arrival).toISOString(),
				receiver_id: formData.receiver_id,
				assigned_manager_id: formData.assigned_manager_id,
				vessel_id: formData.vessel_id || undefined,
				priority_level: formData.priority,
				special_instructions: formData.special_instructions || undefined,
				cargo: {
					cargo_type: formData.cargo_type,
					description: formData.cargo_description,
					weight_kg: Number(formData.weight_kg),
					volume_cbm: formData.volume_cbm ? Number(formData.volume_cbm) : undefined,
					declared_value: formData.declared_value ? Number(formData.declared_value) : undefined,
					insurance_value: formData.insurance_value ? Number(formData.insurance_value) : undefined,
				},
			};
			const response = await api.post(ENDPOINTS.CREATE_SHIPMENT, payload);
			toast.success('Shipment created successfully!');
			navigate(`/shipper/shipments/${response.data.shipment_id}`);
		} catch (err) {
			const msg = err?.response?.data?.detail || 'Unable to create shipment. Please try again.';
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	};

	const getPortName = (portId) => {
		const port = ports.find((p) => p.port_id === portId);
		return port ? `${port.port_name}, ${port.country}` : portId;
	};

	const getReceiverName = (receiverId) => {
		const receiver = receivers.find((r) => String(r.user_id) === receiverId);
		return receiver ? receiver.full_name : receiverId;
	};

	const getManagerName = (managerId) => {
		const manager = managers.find((m) => String(m.user_id) === managerId);
		if (!manager) return managerId;
		return manager.company_name ? `${manager.full_name} (${manager.company_name})` : manager.full_name;
	};

	const getVesselName = (vesselId) => {
		if (!vesselId) return 'Auto-assign';
		const vessel = vessels.find((v) => v.vessel_id === vesselId);
		return vessel ? `${vessel.vessel_name} (${vessel.vessel_type})` : vesselId;
	};

	if (loadingData) {
		return (
			<div className="card" style={{ minHeight: 300, display: 'grid', placeItems: 'center' }}>
				<div style={{ textAlign: 'center' }}>
					<div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
					<p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Loading form data...</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Create Shipment</h1>
					<p className="page-subtitle">Fill in the details to send your package</p>
				</div>
			</div>

			{lookupError ? (
				<div className="card" style={{ marginBottom: 14, borderLeft: '3px solid var(--danger)' }}>
					<div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>{lookupError}</div>
				</div>
			) : null}

			{/* Step Progress Indicator */}
			<div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					{STEPS.map((s, index) => {
						const stepNum = index + 1;
						const isActive = stepNum === step;
						const isCompleted = stepNum < step;
						const StepIcon = s.icon;
						return (
							<div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: index < STEPS.length - 1 ? 1 : 'none' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
									<div
										style={{
											width: 44,
											height: 44,
											borderRadius: '50%',
											display: 'grid',
											placeItems: 'center',
											background: isCompleted
												? 'var(--success)'
												: isActive
													? 'var(--accent-primary)'
													: 'var(--bg-elevated)',
											color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
											transition: 'all 0.3s ease',
											boxShadow: isActive ? '0 0 16px var(--accent-glow)' : 'none',
										}}
									>
										{isCompleted ? <CheckCircle2 size={20} /> : <StepIcon size={20} />}
									</div>
									<div>
										<div style={{
											fontSize: 13,
											fontWeight: 700,
											color: isActive ? 'var(--text-primary)' : isCompleted ? 'var(--success)' : 'var(--text-muted)',
											transition: 'color 0.3s ease',
										}}>
											{s.label}
										</div>
										<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
									</div>
								</div>
								{index < STEPS.length - 1 && (
									<div style={{
										flex: 1,
										height: 2,
										margin: '0 16px',
										borderRadius: 1,
										background: isCompleted ? 'var(--success)' : 'var(--border-default)',
										transition: 'background 0.3s ease',
									}} />
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Step 1: Route & Parties */}
			{step === 1 ? (
				<div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
					<h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<Anchor size={18} style={{ color: 'var(--accent-primary)' }} />
						Route & Parties
					</h3>
					<div className="form-grid">
						<div>
							<label className="label">
								<Ship size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
								Origin Port
							</label>
							<select className="select" value={formData.origin_port_id} onChange={(e) => updateField('origin_port_id', e.target.value)}>
								<option value="">Select origin port...</option>
								{ports.map((port) => (
									<option key={port.port_id} value={port.port_id}>
										{port.port_name}, {port.country} ({port.port_code})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="label">
								<Ship size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
								Destination Port
							</label>
							<select className="select" value={formData.destination_port_id} onChange={(e) => updateField('destination_port_id', e.target.value)}>
								<option value="">Select destination port...</option>
								{ports.map((port) => (
									<option key={port.port_id} value={port.port_id}>
										{port.port_name}, {port.country} ({port.port_code})
									</option>
								))}
							</select>
						</div>

						<div className="full">
							<label className="label">
								<User size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
								Receiver
							</label>
							<select className="select" value={formData.receiver_id} onChange={(e) => updateField('receiver_id', e.target.value)}>
								<option value="">Select receiver...</option>
								{receivers.map((receiver) => (
									<option key={receiver.user_id} value={receiver.user_id}>
										{receiver.full_name} ({receiver.email})
									</option>
								))}
							</select>
						</div>

						<div className="full">
							<label className="label">
								<Box size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
								Logistics Manager / Company
							</label>
							<select className="select" value={formData.assigned_manager_id} onChange={(e) => updateField('assigned_manager_id', e.target.value)}>
								<option value="">Select logistics manager...</option>
								{managers.map((manager) => (
									<option key={manager.user_id} value={manager.user_id}>
										{manager.full_name} {manager.company_name ? `— ${manager.company_name}` : ''} ({manager.email})
									</option>
								))}
							</select>
						</div>

						<div className="full">
							<label className="label">
								<Navigation size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
								Vessel / Shipping Method
							</label>
							<select className="select" value={formData.vessel_id} onChange={(e) => updateField('vessel_id', e.target.value)}>
								<option value="">Auto-assign (recommended)</option>
								{vessels.map((vessel) => (
									<option key={vessel.vessel_id} value={vessel.vessel_id}>
										{vessel.vessel_name} — {vessel.vessel_type} ({vessel.flag_country}{vessel.built_year ? `, ${vessel.built_year}` : ''})
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="label">Departure Date</label>
							<input className="input" type="datetime-local" value={formData.departure_time} onChange={(e) => updateField('departure_time', e.target.value)} />
						</div>
						<div>
							<label className="label">Expected Delivery Date</label>
							<input className="input" type="datetime-local" value={formData.expected_arrival} onChange={(e) => updateField('expected_arrival', e.target.value)} />
						</div>
					</div>
				</div>
			) : null}

			{/* Step 2: Cargo Details */}
			{step === 2 ? (
				<div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
					<h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<Package size={18} style={{ color: 'var(--accent-primary)' }} />
						Cargo Details
					</h3>
					<div className="form-grid">
						<div>
							<label className="label">Cargo Type</label>
							<select className="select" value={formData.cargo_type} onChange={(e) => updateField('cargo_type', e.target.value)}>
								{Object.entries(CARGO_SENSITIVITY).map(([value, meta]) => (
									<option key={value} value={value}>
										{meta.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="label">Priority Level</label>
							<select className="select" value={formData.priority} onChange={(e) => updateField('priority', e.target.value)}>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="urgent">Urgent</option>
							</select>
						</div>

						<div className="full">
							<label className="label">Cargo Description</label>
							<textarea className="textarea" value={formData.cargo_description} onChange={(e) => updateField('cargo_description', e.target.value)} placeholder="Describe the contents of your shipment..." />
						</div>

						<div>
							<label className="label">Weight (kg)</label>
							<input className="input" type="number" value={formData.weight_kg} onChange={(e) => updateField('weight_kg', e.target.value)} placeholder="e.g. 5000" />
						</div>
						<div>
							<label className="label">Volume (CBM)</label>
							<input className="input" type="number" value={formData.volume_cbm} onChange={(e) => updateField('volume_cbm', e.target.value)} placeholder="Optional" />
						</div>

						<div>
							<label className="label">Declared Value (USD)</label>
							<input className="input" type="number" value={formData.declared_value} onChange={(e) => updateField('declared_value', e.target.value)} placeholder="e.g. 50000" />
						</div>
						<div>
							<label className="label">Insurance Value (USD)</label>
							<input className="input" type="number" value={formData.insurance_value} onChange={(e) => updateField('insurance_value', e.target.value)} placeholder="Optional" />
						</div>

						<div className="full">
							<label className="label">Special Handling Notes</label>
							<textarea className="textarea" value={formData.special_instructions} onChange={(e) => updateField('special_instructions', e.target.value)} placeholder="Any special instructions for handling..." />
						</div>
					</div>

					{/* Sensitivity Score Card */}
					<div className="card" style={{ marginTop: 14, padding: 14, borderLeft: `3px solid ${sensitivityScore > 70 ? 'var(--danger)' : sensitivityScore > 50 ? 'var(--warning)' : 'var(--success)'}` }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Estimated Cargo Sensitivity Score</span>
							<span className="mono" style={{ fontSize: 22, fontWeight: 700, color: sensitivityScore > 70 ? 'var(--danger)' : sensitivityScore > 50 ? 'var(--warning)' : 'var(--success)' }}>
								{sensitivityScore}/100
							</span>
						</div>
						<div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
							<div style={{
								width: `${sensitivityScore}%`,
								height: '100%',
								borderRadius: 3,
								background: sensitivityScore > 70 ? 'var(--danger)' : sensitivityScore > 50 ? 'var(--warning)' : 'var(--success)',
								transition: 'width 0.4s ease',
							}} />
						</div>
					</div>
				</div>
			) : null}

			{/* Step 3: Review & Confirm */}
			{step === 3 ? (
				<div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
					<h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
						Review & Confirm
					</h3>
					<div className="grid-two" style={{ marginBottom: 16 }}>
						<div className="card" style={{ padding: 16 }}>
							<h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--accent-primary)' }}>Route Information</h4>
							<div className="info-list">
								<div className="info-row"><span>Origin Port</span><strong>{getPortName(formData.origin_port_id)}</strong></div>
								<div className="info-row"><span>Destination Port</span><strong>{getPortName(formData.destination_port_id)}</strong></div>
								<div className="info-row"><span>Receiver</span><strong>{getReceiverName(formData.receiver_id)}</strong></div>
								<div className="info-row"><span>Logistics Manager</span><strong>{getManagerName(formData.assigned_manager_id)}</strong></div>
								<div className="info-row"><span>Vessel</span><strong>{getVesselName(formData.vessel_id)}</strong></div>
								<div className="info-row"><span>Departure</span><strong>{formData.departure_time ? new Date(formData.departure_time).toLocaleString() : '—'}</strong></div>
								<div className="info-row"><span>Expected Arrival</span><strong>{formData.expected_arrival ? new Date(formData.expected_arrival).toLocaleString() : '—'}</strong></div>
							</div>
						</div>
						<div className="card" style={{ padding: 16 }}>
							<h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--accent-primary)' }}>Cargo Information</h4>
							<div className="info-list">
								<div className="info-row"><span>Type</span><strong>{CARGO_SENSITIVITY[formData.cargo_type]?.label || formData.cargo_type}</strong></div>
								<div className="info-row"><span>Priority</span><strong style={{ textTransform: 'capitalize' }}>{formData.priority}</strong></div>
								<div className="info-row"><span>Weight</span><strong>{Number(formData.weight_kg || 0).toLocaleString()} kg</strong></div>
								<div className="info-row"><span>Declared Value</span><strong>${Number(formData.declared_value || 0).toLocaleString()}</strong></div>
								<div className="info-row"><span>Sensitivity Score</span><strong className="mono">{sensitivityScore}/100</strong></div>
								{formData.cargo_description && (
									<div className="info-row"><span>Description</span><strong style={{ maxWidth: 200, textAlign: 'right' }}>{formData.cargo_description}</strong></div>
								)}
							</div>
						</div>
					</div>
					<button
						type="button"
						className="btn-primary"
						style={{ width: '100%', height: 48, fontSize: 15 }}
						onClick={handleSubmit}
						disabled={submitting}
					>
						{submitting ? (
							<>
								<div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
								Creating Shipment...
							</>
						) : (
							<>
								<CheckCircle2 size={18} />
								Confirm & Create Shipment
							</>
						)}
					</button>
				</div>
			) : null}

			{/* Navigation Buttons */}
			<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
				<button type="button" className="btn-outline" onClick={back} disabled={step === 1 || submitting}>
					← Back
				</button>
				{step < 3 ? (
					<button type="button" className="btn-primary" onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						Next Step
						<ChevronRight size={16} />
					</button>
				) : null}
			</div>
		</div>
	);
}
