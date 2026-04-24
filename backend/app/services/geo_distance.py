"""
geo_distance.py — Haversine distance helpers for SeaRouting
"""
import math
from shapely.geometry import LineString, MultiLineString


def get_distance_km(coord1: tuple, coord2: tuple) -> float:
    """
    Calculate distance between two (lon, lat) coordinates in km
    using the Haversine formula.
    """
    R = 6371  # Earth radius in km

    lat1 = math.radians(coord1[1])
    lat2 = math.radians(coord2[1])

    delta_lat = math.radians(coord2[1] - coord1[1])
    delta_lon = math.radians(coord2[0] - coord1[0])

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_length_geo_km(geometry) -> float:
    """
    Calculate total length of a Shapely geometry in km.
    Supports LineString and MultiLineString.
    """
    total = 0.0

    if geometry.geom_type == "LineString":
        coords = list(geometry.coords)
        for i in range(len(coords) - 1):
            total += get_distance_km(coords[i], coords[i + 1])

    elif geometry.geom_type == "MultiLineString":
        for line in geometry.geoms:
            coords = list(line.coords)
            for i in range(len(coords) - 1):
                total += get_distance_km(coords[i], coords[i + 1])

    return round(total, 2)
