# RouteGuard — Complete Frontend Implementation Specification
### For Coding Agent Use — Implementation-Level Detail

---

## DOCUMENT PURPOSE

This document is the complete implementation guide for the RouteGuard frontend. It covers every page, every component, every UI element, every state, every API call, and every dummy data fallback needed for local testing. The coding agent must not skip any section. Each page is described to the level required to produce production-quality code without needing to ask any questions.

---

## DESIGN SYSTEM

### Aesthetic Direction

RouteGuard is a mission-critical operations tool used by logistics professionals. The aesthetic is **industrial command center** — dark-mode, data-dense, high contrast, precise typography, and real-time indicators that feel alive. Think NASA ground control meets Bloomberg terminal. Every second of delay costs money, so the UI must communicate urgency instantly without confusion.

### Color Palette (CSS Variables)

```css
:root {
  /* Background layers — dark, layered depth */
  --bg-base:       #0A0E1A;   /* deepest background, page root */
  --bg-surface:    #111827;   /* cards, panels, sidebars */
  --bg-elevated:   #1C2333;   /* modals, dropdowns, hover states */
  --bg-overlay:    #242D3E;   /* tooltips, popovers */

  /* Risk level colors — the visual language of danger */
  --risk-low:      #22C55E;   /* green */
  --risk-medium:   #EAB308;   /* yellow */
  --risk-high:     #F97316;   /* orange */
  --risk-critical: #EF4444;   /* red */

  /* Accent — electric blue for interactive elements */
  --accent-primary:   #3B82F6;
  --accent-hover:     #2563EB;
  --accent-glow:      rgba(59, 130, 246, 0.25);

  /* Typography */
  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted:     #475569;
  --text-inverse:   #0A0E1A;

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.12);
  --border-strong:  rgba(255,255,255,0.24);

  /* Semantic colors */
  --success: #22C55E;
  --warning: #EAB308;
  --danger:  #EF4444;
  --info:    #3B82F6;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border radius */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.6);
  --shadow-glow-blue: 0 0 20px rgba(59,130,246,0.3);
}
```

### Typography

```css
/* Import in index.html */
/* Google Fonts: Syne (headings) + JetBrains Mono (data/numbers) + Instrument Sans (body) */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&display=swap');

:root {
  --font-display: 'Syne', sans-serif;        /* Page titles, logo, big headings */
  --font-mono:    'JetBrains Mono', monospace; /* All numbers, IDs, scores, timestamps */
  --font-body:    'Instrument Sans', sans-serif; /* All body copy, labels, buttons */
}

/* Global defaults */
body {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--bg-base);
}

/* Use font-mono for ALL numbers: risk scores, shipment IDs, timestamps, coordinates */
.data-value, .score, .id, .timestamp, .coordinate {
  font-family: var(--font-mono);
}
```

### Component Tokens

```css
/* Cards */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

/* Buttons — primary */
.btn-primary {
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 20px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}
.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-glow-blue);
}

/* Risk badges */
.badge-low      { background: rgba(34,197,94,0.15);  color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
.badge-medium   { background: rgba(234,179,8,0.15);  color: #EAB308; border: 1px solid rgba(234,179,8,0.3); }
.badge-high     { background: rgba(249,115,22,0.15); color: #F97316; border: 1px solid rgba(249,115,22,0.3); }
.badge-critical { background: rgba(239,68,68,0.15);  color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }

/* Input fields */
.input {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 10px 14px;
  font-family: var(--font-body);
  font-size: 14px;
  width: 100%;
  transition: border-color 0.15s;
}
.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

/* Risk dot indicator (small circle next to shipment) */
.risk-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.risk-dot.low      { background: var(--risk-low);      box-shadow: 0 0 8px var(--risk-low); }
.risk-dot.medium   { background: var(--risk-medium);   box-shadow: 0 0 8px var(--risk-medium); }
.risk-dot.high     { background: var(--risk-high);     box-shadow: 0 0 8px var(--risk-high); }
.risk-dot.critical { background: var(--risk-critical); box-shadow: 0 0 12px var(--risk-critical); animation: pulse 1.5s infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

---

## PROJECT SETUP

### Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.18.0",
    "react-leaflet": "^4.2.1",
    "leaflet": "^1.9.4",
    "recharts": "^2.8.0",
    "socket.io-client": "^4.6.1",
    "axios": "^1.5.1",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.294.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "vite": "^4.5.0",
    "@vitejs/plugin-react": "^4.1.0",
    "tailwindcss": "^3.3.5",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
```

### File Structure

```
src/
├── main.jsx
├── App.jsx
│
├── config/
│   └── api.js               ← Axios instance + API base URL
│
├── context/
│   ├── AuthContext.jsx       ← Global auth state (user, role, token)
│   └── SocketContext.jsx     ← Socket.io connection + event listeners
│
├── hooks/
│   ├── useAuth.js
│   └── useSocket.js
│
├── dummy/                   ← All dummy data for testing without backend
│   ├── shipments.js
│   ├── users.js
│   ├── alerts.js
│   ├── ports.js
│   └── analytics.js
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── AppShell.jsx      ← Wraps sidebar + topbar + page content
│   │
│   ├── map/
│   │   ├── LiveMap.jsx       ← Main Leaflet map component
│   │   ├── VesselMarker.jsx  ← Colored marker with popup
│   │   └── RouteLayer.jsx    ← Polyline for active + alternate routes
│   │
│   ├── risk/
│   │   ├── RiskGauge.jsx     ← Circular 0–100 dial with color fill
│   │   ├── FeatureChart.jsx  ← Horizontal bar chart of feature contributions
│   │   └── TrajectoryGraph.jsx ← LSTM 6-hour line graph
│   │
│   ├── alerts/
│   │   ├── AlertPanel.jsx    ← Right sidebar list of active alerts
│   │   └── AlertCard.jsx     ← Individual alert with action buttons
│   │
│   ├── shipments/
│   │   ├── ShipmentTable.jsx ← Data table used across manager + shipper views
│   │   ├── ShipmentCard.jsx  ← Card variant used in mobile / shipper views
│   │   └── StatusTimeline.jsx ← Vertical step indicator for shipment lifecycle
│   │
│   ├── routes/
│   │   ├── RouteCompareTable.jsx ← Alternate routes comparison
│   │   └── FinancialImpactCard.jsx
│   │
│   └── ui/
│       ├── Badge.jsx         ← Risk level badge (Low/Medium/High/Critical)
│       ├── RiskDot.jsx       ← Small pulsing colored dot
│       ├── StatCard.jsx      ← Summary stat with icon + number + label
│       ├── Spinner.jsx       ← Loading spinner
│       ├── EmptyState.jsx    ← Empty state with icon + message
│       ├── Modal.jsx         ← Generic modal wrapper
│       └── ConfirmDialog.jsx ← Confirm/Cancel dialog
│
└── pages/
    ├── auth/
    │   └── LoginPage.jsx
    │
    ├── manager/
    │   ├── ManagerDashboard.jsx   ← HERO SCREEN — map + alerts + stats
    │   ├── ShipmentDetail.jsx     ← ML insights, risk panel, reroute controls
    │   ├── PortStatusBoard.jsx    ← Global port congestion overview
    │   └── AnalyticsPage.jsx      ← Model accuracy, performance metrics
    │
    ├── shipper/
    │   ├── ShipperDashboard.jsx   ← My shipments list
    │   ├── CreateShipment.jsx     ← Multi-step shipment creation form
    │   └── ShipmentTracking.jsx   ← Individual shipment detail for shipper
    │
    ├── driver/
    │   ├── DriverDashboard.jsx    ← Active assignment
    │   ├── StatusUpdate.jsx       ← Status update buttons + incident report
    │   └── RouteChangeAlert.jsx   ← Full screen notification for route change
    │
    └── receiver/
        ├── ReceiverDashboard.jsx  ← Incoming shipments list
        ├── TrackShipment.jsx      ← Shipment tracking view
        └── ConfirmDelivery.jsx    ← Delivery confirmation form
```

---

## API CONFIGURATION

### `src/config/api.js`

```javascript
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

// Axios instance — all API calls use this
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('routeguard_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('routeguard_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api, BASE_URL, SOCKET_URL };
```

### `src/config/endpoints.js`

