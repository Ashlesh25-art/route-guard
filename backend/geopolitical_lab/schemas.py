from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl


class ZoneType(str, Enum):
    WAR_ZONE = "war_zone"
    PIRACY_ZONE = "piracy_zone"
    WEATHER_ZONE = "weather_zone"
    SANCTION_ZONE = "sanction_zone"
    PORT_DISRUPTION = "port_disruption"
    MANUAL_ZONE = "manual_zone"


class RoutingAction(str, Enum):
    HARD_BLOCK = "hard_block"
    STRONG_AVOID = "strong_avoid"
    CAUTION = "caution"
    INFORMATIONAL = "informational"


class EventSource(str, Enum):
    SEED = "seed"
    GDELT = "gdelt"
    NOAA = "noaa"
    MANUAL = "manual"
    MOCK = "mock"


class RawEvent(BaseModel):
    event_id: str
    source: EventSource
    title: str
    description: str = ""
    url: HttpUrl | None = None
    published_at: datetime | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    event_type_hint: str | None = None
    metadata: dict = Field(default_factory=dict)


class Zone(BaseModel):
    zone_id: str
    name: str
    zone_type: ZoneType
    severity: float = Field(ge=1.0, le=10.0)
    center_lat: float = Field(ge=-90, le=90)
    center_lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(ge=1.0, le=5000.0)
    routing_action: RoutingAction
    source: EventSource
    summary: str
    created_at: datetime
    expires_at: datetime
    metadata: dict = Field(default_factory=dict)


class RouteWaypoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class RouteEvaluateRequest(BaseModel):
    route_id: str = "candidate-route"
    waypoints: list[RouteWaypoint] = Field(min_length=2)


class StructuredEventInput(BaseModel):
    title: str
    description: str = ""
    source: EventSource = EventSource.MANUAL
    url: HttpUrl | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    event_type_hint: str | None = None
    severity_hint: float | None = Field(default=None, ge=1.0, le=10.0)
    radius_km_hint: float | None = Field(default=None, ge=10.0, le=5000.0)


class StructuredIngestRequest(BaseModel):
    events: list[StructuredEventInput] = Field(min_length=1, max_length=200)


class ZoneHit(BaseModel):
    zone_id: str
    zone_name: str
    zone_type: ZoneType
    severity: float
    routing_action: RoutingAction
    min_distance_km: float
    summary: str


class RouteEvaluateResponse(BaseModel):
    route_id: str
    blocked: bool
    geopolitical_risk_score: float = Field(ge=0.0, le=100.0)
    recommended_action: str
    hits: list[ZoneHit]


class RefreshResponse(BaseModel):
    timestamp: datetime
    mode: str
    provider_counts: dict[str, int]
    total_events: int
    zones_created: int
    zones_total_active: int


class RequiredApiKeysResponse(BaseModel):
    required_for_live: list[str]
    optional: list[str]
    not_required: list[str]
    notes: list[str]
