import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DEMO_ACCOUNTS = [
	{ label: 'Shipper', email: 'shipper@routeguard.com', password: 'test1234' },
	{ label: 'Manager', email: 'manager@routeguard.com', password: 'test1234' },
	{ label: 'Driver', email: 'driver@routeguard.com', password: 'test1234' },
	{ label: 'Receiver', email: 'receiver@routeguard.com', password: 'test1234' },
];

export default function LoginPage() {
	const { login, isAuthenticated } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	if (isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	const handleSubmit = async (event) => {
		event.preventDefault();
		setLoading(true);
		setError('');

		const result = await login(email, password);
		if (!result.ok) {
			setError(result.message || 'Login failed');
		}

		setLoading(false);
	};

	return (
		<div className="auth-shell">
			<form className="auth-card form-grid" onSubmit={handleSubmit}>
				<h1>RouteGuard</h1>
				<p className="auth-subtitle">Sign in to your workspace</p>

				<input
					className="input"
					type="email"
					placeholder="you@company.com"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					required
				/>

				<input
					className="input"
					type="password"
					placeholder="••••••••"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					required
				/>

				<button className="btn-primary" type="submit" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign In'}
				</button>

				{error ? <p className="auth-error">{error}</p> : null}

				<div className="form-grid">
					<p className="auth-subtitle mono">Test Accounts (Demo Mode)</p>
					<div className="demo-grid">
						{DEMO_ACCOUNTS.map((account) => (
							<button
								className="demo-btn"
								type="button"
								key={account.label}
								onClick={() => {
									setEmail(account.email);
									setPassword(account.password);
								}}
							>
								{account.label}
							</button>
						))}
					</div>
				</div>
			</form>
		</div>
	);
}