```javascript
// Centralized endpoint registry — coding agent must use these consistently
export const ENDPOINTS = {
  // Auth
  LOGIN:           '/auth/login',
  REGISTER:        '/auth/register',
  ME:              '/auth/me',

  // Shipments
  CREATE_SHIPMENT: '/shipments/create',
  MY_SHIPMENTS:    '/shipments/my',
  SHIPMENT_DETAIL: (id) => `/shipments/${id}`,
  UPDATE_STATUS:   (id) => `/shipments/${id}/status`,

  // Monitoring
  RISK_SCORE:      (id) => `/shipments/${id}/risk`,
  ML_PREDICTION:   (id) => `/shipments/${id}/prediction`,
  ALTERNATE_ROUTES:(id) => `/shipments/${id}/routes`,
  APPROVE_REROUTE: (id) => `/shipments/${id}/reroute`,

  // Alerts
  ACTIVE_ALERTS:   '/alerts/active',
  RESOLVE_ALERT:   (id) => `/alerts/${id}/resolve`,

  // Manager
  ALL_SHIPMENTS:   '/manager/shipments',
  PORT_STATUS:     '/manager/ports',
  ASSIGN_RESOURCES:(id) => `/manager/shipments/${id}/assign`,

  // Analytics
  OVERVIEW:        '/analytics/overview',
  MODEL_ACCURACY:  '/analytics/accuracy',

  // Delivery
  CONFIRM_DELIVERY:(id) => `/shipments/${id}/deliver`,

  // Driver
  MY_ASSIGNMENT:   '/driver/assignment',
  REPORT_INCIDENT: (id) => `/shipments/${id}/incident`,
};
```

---

## DUMMY DATA (for frontend testing without backend)

### `src/dummy/shipments.js`

```javascript
export const DUMMY_SHIPMENTS = [
  {
    shipment_id: 'SHP-2025-00847',
    tracking_number: 'SAMS847KR2025',
    origin: 'Samsung Factory, Suwon, South Korea',
    destination: 'Amazon Warehouse, Berlin, Germany',
    cargo_type: 'Electronics',
    cargo_description: '500 Samsung Laptop Model X5',
    weight_kg: 2500,
    declared_value: 750000,
    priority: 'high',
    status: 'in_transit',
    current_risk_level: 'critical',
    current_risk_score: 91,
    is_rerouted: true,
    reroute_count: 1,
    departure_at: '2025-01-15T06:00:00Z',
    expected_arrival: '2025-02-12T10:00:00Z',
    actual_arrival: null,
    assigned_manager: 'Sarah Chen',
    assigned_vessel: 'MV Pacific Star',
    shipper_name: 'Kim Ji-ho',
    receiver_name: 'Anna Schmidt',
    current_coordinates: { lat: 32.5, lng: 152.8 }, // Pacific Ocean
    route_waypoints: [
      { lat: 37.5, lng: 127.0 },   // Seoul
      { lat: 35.1, lng: 129.0 },   // Busan
      { lat: 32.5, lng: 152.8 },   // Current position - Pacific
      { lat: 51.9, lng: 4.5 },     // Rotterdam
      { lat: 52.5, lng: 13.4 },    // Berlin
    ],
  },
  {
    shipment_id: 'SHP-2025-00612',
    tracking_number: 'SGLT612EU2025',
    origin: 'Shenzhen Port, China',
    destination: 'Felixstowe Port, UK',
    cargo_type: 'Standard Dry',
    cargo_description: 'Consumer Electronics Components',
    weight_kg: 18000,
    declared_value: 320000,
    priority: 'medium',
    status: 'in_transit',
    current_risk_level: 'high',
    current_risk_score: 68,
    is_rerouted: false,
    reroute_count: 0,
    departure_at: '2025-01-10T08:00:00Z',
    expected_arrival: '2025-02-05T14:00:00Z',
    actual_arrival: null,
    assigned_manager: 'Sarah Chen',
    assigned_vessel: 'MV Global Trader',
    shipper_name: 'TechParts Ltd',
    receiver_name: 'UK Distribution Centre',
    current_coordinates: { lat: 12.5, lng: 44.2 }, // Red Sea
    route_waypoints: [
      { lat: 22.5, lng: 114.1 },  // Shenzhen
      { lat: 12.5, lng: 44.2 },   // Current position - Red Sea
      { lat: 51.9, lng: 1.3 },    // Felixstowe
    ],
  },
  {
    shipment_id: 'SHP-2025-00445',
    tracking_number: 'PHARM445US2025',
    origin: 'Mumbai Port, India',
    destination: 'Rotterdam Port, Netherlands',
    cargo_type: 'Pharmaceutical',
    cargo_description: 'Temperature-controlled vaccines',
    weight_kg: 800,
    declared_value: 2100000,
    priority: 'urgent',
    status: 'in_transit',
    current_risk_level: 'medium',
    current_risk_score: 44,
    is_rerouted: false,
    reroute_count: 0,
    departure_at: '2025-01-18T04:00:00Z',
    expected_arrival: '2025-02-08T09:00:00Z',
    actual_arrival: null,
    assigned_manager: 'Sarah Chen',
    assigned_vessel: 'MV Reefer Express',
    shipper_name: 'PharmaCo India',
    receiver_name: 'EuroHealth Distribution',
    current_coordinates: { lat: 14.2, lng: 53.1 }, // Arabian Sea
    route_waypoints: [
      { lat: 18.9, lng: 72.8 },  // Mumbai
      { lat: 14.2, lng: 53.1 },  // Current - Arabian Sea
      { lat: 12.8, lng: 44.9 },  // Gulf of Aden
      { lat: 51.9, lng: 4.5 },   // Rotterdam
    ],
  },
  {
    shipment_id: 'SHP-2025-00231',
    tracking_number: 'AUTO231JP2025',
    origin: 'Yokohama Port, Japan',
    destination: 'Los Angeles Port, USA',
    cargo_type: 'Automotive',
    cargo_description: 'Toyota vehicle components',
    weight_kg: 35000,
    declared_value: 890000,
    priority: 'high',
    status: 'at_port',
    current_risk_level: 'low',
    current_risk_score: 18,
    is_rerouted: false,
    reroute_count: 0,
    departure_at: '2025-01-05T10:00:00Z',
    expected_arrival: '2025-01-29T16:00:00Z',
    actual_arrival: null,
    assigned_manager: 'Sarah Chen',
    assigned_vessel: 'MV Trans Pacific',
    shipper_name: 'Toyota Logistics',
    receiver_name: 'LA Auto Parts Hub',
    current_coordinates: { lat: 33.7, lng: -118.2 }, // Los Angeles
    route_waypoints: [
      { lat: 35.4, lng: 139.6 },  // Yokohama
      { lat: 35.0, lng: -140.0 }, // Pacific midpoint
      { lat: 33.7, lng: -118.2 }, // Los Angeles
    ],
  },
  {
    shipment_id: 'SHP-2025-00178',
    tracking_number: 'FOOD178BR2025',
    origin: 'Santos Port, Brazil',
    destination: 'Hamburg Port, Germany',
    cargo_type: 'Perishable',
    cargo_description: 'Frozen beef 22 containers',
    weight_kg: 48000,
    declared_value: 560000,
    priority: 'high',
    status: 'delivered',
    current_risk_level: 'low',
    current_risk_score: 8,
    is_rerouted: false,
    reroute_count: 0,
    departure_at: '2024-12-20T06:00:00Z',
    expected_arrival: '2025-01-20T08:00:00Z',
    actual_arrival: '2025-01-19T14:00:00Z',
    assigned_manager: 'Sarah Chen',
    assigned_vessel: 'MV Cold Chain',
    shipper_name: 'BrazilFoods Export',
    receiver_name: 'Hamburg Cold Storage',
    current_coordinates: { lat: 53.5, lng: 9.9 }, // Hamburg
    route_waypoints: [],
  },
];

export const DUMMY_ML_PREDICTION = {
  shipment_id: 'SHP-2025-00847',
  prediction_timestamp: new Date().toISOString(),
  input_features: {
    weather_score: 75,
    traffic_score: 30,
    port_score: 82,
    historical_score: 65,
    cargo_sensitivity: 65,
    distance_remaining_km: 9800,
    time_of_day: 14,
    day_of_week: 2,
    season: 1,
  },
  model_outputs: {
    xgboost_risk_score: 91,
    random_forest_delay_hours: 18.5,
    gradient_boost_reroute: true,
    gradient_boost_confidence: 92.3,
    lstm_trajectory: [91, 88, 84, 80, 76, 71],
  },
  feature_importance: {
    weather_score: 0.38,
    port_score: 0.29,
    traffic_score: 0.14,
    historical_score: 0.11,
    cargo_sensitivity: 0.08,
  },
  alternate_routes: [
    {
      route_id: 'RTE-00847-ALT1',
      name: 'Southern Pacific Route',
      description: 'Divert 800km south to avoid storm system',
      risk_score: 28,
      risk_level: 'low',
      delay_hours: 0.8,
      extra_distance_km: 800,
      extra_time_hours: 19,
      extra_cost_usd: 12000,
      optimization_score: 18.5,
      recommended: true,
    },
    {
      route_id: 'RTE-00847-ALT2',
      name: 'Guam Waypoint Route',
      description: 'Stop at Guam for 2 days until storm passes',
      risk_score: 18,
      risk_level: 'low',
      delay_hours: 48,
      extra_distance_km: 400,
      extra_time_hours: 52,
      extra_cost_usd: 35000,
      optimization_score: 42.1,
      recommended: false,
    },
    {
      route_id: 'RTE-00847-ALT3',
      name: 'Accelerated Direct Route',
      description: 'Increase speed to outrun storm front',
      risk_score: 79,
      risk_level: 'high',
      delay_hours: 6,
      extra_distance_km: 0,
      extra_time_hours: 0,
      extra_cost_usd: 8000,
      optimization_score: 55.7,
      recommended: false,
    },
  ],
  financial_impact: {
    current_route_damage_probability: 0.34,
    current_route_expected_loss_usd: 255000,
    recommended_route_extra_cost_usd: 12000,
    recommended_route_expected_loss_usd: 60000,
    net_saving_usd: 183000,
  },
};
```

