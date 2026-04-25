import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react';
import { api } from '../../config/api';
import { ENDPOINTS } from '../../config/endpoints';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const DEFAULT_FORM = {
	name: '',
	address_line: '',
	contact: '',
	address_type: 'pickup',
	is_default: false,
};

export default function ShipperAddresses() {
	const [loading, setLoading] = useState(true);
	const [addresses, setAddresses] = useState([]);
	const [editing, setEditing] = useState(null);
	const [showForm, setShowForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState(DEFAULT_FORM);

	const loadAddresses = async () => {
		setLoading(true);
		try {
			const res = await api.get(ENDPOINTS.SHIPPER_ADDRESSES);
			setAddresses(Array.isArray(res.data) ? res.data : []);
		} catch {
			setAddresses([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadAddresses();
	}, []);

	const resetForm = () => {
		setForm(DEFAULT_FORM);
		setEditing(null);
		setShowForm(false);
	};

	const typeLabel = useMemo(() => ({ pickup: 'Pickup', delivery: 'Delivery' }), []);

	const onSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			if (editing?.address_id) {
				await api.put(`${ENDPOINTS.SHIPPER_ADDRESSES}/${editing.address_id}`, form);
			} else {
				await api.post(ENDPOINTS.SHIPPER_ADDRESSES, form);
			}
			resetForm();
			await loadAddresses();
		} catch {
			window.alert('Unable to save address right now.');
		} finally {
			setSaving(false);
		}
	};

	const startEdit = (item) => {
		setEditing(item);
		setForm({
			name: item.name || '',
			address_line: item.address_line || '',
			contact: item.contact || '',
			address_type: item.address_type || 'pickup',
			is_default: Boolean(item.is_default),
		});
		setShowForm(true);
	};

	const markDefault = async (item) => {
		try {
			await api.put(`${ENDPOINTS.SHIPPER_ADDRESSES}/${item.address_id}`, { is_default: true });
			await loadAddresses();
		} catch {
			window.alert('Unable to set default address.');
		}
	};

	const removeAddress = async (item) => {
		const ok = window.confirm(`Delete "${item.name}"?`);
		if (!ok) return;
		try {
			await api.delete(`${ENDPOINTS.SHIPPER_ADDRESSES}/${item.address_id}`);
			await loadAddresses();
		} catch {
			window.alert('Unable to delete address right now.');
		}
	};

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Saved Addresses</h1>
					<p className="page-subtitle">Reuse pickup and delivery locations for faster order creation.</p>
				</div>
				<button
					type="button"
					className="btn-primary"
					onClick={() => {
						setForm(DEFAULT_FORM);
						setEditing(null);
						setShowForm((prev) => !prev);
					}}
				>
					<Plus size={14} />
					{showForm ? 'Close' : 'Add New'}
				</button>
			</div>

			{showForm ? (
				<form className="card" style={{ marginBottom: 16, display: 'grid', gap: 10 }} onSubmit={onSubmit}>
					<div style={{ fontWeight: 700 }}>{editing ? 'Edit Address' : 'New Address'}</div>
					<div className="form-grid">
						<div>
							<label className="label">Name</label>
							<input
								className="input"
								value={form.name}
								onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
								required
							/>
						</div>
						<div>
							<label className="label">Contact</label>
							<input
								className="input"
								value={form.contact}
								onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
								placeholder="+1 ..."
							/>
						</div>
					</div>
					<div>
						<label className="label">Address</label>
						<input
							className="input"
							value={form.address_line}
							onChange={(e) => setForm((prev) => ({ ...prev, address_line: e.target.value }))}
							required
						/>
					</div>
					<div className="form-grid">
						<div>
							<label className="label">Type</label>
							<select
								className="select"
								value={form.address_type}
								onChange={(e) => setForm((prev) => ({ ...prev, address_type: e.target.value }))}
							>
								<option value="pickup">Pickup</option>
								<option value="delivery">Delivery</option>
							</select>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
							<input
								id="is_default"
								type="checkbox"
								checked={form.is_default}
								onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
							/>
							<label htmlFor="is_default" style={{ fontSize: 13 }}>Set as default</label>
						</div>
					</div>
					<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
						<button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>
						<button type="submit" className="btn-primary" disabled={saving}>
							{saving ? 'Saving...' : editing ? 'Update' : 'Save'}
						</button>
					</div>
				</form>
			) : null}

			{loading ? (
				<div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
					<Spinner size="lg" />
				</div>
			) : addresses.length === 0 ? (
				<EmptyState icon={MapPin} title="No saved addresses" description="Add your first pickup or delivery address." />
			) : (
			<div className="grid-two">
				{addresses.map((item) => (
					<div key={item.address_id} className="card" style={{ padding: 14 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
							<div>
								<div style={{ fontWeight: 700 }}>{item.name}</div>
								<div className="page-subtitle">{typeLabel[item.address_type] || 'Address'} address</div>
							</div>
							{item.is_default ? (
								<span className="badge badge-sm badge-low">Default</span>
							) : null}
						</div>
						<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
							<MapPin size={15} color="var(--text-secondary)" />
							<div style={{ fontSize: 13 }}>
								<div>{item.address_line}</div>
								<div className="page-subtitle">{item.contact}</div>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 8 }}>
							<button type="button" className="btn-outline" style={{ padding: '8px 10px' }} onClick={() => startEdit(item)}>
								<Pencil size={14} />
								Edit
							</button>
							{!item.is_default ? (
								<button type="button" className="btn-outline" style={{ padding: '8px 10px' }} onClick={() => markDefault(item)}>
									Set Default
								</button>
							) : null}
							<button type="button" className="btn-danger" style={{ padding: '8px 10px' }} onClick={() => removeAddress(item)}>
								<Trash2 size={14} />
								Delete
							</button>
						</div>
					</div>
				))}
			</div>
			)}
		</div>
	);
}
