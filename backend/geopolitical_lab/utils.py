from __future__ import annotations

import math
from datetime import datetime, timezone
from uuid import uuid4


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_zone_id(prefix: str = "DZ") -> str:
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(a))


def densify_waypoints(
    waypoints: list[tuple[float, float]], segment_km: float = 120.0
) -> list[tuple[float, float]]:
    """Interpolate intermediate points so zone crossing checks are less sparse."""
    if len(waypoints) < 2:
        return waypoints

    dense: list[tuple[float, float]] = [waypoints[0]]
    for idx in range(len(waypoints) - 1):
        lat1, lon1 = waypoints[idx]
        lat2, lon2 = waypoints[idx + 1]
        dist = haversine_km(lat1, lon1, lat2, lon2)
        if dist <= segment_km:
            dense.append((lat2, lon2))
            continue

        steps = max(1, int(dist // segment_km))
        for step in range(1, steps + 1):
            frac = step / (steps + 1)
            dense.append((lat1 + (lat2 - lat1) * frac, lon1 + (lon2 - lon1) * frac))
        dense.append((lat2, lon2))

    return dense
