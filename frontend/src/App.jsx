import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import { useAuth } from './hooks/useAuth';

function PlaceholderPage({ title }) {
	return (
		<div className="page-placeholder">
			<h1>{title}</h1>
			<p>Page scaffold is ready. Implementation will be added in the next step.</p>
		</div>
	);
}

function PrivateRoute({ children, allowedRoles }) {
	const { user } = useAuth();
	if (!user) return <Navigate to="/login" replace />;
	if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
	return children;
}

function RoleRedirect() {
	const { user } = useAuth();
	if (!user) return <Navigate to="/login" replace />;

	const roleRoutes = {
		manager: '/manager',
		shipper: '/shipper',
		driver: '/driver',
		receiver: '/receiver',
	};

	return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
}

export default function App() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route path="/" element={<RoleRedirect />} />

			<Route
				path="/manager/*"
				element={
					<PrivateRoute allowedRoles={['manager']}>
						<PlaceholderPage title="Manager Workspace" />
					</PrivateRoute>
				}
			/>

			<Route
				path="/shipper/*"
				element={
					<PrivateRoute allowedRoles={['shipper']}>
						<PlaceholderPage title="Shipper Workspace" />
					</PrivateRoute>
				}
			/>

			<Route
				path="/driver/*"
				element={
					<PrivateRoute allowedRoles={['driver']}>
						<PlaceholderPage title="Driver Workspace" />
					</PrivateRoute>
				}
			/>

			<Route
				path="/receiver/*"
				element={
					<PrivateRoute allowedRoles={['receiver']}>
						<PlaceholderPage title="Receiver Workspace" />
					</PrivateRoute>
				}
			/>

			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
