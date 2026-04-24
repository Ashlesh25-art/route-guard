import { useState } from 'react';
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react';

const INITIAL = [
	{
		id: 'addr-1',
		name: 'TechCorp Korea Factory',
		address: '123 Guro-dong, Seoul, Korea',
		contact: '+82 10 xxxx xxxx',
		type: 'pickup',
		isDefault: true,
	},
	{
		id: 'addr-2',
		name: 'Berlin Warehouse (Anna Schmidt)',
		address: '45 Industriestrasse, Berlin, Germany',
		contact: '+49 30 xxxxxxx',
		type: 'delivery',
		isDefault: false,
	},
];

export default function ShipperAddresses() {
	const [addresses, setAddresses] = useState(INITIAL);

	const markDefault = (id) => {
		setAddresses((prev) =>
			prev.map((item) => ({
				...item,
				isDefault: item.id === id,
			})),
		);
	};

	const removeAddress = (id) => {
		setAddresses((prev) => prev.filter((item) => item.id !== id));
	};

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Saved Addresses</h1>
					<p className="page-subtitle">Reuse pickup and delivery locations for faster order creation.</p>
				</div>
				<button type="button" className="btn-primary">
					<Plus size={14} />
					Add New
				</button>
			</div>

			<div className="grid-two">
				{addresses.map((item) => (
					<div key={item.id} className="card" style={{ padding: 14 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
							<div>
								<div style={{ fontWeight: 700 }}>{item.name}</div>
								<div className="page-subtitle">{item.type === 'pickup' ? 'Pickup' : 'Delivery'} address</div>
							</div>
							{item.isDefault ? (
								<span className="badge badge-sm badge-low">Default</span>
							) : null}
						</div>
						<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
							<MapPin size={15} color="var(--text-secondary)" />
							<div style={{ fontSize: 13 }}>
								<div>{item.address}</div>
								<div className="page-subtitle">{item.contact}</div>
							</div>
						</div>
						<div style={{ display: 'flex', gap: 8 }}>
							<button type="button" className="btn-outline" style={{ padding: '8px 10px' }}>
								<Pencil size={14} />
								Edit
							</button>
							{!item.isDefault ? (
								<button type="button" className="btn-outline" style={{ padding: '8px 10px' }} onClick={() => markDefault(item.id)}>
									Set Default
								</button>
							) : null}
							<button type="button" className="btn-danger" style={{ padding: '8px 10px' }} onClick={() => removeAddress(item.id)}>
								<Trash2 size={14} />
								Delete
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
