"""
full_seed.py — Complete RouteGuard simulation seed
====================================================
Creates:
  • 1 Manager  (Sarah Chen)
  • 2 Shippers (Global Trade Co, Apex Exports)
  • 2 Receivers (NovaTech Ltd, PrimeParts Inc)
  • 2 Drivers  (Ravi Naik, Carlos Mendez)
  • 6 World Ports (with real lat/lng)
  • 2 Vessels
  • 5 Shipments (in_transit, delayed, at_port) with GPS position + route waypoints
  • Active routes per shipment (for map rendering)
  • Cargo records
  • Risk alerts

Run from backend/ folder:
    python full_seed.py
"""

import sys, os, uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.utils.auth import hash_password

def h(p): return hash_password(p)
def uid(): return uuid.uuid4()
from app.models.user import User, UserRole
from app.models.port import Port, PortType
from app.models.vessel import Vessel, VesselType, VesselStatus
from app.models.shipment import Shipment, ShipmentStatus, RiskLevel, PriorityLevel
from app.models.cargo import Cargo, CargoType
from app.models.route import Route, RouteType
from app.models.alert import Alert, AlertType, AlertSeverity
from sqlalchemy.orm import Session
from app.database.postgres import SessionLocal, engine, Base


NOW = datetime.utcnow()

# ─────────────────────────────────────────────────────────────────────────────
# WIPE & RECREATE TABLES
# ─────────────────────────────────────────────────────────────────────────────
print("Creating tables…")
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

# Wipe in dependency order
for tbl in [Alert, Route, Cargo, Shipment, Vessel, Port, User]:
    db.query(tbl).delete()
db.commit()
print("Tables wiped.")

# ─────────────────────────────────────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────────────────────────────────────
manager = User(user_id=uid(), email="manager@routeguard.com",    full_name="Sarah Chen",    password_hash=h("Manager@123"),   role=UserRole.MANAGER)
shipper1= User(user_id=uid(), email="shipper@routeguard.com",    full_name="Global Trade Co",password_hash=h("Shipper@123"),   role=UserRole.SHIPPER)
shipper2= User(user_id=uid(), email="shipper2@routeguard.com",   full_name="Apex Exports",  password_hash=h("Shipper@123"),   role=UserRole.SHIPPER)
recv1   = User(user_id=uid(), email="receiver@routeguard.com",   full_name="NovaTech Ltd",  password_hash=h("Receiver@123"),  role=UserRole.RECEIVER)
recv2   = User(user_id=uid(), email="receiver2@routeguard.com",  full_name="PrimeParts Inc",password_hash=h("Receiver@123"),  role=UserRole.RECEIVER)
driver1 = User(user_id=uid(), email="driver@routeguard.com",     full_name="Ravi Naik",     password_hash=h("Driver@123"),    role=UserRole.DRIVER)
driver2 = User(user_id=uid(), email="driver2@routeguard.com",    full_name="Carlos Mendez", password_hash=h("Driver@123"),    role=UserRole.DRIVER)

db.add_all([manager, shipper1, shipper2, recv1, recv2, driver1, driver2])
db.commit()
print(f"Users created. Manager: {manager.email}")

# ─────────────────────────────────────────────────────────────────────────────
# PORTS  (real-world coordinates)
# ─────────────────────────────────────────────────────────────────────────────
ports_data = [
    ("Shanghai International Port",   "CNSHA", "China",       31.2304,  121.4737, PortType.SEA),
    ("Port of Rotterdam",              "NLRTM", "Netherlands", 51.9225,   4.4792,  PortType.SEA),
    ("Port of Singapore",              "SGSIN", "Singapore",   1.2644,  103.8222, PortType.SEA),
    ("Port of Mumbai",                 "INBOM", "India",      18.9220,   72.8347, PortType.SEA),
    ("Port of New York",               "USNYC", "USA",        40.6840,  -74.0444, PortType.SEA),
    ("Port of Hamburg",                "DEHAM", "Germany",    53.5461,   9.9760,  PortType.SEA),
    ("Port of Dubai (Jebel Ali)",      "AEDXB", "UAE",        24.9857,   55.0272, PortType.SEA),
    ("Port of Colombo",                "LKCMB", "Sri Lanka",   6.9271,   79.8612, PortType.SEA),
]

port_objs = {}
for name, code, country, lat, lng, ptype in ports_data:
    p = Port(port_id=uid(), port_name=name, port_code=code, country=country,
             latitude=lat, longitude=lng, port_type=ptype, customs_present=True)
    db.add(p)
    port_objs[code] = p

db.commit()
print(f"Ports created: {list(port_objs.keys())}")

