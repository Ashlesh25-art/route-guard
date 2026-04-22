# RouteGuard — Predictive Supply Chain Disruption System
### Complete Project Plan

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [System Architecture](#3-system-architecture)
4. [User Roles and Permissions](#4-user-roles-and-permissions)
5. [Data Sources and Strategy](#5-data-sources-and-strategy)
6. [Feature Engineering](#6-feature-engineering)
7. [Machine Learning Pipeline](#7-machine-learning-pipeline)
8. [Alternate Route Scoring and Decision Engine](#8-alternate-route-scoring-and-decision-engine)
9. [Database Design](#9-database-design)
10. [Tech Stack](#10-tech-stack)
11. [Project Structure](#11-project-structure)
12. [Implementation Plan](#12-implementation-plan)
13. [Demo Flow](#13-demo-flow)
14. [Market Feasibility and Business Model](#14-market-feasibility-and-business-model)
15. [Future Roadmap](#15-future-roadmap)

---

## 1. Problem Statement

### The Core Issue

Global supply chains move millions of shipments simultaneously across land, sea, and air. The fundamental problem is not a lack of data — it is that disruptions are only discovered **after** they have already caused damage. This makes every current system **reactive rather than proactive**.

**Real-world consequences of this gap:**

- A storm forms over a major shipping lane, but no one is alerted until vessels are already delayed.
- A port becomes severely congested, discovered only after a ship has been waiting at anchor for two days.
- A traffic incident blocks the only viable road route hours before a time-sensitive delivery window closes.
- By the time any of these events are escalated and acted upon, the small problem has cascaded into a major operational and financial crisis.

### Why the Status Quo Fails

| Failure Mode | Impact |
|---|---|
| Disruptions identified only after timelines are already compromised | No window to respond proactively |
| Transportation networks are highly complex across multiple modes | Managers cannot process all variables manually |
| No tool automatically suggests or executes optimized route adjustments | Human reaction time too slow for real-time risk |
| Small bottlenecks left unaddressed cascade into larger disasters | Compounding losses across the supply chain |

### The Numbers Behind the Problem

- **$1.5 trillion** lost globally every year due to supply chain disruptions.
- **56%** of companies have no real-time visibility into their supply chain.
- Only **6%** of companies report full supply chain visibility.
- **79%** of disruptions are caused by events that could have been predicted with better data analysis.
- Average time to detect a disruption: **73 days**. Average time to recover: **2 to 6 months**.

*(Sources: McKinsey Global Supply Chain Report, Gartner Supply Chain Research, IBM Institute for Business Value)*

---

## 2. Solution Overview

### What RouteGuard Does

RouteGuard is a predictive supply chain disruption management system. It continuously ingests multi-source real-time data — weather conditions, traffic congestion, port status, AIS vessel positions, and historical delay patterns — feeds this data through a machine learning pipeline, and generates a live **risk score for every active shipment**. When that risk score crosses a threshold, the system proactively surfaces alternate routes, calculates the financial impact of each option, and enables the logistics manager to act with a single click — **before** a delay occurs.

### The Three Core Capabilities

**1. Live Shipment Monitoring**
Every active shipment is continuously tracked on a live map. Each shipment is assigned a risk indicator (Green / Yellow / Orange / Red) updated in real time. The dashboard gives a logistics manager a complete operational picture at a glance.

**2. ML-Powered Disruption Prediction**
A pipeline of five machine learning models analyzes incoming data every 30 minutes per shipment. The primary model (XGBoost) outputs a risk score from 0 to 100. A second model (Random Forest) predicts estimated delay duration in hours. A third model (Gradient Boosting) outputs a reroute decision with a confidence percentage. A fourth model (K-Means) groups routes by risk pattern. A fifth model (LSTM neural network) forecasts the risk trajectory for the next 6 hours.

**3. Smart Rerouting with Financial Impact**
When a shipment reaches High or Critical risk, the system fetches 2–3 alternate routes via OpenRouteService, scores each route through the same ML pipeline, and presents a ranked comparison showing risk score, estimated delay saved, extra distance, and the net financial impact. The manager approves with one click and the driver or vessel captain is immediately notified.

---

## 3. System Architecture

### End-to-End Data Flow

```
EXTERNAL DATA SOURCES
├── OpenWeatherMap API        (live weather at route coordinates)
├── Marine Weather API        (wave height, swell, storm systems at sea)
├── TomTom Traffic API        (road speed and congestion data)
├── Simulated AIS Stream      (vessel position, speed, heading)
├── Simulated Port Data       (congestion levels, berth availability)
└── Historical Delay Dataset  (synthetic training data)

        ↓

FEATURE ENGINEERING LAYER
├── Normalize and clean raw API responses
├── Calculate Weather Severity Score (0–100)
├── Calculate Traffic Congestion Score (0–100)
├── Calculate Port Congestion Score (0–100)
├── Calculate Route Historical Risk Score (0–100)
├── Calculate Cargo Sensitivity Score (0–100)
└── Assemble final 9-feature vector for ML input

        ↓

ML MODEL LAYER
├── XGBoost Regressor         → Risk Score (0–100)
├── Random Forest Regressor   → Estimated Delay (hours)
├── Gradient Boosting Classifier → Reroute Yes/No + Confidence %
├── K-Means Clustering        → Route Pattern (background, weekly)
└── LSTM Neural Network       → Risk Trajectory for Next 6 Hours

        ↓

DECISION ENGINE LAYER
├── Classify risk level (Green / Yellow / Orange / Red)
├── If High or Critical: fetch 2–3 alternate routes
├── Score each alternate route through full ML pipeline
├── Calculate financial impact (damage probability × cargo value)
├── Rank routes by weighted Optimization Score
└── Generate human-readable natural language alert message

        ↓

ALERT AND NOTIFICATION LAYER
├── Push real-time dashboard alert to Logistics Manager (Socket.io)
├── SMS or email alert to Shipper if critical
├── Route change notification to Driver or Vessel Captain
└── Delay notification to Receiver if applicable

        ↓

FRONTEND DASHBOARDS
├── Logistics Manager Portal  (live map, risk panel, reroute controls)
├── Shipper Portal            (create shipment, track own goods)
├── Driver / Captain Panel    (current route, status updates)
└── Receiver Portal           (incoming tracking, delivery confirmation)

        ↓

FEEDBACK AND RETRAINING LAYER
├── Store all ML predictions with actual outcomes post-delivery
├── Calculate prediction error per shipment
├── Weekly automated retraining on expanded dataset
└── K-Means re-clustering to update route pattern knowledge
```

---

## 4. User Roles and Permissions

The system supports four distinct user roles, each with a tailored dashboard and a strictly scoped set of permissions.

### Role 1 — Shipper / Sender

The shipper is the company or individual sending the goods (e.g., a factory dispatching electronics from Korea to Germany).

**Can do:**
- Create new shipments with cargo details, priority level, and special instructions.
- View their own shipments only — current location, status, expected delivery, and risk indicator.
- Receive delay and route-change notifications.

**Cannot do:** Access other shippers' data, view raw ML scores, approve reroutes, or access financial impact analytics.

**Dashboard Screens:**
- My Shipments list with status and risk dot indicator.
- Create New Shipment form (origin, destination, cargo type, weight, priority, special handling).
- Shipment Detail view with live map, status timeline (Created → Picked Up → In Transit → At Port → Customs → Delivered), and alert history.
- Notifications panel for delays and route changes.

---

### Role 2 — Logistics Manager (Primary User)

The logistics manager is the most important user in the system. They oversee all shipments, make all critical rerouting decisions, and have full visibility into ML insights and financial impact data.

**Can do:**
- View all active shipments from all shippers on a live world map.
- See real-time risk scores, ML feature breakdowns, and risk trajectory forecasts.
- Receive and act on alerts — approve reroutes, reject suggestions, escalate situations, manually override risk levels.
- Access the financial impact panel showing damage probability and net savings for each decision.
- Generate reports and analytics — on-time rates, model accuracy, disruptions prevented.
- Configure alert thresholds and monitoring intervals.

**Cannot do:** Create shipments, confirm deliveries, or modify cargo details after creation.

**Dashboard Screens:**
- **Main Control Center (hero screen):** Live world map with all vessels as colored moving dots (Green/Yellow/Orange/Red by risk level). Right-side alert panel sorted by severity. Top bar showing total shipments, critical count, high-risk count, on-time percentage, and delay count.
- **Shipment Detail with ML Insights:** Risk gauge (0–100), feature importance bar chart (e.g., Port 42% / Weather 31% / Traffic 16%), 6-hour risk trajectory graph from LSTM, alternate routes comparison table, financial impact card.
- **Port Status Board:** Global map of port congestion levels.
- **Analytics Dashboard:** Historical accuracy metrics, disruptions prevented, revenue saved.

---

### Role 3 — Driver / Carrier / Captain

The person physically moving the goods — a truck driver for land legs or a vessel captain for sea legs.

**Can do:**
- View their assigned shipment and current route on map.
- Update shipment status (Picked Up, In Transit, At Port, Delivered).
- Report incidents with notes and photos.
- Receive route change notifications when manager approves a reroute.

**Cannot do:** View other drivers' assignments, access risk scores or ML details, approve reroutes.

**Dashboard Screens:**
- Assigned shipment detail with route map.
- Status update buttons with GPS capture.
- Incident reporting form with photo upload.
- Notifications for route changes with new waypoints.

---

### Role 4 — Receiver / Consignee

The person or company receiving the goods (e.g., a warehouse manager confirming receipt).

**Can do:**
- Track incoming shipments with expected arrival time.
- Receive delay and route update notifications.
- Confirm delivery with cargo condition assessment and digital signature.
- Raise a dispute if cargo is damaged.

**Cannot do:** Access other shipments, view ML risk data, or control any routing decisions.

**Dashboard Screens:**
- Incoming shipments list with ETA.
- Shipment tracking map view.
- Delivery Confirmation screen with condition selector, photo upload, and digital signature.

---

### Role vs. Feature Access Matrix

| Feature | Shipper | Manager | Driver | Receiver |
|---|:---:|:---:|:---:|:---:|
| Create Shipment | ✓ | — | — | — |
| View Own Shipments | ✓ | ✓ | ✓ | ✓ |
| View All Shipments | — | ✓ | — | — |
| Live Map (Full) | — | ✓ | Own Only | — |
| Risk Score and ML Details | — | ✓ | — | — |
| Feature Importance Breakdown | — | ✓ | — | — |
| Approve / Reject Reroute | — | ✓ | — | — |
| Financial Impact Panel | — | ✓ | — | — |
| Update Shipment Status | — | — | ✓ | — |
| Report Incident | — | — | ✓ | — |
| Confirm Delivery | — | — | — | ✓ |
| Alert Management | — | ✓ | — | — |
| Analytics and Reports | — | ✓ | — | — |
| Receive Notifications | ✓ | ✓ | ✓ | ✓ |

---

## 5. Data Sources and Strategy

### Real APIs (Actually Fetch This Data)

| Data Type | Source | Notes |
|---|---|---|
| Weather (land) | OpenWeatherMap API | Free tier, easy integration, API key on signup |
| Weather (sea) | OpenWeatherMap Marine API or Stormglass.io | Stormglass has 10 free calls/day — fine for demo |
| Road Traffic | TomTom API | Free tier with call limits, good for hackathon |
| Ocean Currents | CMEMS (Copernicus Marine) or NASA OSCAR | Both free government sources |
| Route Calculation | OpenRouteService | Completely free, good route data |
| Base Map | OpenStreetMap via Leaflet.js | Completely free, no API key needed |

### Simulated Data (Create This Yourself)

Real port congestion data and AIS vessel tracking are behind expensive enterprise paywalls (MarineTraffic, VesselFinder). For the hackathon prototype, the following data is simulated — this is industry-standard practice and judges fully expect it.

| Simulated Data | How to Handle |
|---|---|
| Port congestion levels | JSON file with realistic port status values (Normal / Busy / Congested / Closed), vessel queue counts, and average wait times for 10 major ports |
| AIS vessel positions | Simulated coordinate stream along route waypoints, updated every 30 minutes in production (every 10 seconds in demo script) |
| Historical delay patterns | Synthetic CSV with 3,000 rows covering past routes, weather conditions at the time, and actual delay outcomes |

When presenting to judges, state clearly: *"Port congestion and AIS data are simulated for this prototype. In production, we integrate with MarineTraffic and live port authority feeds."*

---

## 6. Feature Engineering

Raw API data cannot be fed directly into the ML models. The Feature Engineering layer transforms raw API responses into nine standardized numerical scores, each on a 0–100 scale.

### 6.1 Weather Severity Score

```
Start at 0.
Add based on weather condition:
  Clear        →  0
  Cloudy       → 10
  Rain         → 30
  Heavy Rain   → 50
  Storm        → 80
  Snow         → 60
  Fog          → 40

Additional adjustments:
  Wind speed > 50 km/h      → +20
  Visibility < 100 meters   → +30
  Precipitation > 10 mm/hr  → +20

Cap final score at 100.
```

For sea routes, also incorporate wave height: below 2m adds 0, 2–4m adds 30, above 4m adds 60.

### 6.2 Traffic Congestion Score

```
Congestion Ratio = Current Road Speed / Free-Flow Speed

Ratio 0.9–1.0  → Score 10   (clear)
Ratio 0.7–0.9  → Score 30   (slightly slow)
Ratio 0.5–0.7  → Score 55   (moderate)
Ratio 0.3–0.5  → Score 75   (heavy)
Ratio < 0.3    → Score 90   (near standstill)
Road closure detected → Score 100
Active incidents on route → +10
```

### 6.3 Port Congestion Score

```
Base score from operational status:
  Normal    → 10
  Busy      → 40
  Congested → 70
  Closed    → 100

Vessel queue adjustment:
  0–5 vessels    → +0
  6–15 vessels   → +15
  16–30 vessels  → +25
  >30 vessels    → +35

Average wait time adjustment:
  < 6 hours   → +0
  6–12 hours  → +10
  12–24 hours → +20
  > 24 hours  → +30

Cap at 100.
```

### 6.4 Route Historical Risk Score

```
Historical Delay Rate = Delayed shipments on this route / Total shipments on route
Average Delay Duration = Sum of all delays (hours) / Number of delayed shipments

Historical Risk Score = (Delay Rate × 60) + (Normalized Average Delay × 40)
Cap at 100.
```

### 6.5 Cargo Sensitivity Score

```
Base score from cargo type:
  Standard Dry   → 10
  Fragile        → 40
  Electronics    → 65
  Perishable     → 70
  Hazardous      → 60
  Reefer (cold)  → 75
  Livestock      → 90

Priority multiplier applied to base:
  Low     → × 0.8
  Medium  → × 1.0
  High    → × 1.2
  Urgent  → × 1.5

Cap at 100.
```

### 6.6 Complete 9-Feature Input Vector

| Feature | Range | Source |
|---|---|---|
| Weather Severity Score | 0–100 | Calculated from weather API |
| Traffic / Sea Condition Score | 0–100 | Calculated from traffic / marine API |
| Port Congestion Score | 0–100 | Calculated from port data |
| Route Historical Risk Score | 0–100 | Calculated from historical dataset |
| Cargo Sensitivity Score | 0–100 | Calculated from shipment details |
| Distance Remaining (km) | Actual km | OpenRouteService |
| Time of Day | 0–23 | System clock |
| Day of Week | 0–6 | System clock |
| Season | 1–4 | Derived from date |

---

## 7. Machine Learning Pipeline

### Overview

Five models run in sequence for every shipment assessment cycle. Each model has a distinct, non-overlapping job.

```
Feature Vector (9 inputs)
        ↓
Model 1: XGBoost Regressor         → Risk Score (0–100)
        ↓
Model 2: Random Forest Regressor   → Estimated Delay (hours)
        ↓
Model 3: Gradient Boosting         → Reroute? (Yes/No + Confidence %)
        ↓
Model 4: K-Means Clustering        → Route Pattern (background, weekly)
        ↓
Model 5: LSTM Neural Network       → Risk Trajectory for Next 6 Hours
```

---

### Model 1 — XGBoost Regressor (Primary Risk Scoring Model)

**Job:** Predict the overall risk score for any route, given the current 9-feature vector.

**Why XGBoost:** Handles mixed tabular data extremely well. Produces feature importance scores you can visualize. Fast enough for near-real-time prediction. Industry standard for structured data problems.

**Training:**
- Input: 9-feature vectors from 3,000-row synthetic dataset.
- Target: Risk Score (0–100), generated with weighted combination of input scores plus realistic noise.
- Split: 80% train / 20% test.
- Evaluation metric: RMSE and R² score.
- Save: `joblib.dump(model, 'xgboost_risk.pkl')`.

**Usage:** Runs every 30 minutes per active shipment. Also runs on every alternate route when rerouting is triggered.

---

### Model 2 — Random Forest Regressor (Delay Duration Prediction)

**Job:** Predict the estimated delay in hours if the shipment stays on its current route.

**Why Random Forest:** Stable regressor, less prone to overfitting on synthetic data. Ensemble approach makes it reliable with limited training data.

**Training:**
- Input: Same 9 features plus the risk score output from Model 1 (10 inputs total).
- Target: Estimated delay hours (0 = no delay expected).
- Save: `joblib.dump(model, 'rf_delay.pkl')`.

**Usage:** Runs immediately after Model 1. Provides the time estimate that appears in the manager's alert alongside the risk score.

---

### Model 3 — Gradient Boosting Classifier (Reroute Decision)

**Job:** Classify whether rerouting is necessary and output a confidence percentage.

**Why a separate model for this:** Giving the manager a clear "Reroute — 87% confident" message is more actionable than a raw score alone. The classifier also accounts for variables like time remaining to destination and cargo urgency when making this binary call.

**Training:**
- Input: Risk Score (Model 1), Delay Hours (Model 2), Cargo Sensitivity Score, Time Remaining to Destination, Number of Available Alternate Routes.
- Target: Binary label — 1 = reroute needed, 0 = stay on route.
- Save: `joblib.dump(model, 'gb_reroute.pkl')`.

**Usage:** Final decision gate before an alert is escalated to the manager with route options.

---

### Model 4 — K-Means Clustering (Route Pattern Learning)

**Job:** Group all historical routes into behavioural clusters based on their risk patterns.

**Example clusters produced:**
- Cluster 1: Always reliable routes (low scores across all features).
- Cluster 2: Weather-sensitive routes (high weather score variance).
- Cluster 3: Port-congestion-prone routes (high port scores seasonally).
- Cluster 4: High-traffic land routes (consistently high traffic scores on weekdays).
- Cluster 5: Historically problematic routes (high historical risk scores).

**Usage:** Runs as a background job weekly on accumulated data. Insights feed back into Model 1 by enriching the historical risk score feature. Not part of real-time prediction.

---

### Model 5 — LSTM Neural Network (Risk Trajectory Forecasting)

**Job:** Given the last 24 hours of risk score readings for a shipment, predict the risk score for the next 6 hours and output whether risk is trending upward, stable, or downward.

**Why LSTM:** Long Short-Term Memory networks are specifically designed for time-series sequences. They can detect when a risk score is gradually rising — even before it crosses a threshold — giving the manager advance warning.

**Architecture:**
```
Input Layer    → sequence of 12 risk scores (last 6 hours, sampled every 30 min)
LSTM Layer     → 64 units
Dense Layer    → 6 outputs (predicted risk scores for next 6 hours)
```

**Training:** Train on simulated time-series sequences generated from the synthetic dataset. 50 epochs. Save: `model.save('lstm_trajectory.h5')`.

**Usage:** Output displayed as a line graph on the manager's shipment detail panel. Most impressive model to explain to judges.

---

### Risk Classification Thresholds and Actions

| Score | Level | Color | Action Triggered |
|---|---|---|---|
| 0–25 | Low | 🟢 Green | Monitor every 30 minutes, no action |
| 26–50 | Medium | 🟡 Yellow | Warning notification to manager |
| 51–75 | High | 🟠 Orange | Generate alternate routes, alert manager to review |
| 76–100 | Critical | 🔴 Red | Urgent push notification, immediate reroute recommended |

---

### Synthetic Training Data Generation

Real supply chain data is private and expensive. The training dataset is generated synthetically using the following rules:

- **3,000 rows** covering all combinations of feature scores.
- Risk score = weighted combination of input scores + Gaussian noise (so the model learns patterns, not a formula).
- High weather + high port score = high risk output.
- Low scores across all features = low risk output.
- Delay hours correlate with risk score with realistic variance.
- Include edge cases: low weather score but high port score leading to elevated risk, etc.

Judges will not penalize synthetic data. They care whether the model logic is sound and whether it performs correctly in the demo.

---

## 8. Alternate Route Scoring and Decision Engine

When a shipment reaches High (Orange) or Critical (Red) risk, the system does not simply alert the manager — it also scores every viable alternate route through the same ML pipeline and presents a ranked recommendation.

### Step-by-Step Process

```
Step 1: Fetch 3 alternate routes from OpenRouteService API

Step 2: For each alternate route, fetch fresh data:
        - Weather at all waypoints on that route
        - Traffic conditions on road segments
        - Port conditions if the alternate uses a different port

Step 3: Run Feature Engineering on the alternate route data
        to produce a full 9-feature vector for that route

Step 4: Run all 5 ML models on the alternate route's feature vector
        Get its risk score, delay estimate, and reroute confidence

Step 5: Calculate the weighted Optimization Score for each route:
        Optimization Score = (Risk Score × 0.40)
                           + (Delay Score × 0.30)
                           + (Cost Score × 0.20)
                           + (Distance Score × 0.10)
        Lower = Better

Step 6: Rank all routes by Optimization Score (lowest first)

Step 7: Calculate Financial Impact for top 2 options:
        Expected Loss = Cargo Value × Damage Probability at that risk level
        Net Saving = (Current Route Expected Loss) – (Alternate Route Cost + Expected Loss)

Step 8: Present to manager with full comparison table and recommended option highlighted
```

### Example: Shanghai to Rotterdam (Suez Route)

| | Current Route (Suez) | Alt 1 — South Africa | Alt 2 — Hamburg Port |
|---|---|---|---|
| Risk Score | 74 (High) | 28 (Low) | 30 (Low) |
| Estimated Delay | 18 hours | 2 hours | 1 hour |
| Extra Distance | — | +3,500 km | +400 km |
| Extra Transit Time | — | +6 days | +8 hours |
| Extra Cost | — | High fuel | Minimal |
| Optimization Score | High (bad) | Medium | **Lowest (best)** |
| **Recommendation** | | | **✓ Approved** |

The system recommends Alt 2 — Hamburg because it achieves the lowest combined risk + delay + cost + distance score, even though Alt 1 has a slightly lower risk score (the 6-day extra transit time and high fuel cost raise its optimization score).

---

## 9. Database Design

The system uses **polyglot persistence** — two databases serving different data characteristics. This is an industry-standard approach for systems that mix structured business records with high-frequency real-time data streams.

### PostgreSQL — Structured Business Data

PostgreSQL handles all relational, transactional, and structured data. ACID compliance is essential here for financial records and shipment status.

**Core Tables:**

**users** — Stores all user accounts across all roles. Fields: `user_id (UUID PK)`, `name`, `email`, `password_hash`, `role (ENUM: shipper/manager/driver/receiver)`, `company_name`, `created_at`.

**shipments** — Central table. Fields: `shipment_id (UUID PK)`, `tracking_number`, `shipper_id (FK)`, `assigned_manager_id (FK)`, `assigned_vessel_id (FK)`, `origin`, `destination`, `status`, `priority`, `current_risk_level`, `current_risk_score`, `is_rerouted`, `reroute_count`, `departure_at`, `expected_arrival`, `actual_arrival`, `final_status`.

**cargo** — Linked to shipments. Fields: `cargo_id`, `shipment_id (FK)`, `cargo_type`, `description`, `weight_kg`, `volume_cbm`, `declared_value`, `insurance_value`, `cargo_sensitivity_score`, `special_handling_notes`.

**vessels** — Fields: `vessel_id`, `name`, `type`, `capacity_teu`, `current_speed`, `fuel_level`, `assigned_captain_id (FK)`.

**ports** — Seed data for major global ports. Fields: `port_id`, `port_code` (e.g., NLRTM), `name`, `country`, `latitude`, `longitude`, `max_vessel_draft`, `total_berths`.

**routes** — Fields: `route_id`, `shipment_id (FK)`, `route_type (ENUM: original/alternate_1/alternate_2)`, `is_active`, `total_distance_km`, `estimated_hours`, `extra_cost`, `optimization_score`, `waypoints_summary`.

**manager_decisions** — Full audit trail of every rerouting decision. Fields: `decision_id`, `shipment_id (FK)`, `manager_id (FK)`, `decision_type (ENUM: approve_reroute/reject/manual_override/escalate)`, `original_route_id (FK)`, `new_route_id (FK)`, `risk_score_at_decision`, `predicted_delay_hr`, `decision_reason`, `decision_at`, `actual_delay_saved_hr` (filled post-delivery).

**alerts** — Fields: `alert_id`, `shipment_id (FK)`, `alert_type`, `severity (ENUM: info/warning/high/critical)`, `message`, `risk_score_at_alert`, `triggered_by (ENUM: system/manual)`, `is_read`, `is_resolved`, `sent_to_roles`, `created_at`, `resolved_at`.

**status_updates** — Every GPS-stamped status change by drivers. Fields: `update_id`, `shipment_id (FK)`, `updated_by (FK)`, `previous_status`, `new_status`, `latitude`, `longitude`, `incident_type`, `photo_url`, `created_at`.

**model_predictions** — Structured summary of each ML run. Fields: `prediction_id`, `shipment_id (FK)`, `prediction_timestamp`, all 9 input feature scores, `risk_score`, `risk_level`, `predicted_delay_hr`, `reroute_recommended`, `confidence_percent`, `actual_delay_hr` (filled post-delivery), `prediction_error`.

**delivery_confirmations** — Fields: `confirmation_id`, `shipment_id (FK)`, `confirmed_by (FK)`, `confirmed_at`, `cargo_condition`, `damage_description`, `photo_url`, `digital_signature`, `dispute_raised`.

---

### MongoDB — Real-Time and Time-Series Data

MongoDB handles high-frequency sensor streams, variable-schema API responses, and time-series logs where write speed and schema flexibility matter more than relational integrity.

**vessel_positions** — AIS readings every 30 minutes per vessel. Each document contains: `vessel_id`, `shipment_id`, `timestamp`, `coordinates (lat/lng)`, `speed_knots`, `heading_degrees`, `navigation_status`, `ais_source`. TTL index: delete after 90 days.

**weather_snapshots** — Weather API readings at shipment coordinates. Each document contains the full raw API response plus the calculated `weather_score`. Indexed on `shipment_id` and `timestamp`.

**port_conditions** — Simulated or real port status snapshots. Each document contains: `port_code`, `timestamp`, `operational_status`, `vessels_in_queue`, `average_wait_hours`, `berths_available`, `customs_status`, `calculated_port_score`.

**ml_prediction_logs** — Full detailed log of every ML pipeline run per shipment. Stores all input features, all model outputs (XGBoost risk score, Random Forest delay hours, Gradient Boost reroute decision + confidence, LSTM trajectory array), feature importance weights, all alternate routes scored with their optimization scores, and the final recommendation made.

**alert_history** — Rich logs of every alert event, including the full notification delivery record (which roles were notified, through which channels, read timestamps).

**training_data** — Post-delivery records combining predictions with actuals. These feed weekly retraining. Each record stores feature inputs, model predictions, actual outcomes, and calculated prediction error.

---

### Redis — Caching Layer

Redis stores frequently accessed live data for near-instant dashboard reads:
- `risk_score:{shipment_id}` — Current risk score (updated every 30 min).
- `active_alerts:{shipment_id}` — Current unresolved alert summary.
- `vessel_position:{vessel_id}` — Latest vessel coordinates for map rendering.
- Session data for authenticated users.

---

## 10. Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React.js | UI framework — role-based dashboards |
| Leaflet.js + React-Leaflet | Free interactive map with no API key required for base tiles |
| Tailwind CSS + Shadcn UI | Pre-built components for fast professional-looking dashboards |
| Recharts | Risk score gauges, feature importance charts, trajectory graphs |
| Socket.io Client | Real-time risk updates and alert pushes without page reload |
| Axios | HTTP requests to backend API |
| React Hot Toast | In-app notifications for alert events |
| Lucide React | Icon library |

### Backend

| Technology | Purpose |
|---|---|
| Python FastAPI | High-performance REST API framework. Auto-generates Swagger docs. Easy ML integration in Python. |
| Python Socket.io | Real-time event emission to frontend |
| APScheduler | Automated background jobs: 30-minute monitoring cycle, weekly ML retraining |
| SQLAlchemy | ORM for PostgreSQL |
| PyMongo | MongoDB driver |
| Redis-py | Redis client |
| Python-JOSE + Passlib | JWT authentication and password hashing |

### Machine Learning

| Technology | Purpose |
|---|---|
| XGBoost | Primary risk scoring model |
| Scikit-learn | Random Forest, Gradient Boosting, K-Means, preprocessing utilities |
| TensorFlow / Keras | LSTM neural network for trajectory forecasting |
| Pandas + NumPy | Data manipulation, synthetic data generation, feature engineering |
| Joblib | Save and load trained model files |
| Jupyter Notebook | Model training, evaluation charts, feature importance visualization for demo |

### Databases

| Technology | Purpose |
|---|---|
| PostgreSQL | Core structured business data |
| MongoDB | Real-time sensor streams and time-series logs |
| Redis | Caching layer for live dashboard performance |

### External APIs

| API | Data Provided | Cost |
|---|---|---|
| OpenWeatherMap | Land weather and marine weather | Free tier |
| Stormglass.io | Marine-specific conditions (wave, swell) | Free (10 calls/day) |
| TomTom Traffic | Road speed and congestion | Free tier |
| OpenRouteService | Route calculation and alternate routes | Free |
| NOAA / CMEMS | Ocean current data | Free (government) |

---

## 11. Project Structure

```
routeguard/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/              (LiveMap, VesselMarker, RouteLayer)
│   │   │   ├── RiskPanel/        (RiskGauge, FeatureChart, TrajectoryGraph)
│   │   │   ├── AlertPanel/       (AlertList, AlertCard)
│   │   │   └── RouteComparison/  (RouteTable, FinancialImpactCard)
│   │   │
│   │   ├── pages/
│   │   │   ├── shipper/          (ShipperHome, CreateShipment, ShipmentDetail)
│   │   │   ├── manager/          (ManagerHome, ShipmentDetail, PortStatusBoard, Analytics)
│   │   │   ├── driver/           (DriverHome, StatusUpdate, IncidentReport)
│   │   │   ├── receiver/         (ReceiverHome, TrackShipment, ConfirmDelivery)
│   │   │   └── auth/             (Login, Register)
│   │   │
│   │   ├── context/              (AuthContext, SocketContext)
│   │   ├── hooks/                (useSocket, useAuth)
│   │   ├── services/             (api.js — all Axios calls)
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py               (entry point, app config, CORS, socket setup)
│   │   ├── config.py             (environment variables)
│   │   │
│   │   ├── routers/              (auth, shipments, vessels, cargo, routes,
│   │   │                          alerts, manager, driver, analytics)
│   │   ├── models/               (SQLAlchemy table models)
│   │   ├── schemas/              (Pydantic request/response schemas)
│   │   │
│   │   ├── services/
│   │   │   ├── weather_service.py    (fetch weather from OpenWeatherMap)
│   │   │   ├── traffic_service.py    (fetch traffic from TomTom)
│   │   │   ├── port_service.py       (read/simulate port conditions)
│   │   │   ├── feature_engine.py     (calculate all 9 feature scores)
│   │   │   ├── route_service.py      (fetch and score alternate routes)
│   │   │   └── alert_service.py      (generate and dispatch alerts)
│   │   │
│   │   ├── ml/
│   │   │   ├── models/               (xgboost_risk.pkl, rf_delay.pkl,
│   │   │   │                          gb_reroute.pkl, lstm_trajectory.h5)
│   │   │   ├── predict.py            (load_models, predict_risk, predict_delay,
│   │   │   │                          predict_reroute, predict_trajectory,
│   │   │   │                          score_alternate_route)
│   │   │   ├── feature_builder.py
│   │   │   └── retrain.py            (weekly retraining pipeline)
│   │   │
│   │   ├── scheduler/
│   │   │   ├── monitoring_job.py     (runs every 30 min per active shipment)
│   │   │   └── retraining_job.py     (runs every Sunday)
│   │   │
│   │   └── database/
│   │       ├── postgres.py
│   │       ├── mongodb.py
│   │       └── redis_client.py
│   │
│   ├── ml_training/              (Jupyter notebooks)
│   │   ├── generate_synthetic_data.ipynb
│   │   ├── train_xgboost.ipynb
│   │   ├── train_random_forest.ipynb
│   │   ├── train_gradient_boosting.ipynb
│   │   ├── train_lstm.ipynb
│   │   └── model_evaluation.ipynb
│   │
│   ├── data/
│   │   ├── synthetic_training_data.csv
│   │   ├── ports_data.json           (10 major ports seed data)
│   │   └── simulated_ais.json
│   │
│   ├── requirements.txt
│   └── .env
│
└── docker-compose.yml
```

---

## 12. Implementation Plan

The implementation is scoped for a hackathon timeframe (~18 hours of build time). Work is split into six sequential steps.

### Step 1 — Database Setup (Hours 1–2)

**PostgreSQL:**
- Create database `routeguard`.
- Run SQL scripts to create all 11 tables in dependency order (users first, then ports, vessels, shipments, etc.).
- Insert seed data: 4 test users (one per role), 10 major global ports (Busan, Rotterdam, Hamburg, Singapore, Shanghai, Los Angeles, Dubai, Antwerp, New York, Dubai), 3 sample vessels, 2–3 shipments already in progress for demo.

**MongoDB:**
- Create database `routeguard_realtime`.
- Create the 6 collections (auto-created on first insert, so just plan the names).
- Insert simulated vessel position history and port condition snapshots for demo shipments.

**Redis:**
- Install and run Redis locally. No schema needed.
- Pre-populate risk scores for demo shipments.

---

### Step 2 — ML Model Training (Hours 2–4)

All training is done in Jupyter Notebooks and saved as model files.

**Notebook 1 — Generate Synthetic Data:**
Create `synthetic_training_data.csv` with 3,000 rows. Columns: `weather_score`, `traffic_score`, `port_score`, `historical_score`, `cargo_sensitivity`, `distance_km`, `time_of_day`, `day_of_week`, `season`, `risk_score`, `delay_hours`, `reroute_needed`. Apply the correlation rules described in Section 6 with NumPy random noise.

**Notebook 2 — Train XGBoost:**
Load CSV → 80/20 train-test split → train XGBoost Regressor on `risk_score` target → evaluate RMSE and R² → plot feature importance → `joblib.dump(model, 'xgboost_risk.pkl')`.

**Notebook 3 — Train Random Forest:**
Same data, target = `delay_hours` → train Random Forest Regressor → evaluate → `joblib.dump(model, 'rf_delay.pkl')`.

**Notebook 4 — Train Gradient Boosting:**
Target = `reroute_needed` (binary) → train Gradient Boosting Classifier → confusion matrix → `joblib.dump(model, 'gb_reroute.pkl')`.

**Notebook 5 — Train LSTM:**
Generate time-series sequences (12 readings per sequence, target = next risk value) → build Keras LSTM (Input → LSTM 64 units → Dense) → train 50 epochs → `model.save('lstm_trajectory.h5')`.

---

### Step 3 — Backend API (Hours 4–8)

**FastAPI Setup (`main.py`):**
Connect to PostgreSQL, MongoDB, and Redis. Register all routers. Configure Socket.io. Set CORS for React frontend.

**Core API Endpoints to Build:**

```
Authentication:
POST  /auth/login
POST  /auth/register
GET   /auth/me

Shipments:
POST  /shipments/create           (shipper creates)
GET   /shipments/my               (role-filtered list)
GET   /shipments/{id}             (detail)
PUT   /shipments/{id}/status      (driver updates)

Monitoring:
GET   /shipments/{id}/risk        (current risk score from Redis)
GET   /shipments/{id}/prediction  (full ML prediction detail)
GET   /shipments/{id}/routes      (alternate routes with scores)
POST  /shipments/{id}/reroute     (manager approves new route)

Alerts:
GET   /alerts/active
PUT   /alerts/{id}/resolve

Analytics (manager only):
GET   /analytics/overview
GET   /analytics/accuracy

Delivery:
POST  /shipments/{id}/deliver     (receiver confirms)
```

**Feature Engineering Service (`feature_engine.py`):**
Takes raw weather, traffic, port, and cargo data → applies the scoring formulas from Section 6 → returns a clean 9-element Python dict ready for model input.

**ML Prediction Service (`predict.py`):**
`load_models()` — load all saved model files at startup. Expose `predict_risk()`, `predict_delay()`, `predict_reroute()`, `predict_trajectory()`, and `score_alternate_route()` as callable functions used by both the API endpoints and the background monitoring job.

**Background Monitoring Job (`monitoring_job.py`):**
Runs every 30 minutes via APScheduler. For every active shipment: fetch current coordinates → call weather and traffic APIs → assemble feature vector → run all models → update Redis with new risk score → write full log to MongoDB → if risk changed significantly, create alert in PostgreSQL and emit Socket.io event to dashboard → if reroute recommended, fetch and score alternate routes and push to manager.

---

### Step 4 — Frontend (Hours 8–14)

Build screens in priority order:

1. **Login page** (30 min) — role selector + credentials form.
2. **Manager Dashboard with Live Map** (3 hours) — This is the most critical screen. Leaflet map centered on world, vessel markers colored by risk, right-side alert panel, top stats bar. Socket.io listener that updates marker colors in real time when a new risk event fires.
3. **Shipment Detail with ML Insights** (2 hours) — Risk score gauge, feature importance bar chart (Recharts), LSTM trajectory line graph, alternate routes table with Approve buttons, financial impact card.
4. **Shipper Create Shipment form** (1 hour) — Cargo type, weight, priority, origin/destination, submit.
5. **Driver Status Update screen** (1 hour) — Assigned shipment, status buttons, incident report.
6. **Receiver Tracking and Confirm** (1 hour) — Incoming shipment map, confirm delivery form.
7. **Polish and backend integration** (1 hour) — Wire all screens to API, loading states, error handling.

**Real-Time Update Pattern (Socket.io):**
```
Backend emits on risk change:
{ event: "risk_update", shipment_id: "...", risk_score: 91,
  risk_level: "critical", message: "Storm detected ahead" }

Frontend listener:
- Update vessel marker color on map
- Add new entry to alert panel
- Show toast notification
- Play audio alert if critical
(No page reload required)
```

---

### Step 5 — Demo Simulation Script (Hours 14–16)

This is critical for a controlled, impressive hackathon demo. Build a Python script that simulates a complete risk event in accelerated time.

**Simulation Flow:**
```
1. Script starts — vessel is moving normally (green marker)
2. Every 10 seconds = 30 minutes of real time
3. At T+30s: inject high weather score + high port score into data
4. System detects risk spike → runs models → risk score hits 91 (Critical)
5. Alert fires on manager dashboard via Socket.io
6. Alternate routes appear in panel with financial comparison
7. Manager clicks "Approve Route 2"
8. Route line on map changes color and path
9. Risk score begins dropping: 91 → 85 → 72 → 48 → 35 (as vessel clears storm)
10. Judges have seen the full system working end to end in under 5 minutes
```

---

### Step 6 — Testing and Polish (Hours 16–18)

Verify the complete end-to-end flow: Shipper creates shipment → Manager sees it on map → Simulation triggers risk event → Alert fires → Manager approves reroute → Route changes on map → Risk score drops → Driver gets notification → Receiver confirms delivery. Check all 4 role dashboards load without errors, mobile view works for driver screen, no console errors.

---

### Hackathon Build Priorities

If time runs short, build in this priority order:

| Priority | Component | Why |
|---|---|---|
| 1 | Manager dashboard with live map | This is what judges will see and remember |
| 2 | Working ML risk prediction and real-time alert | Core technical proof of concept |
| 3 | Shipper shipment creation form | Needed to start the demo flow |
| 4 | Simulation script | Without this, you cannot reliably trigger the demo |
| 5 | Driver and receiver dashboards | Can be shown as mockup if needed |

---

### Suggested Team Split

| Team Size | Person 1 | Person 2 | Person 3 | Person 4 |
|---|---|---|---|---|
| 4 people | ML training + backend ML service | Backend APIs + database setup | Manager dashboard + map | Other dashboards + simulation script |
| 3 people | ML + all backend | Manager dashboard + map | Other dashboards + simulation + presentation |
| 2 people | Backend + ML + database | All frontend + simulation |

---

## 13. Demo Flow

### 10-Minute Presentation Flow for Judges

**Minutes 1–2: Problem and Introduction**
Open with the core problem: *"$1.5 trillion lost annually because supply chains are reactive, not predictive."* Introduce RouteGuard. Show the four role login options on screen.

**Minutes 2–4: Shipment Creation**
Log in as the Shipper (Kim Ji-ho). Create a new shipment — 500 laptops from Korea to Berlin, cargo type Electronics, priority High. Show how the cargo sensitivity score is calculated and displayed. Show the manager receiving the new shipment notification.

**Minutes 4–7: ML in Action (the centrepiece)**
Log in as the Logistics Manager (Sarah Chen). Show the live world map with vessels as colored dots. Run the simulation script. Watch in real time as a vessel's marker shifts from green to red as the risk score climbs to 91. Point out:
- The LSTM trajectory graph showing risk was trending up for the last 2 hours.
- The feature importance chart (Port: 42%, Weather: 31%, Traffic: 16%).
- The alert panel showing the natural language message.
- The three alternate routes with their risk scores, delay estimates, and financial impact.
- "Staying on current route: 34% damage probability, expected loss $255,000. Taking Alternate Route 2: extra cost $12,000. Net saving: $183,000."

Click Approve on Route 2. Watch the route line change color and path on the map. Watch the risk score begin its descent.

**Minutes 7–8: Driver Experience**
Log in as the Captain (James Okafor). Show the route change notification received on his panel. He confirms acceptance. Route updated.

**Minutes 8–9: Delivery Confirmation**
Log in as the Receiver (Anna Schmidt). Show incoming shipment tracking. Walk through delivery confirmation with cargo condition assessment.

**Minutes 9–10: Model Accuracy and Vision**
Open Jupyter Notebook. Show the training accuracy charts and feature importance graphs. Point out: *"The system retrains automatically every week on real delivery outcomes. It gets more accurate with every shipment it handles."* Close with the 5-year vision — RouteGuard as the industry standard for predictive supply chain risk.

---

## 14. Market Feasibility and Business Model

### Market Size

| Market | 2024 Value | 2030 Projection | Growth Rate |
|---|---|---|---|
| Global Supply Chain Management | $26.5B | $45.2B | 9.2% CAGR |
| Supply Chain Analytics | $6.6B | $21.8B | 22.1% CAGR |
| Global Freight and Logistics | $7.98T | $13.7T | Steady |

### Target Customer Segments

**Tier 1 — Large Freight and Logistics Companies** (Maersk, DHL, DB Schenker, FedEx Freight): Managing thousands of shipments daily on reactive systems. Enterprise software spend of $2M–$15M per year. Each major disruption costs millions. Willingness to pay: $500K–$2M annually per company.

**Tier 2 — Mid-Size Importers and Exporters** (electronics manufacturers, pharmaceutical companies, automotive suppliers, retail chains): They own the cargo but not the vessels. Delays cause production shutdowns, spoilage, and patient impact for pharma. Cannot afford enterprise-level tools. Target price: $2,000–$15,000 per month SaaS subscription, scaled by shipment volume.

**Tier 3 — Insurance Companies** (Lloyds of London, Allianz Trade, Tokio Marine): Risk scores are extremely valuable for marine cargo premium pricing. Revenue model: license risk data as an API at $0.50–$2.00 per risk query. Millions of queries per year = significant data revenue stream.

### Revenue Projections

| Year | Customers | Monthly Revenue | Annual Revenue |
|---|---|---|---|
| Year 1 | 15 mid-tier + 2 enterprise | $75,000 | ~$900,000 |
| Year 2 | 80 mid-tier + 8 enterprise | ~$500,000 | ~$6M |
| Year 3 | 200+ customers + data API | ~$1.6M | ~$19.2M |

### Competitive Advantage

| Capability | RouteGuard | Oracle TMS | FourKites | project44 |
|---|:---:|:---:|:---:|:---:|
| Real-time tracking | ✓ | ✓ | ✓ | ✓ |
| ML-based risk prediction | ✓ | — | — | — |
| Proactive rerouting engine | ✓ | — | — | — |
| Financial impact calculation | ✓ | ✓ | — | — |
| Self-improving model (retraining) | ✓ | — | — | — |
| Affordable for mid-market | ✓ | — | ✓ | ✓ |
| Fast implementation | ✓ | — | ✓ | — |
| Multi-mode (sea + land) | ✓ | ✓ | ✓ | ✓ |

The core competitive moat is the ML prediction and rerouting engine. Current market leaders (FourKites, project44) offer visibility — they show where shipments are. RouteGuard predicts where the problem will be and recommends how to avoid it. This is a fundamental category difference, not a feature difference.

---

## 15. Future Roadmap

### Post-Hackathon Product Roadmap

**Phase 1 — 0 to 3 Months (Prototype to Pilot)**
Launch 3-month paid pilot with 5 logistics companies. Integrate real AIS data from MarineTraffic. Replace simulated port data with live port authority feeds for top 20 global ports. Begin accumulating real training data from live shipments to replace synthetic dataset.

**Phase 2 — 3 to 6 Months (IoT and Customs)**
Integrate IoT sensor data — temperature monitoring for refrigerated cargo, shock sensors for fragile goods, GPS beacons for land transport. Add a Customs Intelligence module using public regulatory delay data to predict customs clearance time by port and cargo type. Begin model retraining on real operational data — model accuracy begins improving beyond synthetic training limits.

**Phase 3 — 6 to 12 Months (Autonomous Operations)**
Enable autonomous rerouting for pre-approved route changes below a cost threshold — manager sets approval rules, system executes within them automatically. Add multi-carrier and multi-modal coordination so rerouting can include mode changes (sea to air, for example) when justified by financial impact. Add carbon emissions tracking per route — optimized routes also produce environmental reporting for regulatory compliance.

### Advanced ML Enhancements

**Transformer Model for Route Optimization:** Instead of only scoring existing routes, generate entirely new optimal routes using attention mechanisms across the global shipping network graph. True route generation, not just route selection.

**Reinforcement Learning Agent:** An RL agent learns optimal rerouting decisions through millions of simulated scenarios and improves through every real-world decision made. Over time, it outperforms human managers on routine routing decisions and handles them autonomously.

**Computer Vision for Port Congestion:** Satellite imagery analysis to detect port congestion without relying on API data. Independent verification of port conditions at any port globally.

**Natural Language Interface:** Managers type or speak queries — *"Show me all high-risk shipments going through Rotterdam this week"* — and the system interprets and responds. No dashboard navigation required.

**Federated Learning:** Train on customer data without exposing customer data. Multiple companies improve a shared model without sharing sensitive shipment information. Privacy-preserving ML at scale.

### Platform Evolutions

**Blockchain Integration:** Immutable shipment records on Hyperledger Fabric. Every status update, route change, and document exchange recorded on blockchain. Enables automated insurance claims, instant customs verification, and tamper-proof dispute resolution.

**Digital Twin:** A complete virtual replica of the entire supply chain network. Simulate disruptions before they happen, test new routes virtually, model capacity scenarios, and war-game crisis scenarios. Example: *"What if the Suez Canal closes tomorrow? Which of our 500 shipments are affected? What is the optimal response and total financial impact?"* — answered in seconds.

**Carrier Marketplace:** Connect shippers directly to carriers within the platform. When a disruption occurs, automatically find and book an alternative carrier in the same interface. Revenue model shifts from pure SaaS to transaction fees (2–3% of freight value) — substantially higher revenue potential.

### 5-Year Vision

RouteGuard becomes the global standard for predictive supply chain risk management — the Bloomberg Terminal of logistics. Every major logistics company uses the platform. Risk data from RouteGuard becomes the industry benchmark. Insurance companies use RouteGuard scores as standard premium pricing input. Port authorities integrate vessel traffic predictions.

**5-Year Targets:**
- 2,000+ companies on platform
- 500,000+ shipments monitored daily
- $500M+ in customer losses prevented
- Operations in 50+ countries
- $100M+ annual revenue

---

## Summary

| Aspect | Details |
|---|---|
| Problem | $1.5T annual global loss from reactive supply chain management |
| Solution | ML-powered predictive risk scoring with proactive rerouting |
| Primary User | Logistics Manager — full control via real-time dashboard |
| Core Models | XGBoost (risk), Random Forest (delay), Gradient Boosting (reroute), LSTM (trajectory) |
| Data Strategy | Live weather + traffic APIs, simulated AIS and port data |
| Tech Stack | React + Leaflet / Python FastAPI / PostgreSQL + MongoDB + Redis |
| Market Size | $26.5B SCM market growing at 9.2% CAGR |
| Year 1 Revenue Target | $900,000 |
| Year 3 Revenue Target | $19.2M |
| Key Differentiator | Prediction and proactive rerouting — not just tracking |
| Immediate Next Step | 3-month pilot with 5 companies using live data |
| 5-Year Vision | Global standard for supply chain risk intelligence |