### `src/dummy/alerts.js`

```javascript
export const DUMMY_ALERTS = [
  {
    alert_id: 'ALT-001',
    shipment_id: 'SHP-2025-00847',
    tracking_number: 'SAMS847KR2025',
    alert_type: 'weather_warning',
    severity: 'critical',
    message: 'Tropical storm forming 180km ahead of MV Pacific Star. Risk Score 91. Wave height 4.8m. 18.5 hour delay expected on current route. Alternate southern route shows Risk Score 28 with only 0.8 day delay. Immediate action required.',
    risk_score_at_alert: 91,
    primary_cause: 'Weather (38%) + Port Congestion (29%)',
    triggered_by: 'system',
    is_read: false,
    is_resolved: false,
    created_at: new Date(Date.now() - 8 * 60000).toISOString(), // 8 min ago
  },
  {
    alert_id: 'ALT-002',
    shipment_id: 'SHP-2025-00612',
    tracking_number: 'SGLT612EU2025',
    alert_type: 'port_congestion',
    severity: 'high',
    message: 'Suez Canal traffic high. Port Said congestion detected — 23 vessels in queue. Estimated additional delay 14 hours. Review alternate Bab-el-Mandeb routing.',
    risk_score_at_alert: 68,
    primary_cause: 'Port Congestion (52%) + Traffic (21%)',
    triggered_by: 'system',
    is_read: false,
    is_resolved: false,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    alert_id: 'ALT-003',
    shipment_id: 'SHP-2025-00445',
    tracking_number: 'PHARM445US2025',
    alert_type: 'risk_increase',
    severity: 'warning',
    message: 'Risk score increased from 31 to 44 over last 2 hours. LSTM model predicts continued rise. Temperature-sensitive pharmaceutical cargo — monitor closely.',
    risk_score_at_alert: 44,
    primary_cause: 'Weather (44%) + Historical Pattern (33%)',
    triggered_by: 'system',
    is_read: true,
    is_resolved: false,
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
  },
];
```

### `src/dummy/analytics.js`

```javascript
export const DUMMY_ANALYTICS = {
  overview: {
    total_active_shipments: 4,
    critical_count: 1,
    high_risk_count: 1,
    medium_risk_count: 1,
    low_risk_count: 1,
    on_time_percentage: 86.4,
    delayed_count: 2,
    rerouted_this_week: 3,
    total_value_monitored_usd: 4620000,
    financial_losses_prevented_usd: 183000,
  },
  accuracy: {
    overall_model_accuracy: 88.4,
    xgboost_rmse: 4.2,
    xgboost_r2: 0.91,
    random_forest_delay_mae: 1.8,
    gradient_boost_accuracy: 94.1,
    total_predictions_made: 3287,
    correct_reroute_decisions: 41,
    incorrect_reroute_decisions: 3,
  },
  risk_history_7_days: [
    { date: 'Jan 16', critical: 0, high: 2, medium: 3, low: 5 },
    { date: 'Jan 17', critical: 1, high: 1, medium: 4, low: 4 },
    { date: 'Jan 18', critical: 2, high: 2, medium: 2, low: 4 },
    { date: 'Jan 19', critical: 1, high: 3, medium: 3, low: 3 },
    { date: 'Jan 20', critical: 0, high: 1, medium: 4, low: 5 },
    { date: 'Jan 21', critical: 1, high: 2, medium: 2, low: 5 },
    { date: 'Jan 22', critical: 1, high: 1, medium: 1, low: 4 },
  ],
};

export const DUMMY_PORTS = [
  { port_id: 'PORT-RTM', code: 'NLRTM', name: 'Rotterdam', country: 'Netherlands', lat: 51.9, lng: 4.5, status: 'severely_congested', vessels_in_queue: 47, avg_wait_hours: 38, port_score: 100 },
  { port_id: 'PORT-HHN', code: 'DEHAM', name: 'Hamburg', country: 'Germany', lat: 53.5, lng: 9.9, status: 'normal', vessels_in_queue: 4, avg_wait_hours: 3, port_score: 15 },
  { port_id: 'PORT-SGN', code: 'SGSIN', name: 'Singapore', country: 'Singapore', lat: 1.3, lng: 103.8, status: 'busy', vessels_in_queue: 12, avg_wait_hours: 8, port_score: 42 },
  { port_id: 'PORT-SHA', code: 'CNSHA', name: 'Shanghai', country: 'China', lat: 31.2, lng: 121.5, status: 'normal', vessels_in_queue: 6, avg_wait_hours: 4, port_score: 22 },
  { port_id: 'PORT-BUS', code: 'KRPUS', name: 'Busan', country: 'South Korea', lat: 35.1, lng: 129.0, status: 'normal', vessels_in_queue: 3, avg_wait_hours: 2, port_score: 12 },
  { port_id: 'PORT-LAX', code: 'USLAX', name: 'Los Angeles', country: 'USA', lat: 33.7, lng: -118.2, status: 'busy', vessels_in_queue: 9, avg_wait_hours: 6, port_score: 35 },
  { port_id: 'PORT-ANT', code: 'BEANR', name: 'Antwerp', country: 'Belgium', lat: 51.3, lng: 4.4, status: 'busy', vessels_in_queue: 11, avg_wait_hours: 9, port_score: 45 },
  { port_id: 'PORT-DXB', code: 'AEJEA', name: 'Jebel Ali', country: 'UAE', lat: 25.0, lng: 55.1, status: 'normal', vessels_in_queue: 5, avg_wait_hours: 3, port_score: 18 },
];
```

### `src/dummy/users.js`

```javascript
// Four test accounts — one per role — for login testing
export const DUMMY_USERS = [
  { user_id: 'USR-001', name: 'Kim Ji-ho', email: 'shipper@routeguard.com', password: 'test1234', role: 'shipper', company: 'Samsung Electronics' },
  { user_id: 'USR-002', name: 'Sarah Chen', email: 'manager@routeguard.com', password: 'test1234', role: 'manager', company: 'GlobalFreight Corp' },
  { user_id: 'USR-003', name: 'James Okafor', email: 'driver@routeguard.com', password: 'test1234', role: 'driver', company: 'Pacific Maritime' },
  { user_id: 'USR-004', name: 'Anna Schmidt', email: 'receiver@routeguard.com', password: 'test1234', role: 'receiver', company: 'Amazon Logistics EU' },
];

// Dummy auth function — replace with real API call when backend is ready
export function dummyLogin(email, password) {
  const user = DUMMY_USERS.find(u => u.email === email && u.password === password);
  if (!user) return null;
  return {
    user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role, company: user.company },
    token: `dummy_token_${user.role}_${Date.now()}`,
  };
}
```

---

## GLOBAL APP SETUP

### `src/main.jsx`

```jsx
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
```

### `src/App.jsx`

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/auth/LoginPage';
import AppShell from './components/layout/AppShell';

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerShipmentDetail from './pages/manager/ShipmentDetail';
import PortStatusBoard from './pages/manager/PortStatusBoard';
import AnalyticsPage from './pages/manager/AnalyticsPage';

// Shipper pages
import ShipperDashboard from './pages/shipper/ShipperDashboard';
import CreateShipment from './pages/shipper/CreateShipment';
import ShipmentTracking from './pages/shipper/ShipmentTracking';