# ─────────────────────────────────────────────────────────────────────────────
# VESSELS
# ─────────────────────────────────────────────────────────────────────────────
v1 = Vessel(vessel_id=uid(), vessel_name="MSC Aurora",    imo_number="IMO9876543",
            vessel_type=VesselType.CONTAINER,
            current_status=VesselStatus.ACTIVE, flag_country="Panama", built_year=2018)
v2 = Vessel(vessel_id=uid(), vessel_name="Maersk Horizon", imo_number="IMO8765432",
            vessel_type=VesselType.CONTAINER,
            current_status=VesselStatus.ACTIVE, flag_country="Denmark", built_year=2020)
db.add_all([v1, v2])
db.commit()
print("Vessels created.")

# ─────────────────────────────────────────────────────────────────────────────
# HELPER: build route waypoints as JSONB-ready list
# ─────────────────────────────────────────────────────────────────────────────
def waypoints(*coords):
    return [{"lat": lat, "lng": lng} for lat, lng in coords]

# ─────────────────────────────────────────────────────────────────────────────
# SHIPMENTS  (5 total, all under Sarah Chen / manager)
# ─────────────────────────────────────────────────────────────────────────────

# ── 1. Shanghai → Rotterdam (IN_TRANSIT, HIGH risk) ──────────────────────────
s1_id = uid()
s1 = Shipment(
    shipment_id=s1_id, tracking_number="RG-2025-0001",
    shipper_id=shipper1.user_id, receiver_id=recv1.user_id,
    assigned_manager_id=manager.user_id, assigned_driver_id=driver1.user_id,
    assigned_vessel_id=v1.vessel_id,
    origin_port_id=port_objs["CNSHA"].port_id,
    destination_port_id=port_objs["NLRTM"].port_id,
    departure_time=NOW - timedelta(days=8),
    expected_arrival=NOW + timedelta(days=4),
    current_status=ShipmentStatus.IN_TRANSIT,
    current_latitude=15.5,  current_longitude=68.2,   # Indian Ocean
    current_risk_level=RiskLevel.HIGH, current_risk_score=72.4,
    priority_level=PriorityLevel.HIGH,
    special_instructions="Handle with care — fragile electronics",
    is_rerouted=False, reroute_count=0,
)
db.add(s1)
db.add(Cargo(
    cargo_id=uid(), shipment_id=s1_id,
    cargo_type=CargoType.ELECTRONICS, description="Consumer electronics — smartphones & tablets",
    weight_kg=24000, volume_cbm=180, quantity=4800, unit_type="units",
    declared_value=2800000, currency="USD", cargo_sensitivity_score=8.5,
))
db.add(Route(
    route_id=uid(), shipment_id=s1_id,
    route_type=RouteType.ORIGINAL, is_active=True,
    origin_port_id=port_objs["CNSHA"].port_id,
    destination_port_id=port_objs["NLRTM"].port_id,
    total_distance_km=19800, estimated_duration_hr=288,
    risk_score_at_creation=45.0,
    waypoints=waypoints(
        (31.23, 121.47),  # Shanghai
        (22.30, 114.17),  # Hong Kong
        (10.82, 106.62),  # Ho Chi Minh
        (1.26,  103.82),  # Singapore
        (6.93,   79.86),  # Colombo
        (15.55,  68.20),  # Current (Indian Ocean) ← ship is here
        (12.50,  44.00),  # Gulf of Aden
        (29.97,  32.55),  # Suez Canal
        (36.89,  10.32),  # Tunisia
        (51.92,   4.48),  # Rotterdam
    ),
))

# ── 2. Singapore → New York (DELAYED, CRITICAL risk) ────────────────────────
s2_id = uid()
s2 = Shipment(
    shipment_id=s2_id, tracking_number="RG-2025-0002",
    shipper_id=shipper2.user_id, receiver_id=recv2.user_id,
    assigned_manager_id=manager.user_id, assigned_driver_id=driver2.user_id,
    assigned_vessel_id=v2.vessel_id,
    origin_port_id=port_objs["SGSIN"].port_id,
    destination_port_id=port_objs["USNYC"].port_id,
    departure_time=NOW - timedelta(days=12),
    expected_arrival=NOW - timedelta(days=1),   # OVERDUE
    current_status=ShipmentStatus.DELAYED,
    current_latitude=9.1,   current_longitude=-23.5,  # Mid-Atlantic
    current_risk_level=RiskLevel.CRITICAL, current_risk_score=88.6,
    priority_level=PriorityLevel.URGENT,
    special_instructions="Time-sensitive pharmaceutical cargo",
    is_rerouted=True, reroute_count=1, actual_delay_hours=31.5,
)
db.add(s2)
db.add(Cargo(
    cargo_id=uid(), shipment_id=s2_id,
    cargo_type=CargoType.PHARMACEUTICAL, description="Temperature-sensitive vaccines",
    weight_kg=3200, volume_cbm=28, quantity=160, unit_type="crates",
    declared_value=1200000, currency="USD",
    temperature_required=2.0, cargo_sensitivity_score=9.8,
))
db.add(Route(
    route_id=uid(), shipment_id=s2_id,
    route_type=RouteType.ALTERNATE_1, is_active=True,
    origin_port_id=port_objs["SGSIN"].port_id,
    destination_port_id=port_objs["USNYC"].port_id,
    total_distance_km=21500, estimated_duration_hr=336,
    risk_score_at_creation=60.0,
    waypoints=waypoints(
        (1.26,  103.82),  # Singapore
        (14.10,  52.56),  # Arabian Sea
        (12.5,   44.00),  # Gulf of Aden
        (29.97,  32.55),  # Suez Canal
        (35.89,  14.51),  # Malta
        (9.10,  -23.50),  # Mid-Atlantic ← ship here
        (40.68, -74.04),  # New York
    ),
))

