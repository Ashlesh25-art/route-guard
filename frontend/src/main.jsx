import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<SocketProvider>
					<App />
					<Toaster
						position="top-right"
						toastOptions={{
							style: {
								background: '#1C2333',
								color: '#F1F5F9',
								border: '1px solid rgba(255,255,255,0.12)',
								fontFamily: 'Instrument Sans, sans-serif',
							},
						}}
					/>
				</SocketProvider>
			</AuthProvider>
		</BrowserRouter>
	</React.StrictMode>
);
