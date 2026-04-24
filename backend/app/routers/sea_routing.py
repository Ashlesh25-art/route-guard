"""
sea_routing.py — FastAPI router for maritime shortest-path queries
------------------------------------------------------------------
Endpoints:
  POST /sea-route/route            — single A→B route
  POST /sea-route/waypoints        — same but returns flat waypoint list
  POST /sea-route/matrix           — pairwise distance matrix for N ports
  POST /sea-route/filter-ports     — filter ports by proximity to network
  GET  /sea-route/status           — engine health / stats
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.geo_distance import get_distance_km
from app.services.sea_routing_engine import DEFAULT_PASSAGES, get_sea_routing_engine

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class PassageFlags(BaseModel):
    suez: bool = True
    panama: bool = True
    malacca: bool = True
    gibraltar: bool = True
    dover: bool = True
    bering: bool = True
    magellan: bool = True
    babelmandeb: bool = True
    kiel: bool = False
    corinth: bool = False
    northwest: bool = False
    northeast: bool = False

    def as_dict(self) -> dict[str, bool]:
        return self.model_dump()


class SingleRouteRequest(BaseModel):
    origin_lon: float = Field(..., ge=-180, le=180, example=121.5)
    origin_lat: float = Field(..., ge=-90, le=90, example=31.2)
    dest_lon: float = Field(..., ge=-180, le=180, example=103.8)
    dest_lat: float = Field(..., ge=-90, le=90, example=1.3)
    passages: PassageFlags = Field(default_factory=PassageFlags)
    resolution_km: int = Field(20, description="Network resolution in km (5/10/20/50/100)")


class PortEntry(BaseModel):
    id: str
    lon: float = Field(..., ge=-180, le=180)
    lat: float = Field(..., ge=-90, le=90)


class MatrixRequest(BaseModel):
    ports: list[PortEntry] = Field(..., min_length=2)
    passages: PassageFlags = Field(default_factory=PassageFlags)
    resolution_km: int = 20


class FilterPortsRequest(BaseModel):
    ports: list[PortEntry]
    max_dist_km: float = Field(100.0, gt=0)
    resolution_km: int = 20


class WaypointEntry(BaseModel):
    lat: float
    lng: float


class SingleRouteResponse(BaseModel):
    dist_km: float
    d_from_km: float
    d_to_km: float
    route_type: str


class WaypointsResponse(BaseModel):
    dist_km: float
    route_type: str
    waypoints: list[WaypointEntry]


class MatrixRouteEntry(BaseModel):
    from_port: str
    to_port: str
    dist_km: float
    route_type: str


class MatrixResponse(BaseModel):
    total_routes: int
    routes: list[MatrixRouteEntry]


class FilterPortsResponse(BaseModel):
    total_input: int
    total_kept: int
    kept_ports: list[str]


class EngineStatusResponse(BaseModel):
    status: str
    resolution_km: int
    nodes: int
    edges: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/status",
    response_model=EngineStatusResponse,
    summary="Maritime engine health & stats",
)
async def sea_route_status():
    """Returns network size information for the loaded marnet graph."""
    try:
        engine = get_sea_routing_engine()
        return EngineStatusResponse(
            status="ready",
            resolution_km=engine.res_km,
            nodes=engine.graph.number_of_nodes(),
            edges=engine.graph.number_of_edges(),
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post(
    "/route",
    response_model=SingleRouteResponse,
    summary="Single port-to-port sea route (distances only)",
)
async def get_single_route(req: SingleRouteRequest):
    """
    Calculate the shortest navigable sea route between two coordinates.
    Returns distance in km. Use /waypoints for the full geometry.
    """
    try:
        engine = get_sea_routing_engine(req.resolution_km)
        result = engine.get_route(
            req.origin_lon, req.origin_lat,
            req.dest_lon, req.dest_lat,
            passages=req.passages.as_dict(),
        )
    except Exception as exc:
        logger.error("Sea routing engine error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Engine error: {exc}")

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No navigable sea route found between the given coordinates.",
        )

    return SingleRouteResponse(
        dist_km=result["distKM"],
        d_from_km=result["dFromKM"],
        d_to_km=result["dToKM"],
        route_type=result["type"],
    )


@router.post(
    "/waypoints",
    response_model=WaypointsResponse,
    summary="Single port-to-port sea route with full waypoint geometry",
)
async def get_route_waypoints(req: SingleRouteRequest):
    """
    Same as /route but also returns a list of {lat, lng} waypoints
    compatible with the existing RouteGuard map rendering.
    """
    try:
        engine = get_sea_routing_engine(req.resolution_km)
        result = engine.get_route(
            req.origin_lon, req.origin_lat,
            req.dest_lon, req.dest_lat,
            passages=req.passages.as_dict(),
        )
    except Exception as exc:
        logger.error("Sea routing engine error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Engine error: {exc}")

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No navigable sea route found between the given coordinates.",
        )

    # Flatten geometry to waypoint list
    geom = result["geometry"]
    waypoints: list[dict] = []
    for line in (geom.geoms if hasattr(geom, "geoms") else [geom]):
        for lon, lat in line.coords:
            waypoints.append({"lat": round(lat, 6), "lng": round(lon, 6)})

    return WaypointsResponse(
        dist_km=result["distKM"],
        route_type=result["type"],
        waypoints=[WaypointEntry(**w) for w in waypoints],
    )


@router.post(
    "/matrix",
    response_model=MatrixResponse,
    summary="Pairwise sea-route distance matrix for multiple ports",
)
async def get_route_matrix(req: MatrixRequest):
    """
    Compute all pairwise sea routes for a list of ports.
    Returns an N×(N-1)/2 matrix of distances.
    """
    try:
        engine = get_sea_routing_engine(req.resolution_km)
        ports_raw = [{"id": p.id, "lon": p.lon, "lat": p.lat} for p in req.ports]
        routes = engine.get_routes(ports_raw, passages=req.passages.as_dict())
    except Exception as exc:
        logger.error("Sea routing matrix error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Engine error: {exc}")

    matrix_entries = [
        MatrixRouteEntry(
            from_port=r["from"],
            to_port=r["to"],
            dist_km=r["distKM"],
            route_type=r["type"],
        )
        for r in routes
    ]

    return MatrixResponse(total_routes=len(matrix_entries), routes=matrix_entries)


@router.post(
    "/filter-ports",
    response_model=FilterPortsResponse,
    summary="Filter ports by proximity to the maritime network",
)
async def filter_ports(req: FilterPortsRequest):
    """
    Returns only the ports that are within *max_dist_km* of the nearest
    network node — useful for validating port coordinates before routing.
    """
    try:
        engine = get_sea_routing_engine(req.resolution_km)
        ports_raw = [{"id": p.id, "lon": p.lon, "lat": p.lat} for p in req.ports]
        kept = engine.filter_ports(ports_raw, req.max_dist_km)
    except Exception as exc:
        logger.error("filter_ports error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Engine error: {exc}")

    return FilterPortsResponse(
        total_input=len(req.ports),
        total_kept=len(kept),
        kept_ports=[p["id"] for p in kept],
    )