# ── 3. Mumbai → Hamburg (AT_PORT, MEDIUM risk) ───────────────────────────────
s3_id = uid()
s3 = Shipment(
    shipment_id=s3_id, tracking_number="RG-2025-0003",
    shipper_id=shipper1.user_id, receiver_id=recv1.user_id,
    assigned_manager_id=manager.user_id,
    assigned_vessel_id=v1.vessel_id,
    origin_port_id=port_objs["INBOM"].port_id,
    destination_port_id=port_objs["DEHAM"].port_id,
    departure_time=NOW - timedelta(days=6),
    expected_arrival=NOW + timedelta(days=6),
    current_status=ShipmentStatus.AT_PORT,
    current_latitude=24.99,  current_longitude=55.03,  # Dubai port
    current_risk_level=RiskLevel.MEDIUM, current_risk_score=48.2,
    priority_level=PriorityLevel.MEDIUM,
    special_instructions="Customs clearance required in Dubai",
    is_rerouted=False, reroute_count=0,
)
db.add(s3)
db.add(Cargo(
    cargo_id=uid(), shipment_id=s3_id,
    cargo_type=CargoType.STANDARD, description="Textile machinery & spare parts",
    weight_kg=18500, volume_cbm=210, quantity=320, unit_type="packages",
    declared_value=650000, currency="USD", cargo_sensitivity_score=5.0,
))
db.add(Route(
    route_id=uid(), shipment_id=s3_id,
    route_type=RouteType.ORIGINAL, is_active=True,
    origin_port_id=port_objs["INBOM"].port_id,
    destination_port_id=port_objs["DEHAM"].port_id,
    total_distance_km=10200, estimated_duration_hr=168,
    risk_score_at_creation=35.0,
    waypoints=waypoints(
        (18.92,  72.83),  # Mumbai
        (12.97,  80.25),  # Chennai
        (6.93,   79.86),  # Colombo
        (24.99,  55.03),  # Dubai (current — at port)
        (29.97,  32.55),  # Suez Canal
        (36.89,  10.32),  # Tunisia
        (53.55,   9.98),  # Hamburg
    ),
))

# ── 4. Dubai → Rotterdam (IN_TRANSIT, LOW risk) ──────────────────────────────
s4_id = uid()
s4 = Shipment(
    shipment_id=s4_id, tracking_number="RG-2025-0004",
    shipper_id=shipper2.user_id, receiver_id=recv2.user_id,
    assigned_manager_id=manager.user_id, assigned_driver_id=driver1.user_id,
    assigned_vessel_id=v2.vessel_id,
    origin_port_id=port_objs["AEDXB"].port_id,
    destination_port_id=port_objs["NLRTM"].port_id,
    departure_time=NOW - timedelta(days=3),
    expected_arrival=NOW + timedelta(days=9),
    current_status=ShipmentStatus.IN_TRANSIT,
    current_latitude=30.5,   current_longitude=32.3,  # Near Suez
    current_risk_level=RiskLevel.LOW, current_risk_score=22.1,
    priority_level=PriorityLevel.LOW,
    is_rerouted=False, reroute_count=0,
)
db.add(s4)
db.add(Cargo(
    cargo_id=uid(), shipment_id=s4_id,
    cargo_type=CargoType.STANDARD, description="Petrochemical products",
    weight_kg=32000, volume_cbm=380, quantity=80, unit_type="drums",
    declared_value=420000, currency="USD", cargo_sensitivity_score=6.5,
))
db.add(Route(
    route_id=uid(), shipment_id=s4_id,
    route_type=RouteType.ORIGINAL, is_active=True,
    origin_port_id=port_objs["AEDXB"].port_id,
    destination_port_id=port_objs["NLRTM"].port_id,
    total_distance_km=8800, estimated_duration_hr=144,
    risk_score_at_creation=20.0,
    waypoints=waypoints(
        (24.99,  55.03),  # Dubai
        (12.50,  44.00),  # Gulf of Aden
        (30.50,  32.30),  # Suez Canal ← ship here
        (36.89,  10.32),  # Tunisia
        (43.00,   5.50),  # Marseille
        (51.92,   4.48),  # Rotterdam
    ),
))

