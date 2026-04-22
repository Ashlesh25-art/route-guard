import { createContext, useEffect, useMemo, useState } from 'react';
import { api } from '../config/api';
import { ENDPOINTS } from '../config/endpoints';
import { DUMMY_USERS, dummyLogin } from '../dummy/users';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(() => {
		const raw = localStorage.getItem('routeguard_user');
		return raw ? JSON.parse(raw) : null;
	});

	const [token, setToken] = useState(() => localStorage.getItem('routeguard_token') || null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!token) {
			setLoading(false);
			return;
		}

		api
			.get(ENDPOINTS.ME)
			.then((response) => {
				setUser(response.data);
				localStorage.setItem('routeguard_user', JSON.stringify(response.data));
			})
			.catch(() => {
				if (!token.startsWith('dummy_token_')) {
					localStorage.removeItem('routeguard_token');
					localStorage.removeItem('routeguard_user');
					setUser(null);
					setToken(null);
					return;
				}

				const parts = token.split('_');
				const role = parts[2];
				const fallbackUser = DUMMY_USERS.find((item) => item.role === role);
				if (fallbackUser) {
					const safeUser = {
						user_id: fallbackUser.user_id,
						name: fallbackUser.name,
						email: fallbackUser.email,
						role: fallbackUser.role,
						company: fallbackUser.company,
					};
					setUser(safeUser);
					localStorage.setItem('routeguard_user', JSON.stringify(safeUser));
				}
			})
			.finally(() => setLoading(false));
	}, [token]);

	const login = async (email, password) => {
		try {
			const response = await api.post(ENDPOINTS.LOGIN, { email, password });
			const nextToken = response?.data?.access_token;
			const nextUser = response?.data?.user;

			if (nextToken && nextUser) {
				localStorage.setItem('routeguard_token', nextToken);
				localStorage.setItem('routeguard_user', JSON.stringify(nextUser));
				setToken(nextToken);
				setUser(nextUser);
				return { success: true, user: nextUser };
			}
		} catch {
			const result = dummyLogin(email, password);
			if (result) {
				localStorage.setItem('routeguard_token', result.token);
				localStorage.setItem('routeguard_user', JSON.stringify(result.user));
				setToken(result.token);
				setUser(result.user);
				return { success: true, user: result.user };
			}
		}

		return { success: false, error: 'Invalid credentials' };
	};

	const logout = () => {
		localStorage.removeItem('routeguard_token');
		localStorage.removeItem('routeguard_user');
		setToken(null);
		setUser(null);
	};

	const value = useMemo(
		() => ({
			user,
			token,
			loading,
			login,
			logout,
		}),
		[user, token, loading]
	);

	return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