// Driver pages
import DriverDashboard from './pages/driver/DriverDashboard';
import StatusUpdate from './pages/driver/StatusUpdate';
import RouteChangeAlert from './pages/driver/RouteChangeAlert';

// Receiver pages
import ReceiverDashboard from './pages/receiver/ReceiverDashboard';
import TrackShipment from './pages/receiver/TrackShipment';
import ConfirmDelivery from './pages/receiver/ConfirmDelivery';

// Route guard component
function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Default redirect by role after login
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roleRoutes = { manager: '/manager', shipper: '/shipper', driver: '/driver', receiver: '/receiver' };
  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Manager routes */}
      <Route path="/manager" element={<PrivateRoute allowedRoles={['manager']}><AppShell /></PrivateRoute>}>
        <Route index element={<ManagerDashboard />} />
        <Route path="shipments/:id" element={<ManagerShipmentDetail />} />
        <Route path="ports" element={<PortStatusBoard />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>

      {/* Shipper routes */}
      <Route path="/shipper" element={<PrivateRoute allowedRoles={['shipper']}><AppShell /></PrivateRoute>}>
        <Route index element={<ShipperDashboard />} />
        <Route path="create" element={<CreateShipment />} />
        <Route path="shipments/:id" element={<ShipmentTracking />} />
      </Route>

      {/* Driver routes */}
      <Route path="/driver" element={<PrivateRoute allowedRoles={['driver']}><AppShell /></PrivateRoute>}>
        <Route index element={<DriverDashboard />} />
        <Route path="status" element={<StatusUpdate />} />
        <Route path="route-change" element={<RouteChangeAlert />} />
      </Route>

      {/* Receiver routes */}
      <Route path="/receiver" element={<PrivateRoute allowedRoles={['receiver']}><AppShell /></PrivateRoute>}>
        <Route index element={<ReceiverDashboard />} />
        <Route path="shipments/:id" element={<TrackShipment />} />
        <Route path="shipments/:id/confirm" element={<ConfirmDelivery />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

### `src/context/AuthContext.jsx`

```jsx
import { createContext, useState, useEffect } from 'react';
import { api } from '../config/api';
import { dummyLogin } from '../dummy/users'; // Remove when backend ready

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('routeguard_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Try to fetch real user from backend
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          // Backend not available — check if dummy token and decode role
          if (token.startsWith('dummy_token_')) {
            const parts = token.split('_');
            const role = parts[2];
            const { DUMMY_USERS } = require('../dummy/users');
            const u = DUMMY_USERS.find(u => u.role === role);
            if (u) setUser({ user_id: u.user_id, name: u.name, email: u.email, role: u.role, company: u.company });
          } else {
            logout();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      // Try real backend first
      const res = await api.post('/auth/login', { email, password });
      const { user: userData, access_token } = res.data;
      localStorage.setItem('routeguard_token', access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch {
      // Fallback to dummy login for frontend testing
      const result = dummyLogin(email, password);
      if (result) {
        localStorage.setItem('routeguard_token', result.token);
        setToken(result.token);
        setUser(result.user);
        return { success: true, user: result.user };
      }
      return { success: false, error: 'Invalid credentials' };
    }
  };

  const logout = () => {
    localStorage.removeItem('routeguard_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
```

### `src/context/SocketContext.jsx`

```jsx
import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [riskUpdates, setRiskUpdates] = useState({});
  const [newAlerts, setNewAlerts] = useState([]);

  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
    });

    s.on('connect', () => console.log('[Socket] Connected'));
    s.on('disconnect', () => console.log('[Socket] Disconnected'));

    // Risk score updates from monitoring job
    s.on('risk_update', (data) => {
      setRiskUpdates(prev => ({ ...prev, [data.shipment_id]: data }));

      if (data.risk_level === 'critical') {
        toast.error(`🚨 CRITICAL: ${data.shipment_id} — ${data.message}`, { duration: 8000 });
      } else if (data.risk_level === 'high') {
        toast(`⚠️ HIGH RISK: ${data.shipment_id} — risk score ${data.risk_score}`, { duration: 5000 });
      }
    });

    // New alert from system
    s.on('new_alert', (alert) => {
      setNewAlerts(prev => [alert, ...prev]);
    });

    // Route change notification for driver/captain
    s.on('route_changed', (data) => {
      toast.success(`Route updated for ${data.shipment_id}. Check your panel.`, { duration: 6000 });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, riskUpdates, newAlerts }}>
      {children}
    </SocketContext.Provider>
  );
}
```

---

## LAYOUT COMPONENTS

### `src/components/layout/AppShell.jsx`

The AppShell wraps all authenticated pages. It renders the role-appropriate sidebar, the topbar, and the page content via `<Outlet />`.

```jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../hooks/useAuth';

export default function AppShell() {
  const { user } = useAuth();

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <Sidebar role={user?.role} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### `src/components/layout/Sidebar.jsx`

The sidebar shows navigation links appropriate to the user's role. It has the RouteGuard logo at the top and a logout button at the bottom.

```jsx
// Navigation items per role
const NAV_CONFIG = {
  manager: [
    { label: 'Control Center', icon: 'LayoutDashboard', path: '/manager' },
    { label: 'Port Status', icon: 'Anchor', path: '/manager/ports' },
    { label: 'Analytics', icon: 'BarChart3', path: '/manager/analytics' },
  ],
  shipper: [
    { label: 'My Shipments', icon: 'Package', path: '/shipper' },
    { label: 'Create Shipment', icon: 'PackagePlus', path: '/shipper/create' },
  ],
  driver: [
    { label: 'My Assignment', icon: 'Truck', path: '/driver' },
    { label: 'Update Status', icon: 'CheckCircle', path: '/driver/status' },
  ],
  receiver: [
    { label: 'Incoming', icon: 'PackageCheck', path: '/receiver' },
  ],
};

// Implementation:
// - Fixed left sidebar, 240px wide
// - Background: var(--bg-surface), right border: var(--border-subtle)
// - Top: RouteGuard logo (Syne font, bold, with a small blue triangle icon)
// - Nav links: 48px height, full-width, flex row with icon (20px) + label
// - Active state: background var(--bg-elevated), left border 3px solid var(--accent-primary), text white
// - Inactive state: text var(--text-secondary), hover background var(--bg-elevated)
// - Bottom: User avatar (initials circle) + name + role badge + logout button
```

### `src/components/layout/Topbar.jsx`

```jsx
// Implementation:
// - Fixed top bar, 64px height, full width
// - Background: var(--bg-surface), bottom border: var(--border-subtle)
// - Left: Current page title (Syne font, 18px, bold)
// - Center: Live status indicator — blinking green dot + "LIVE MONITORING" text (JetBrains Mono)
// - Right:
//   - Notification bell icon with unread badge (count of unresolved alerts)
//   - User name + role chip (small, colored by role)
//   - Gear icon for settings
```

---

## PAGE 1: LOGIN PAGE

**File:** `src/pages/auth/LoginPage.jsx`

### Layout
Full-page, centered layout. Dark background with subtle animated grid pattern overlay. Left half has branding; right half has the login form.

### Left Panel — Branding
- Large "ROUTEGUARD" wordmark in Syne font, electric blue.
- Tagline: "Predict. Prevent. Protect." in muted text.
- Three feature bullets with icons: "Real-time ML risk scoring", "Proactive rerouting engine", "Financial impact analysis".
- Subtle animated world map SVG in background.

### Right Panel — Login Form
- Card with `var(--bg-surface)` background.
- Title: "Welcome back" (Syne, 28px).
- Subtitle: "Sign in to your RouteGuard workspace".
- **Email field** — label "Email address", placeholder "you@company.com".
- **Password field** — label "Password", placeholder "••••••••", show/hide toggle.
- **Sign In button** — full width, primary blue, loading spinner state.
- **Error message area** — red text below button if credentials wrong.
- Divider line.
- **Demo accounts section** — clearly labeled "Test Accounts (Demo Mode)". Four buttons, one per role, each shows the role name and pre-fills the email/password fields when clicked:
  - Shipper → shipper@routeguard.com / test1234
  - Manager → manager@routeguard.com / test1234
  - Driver → driver@routeguard.com / test1234
  - Receiver → receiver@routeguard.com / test1234
- Small footer: "These demo credentials bypass the backend for UI testing."

### State Management
```javascript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [showPassword, setShowPassword] = useState(false);
```

### API Call with Dummy Fallback
```javascript
const handleLogin = async () => {
  setLoading(true);
  setError('');
  const result = await login(email, password); // AuthContext handles backend + dummy fallback
  if (result.success) {
    const roleRoutes = { manager: '/manager', shipper: '/shipper', driver: '/driver', receiver: '/receiver' };
    navigate(roleRoutes[result.user.role]);
  } else {
    setError('Invalid email or password. Try the demo accounts below.');
  }
  setLoading(false);
};
```

---

## PAGE 2: MANAGER DASHBOARD (HERO SCREEN)

**File:** `src/pages/manager/ManagerDashboard.jsx`

This is the most important page in the entire application. It must look like a genuine operations control center.

### Layout: Three-Column Design

```
┌─────────────────────────────────────────────────────────────┐
│  TOP STATS BAR — full width, 5 stat cards in a row          │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│   LIVE MAP                   │   ALERT PANEL                │
│   (full height, ~65% width)  │   (35% width, scrollable)    │
│                              │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

### Section 1: Top Stats Bar

Five `StatCard` components in a horizontal row. Each shows:
- Icon (Lucide icon)
- Big number in JetBrains Mono, 32px
- Label in muted text, 13px

Cards:
1. **Total Active** — ship icon — number: 4 — label: "Active Shipments"
2. **Critical** — alert-triangle icon — number: 1 — label: "Critical Risk" — number in `var(--risk-critical)`
3. **High Risk** — activity icon — number: 1 — label: "High Risk" — number in `var(--risk-high)`
4. **On Time** — check-circle icon — number: "86.4%" — label: "On-Time Rate" — number in `var(--risk-low)`
5. **Value Monitored** — dollar-sign icon — number: "$4.62M" — label: "Cargo Under Watch"

Data source: Try `GET /analytics/overview`, fallback to `DUMMY_ANALYTICS.overview`.

### Section 2: Live Map

**Component:** `src/components/map/LiveMap.jsx`

Implementation details:
- Use `react-leaflet` `MapContainer` with OpenStreetMap tiles.
- Tile URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Initial center: `[20, 30]`, zoom: `2.5`
- Dark map style: Use `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` (CartoDB dark tiles — free, no API key needed). Attribution: `&copy; <a href="https://carto.com/">CARTO</a>`.
- Map container: height fills available space (`calc(100vh - 180px)`), dark background `#0A0E1A`.

**Vessel Markers:**
For each active shipment, render a custom `VesselMarker` at `current_coordinates`. The marker is a custom divIcon — a small circle colored by risk level with a pulsing ring for Critical.

```javascript
// VesselMarker divIcon HTML by risk level:
const markerColors = {
  low:      '#22C55E',
  medium:   '#EAB308',
  high:     '#F97316',
  critical: '#EF4444',
};
// Critical markers get a CSS animation for pulsing ring
```

**Marker Popup (click to open):**
- Shipment ID (JetBrains Mono, bold)
- Cargo type + vessel name
- Risk score with colored badge
- "View Details →" button that navigates to `/manager/shipments/{id}`

**Route Lines:**
Draw a `Polyline` for each shipment's `route_waypoints`. Color: dim `rgba(59,130,246,0.4)`. On hover or when shipment is selected, brighten to `rgba(59,130,246,0.9)`. If `is_rerouted`, draw original route in faint red and new route in bright green.

**Map Controls:**
- Top-right: Toggle buttons for "Weather Overlay" and "Port Overlay" (visual only for demo — just shows/hides port status circles on the map).
- Bottom-right: Standard Leaflet zoom controls, styled to match dark theme.

**Port Overlay (when toggled on):**
Show `CircleMarker` at each port's coordinates, colored by `port_score`:
- Score < 30: green circle, radius 8
- Score 30–60: yellow circle, radius 10
- Score 61–80: orange circle, radius 12
- Score > 80: red circle, radius 14, pulsing

Data source: Try `GET /manager/ports`, fallback to `DUMMY_PORTS`.

**Socket.io Integration in Map:**
```javascript
const { riskUpdates } = useSocket();
// When riskUpdates changes, update the relevant marker color in real time
// This is what makes the demo impressive — marker turns red live
```

### Section 3: Alert Panel

**Component:** `src/components/alerts/AlertPanel.jsx`

- Fixed-height panel to the right of the map, full height, scrollable.
- Header: "Active Alerts" + count badge + "Mark all read" button.
- Each `AlertCard` shows:
  - Severity indicator strip (left border, colored by severity)
  - Shipment ID (JetBrains Mono) + tracking number
  - Time ago (e.g., "8 minutes ago")
  - Alert type icon + short message (2 lines max, truncated)
  - Risk score badge
  - Two buttons: "View Details" → navigates to shipment detail; "Resolve" → calls `PUT /alerts/{id}/resolve`

- Sort order: Critical first, then High, then Warning, then Info. Within same severity, newest first.
- Unread alerts have a subtle left glow: `box-shadow: inset 4px 0 0 var(--risk-critical)` (or appropriate color).
- Empty state: Ship icon + "No active alerts. All shipments nominal."

Data source: Try `GET /alerts/active`, fallback to `DUMMY_ALERTS`. Socket.io `new_alert` events prepend to list automatically.

---

## PAGE 3: MANAGER — SHIPMENT DETAIL

**File:** `src/pages/manager/ShipmentDetail.jsx`

This page is opened by clicking a vessel on the map or "View Details" in the alert panel.

### Layout: Two-Column

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Shipment ID + Status + Back button                 │
├─────────────────────────┬───────────────────────────────────┤
│  LEFT COLUMN (60%)      │  RIGHT COLUMN (40%)               │
│  ─ Risk Score Panel     │  ─ Shipment Info Card             │
│  ─ Feature Importance   │  ─ Cargo Details Card             │
│  ─ Trajectory Graph     │  ─ Team Assignments Card          │
│  ─ Alternate Routes     │  ─ Status Timeline                │
│  ─ Financial Impact     │                                   │
└─────────────────────────┴───────────────────────────────────┘
```

### Header

- Back arrow button → `/manager`
- Shipment ID in JetBrains Mono, 20px, bold
- Tracking number in muted text
- Status chip (color by current status)
- Risk level badge (large, prominent)
- Last updated timestamp

### Left Column

**Risk Score Panel:**
Component: `src/components/risk/RiskGauge.jsx`

A large circular gauge (SVG-based, 200px diameter):
- Background ring: `var(--bg-elevated)`, stroke-width 16
- Foreground arc: colored by risk level, stroke-width 16, `stroke-linecap: round`
- Arc spans from 7 o'clock to 5 o'clock (225 degrees sweep)
- Center text: risk score number in JetBrains Mono, 48px, bold; below it "/ 100" in muted small text; below that the risk level label (e.g., "CRITICAL") in the risk color
- Outside the gauge: two sub-stats in a row — "Est. Delay: 18.5 hrs" and "Reroute Confidence: 92%"

**Feature Importance Chart:**
Component: `src/components/risk/FeatureChart.jsx`

A horizontal bar chart using Recharts `BarChart` with `layout="vertical"`:
- Y-axis: feature names (Weather, Port, Traffic, Historical, Cargo Sensitivity)
- X-axis: percentage 0–100
- Bars filled with gradient from `var(--accent-primary)` to `var(--risk-high)` based on value
- Each bar has the percentage value displayed at the end
- Title: "Risk Factor Breakdown"

Data: `feature_importance` from ML prediction response.

**6-Hour Risk Trajectory Graph:**
Component: `src/components/risk/TrajectoryGraph.jsx`

A `LineChart` from Recharts:
- X-axis: "Now", "+1hr", "+2hr", "+3hr", "+4hr", "+5hr"
- Y-axis: 0 to 100
- Line: smooth, color changes based on ending value (green if declining, red if rising)
- Fill area under line with gradient opacity
- Current value highlighted with a dot and tooltip
- If trajectory is going DOWN: title "Risk Trajectory — Improving ↓" in green
- If trajectory is going UP: title "Risk Trajectory — Escalating ↑" in red (with pulsing effect)
- Threshold line at y=75 (dashed red) labeled "Critical threshold"

**Alternate Routes Comparison Table:**
Component: `src/components/routes/RouteCompareTable.jsx`

Table with columns: Route Name | Risk Score | Est. Delay | Extra Distance | Extra Cost | Action

- Header row: dark background, muted text labels
- Each route row: 
  - Route name with description in smaller muted text below
  - Risk score with colored badge
  - Delay hours in JetBrains Mono
  - Extra distance in km
  - Extra cost in USD
  - For recommended route: highlighted row with `var(--accent-glow)` background + "RECOMMENDED" badge in top-right corner of the row
  - "Approve" button (green, primary) for each alternate route
  - "Reject" button (subtle, outline) for the recommended one
  - Current route shown as first row, labeled "Current Route", with risk badge, no action buttons

On clicking "Approve":
- Show `ConfirmDialog`: "Approve reroute to [route name]? This will notify the vessel captain immediately."
- On confirm: call `POST /shipments/{id}/reroute` with `{ route_id }`, fallback updates local state
- Show success toast: "✓ Reroute approved. Captain James Okafor notified."
- Update the shipment's current route in local state

**Financial Impact Card:**
Component: `src/components/routes/FinancialImpactCard.jsx`

Two columns side by side:
- Left: "Current Route" — risk %, expected loss amount in large red text, sub-label "Expected financial exposure"
- Right: "Recommended Route" — extra cost in smaller text, expected loss amount in smaller green text, net saving highlighted in large green bold text
- Bottom: "By approving the reroute, you protect an estimated $183,000 in cargo value."

### Right Column

**Shipment Info Card:**
- Origin → Destination (with arrow)
- Departure date, Expected arrival
- Priority chip, Status chip
- Cargo type, Weight, Declared value
- Is rerouted? If yes: "Rerouted ×1" badge + "Originally via Suez Canal" note

**Cargo Details Card:**
- Cargo description
- Cargo sensitivity score with explanation
- Special handling notes
- Insurance value

**Team Assignments Card:**
- Manager: avatar (initials circle) + name
- Vessel / Captain: vessel name + captain name
- Driver 1 (land leg): name + phone icon
- Receiver: name + company

**Status Timeline:**
Component: `src/components/shipments/StatusTimeline.jsx`

Vertical step indicator:
- Steps: Created → Picked Up → In Transit → At Port → Customs Clearance → Delivered
- Completed steps: solid colored circle with checkmark + timestamp
- Current step: animated pulsing ring
- Future steps: dimmed circle with dashed border

Data source: status_updates from backend or show dummy progress based on status field.

**API Calls:**

```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const [shipmentRes, predictionRes] = await Promise.all([
        api.get(ENDPOINTS.SHIPMENT_DETAIL(id)),
        api.get(ENDPOINTS.ML_PREDICTION(id)),
      ]);
      setShipment(shipmentRes.data);
      setPrediction(predictionRes.data);
    } catch {
      // Fallback to dummy data
      const shipment = DUMMY_SHIPMENTS.find(s => s.shipment_id === id);
      setShipment(shipment);
      setPrediction(DUMMY_ML_PREDICTION);
    }
  };
  fetchData();
}, [id]);
```

---

## PAGE 4: MANAGER — PORT STATUS BOARD

**File:** `src/pages/manager/PortStatusBoard.jsx`

### Layout

```
Header: "Global Port Status" + last updated timestamp

