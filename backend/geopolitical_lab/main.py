from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    RawEvent,
    RefreshResponse,
    RequiredApiKeysResponse,
    RouteEvaluateRequest,
    RouteEvaluateResponse,
    StructuredIngestRequest,
)
from .settings import get_lab_settings
from .zone_engine import GeopoliticalZoneEngine

settings = get_lab_settings()
engine = GeopoliticalZoneEngine(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep seed zones loaded even when no provider keys are configured.
    engine.reset_to_seed()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description=(
        "Standalone geopolitics + maritime risk backend lab. "
        "Designed to run separately without affecting current RouteGuard API."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict:
    return {
        "service": settings.APP_NAME,
        "mode": "standalone-lab",
        "docs": "/docs",
    }


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "parser_mode": settings.PARSER_MODE,
        "active_zones": len(engine.get_zones(min_severity=0.0, active_only=True)),
    }


@app.get("/setup/required-keys", response_model=RequiredApiKeysResponse)
async def required_keys() -> RequiredApiKeysResponse:
    return RequiredApiKeysResponse(
        required_for_live=[],
        optional=[],
        not_required=["GDELT (public)", "NOAA weather.gov (public)"],
        notes=[
            "Live ingestion is API-key free and uses only public sources.",
            "Parsing is deterministic and uses structured rules (no LLM dependency).",
        ],
    )


@app.post("/zones/reset-seed")
async def reset_seed() -> dict:
    engine.reset_to_seed()
    return {
        "ok": True,
        "active_zones": len(engine.get_zones(min_severity=0.0, active_only=True)),
    }


@app.post("/zones/refresh")
async def refresh_zones(use_mock: bool = Query(default=True)):
    return await engine.refresh(use_mock=use_mock)


@app.post("/zones/ingest-structured", response_model=RefreshResponse)
async def ingest_structured(
    payload: StructuredIngestRequest,
    reset_to_seed: bool = Query(default=False),
) -> RefreshResponse:
    events: list[RawEvent] = []
    for idx, item in enumerate(payload.events):
        events.append(
            RawEvent(
                event_id=f"manual-{idx}-{abs(hash(item.title)) % 100000}",
                source=item.source,
                title=item.title,
                description=item.description,
                url=item.url,
                latitude=item.latitude,
                longitude=item.longitude,
                event_type_hint=item.event_type_hint,
                metadata={
                    "provider": "manual_structured",
                    "severity_hint": item.severity_hint,
                    "radius_km_hint": item.radius_km_hint,
                },
            )
        )

    return await engine.ingest_raw_events(
        events,
        mode="structured",
        provider_counts={"structured": len(events)},
        reset_to_seed=reset_to_seed,
    )


@app.get("/zones")
async def list_zones(
    min_severity: float = Query(default=0.0, ge=0.0, le=10.0),
    active_only: bool = Query(default=True),
):
    return engine.get_zones(min_severity=min_severity, active_only=active_only)


@app.get("/zones/active")
async def list_active_zones(min_severity: float = Query(default=5.0, ge=0.0, le=10.0)):
    return engine.get_zones(min_severity=min_severity, active_only=True)


@app.get("/events/raw")
async def list_raw_events():
    return engine.get_raw_events()


@app.post("/route/evaluate", response_model=RouteEvaluateResponse)
async def evaluate_route(request: RouteEvaluateRequest) -> RouteEvaluateResponse:
    return engine.evaluate_route(request)
