from datetime import datetime, timedelta, timezone

from .schemas import EventSource, RoutingAction, Zone, ZoneType


def default_seed_zones() -> list[Zone]:
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=30)

    return [
        Zone(
            zone_id="DZ-001",
            name="Red Sea / Bab el-Mandeb",
            zone_type=ZoneType.WAR_ZONE,
            severity=9.5,
            center_lat=12.5,
            center_lng=43.3,
            radius_km=350,
            routing_action=RoutingAction.HARD_BLOCK,
            source=EventSource.SEED,
            summary="Active military attacks on commercial vessels reported in this corridor.",
            created_at=now,
            expires_at=expiry,
            metadata={"baseline": True},
        ),
        Zone(
            zone_id="DZ-002",
            name="Gulf of Guinea",
            zone_type=ZoneType.PIRACY_ZONE,
            severity=7.2,
            center_lat=3.5,
            center_lng=2.8,
            radius_km=400,
            routing_action=RoutingAction.STRONG_AVOID,
            source=EventSource.SEED,
            summary="High piracy activity including robbery and kidnapping incidents.",
            created_at=now,
            expires_at=expiry,
            metadata={"baseline": True},
        ),
        Zone(
            zone_id="DZ-003",
            name="Singapore Strait",
            zone_type=ZoneType.PIRACY_ZONE,
            severity=5.5,
            center_lat=1.2,
            center_lng=103.8,
            radius_km=150,
            routing_action=RoutingAction.CAUTION,
            source=EventSource.SEED,
            summary="Rising opportunistic maritime robbery incidents in this lane.",
            created_at=now,
            expires_at=expiry,
            metadata={"baseline": True},
        ),
        Zone(
            zone_id="DZ-004",
            name="Black Sea",
            zone_type=ZoneType.WAR_ZONE,
            severity=8.0,
            center_lat=43.0,
            center_lng=34.0,
            radius_km=300,
            routing_action=RoutingAction.HARD_BLOCK,
            source=EventSource.SEED,
            summary="Armed conflict and mine risks reported in maritime corridors.",
            created_at=now,
            expires_at=expiry,
            metadata={"baseline": True},
        ),
        Zone(
            zone_id="DZ-005",
            name="Somali Coast / Gulf of Aden",
            zone_type=ZoneType.PIRACY_ZONE,
            severity=6.8,
            center_lat=11.5,
            center_lng=51.0,
            radius_km=500,
            routing_action=RoutingAction.STRONG_AVOID,
            source=EventSource.SEED,
            summary="Renewed piracy risk for merchant shipping near the Horn of Africa.",
            created_at=now,
            expires_at=expiry,
            metadata={"baseline": True},
        ),
    ]


def mock_events() -> list[dict]:
    """Deterministic mock items for keyless testing."""
    return [
        {
            "title": "Missile attack reported near Bab el-Mandeb shipping lane",
            "description": "Commercial vessels advised to avoid the southern Red Sea corridor.",
            "source": "mock",
            "latitude": 12.6,
            "longitude": 43.1,
            "hint": "war",
        },
        {
            "title": "Armed robbery attempts rise in Gulf of Guinea",
            "description": "Two bulk carriers reported boardings during overnight transit.",
            "source": "mock",
            "latitude": 4.2,
            "longitude": 3.5,
            "hint": "piracy",
        },
        {
            "title": "Cyclone warning for Bay of Bengal maritime routes",
            "description": "Storm intensity expected to increase over the next 24 hours.",
            "source": "mock",
            "latitude": 14.0,
            "longitude": 88.0,
            "hint": "weather",
        },
    ]