Summary bar: 
  Operational: 4 | Busy: 2 | Congested: 1 | Severely Congested: 1

Main content: Two-column
  Left: World map with port markers (Leaflet, dark tiles)
  Right: Scrollable list of port cards
```

### Port Cards (right column)

Each card shows:
- Port name (Syne font, 16px bold) + Port code (JetBrains Mono, muted)
- Country flag emoji + country name
- Status badge: Operational (green) / Busy (yellow) / Congested (orange) / Severely Congested (red + pulse animation)
- Key metrics row: "Vessels in Queue: 47" | "Avg Wait: 38 hrs" | "Berths Free: 0/12"
- Port Score bar: thin horizontal progress bar, full width, color-coded, value shown at end
- If severely congested: yellow warning strip at top of card "⚠ Affecting active shipment SHP-2025-00847"

Cards sorted by port_score descending (most congested first).

Data source: Try `GET /manager/ports`, fallback to `DUMMY_PORTS`.

---

## PAGE 5: MANAGER — ANALYTICS

**File:** `src/pages/manager/AnalyticsPage.jsx`

### Layout: Grid of Cards

```
Row 1: Model Accuracy stats (3 metric cards)
Row 2: Risk Level Distribution over time (full-width chart)
Row 3: Left: Rerouting success table | Right: Performance stats
```

**Model Accuracy Cards (Row 1):**
1. "XGBoost Accuracy" — R² score: 0.91, displayed as "91.0%" with a circular mini-gauge
2. "Delay Prediction MAE" — "1.8 hours average error"
3. "Reroute Decision Accuracy" — "94.1% correct"

**Risk Distribution Over Time (Row 2):**
`StackedBarChart` from Recharts:
- X-axis: last 7 days
- Stacked bars: Critical (red) + High (orange) + Medium (yellow) + Low (green)
- Title: "Daily Shipment Risk Distribution"
- Hover tooltip showing counts per level

**Rerouting Success Table (Row 3 Left):**
Table: Route Decision | Original Risk | New Risk | Outcome | Delay Saved
Show last 5 rerouting decisions from dummy data.

**Performance Stats (Row 3 Right):**
- Predictions made: 3,287
- Average detection time before impact: 4.2 hours
- Total disruptions prevented: 44
- Financial losses prevented: $183,000 (this week)

Data source: Try `GET /analytics/accuracy` + `GET /analytics/overview`, fallback to `DUMMY_ANALYTICS`.

---

## PAGE 6: SHIPPER DASHBOARD

**File:** `src/pages/shipper/ShipperDashboard.jsx`

### Layout

```
Header: "My Shipments" + total count badge + "New Shipment" button

