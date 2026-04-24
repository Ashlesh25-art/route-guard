# RouteGuard

AI-powered supply chain risk management for maritime and multimodal logistics.

RouteGuard combines real-time shipment tracking, predictive ML models, and operational dashboards for role-based teams (Manager, Shipper, Driver, Receiver).

## Repository Description (GitHub About)

Use this as your repo description:

`AI-powered logistics risk platform with FastAPI + React, real-time shipment monitoring, sea-route intelligence, and multi-model delay/reroute prediction.`

## Why RouteGuard

- Predict shipment risk before delays become expensive.
- Recommend rerouting decisions with explainable ML outputs.
- Monitor active shipments through role-based dashboards.
- Support maritime routing with sea network waypoints.

## Core Capabilities

- Authentication and role-based access (Manager, Shipper, Driver, Receiver)
- Shipment lifecycle management and live status tracking
- Risk scoring, delay estimation, and reroute recommendation
- Alerting and monitoring workflows
- Analytics for operational visibility
- Sea-routing engine with fallback strategies
- Background monitoring and retraining hooks

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy + PostgreSQL
- APScheduler
- scikit-learn, XGBoost, PyTorch (for LSTM)
- NetworkX + GeoPandas + Shapely (sea-route graph and geometry)

### Frontend

- React 18 + Vite
- React Router
- Axios
- Socket.IO client
- Recharts
- Leaflet + React-Leaflet

## Architecture Overview

1. Frontend (React) calls backend APIs and listens to realtime events.
2. Backend (FastAPI) handles auth, shipment operations, monitoring, alerts, and analytics.
3. Feature engine composes weather, traffic, port, historical, and distance signals.
4. ML service runs multi-model inference for risk, delay, reroute, and risk trend.
5. Route service provides initial and alternate routes, including sea-routing engine integration.
6. Background jobs perform periodic monitoring cycles.

## ML Pipeline (High Level)

- Model 1: XGBoost risk score prediction
- Model 2: Random Forest delay-hour prediction
- Model 3: Gradient Boosting reroute decision classification
- Model 4: KMeans route cluster profiling (metadata driven)
- Model 5: LSTM risk trajectory forecasting
- Model 6: Continuous improvement and model performance tracking

ML metadata and logs are stored under `ml/models/`.

## Project Structure

```text
route guard/
	backend/
		app/
			routers/        # API route modules
			services/       # Business logic + ML + routing logic
			models/         # SQLAlchemy entities
			schemas/        # Pydantic DTOs
			background/     # Monitoring/retraining jobs
		requirements.txt
		schema.sql
		setup.bat
	frontend/
		src/
			pages/          # Role-based dashboards and screens
			components/     # Shared UI modules (tables, maps, layout)
			context/        # Auth + socket context
			config/         # API base URL and endpoints
	ml/
		scripts/          # Model training scripts
		models/           # Model binaries and metadata
		data/             # Datasets and derived artifacts
	marnet/             # Maritime network data for sea routing
```

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (local)

### 1) Backend setup

From `backend/`:

```bash
pip install -r requirements.txt
```

Create `.env` (or use `backend/setup.bat` on Windows), then start:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### 2) Seed sample data (optional)

From `backend/`:

```bash
python full_seed.py
```

Alternative reset/seed scripts:

- `full_reset_seed.py`
- `migrate_and_seed.py`

### 3) Frontend setup

From `frontend/`:

```bash
npm install
npm run dev
```

Set environment values in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

Default frontend URL:

- `http://localhost:5173`

## API Surface (Major Modules)

- `/auth` - login, register, me
- `/shipments` - shipment CRUD and workflow actions
- `/alerts` - active alerts and resolution
- `/manager` - manager orchestration endpoints
- `/driver` - assignment and incident flow
- `/analytics` - dashboard and model accuracy summaries
- `/sea-route` - sea routing endpoints
- `/health` - runtime health checks

## Role-Based Product Flows

- Manager: monitor risk, assign resources, approve reroutes, review analytics
- Shipper: create and track shipments
- Driver: update shipment status, report incidents
- Receiver: track incoming orders and confirmations

## Notes for Development

- Backend defaults are optimized for local development and hackathon mode.
- If optional external API keys are not set, fallback/simulated paths are used.
- Sea-route logic falls back from sea engine to external directions and then geodesic interpolation.

## Testing

Backend tests exist under `backend/tests/`, including auth, routes, monitoring, and ML service coverage.

## Deployment Readiness

Recommended hardening before production:

- Move secrets from defaults to secure environment stores
- Tighten CORS origins
- Add migration/versioning workflow and CI validation
- Add structured logging and observability dashboards

## License

No license file is currently present in this repository.