# ── 5. Shanghai → Singapore (PICKED_UP, LOW risk) ────────────────────────────
s5_id = uid()
s5 = Shipment(
    shipment_id=s5_id, tracking_number="RG-2025-0005",
    shipper_id=shipper1.user_id, receiver_id=recv1.user_id,
    assigned_manager_id=manager.user_id, assigned_driver_id=driver2.user_id,
    origin_port_id=port_objs["CNSHA"].port_id,
    destination_port_id=port_objs["SGSIN"].port_id,
    departure_time=NOW - timedelta(days=1),
    expected_arrival=NOW + timedelta(days=4),
    current_status=ShipmentStatus.PICKED_UP,
    current_latitude=22.3,   current_longitude=114.2,  # Hong Kong area
    current_risk_level=RiskLevel.LOW, current_risk_score=15.3,
    priority_level=PriorityLevel.MEDIUM,
    is_rerouted=False, reroute_count=0,
)
db.add(s5)
db.add(Cargo(
    cargo_id=uid(), shipment_id=s5_id,
    cargo_type=CargoType.REFRIGERATED, description="Fresh produce — tropical fruits",
    weight_kg=8500, volume_cbm=95, quantity=850, unit_type="crates",
    declared_value=180000, currency="USD",
    temperature_required=4.0, cargo_sensitivity_score=7.2,
))
db.add(Route(
    route_id=uid(), shipment_id=s5_id,
    route_type=RouteType.ORIGINAL, is_active=True,
    origin_port_id=port_objs["CNSHA"].port_id,
    destination_port_id=port_objs["SGSIN"].port_id,
    total_distance_km=3400, estimated_duration_hr=72,
    risk_score_at_creation=15.0,
    waypoints=waypoints(
        (31.23, 121.47),  # Shanghai
        (22.30, 114.17),  # Hong Kong ← ship here
        (10.82, 106.62),  # Ho Chi Minh
        (1.26,  103.82),  # Singapore
    ),
))

db.commit()
print("Shipments, cargo, and routes created.")

# ─────────────────────────────────────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────────────────────────────────────
alerts = [
    Alert(alert_id=uid(), shipment_id=s1_id,
          alert_type=AlertType.WEATHER_WARNING, severity=AlertSeverity.HIGH,
          message="Cyclone system forming in Indian Ocean — risk of 2-day delay. Reroute via southern corridor recommended.",
          is_resolved=False, triggered_by="system"),
    Alert(alert_id=uid(), shipment_id=s2_id,
          alert_type=AlertType.DELAY_DETECTED, severity=AlertSeverity.CRITICAL,
          message="Shipment RG-2025-0002 is 31.5 hours overdue. Pharmaceutical cargo requires immediate escalation.",
          is_resolved=False, triggered_by="system"),
    Alert(alert_id=uid(), shipment_id=s2_id,
          alert_type=AlertType.RISK_INCREASE, severity=AlertSeverity.CRITICAL,
          message="ML model recommends emergency reroute via Cape of Good Hope to avoid Mediterranean congestion.",
          is_resolved=False, triggered_by="ml_model"),
    Alert(alert_id=uid(), shipment_id=s3_id,
          alert_type=AlertType.PORT_CONGESTION, severity=AlertSeverity.WARNING,
          message="Customs inspection in Dubai (Jebel Ali) — estimated 18-hour delay.",
          is_resolved=False, triggered_by="system"),
]
db.add_all(alerts)
db.commit()
print(f"Alerts created: {len(alerts)}")

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  ROUTEGUARD SIMULATION SEED — COMPLETE")
print("="*60)
print(f"\n  Manager:  manager@routeguard.com   / Manager@123")
print(f"  Shipper:  shipper@routeguard.com   / Shipper@123")
print(f"  Receiver: receiver@routeguard.com  / Receiver@123")
print(f"  Driver:   driver@routeguard.com    / Driver@123")
print(f"\n  Shipments: 5 active (1 delayed/critical, 1 at-port, 3 in-transit)")
print(f"  Ports:     {len(port_objs)} world ports with GPS coordinates")
print(f"  Routes:    5 with full waypoints (visible on CargoTrack map)")
print(f"  Alerts:    {len(alerts)} active (2 critical, 1 high, 1 medium)")
print(f"\n  Start backend:  uvicorn app.main:app --reload")
print(f"  Start frontend: npm run dev")
print("="*60)

db.close()