Filter/search bar:
  Search by tracking number | Filter by status (dropdown) | Filter by date range

Shipments table (desktop) / Cards (mobile)
```

### Shipments Table

Columns: Tracking # | Destination | Status | Risk | Expected Arrival | Actions

- Each row: 
  - Tracking number in JetBrains Mono
  - Origin → Destination with arrow icon
  - Status chip (color-coded: green=delivered, blue=in_transit, gray=created, orange=at_port)
  - Risk indicator: colored dot + level label. Note: shippers see the level label (Low/High/Critical) but NOT the raw score number (that's manager-only detail)
  - Expected arrival date
  - Actions: "Track →" button navigating to `/shipper/shipments/{id}`
  - If status is delayed: show "⚠ Delayed" chip in orange

- Empty state: "No shipments yet. Create your first shipment to get started." with a "Create Shipment" button.

Data source: Try `GET /shipments/my`, fallback to filter `DUMMY_SHIPMENTS` where `shipper_name === user.name` (or show first 2 for demo).

---

## PAGE 7: SHIPPER — CREATE SHIPMENT

**File:** `src/pages/shipper/CreateShipment.jsx`

### Multi-Step Form (3 Steps)

Progress indicator at top: Step 1 of 3 — Step 2 of 3 — Step 3 of 3 (horizontal stepper with step numbers and labels).

### Step 1 — Route Details

**Origin Location:**
- Text input: "Origin Address or Port" — placeholder: "e.g., Samsung Factory, Suwon, South Korea"
- Quick-select buttons below: Common origins shown as chips (e.g., "Busan Port", "Shanghai Port", "Mumbai Port") — clicking auto-fills the field

**Destination Location:**
- Same as above with common destinations

**Departure Date:**
- Date picker input, minimum today

**Expected Delivery Date:**
- Date picker, minimum departure + 5 days

**Next button** → validates fields are not empty

### Step 2 — Cargo Details

**Cargo Type dropdown:**
Options: Standard Dry / Electronics (Fragile) / Perishable / Pharmaceutical / Hazardous / Refrigerated / Automotive / Oversized

When cargo type is selected, show an info box explaining the sensitivity level:
> "Electronics (Fragile) — Sensitivity Score: 65. System will apply stricter alert thresholds for this cargo type."

**Cargo Description:**
Textarea — "Describe your cargo (e.g., 500 Samsung Laptop Model X5)"

**Weight (kg):**
Number input

**Volume (CBM):**
Number input

**Declared Value (USD):**
Number input with $ prefix. Show dynamic text below: "RouteGuard will monitor this shipment's risk based on its declared value."

**Insurance Value (USD):**
Number input

**Priority Level:**
Radio group with descriptions:
- Low: "Standard monitoring, alerts above 75 risk score"
- Medium: "Enhanced monitoring, alerts above 60 risk score"
- High: "Priority monitoring, alerts above 45 risk score"
- Urgent: "Maximum monitoring, alerts above 30 risk score. 24/7 escalation."

**Special Handling Notes:**
Textarea (optional)

**Cargo Sensitivity Preview:**
After filling cargo type + priority, show a live calculated preview:
> "Based on your selections: Estimated Cargo Sensitivity Score — **78/100**. Rerouting will be recommended proactively for this shipment."

**Back / Next buttons**

### Step 3 — Review and Confirm

Summary card showing all filled details in two columns. Large "Confirm and Create Shipment" button.

On click:
```javascript
const handleSubmit = async () => {
  setSubmitting(true);
  try {
    const res = await api.post(ENDPOINTS.CREATE_SHIPMENT, formData);
    toast.success('Shipment created successfully!');
    navigate(`/shipper/shipments/${res.data.shipment_id}`);
  } catch {
    // Dummy fallback: just navigate to a dummy shipment
    toast.success('Shipment created! (Demo mode — navigating to example shipment)');
    navigate('/shipper/shipments/SHP-2025-00847');
  }
  setSubmitting(false);
};
```

---

## PAGE 8: SHIPPER — SHIPMENT TRACKING

**File:** `src/pages/shipper/ShipmentTracking.jsx`

### Layout

```
Header: Tracking number + status chip + risk dot (colored)

