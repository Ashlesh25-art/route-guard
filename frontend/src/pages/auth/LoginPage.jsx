import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import RoleSelection from '../../components/auth/RoleSelection';
import RoleSpecificFields from '../../components/auth/RoleSpecificFields';
import {
	AUTH_ROLES,
	AUTH_ROLE_ORDER,
	DEMO_ACCOUNTS,
} from '../../components/auth/roleConfig';
import './login-portal.css';

const ROLE_ROUTES = {
	manager: '/manager',
	shipper: '/shipper',
	driver: '/driver',
	receiver: '/receiver',
};

function normalizeRole(role) {
	return String(role || '').trim().toLowerCase();
}

export default function LoginPage() {
	const navigate = useNavigate();
	const { login, register } = useAuth();
	const authPaneRef = useRef(null);
	const [theme, setTheme] = useState('dark');
	const [authOpen, setAuthOpen] = useState(false);
	const [isSignup, setIsSignup] = useState(false);
	const [selectedRole, setSelectedRole] = useState('receiver');
	const [fullName, setFullName] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [companyName, setCompanyName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [industryType, setIndustryType] = useState('Electronics');
	const [otherIndustry, setOtherIndustry] = useState('');
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [showPassword, setShowPassword] = useState(false);

	const currentRoleData = useMemo(() => AUTH_ROLES[selectedRole], [selectedRole]);

	const openAuth = (role) => {
		setSelectedRole(role);
		setIsSignup(false);
		setError('');
		setAuthOpen(true);
	};

	const closeAuth = () => {
		setAuthOpen(false);
		setError('');
	};

	const toggleAuthMode = () => {
		setIsSignup((prev) => !prev);
		setError('');
	};

	const toggleTheme = () => {
		setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
	};

	const onRoleChange = (nextRole) => {
		setSelectedRole(nextRole);
	};

	const handleLogin = async (event) => {
		event.preventDefault();
		setLoading(true);
		setError('');

		try {
			if (isSignup) {
				if (!fullName.trim()) {
					setError('Full name is required.');
					return;
				}
				if (password !== confirmPassword) {
					setError('Passwords do not match.');
					return;
				}
				if (!acceptTerms) {
					setError('Please accept the terms and conditions to continue.');
					return;
				}

				const registerPayload = {
					full_name: fullName.trim(),
					email: String(email || '').trim(),
					password,
					role: selectedRole,
					company_name: companyName.trim() || null,
					phone_number: phoneNumber.trim() || null,
				};

				const result = await register(registerPayload);
				if (!result.success) {
					setError(result.error || 'Registration failed.');
					return;
				}

				toast.success(`Account created for ${currentRoleData.label}.`);
				setIsSignup(false);
				setConfirmPassword('');
				setAcceptTerms(false);
				navigate(ROLE_ROUTES[normalizeRole(result.user.role)] || '/login');
				return;
			}

			const result = await login(String(email || '').trim(), password);
			if (!result.success) {
				setError(result.error || 'Invalid email or password.');
				return;
			}

			toast.success(`Authenticated as ${result.user.role}.`);
			navigate(ROLE_ROUTES[normalizeRole(result.user.role)] || '/login');
		} finally {
			setLoading(false);
		}
	};

	const fillDemo = (account) => {
		setEmail(account.email);
		setPassword(account.password);
		setSelectedRole(account.role);
		setError('');
		setAuthOpen(true);
		setIsSignup(false);
	};

	const handleGoogleLogin = () => {
		toast('Google sign-in is not connected in the demo.', { icon: 'ℹ️' });
	};

	useEffect(() => {
		if (!authOpen || !authPaneRef.current) return;
		authPaneRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
		requestAnimationFrame(() => {
			if (authPaneRef.current) {
				authPaneRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
			}
		});
	}, [authOpen, isSignup, selectedRole]);

	return (
		<div className="portal-auth" data-theme={theme}>
			<div className="portal-auth__bg-container">
				<div className="portal-auth__bg-image" />
			</div>
			<div className="portal-auth__bg-overlay" />

			<button type="button" className="portal-auth__theme-toggle" onClick={toggleTheme} title="Toggle Light and Dark Mode">
				{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
			</button>

			<div
				style={{
					opacity: authOpen ? 0 : 1,
					transform: authOpen ? 'scale(0.95)' : 'scale(1)',
					pointerEvents: authOpen ? 'none' : 'auto',
					position: 'fixed',
					inset: 0,
				}}
			>
				<RoleSelection roles={AUTH_ROLES} roleOrder={AUTH_ROLE_ORDER} onSelect={openAuth} />
			</div>

			<div className={`portal-auth__auth-screen portal-auth__auth-screen--brand${authOpen ? ' active' : ''}`} id="authScreen">
				<button type="button" className="portal-auth__back-btn" onClick={closeAuth}>
					<ArrowLeft size={18} />
					Switch Sector
				</button>

				<aside className="rg-login__brand" aria-hidden="true">
					<div className="rg-login__brand-image" />
				</aside>

				<div className="portal-auth__auth-right rg-login__pane" ref={authPaneRef}>
					<div className={`portal-auth__form-wrapper rg-login__card${isSignup ? ' rg-login__card--signup' : ''}`}>
						{isSignup ? (
							<>
								<h3 className="rg-login__title">Create your account</h3>
								<p className="rg-login__subtitle">
									Register as a new {currentRoleData.label}
								</p>
							</>
						) : (
							<>
								<h3 className="rg-login__title">Welcome Back</h3>
								<p className="rg-login__subtitle">
									Login to your RouteGuard account
								</p>
							</>
						)}

						<form onSubmit={handleLogin}>
							{isSignup ? (
								<div className="portal-auth__form-grid">
									<div className="portal-auth__section-title portal-auth__full-width">Basic Information</div>
									<div className="portal-auth__form-group">
										<label>Full Name *</label>
										<input
											type="text"
											placeholder="John Doe"
											value={fullName}
											onChange={(event) => setFullName(event.target.value)}
											required
										/>
									</div>
									<div className="portal-auth__form-group">
										<label>Phone Number *</label>
										<input
											type="tel"
											placeholder="+1 (555) 000-0000"
											value={phoneNumber}
											onChange={(event) => setPhoneNumber(event.target.value)}
											required
										/>
									</div>
									<div className="portal-auth__form-group portal-auth__full-width">
										<label>Account Role *</label>
										<select value={selectedRole} onChange={(event) => onRoleChange(event.target.value)}>
											{AUTH_ROLE_ORDER.map((roleKey) => (
												<option key={roleKey} value={roleKey}>
													{AUTH_ROLES[roleKey].label}
												</option>
											))}
										</select>
									</div>

									<div className="portal-auth__form-group portal-auth__full-width">
										<label>Email Address or Phone Number *</label>
										<input
											type="text"
											placeholder="name@domain.com or +1 234..."
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											required
										/>
									</div>

									<div className="portal-auth__form-group portal-auth__full-width">
										<label>Password *</label>
										<input
											type="password"
											placeholder="••••••••"
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											required
										/>
									</div>

									<div className="portal-auth__form-group portal-auth__full-width">
										<label>Confirm Password *</label>
										<input
											type="password"
											placeholder="••••••••"
											value={confirmPassword}
											onChange={(event) => setConfirmPassword(event.target.value)}
											required
										/>
									</div>

									<RoleSpecificFields
										role={selectedRole}
										industryType={industryType}
										onIndustryTypeChange={setIndustryType}
										otherIndustry={otherIndustry}
										onOtherIndustryChange={setOtherIndustry}
										companyName={companyName}
										onCompanyNameChange={setCompanyName}
									/>

									<div className="portal-auth__section-title portal-auth__full-width">System Preferences</div>
									<div className="portal-auth__form-group">
										<label>Profile Picture</label>
										<input type="file" accept="image/*" />
									</div>
									<div className="portal-auth__form-group">
										<label>Language and Time Zone</label>
										<div style={{ display: 'flex', gap: 10 }}>
											<select style={{ flex: 1 }}>
												<option>English</option>
												<option>Spanish</option>
											</select>
											<select style={{ flex: 1 }}>
												<option>UTC -05:00</option>
												<option>UTC +00:00</option>
											</select>
										</div>
									</div>
									<div className="portal-auth__form-group portal-auth__full-width">
										<label>Notification Alerts (Select all that apply)</label>
										<div className="portal-auth__checkbox-group">
											<label className="portal-auth__checkbox-item">
												<input type="checkbox" defaultChecked /> App Alerts
											</label>
											<label className="portal-auth__checkbox-item">
												<input type="checkbox" defaultChecked /> Email
											</label>
											<label className="portal-auth__checkbox-item">
												<input type="checkbox" /> SMS
											</label>
										</div>
									</div>
									<div className="portal-auth__form-group portal-auth__full-width" style={{ marginTop: '1rem' }}>
										<label className="portal-auth__checkbox-item" style={{ fontWeight: 500 }}>
											<input
												type="checkbox"
												checked={acceptTerms}
												onChange={(event) => setAcceptTerms(event.target.checked)}
											/>
											I agree to the RouteGuard Terms and Conditions and Privacy Policy.
										</label>
									</div>
								</div>
							) : (
								<div className="rg-login__fields">
									<div className="rg-login__field">
										<label htmlFor="rg-email">Email Address</label>
										<div className="rg-login__input-wrap">
											<Mail size={18} className="rg-login__input-icon" />
											<input
												id="rg-email"
												type="email"
												autoComplete="email"
												placeholder="Enter your email"
												value={email}
												onChange={(event) => setEmail(event.target.value)}
												required
											/>
										</div>
									</div>

									<div className="rg-login__field">
										<label htmlFor="rg-password">Password</label>
										<div className="rg-login__input-wrap">
											<Lock size={18} className="rg-login__input-icon" />
											<input
												id="rg-password"
												type={showPassword ? 'text' : 'password'}
												autoComplete="current-password"
												placeholder="Enter your password"
												value={password}
												onChange={(event) => setPassword(event.target.value)}
												required
											/>
											<button
												type="button"
												className="rg-login__password-toggle"
												onClick={() => setShowPassword((prev) => !prev)}
												aria-label={showPassword ? 'Hide password' : 'Show password'}
											>
												{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
											</button>
										</div>
									</div>

									<div className="rg-login__forgot">
										<a href="#" onClick={(event) => event.preventDefault()}>
											Forgot password?
										</a>
									</div>
								</div>
							)}

							{isSignup ? (
								<button type="submit" className="portal-auth__submit-btn" disabled={loading}>
									{loading ? 'Processing...' : 'Create Account'}
								</button>
							) : (
								<button type="submit" className="rg-login__submit" disabled={loading}>
									{loading ? 'Signing in…' : 'Login'}
								</button>
							)}

							{error ? <p className="portal-auth__form-error">{error}</p> : null}

							{!isSignup ? (
								<>
									<div className="rg-login__divider">
										<span>or</span>
									</div>

									<button type="button" className="rg-login__google" onClick={handleGoogleLogin}>
										<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
											<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
											<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
											<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
											<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.4-.4-3.5z" />
										</svg>
										<span>Continue with Google</span>
									</button>

									<div className="rg-login__demo-row">
										{DEMO_ACCOUNTS.map((account) => (
											<button
												type="button"
												className="rg-login__demo-btn"
												key={account.role}
												onClick={() => fillDemo(account)}
											>
												Use {AUTH_ROLES[account.role].label} Demo
											</button>
										))}
									</div>
								</>
							) : null}
						</form>

						<div className={isSignup ? 'portal-auth__toggle-row' : 'rg-login__toggle-row'}>
							<span>{isSignup ? 'Already operational?' : "Don't have an account?"}</span>
							<button type="button" className={isSignup ? 'portal-auth__toggle-link' : 'rg-login__toggle-link'} onClick={toggleAuthMode}>
								{isSignup ? 'Sign in' : 'Sign up'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
