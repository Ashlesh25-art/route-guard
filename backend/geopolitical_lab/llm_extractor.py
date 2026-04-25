from __future__ import annotations

from datetime import timedelta

from .schemas import RawEvent, RoutingAction, Zone, ZoneType
from .settings import LabSettings
from .utils import clamp, new_zone_id, now_utc


_REGION_MAP: dict[str, tuple[float, float, float, str]] = {
    "red sea": (15.5, 41.2, 350.0, "Red Sea"),
    "bab el-mandeb": (12.5, 43.3, 250.0, "Bab el-Mandeb"),
    "gulf of guinea": (3.5, 2.8, 400.0, "Gulf of Guinea"),
    "somali": (11.5, 51.0, 500.0, "Somali Coast"),
    "gulf of aden": (12.0, 46.0, 400.0, "Gulf of Aden"),
    "strait of hormuz": (26.6, 56.3, 220.0, "Strait of Hormuz"),
    "black sea": (43.0, 34.0, 300.0, "Black Sea"),
    "south china sea": (13.0, 114.0, 700.0, "South China Sea"),
    "malacca": (3.0, 101.0, 220.0, "Strait of Malacca"),
    "singapore": (1.2, 103.8, 150.0, "Singapore Strait"),
    "bay of bengal": (14.0, 88.0, 500.0, "Bay of Bengal"),
}


def _keyword_zone_type(text: str) -> ZoneType:
    lowered = text.lower()
    if any(word in lowered for word in ["war", "missile", "drone", "naval attack", "military"]):
        return ZoneType.WAR_ZONE
    if any(word in lowered for word in ["piracy", "pirate", "hijack", "boarding", "robbery"]):
        return ZoneType.PIRACY_ZONE
    if any(word in lowered for word in ["sanction", "embargo", "restricted waters", "blockade"]):
        return ZoneType.SANCTION_ZONE
    if any(word in lowered for word in ["storm", "cyclone", "hurricane", "typhoon", "gale"]):
        return ZoneType.WEATHER_ZONE
    if any(word in lowered for word in ["port strike", "port closed", "terminal disruption"]):
        return ZoneType.PORT_DISRUPTION
    return ZoneType.PORT_DISRUPTION


def _hint_zone_type(hint: str | None) -> ZoneType | None:
    if not hint:
        return None

    lowered = hint.lower().strip()
    if lowered in {"war", "military_attack", "attack", "war_zone"}:
        return ZoneType.WAR_ZONE
    if lowered in {"piracy", "pirate", "hijack", "piracy_zone"}:
        return ZoneType.PIRACY_ZONE
    if lowered in {"weather", "storm", "cyclone", "hurricane", "weather_zone"}:
        return ZoneType.WEATHER_ZONE
    if lowered in {"sanction", "sanctions", "sanction_zone", "restricted"}:
        return ZoneType.SANCTION_ZONE
    if lowered in {"port", "port_disruption", "disruption"}:
        return ZoneType.PORT_DISRUPTION
    return None


def _default_action(zone_type: ZoneType) -> RoutingAction:
    if zone_type in {ZoneType.WAR_ZONE, ZoneType.SANCTION_ZONE}:
        return RoutingAction.HARD_BLOCK
    if zone_type == ZoneType.PIRACY_ZONE:
        return RoutingAction.STRONG_AVOID
    if zone_type == ZoneType.WEATHER_ZONE:
        return RoutingAction.CAUTION
    return RoutingAction.INFORMATIONAL


def _base_severity(zone_type: ZoneType) -> float:
    if zone_type == ZoneType.WAR_ZONE:
        return 9.0
    if zone_type == ZoneType.PIRACY_ZONE:
        return 7.0
    if zone_type == ZoneType.SANCTION_ZONE:
        return 8.0
    if zone_type == ZoneType.WEATHER_ZONE:
        return 6.0
    return 5.0


def _locate_region(text: str) -> tuple[float, float, float, str] | None:
    lowered = text.lower()
    for key, value in _REGION_MAP.items():
        if key in lowered:
            return value
    return None


class StructuredZoneExtractor:
    def __init__(self, settings: LabSettings):
        self.settings = settings

    async def extract_zone(self, event: RawEvent) -> Zone:
        return self._extract_with_rules(event)

    def _extract_with_rules(self, event: RawEvent) -> Zone:
        text = f"{event.title} {event.description}".strip()
        zone_type = _hint_zone_type(event.event_type_hint) or _keyword_zone_type(text)
        severity = _base_severity(zone_type)
        metadata = event.metadata or {}

        severity_hint = metadata.get("severity_hint")
        if isinstance(severity_hint, (int, float)):
            severity = float(severity_hint)

        if not isinstance(severity_hint, (int, float)):
            if any(word in text.lower() for word in ["critical", "multiple attacks", "category 5", "hijacked"]):
                severity += 1.0
            if any(word in text.lower() for word in ["advisory", "watch", "minor"]):
                severity -= 0.8

        located = _locate_region(text)
        if event.latitude is not None and event.longitude is not None:
            lat, lng = event.latitude, event.longitude
            radius_hint = metadata.get("radius_km_hint")
            if isinstance(radius_hint, (int, float)):
                radius = clamp(float(radius_hint), 10.0, 5000.0)
            else:
                radius = self.settings.DEFAULT_ZONE_RADIUS_KM
            region_name = event.title[:64] or "Structured Maritime Event"
        elif located is not None:
            lat, lng, radius, region_name = located
        else:
            lat, lng = 0.0, 0.0
            radius = self.settings.DEFAULT_ZONE_RADIUS_KM
            region_name = "Unspecified Maritime Zone"

        action = _default_action(zone_type)

        now = now_utc()
        ttl = timedelta(hours=self.settings.LIVE_ZONE_TTL_HOURS)

        summary = (
            f"{zone_type.value.replace('_', ' ').title()} derived from structured event input ({event.source.value}). "
            f"Use routing action: {action.value.replace('_', ' ')}."
        )

        return Zone(
            zone_id=new_zone_id(),
            name=region_name,
            zone_type=zone_type,
            severity=clamp(severity, 1.0, 10.0),
            center_lat=lat,
            center_lng=lng,
            radius_km=radius,
            routing_action=action,
            source=event.source,
            summary=summary,
            created_at=now,
            expires_at=now + ttl,
            metadata={
                "event_id": event.event_id,
                "parser_mode": self.settings.PARSER_MODE,
                "url": str(event.url) if event.url else "",
            },
        )


# Backward compatible alias for existing imports.
LLMZoneExtractor = StructuredZoneExtractor