Map section (full width): Leaflet map showing just this shipment's route

Two cards below:
  Left: Journey Progress (status timeline)
  Right: Shipment Info + Notifications history
```

### Map

Small Leaflet map (400px height), centered on the shipment's current coordinates. Route polyline in blue. Vessel marker with pulse if in motion. Origin pin (green) and Destination pin (gray, or green when delivered).

### Risk Alert Banner

If risk level is Medium or above, show a banner between the header and map:
```
⚠ Your shipment is experiencing [High/Critical] risk conditions.
Your logistics manager has been notified and is reviewing routing options.
[If rerouted]: Route has been updated. New estimated arrival: Feb 12.
```
- Background: `rgba(249,115,22,0.1)`, border: `var(--risk-high)` for High
- Background: `rgba(239,68,68,0.1)`, border: `var(--risk-critical)` for Critical

### Status Timeline (left card)

Same `StatusTimeline` component. Shipper-visible statuses + timestamps. If a delay was detected and resolved, show it inline: "⚠ Delay detected → Rerouted via Hamburg (saved 34 hrs)"

### Right Card

- Expected arrival (large, prominent)
- If delayed: new ETA with explanation
- Cargo type + declared value
- Assigned vessel + manager name
- Alert history: last 3 notifications this shipment received

Data source: Try `GET /shipments/{id}`, fallback to `DUMMY_SHIPMENTS.find(s => s.shipment_id === id)`.

---

## PAGE 9: DRIVER DASHBOARD

**File:** `src/pages/driver/DriverDashboard.jsx`

### Design Note

The driver dashboard must work on mobile. Use a card-focused layout with large touch targets (minimum 48px tap area). Avoid dense tables.

### Layout

```
Header: "My Assignment" + driver name

Active Assignment Card (full width, large):
  ─ Shipment ID + tracking number
  ─ Pickup and delivery addresses
  ─ Expected delivery time (large, prominent)
  ─ Current status

Map Section:
  ─ Leaflet map showing current route
  ─ Driver's current leg highlighted

Status Update Section (large buttons):
  ─ Current status shown prominently
  ─ Action button to go to StatusUpdate page

Route Change Alert Section:
  ─ Only shows if socket has received a route_changed event
  ─ Prominent red banner with "View New Route" button

No Active Assignment State:
  ─ Empty state card: "No active assignment. Your next shipment will appear here."
```

### Assignment Card

Large card with:
- Top: Shipment ID (JetBrains Mono) + priority badge
- Origin address with truck icon
- Arrow down
- Destination address with flag icon
- Departure date | Expected arrival date
- Current status chip (large, 36px height)
- Cargo type + weight

Map: `react-leaflet` MapContainer, 280px height, shows the driver's specific leg. Current GPS position dot (blue, pulsing). Destination marker (green flag).

Data source: Try `GET /driver/assignment`, fallback to use `DUMMY_SHIPMENTS[0]` for demo.

---

## PAGE 10: DRIVER — STATUS UPDATE

**File:** `src/pages/driver/StatusUpdate.jsx`

### Layout

Full-page card layout (mobile-friendly).

**Current Status Display:**
Large text showing current status at top.

**Status Update Buttons:**

Large, full-width action buttons in a vertical stack. Each button represents the next possible status in the shipment lifecycle. Only relevant next-step buttons are shown based on current status.

| Current Status | Available Actions |
|---|---|
| assigned | Picked Up (start journey) |
| picked_up | In Transit, Report Delay |
| in_transit | Arrived at Port, Delayed, Report Incident |
| at_port | Cleared Customs, Delayed at Port |
| customs_clearance | In Transit (outbound) |
| in_transit (outbound) | Delivered |

Each button:
- 64px height
- Large icon (32px) + label (18px) in a row
- Truck icon for transit, anchor for port, checkmark for delivered, alert for incident

**Incident Report Section** (expandable):
Shown when "Report Delay" or "Report Incident" is tapped:
- Incident type dropdown: Weather / Traffic / Mechanical / Customs Hold / Other
- Description textarea
- Photo upload button (visual only, no actual upload required for demo)
- Submit button

**API Call:**
```javascript
const updateStatus = async (newStatus, incidentData = null) => {
  try {
    await api.put(ENDPOINTS.UPDATE_STATUS(shipment.shipment_id), {
      new_status: newStatus,
      ...incidentData,
    });
    toast.success(`Status updated to: ${newStatus}`);
    setCurrentStatus(newStatus);
  } catch {
    // Dummy: just update local state
    toast.success(`Status updated to: ${newStatus} (Demo mode)`);
    setCurrentStatus(newStatus);
  }
};
```

---

## PAGE 11: DRIVER — ROUTE CHANGE ALERT

**File:** `src/pages/driver/RouteChangeAlert.jsx`

This page is shown as a full-screen alert when a route change notification arrives via Socket.io. It is also accessible from the driver dashboard.

### Layout

Full-page, high-urgency design. Red-tinted overlay at top.

```
[ROUTE CHANGE banner — red background, white text, large]

Old Route Card:
  "Your previous route has been changed"
  Old route description (crossed out)

New Route Card (green border, prominent):
  New route description
  New waypoints listed
  New ETA

Reason Card:
  Why the route was changed (from alert message)
  "Tropical storm system detected ahead. Your route has been updated for safety."

Two buttons (full width):
  ✓ Confirm I Understand (green, large)
  ? Contact Manager (outline, smaller)
```

On "Confirm I Understand" → navigate back to DriverDashboard.

---

## PAGE 12: RECEIVER DASHBOARD

**File:** `src/pages/receiver/ReceiverDashboard.jsx`

### Layout

```
Header: "Incoming Shipments" + count

Stats row: Expected Today: 0 | This Week: 1 | Pending Confirmation: 1

Shipments list
```

### Shipments List

Card-based layout (one card per shipment):
- Top: Tracking number (JetBrains Mono) + origin company
- Main: "Expected Arrival" date — **large, prominent** (this is what receivers care about most)
- Sub: Cargo description + weight
- Status chip + risk dot
- If delayed: "⚠ Delayed — New ETA: [date]" banner in orange within the card
- "Track →" button → `/receiver/shipments/{id}`
- If status is `delivered` and not yet confirmed: **"Confirm Delivery" button** prominently in green

Empty state: "No incoming shipments currently tracked."

Data source: Try `GET /shipments/my`, fallback to `[DUMMY_SHIPMENTS[2], DUMMY_SHIPMENTS[3]]`.

---

## PAGE 13: RECEIVER — TRACK SHIPMENT

**File:** `src/pages/receiver/TrackShipment.jsx`

### Layout

Simplified version of the shipper tracking page, optimized for the receiver perspective.

```
Header: "Tracking — [tracking number]"

ETA Card (top, full width):
  Large: "Estimated Arrival"
  Large date/time in JetBrains Mono
  Sub: "On time" (green) or "Delayed by X hours" (orange)

Map (full width, 350px height):
  Shipment current position on world map
  Route line from origin to this location to destination
  Destination marker pulsing green when shipment is close

Journey Status Card:
  Progress bar (0%–100%) based on distance remaining vs total
  Current leg label: "At sea — Pacific Ocean"
  Status timeline (simplified, 4 steps: Dispatched / In Transit / Approaching / Delivered)

Shipment Details Card:
  Sender company, cargo type, weight
  Tracking number, assigned vessel
```

---

## PAGE 14: RECEIVER — CONFIRM DELIVERY

**File:** `src/pages/receiver/ConfirmDelivery.jsx`

### Layout

Step-by-step confirmation form. This is important for the feedback loop — confirmed deliveries generate training data for the ML models.

### Form Fields

**Step 1 — Cargo Inspection**

"Have you received all items in this shipment?"
- Radio: Yes / Partially / No

"Cargo condition on arrival:"
- Radio with descriptions:
  - Good — "All items intact, no visible damage"
  - Minor Damage — "Some packaging damage, contents appear okay"
  - Significant Damage — "Contents damaged, need assessment"
  - Total Loss — "Cargo completely damaged or lost"

"Number of units received:" (number input, pre-filled with expected quantity)

**Step 2 — Documentation**

"Upload photo of delivered goods" — file input area with drag-and-drop styling (visual only for demo). Shows camera icon + "Tap to upload photo" text. On click, shows a file selector.

"Delivery notes (optional):" — textarea

**Step 3 — Sign and Confirm**

Summary of what was received.

"Digital Signature:" — a simple canvas element where the receiver can draw their signature with their finger/mouse. Has "Clear" button.

"By confirming, you acknowledge receipt of the shipment as described above."

Large green "Confirm Delivery" button.

**API Call:**
```javascript
const confirmDelivery = async () => {
  try {
    await api.post(ENDPOINTS.CONFIRM_DELIVERY(id), {
      cargo_condition: condition,
      units_received: unitsReceived,
      damage_description: notes,
      dispute_raised: conditionValue === 'significant_damage' || conditionValue === 'total_loss',
    });
    toast.success('Delivery confirmed. Shipper has been notified.');
    navigate('/receiver');
  } catch {
    toast.success('Delivery confirmed! (Demo mode)');
    navigate('/receiver');
  }
};
```

---

## SHARED COMPONENTS — FULL SPECIFICATION

### `src/components/ui/Badge.jsx`

```jsx
// Props: level (low | medium | high | critical), size (sm | md | lg), showIcon (bool)
// Renders a pill badge with background, text, and optional icon
// Uses the badge CSS classes defined in the design system
// sm: 10px padding, 11px text
// md: 12px padding, 13px text (default)
// lg: 16px padding, 15px text
```

### `src/components/ui/StatCard.jsx`

```jsx
// Props: icon (Lucide icon component), value (string), label (string), color (optional)
// Renders a card with icon + large number + label
// If color provided, apply it to the value text
// Card: var(--bg-surface), border var(--border-subtle), rounded-lg, padding 20px
```

### `src/components/ui/Spinner.jsx`

```jsx
// A simple CSS-animated spinning circle
// Props: size (sm 16px | md 24px | lg 40px), color (defaults to var(--accent-primary))
// Use CSS animation: spin 0.8s linear infinite
```

### `src/components/ui/EmptyState.jsx`

```jsx
// Props: icon (Lucide icon), title (string), description (string), action (optional button)
// Centers the icon (48px, muted color) + title + description in a card
// Used when list is empty
```

### `src/components/ui/Modal.jsx`

```jsx
// Props: isOpen, onClose, title, children, footer
// Full overlay (rgba(0,0,0,0.7)) with centered modal card
// Card: var(--bg-surface), border var(--border-default), rounded-xl
// Header: title + X close button
// Body: children with padding
// Footer: action buttons
// Backdrop click closes modal
```

### `src/components/ui/ConfirmDialog.jsx`

```jsx
// A Modal variant for destructive/important confirmations
// Props: isOpen, onClose, onConfirm, title, message, confirmLabel, confirmVariant (danger|primary)
// Shows warning icon + message + Cancel + Confirm buttons
```

---

## HOOKS

### `src/hooks/useAuth.js`

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
export const useAuth = () => useContext(AuthContext);
```

### `src/hooks/useSocket.js`

```javascript
import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
export const useSocket = () => useContext(SocketContext);
```

---

## DATA FETCHING PATTERN

Every page must follow this exact pattern for API calls with dummy data fallback:

```javascript
// Standard data fetching hook pattern to use across all pages
import { useState, useEffect } from 'react';
import { api } from '../config/api';

function useShipments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingDummy, setUsingDummy] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(ENDPOINTS.MY_SHIPMENTS);
        setData(res.data);
      } catch (err) {
        // Backend unavailable — use dummy data silently
        setData(DUMMY_SHIPMENTS);
        setUsingDummy(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, loading, error, usingDummy };
}

// In the component JSX, when usingDummy is true, 
// show a small banner at the top of the page:
// [yellow chip] "Demo Mode — Using sample data. Connect backend to see live data."
```

---

## DEMO MODE BANNER

Every page that falls back to dummy data should show this non-intrusive banner at the top of the page content:

```jsx
{usingDummy && (
  <div style={{
    background: 'rgba(234,179,8,0.1)',
    border: '1px solid rgba(234,179,8,0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#EAB308',
  }}>
    <span>⚡</span>
    <span>Demo Mode — showing sample data. Start the backend to connect live data.</span>
  </div>
)}
```

---

## TAILWIND CONFIGURATION

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':     '#0A0E1A',
        'bg-surface':  '#111827',
        'bg-elevated': '#1C2333',
        'risk-low':      '#22C55E',
        'risk-medium':   '#EAB308',
        'risk-high':     '#F97316',
        'risk-critical': '#EF4444',
        'accent':        '#3B82F6',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        body:    ['Instrument Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

---

## ENVIRONMENT VARIABLES

Create `.env` file at project root:

```
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

For production, these will be replaced with the deployed backend URL.

---

## QUICK REFERENCE: PAGE → ROUTE → DATA SOURCE

| Page | Route | Role | Primary API | Dummy Fallback |
|---|---|---|---|---|
| Login | /login | All | POST /auth/login | dummyLogin() |
| Manager Dashboard | /manager | manager | GET /analytics/overview + GET /alerts/active | DUMMY_ANALYTICS + DUMMY_ALERTS |
| Manager Shipment Detail | /manager/shipments/:id | manager | GET /shipments/:id + GET /shipments/:id/prediction | DUMMY_SHIPMENTS + DUMMY_ML_PREDICTION |
| Port Status Board | /manager/ports | manager | GET /manager/ports | DUMMY_PORTS |
| Analytics | /manager/analytics | manager | GET /analytics/overview + /accuracy | DUMMY_ANALYTICS |
| Shipper Dashboard | /shipper | shipper | GET /shipments/my | DUMMY_SHIPMENTS (filtered) |
| Create Shipment | /shipper/create | shipper | POST /shipments/create | Local state redirect |
| Shipment Tracking | /shipper/shipments/:id | shipper | GET /shipments/:id | DUMMY_SHIPMENTS |
| Driver Dashboard | /driver | driver | GET /driver/assignment | DUMMY_SHIPMENTS[0] |
| Status Update | /driver/status | driver | PUT /shipments/:id/status | Local state update |
| Route Change Alert | /driver/route-change | driver | Socket.io event | Dummy route change object |
| Receiver Dashboard | /receiver | receiver | GET /shipments/my | DUMMY_SHIPMENTS (2 items) |
| Track Shipment | /receiver/shipments/:id | receiver | GET /shipments/:id | DUMMY_SHIPMENTS |
| Confirm Delivery | /receiver/shipments/:id/confirm | receiver | POST /shipments/:id/deliver | Local state + toast |

---

## IMPLEMENTATION CHECKLIST FOR CODING AGENT

Before submitting, verify each item:

- [ ] Design system CSS variables defined in `index.css`
- [ ] Google Fonts imported in `index.html`
- [ ] Leaflet CSS imported in `main.jsx`
- [ ] AuthContext handles both real backend login AND dummy login fallback
- [ ] SocketContext connects to backend but degrades gracefully if unavailable
- [ ] All 4 test accounts work from the Login page demo buttons
- [ ] Role-based routing: each role can only access their own pages
- [ ] Manager dashboard map uses CartoDB dark tiles
- [ ] All vessel markers are colored by risk level
- [ ] Critical markers have a CSS pulse animation
- [ ] Alternate routes table on shipment detail shows Approve/Reject buttons
- [ ] Approve reroute calls API with fallback to local state update + toast
- [ ] Financial impact card shows net saving in green
- [ ] LSTM trajectory graph shows correct trend direction label
- [ ] Feature importance chart uses horizontal bar chart layout
- [ ] All data values (scores, IDs, times) use JetBrains Mono font
- [ ] All pages show Demo Mode banner when using dummy data
- [ ] Driver dashboard is mobile-friendly with large touch targets
- [ ] Delivery confirmation has canvas signature field
- [ ] All loading states show `Spinner` component
- [ ] All empty list states show `EmptyState` component
- [ ] Toast notifications work for success and error states
- [ ] All modals close on backdrop click
- [ ] No console errors on any page with dummy data
