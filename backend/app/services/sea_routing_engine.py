"""
sea_routing_engine.py — Maritime Shortest-Path Engine (RouteGuard)
------------------------------------------------------------------
Loads the marnet GeoPackage network, builds a NetworkX graph, and
exposes get_route() / get_routes() / filter_ports() for FastAPI.

The engine is loaded once at startup (singleton pattern) and reused
across all API requests.
"""

import logging
import os
from functools import lru_cache
from typing import Any

import networkx as nx
import numpy as np
from shapely.geometry import LineString, MultiLineString
from shapely.ops import linemerge

from app.services.geo_distance import get_distance_km, get_length_geo_km

logger = logging.getLogger(__name__)

# ── Passage defaults ──────────────────────────────────────────────────────────
DEFAULT_PASSAGES: dict[str, bool] = {
    "suez": True,
    "panama": True,
    "malacca": True,
    "gibraltar": True,
    "dover": True,
    "bering": True,
    "magellan": True,
    "babelmandeb": True,
    "kiel": False,
    "corinth": False,
    "northwest": False,
    "northeast": False,
}


class SeaRoutingEngine:
    """
    Maritime routing engine backed by the marnet GeoPackage network.

    Attributes:
        res_km   — grid resolution used (e.g. 20)
        graph    — NetworkX Graph where nodes are integer IDs and edges
                   carry 'weight' (km), 'geometry' (Shapely LineString),
                   and 'pass_attr' (optional passage name).
    """

    # Supported resolutions (km)
    RESOLUTION_KM = [100, 50, 20, 10, 5]

    def __init__(self, res_km: int = 20) -> None:
        self.res_km = res_km
        self.graph: nx.Graph = nx.Graph()
        self._nodes: dict[tuple, int] = {}        # coord → node_id
        self._node_coords: dict[int, tuple] = {}  # node_id → coord
        self._all_coords_arr: np.ndarray | None = None
        self._all_ids_list: list[int] = []

        self._load_network(res_km)
        self._link_globe_nodes()
        self._build_coord_array()

        logger.info(
            "SeaRoutingEngine ready | res=%skm | nodes=%d | edges=%d",
            res_km,
            self.graph.number_of_nodes(),
            self.graph.number_of_edges(),
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    def _find_network_file(self, res_km: int) -> str:
        """Locate the marnet .gpkg for the requested resolution."""
        base = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            # Relative to this file: …/backend/app/services/ → go up 3 levels
            os.path.join(base, "..", "..", "..", "marnet", f"marnet_plus_{res_km}km.gpkg"),
            # Common fallback locations
            os.path.join("marnet", f"marnet_plus_{res_km}km.gpkg"),
            os.path.join("..", "marnet", f"marnet_plus_{res_km}km.gpkg"),
        ]
        for path in candidates:
            norm = os.path.normpath(path)
            if os.path.exists(norm):
                return norm
        raise FileNotFoundError(
            f"marnet_plus_{res_km}km.gpkg not found.\n"
            f"Searched:\n" + "\n".join(f"  {os.path.normpath(p)}" for p in candidates)
        )

    def _load_network(self, res_km: int) -> None:
        """Parse the GeoPackage and populate self.graph."""
        import geopandas as gpd  # lazy import — heavy dependency

        file_path = self._find_network_file(res_km)
        logger.info("Loading network from: %s", file_path)

        gdf = gpd.read_file(file_path, engine="pyogrio")
        logger.info("Loaded %d features", len(gdf))

        node_id = 0
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom is None:
                continue

            pass_attr = row.get("pass", None)

            lines = (
                [geom]
                if geom.geom_type == "LineString"
                else list(geom.geoms)
                if geom.geom_type == "MultiLineString"
                else []
            )

            for line in lines:
                coords = list(line.coords)
                if len(coords) < 2:
                    continue

                start_c = (round(coords[0][0], 6), round(coords[0][1], 6))
                end_c = (round(coords[-1][0], 6), round(coords[-1][1], 6))

                if start_c not in self._nodes:
                    self._nodes[start_c] = node_id
                    self._node_coords[node_id] = start_c
                    node_id += 1

                if end_c not in self._nodes:
                    self._nodes[end_c] = node_id
                    self._node_coords[node_id] = end_c
                    node_id += 1

                self.graph.add_edge(
                    self._nodes[start_c],
                    self._nodes[end_c],
                    weight=get_length_geo_km(line),
                    geometry=line,
                    pass_attr=pass_attr,
                )

    def _link_globe_nodes(self) -> None:
        """Add zero-weight edges between lon=180 and lon=-180 nodes."""
        linked = 0
        for coord, nid in list(self._nodes.items()):
            if coord[0] == 180:
                mirror = (-180.0, coord[1])
                if mirror in self._nodes:
                    self.graph.add_edge(
                        nid, self._nodes[mirror], weight=0, geometry=None, pass_attr=None
                    )
                    linked += 1
        logger.info("Linked %d globe-wrapping node pairs", linked)

    def _build_coord_array(self) -> None:
        """Cache node coordinates as a NumPy array for fast nearest-node lookup."""
        self._all_ids_list = list(self._node_coords.keys())
        self._all_coords_arr = np.array(
            [self._node_coords[nid] for nid in self._all_ids_list]
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def get_node(self, coord: tuple) -> int | None:
        """Return the node_id of the closest network node to *coord* (lon, lat)."""
        if self._all_coords_arr is None or len(self._all_coords_arr) == 0:
            return None
        dists = np.sqrt(np.sum((self._all_coords_arr - np.array(coord)) ** 2, axis=1))
        return self._all_ids_list[int(np.argmin(dists))]

    def get_position(self, node_id: int) -> tuple | None:
        """Return (lon, lat) for *node_id*."""
        return self._node_coords.get(node_id)

    def _edge_weight(self, u: int, v: int, data: dict, passages: dict) -> float:
        pass_attr = data.get("pass_attr")
        if pass_attr and not passages.get(pass_attr, True):
            return float("inf")
        return data.get("weight", float("inf"))

    def _find_path(self, start: int, end: int, passages: dict) -> list[int] | None:
        def wfunc(u, v, d):
            return self._edge_weight(u, v, d, passages)

        try:
            return nx.dijkstra_path(self.graph, start, end, weight=wfunc)
        except nx.NetworkXNoPath:
            logger.warning("No sea path between nodes %d and %d", start, end)
            return None
        except nx.NodeNotFound as exc:
            logger.error("Node not found: %s", exc)
            return None

    def get_route(
        self,
        o_lon: float,
        o_lat: float,
        d_lon: float,
        d_lat: float,
        passages: dict[str, bool] | None = None,
    ) -> dict[str, Any] | None:
        """
        Calculate the shortest sea route between two coordinates.

        Returns a dict with:
            geometry   — Shapely MultiLineString
            distKM     — total route distance (km)
            dFromKM    — distance from origin to first network node (km)
            dToKM      — distance from last network node to destination (km)
            type       — 'network' | 'direct'
        """
        if passages is None:
            passages = dict(DEFAULT_PASSAGES)

        o_pos = (o_lon, o_lat)
        d_pos = (d_lon, d_lat)

        o_node = self.get_node(o_pos)
        d_node = self.get_node(d_pos)
        if o_node is None or d_node is None:
            return None

        o_node_pos = self.get_position(o_node)
        d_node_pos = self.get_position(d_node)

        # Fall back to straight line when network connectors are longer
        direct_dist = get_distance_km(o_pos, d_pos)
        connector_dist = (
            get_distance_km(o_pos, o_node_pos) + get_distance_km(d_pos, d_node_pos)
        )

        if direct_dist < connector_dist:
            line = LineString([o_pos, d_pos])
            ml = MultiLineString([line])
            return {
                "geometry": ml,
                "distKM": get_length_geo_km(ml),
                "dFromKM": 0.0,
                "dToKM": 0.0,
                "type": "direct",
            }

        path = self._find_path(o_node, d_node, passages)
        if path is None:
            return None

        # Build route geometry
        segments: list = [LineString([o_pos, o_node_pos])]
        for i in range(len(path) - 1):
            edata = self.graph.get_edge_data(path[i], path[i + 1])
            if edata and edata.get("geometry"):
                segments.append(edata["geometry"])

        segments.append(LineString([d_node_pos, d_pos]))

        merged = linemerge(segments)
        route_geom = (
            MultiLineString([merged])
            if merged.geom_type == "LineString"
            else merged
        )

        return {
            "geometry": route_geom,
            "distKM": round(get_length_geo_km(route_geom), 2),
            "dFromKM": round(get_distance_km(o_pos, o_node_pos), 2),
            "dToKM": round(get_distance_km(d_pos, d_node_pos), 2),
            "type": "network",
        }

    def get_waypoints(
        self,
        o_lon: float,
        o_lat: float,
        d_lon: float,
        d_lat: float,
        passages: dict[str, bool] | None = None,
    ) -> list[dict[str, float]]:
        """
        Convenience method: return a list of {lat, lng} dicts that can be
        dropped directly into the existing RouteGuard waypoint format.
        """
        route = self.get_route(o_lon, o_lat, d_lon, d_lat, passages)
        if route is None:
            return []

        geom = route["geometry"]
        waypoints: list[dict[str, float]] = []

        for line in (geom.geoms if hasattr(geom, "geoms") else [geom]):
            for lon, lat in line.coords:
                waypoints.append({"lat": round(lat, 6), "lng": round(lon, 6)})

        return waypoints

    def filter_ports(
        self, ports: list[dict], max_dist_km: float = 100.0
    ) -> list[dict]:
        """Return only ports whose nearest network node is within *max_dist_km*."""
        result = []
        for port in ports:
            coord = (port["lon"], port["lat"])
            node = self.get_node(coord)
            if node is None:
                continue
            if get_distance_km(coord, self.get_position(node)) <= max_dist_km:
                result.append(port)
        return result

    def get_routes(
        self,
        ports: list[dict],
        passages: dict[str, bool] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Compute all pairwise routes for *ports*.
        Each port dict must have 'id', 'lon', 'lat'.
        """
        if passages is None:
            passages = dict(DEFAULT_PASSAGES)

        routes: list[dict[str, Any]] = []
        n = len(ports)
        total = n * (n - 1) // 2
        count = 0

        for i in range(n):
            for j in range(i + 1, n):
                count += 1
                pi, pj = ports[i], ports[j]
                logger.info(
                    "Route %d/%d: %s → %s", count, total, pi["id"], pj["id"]
                )
                route = self.get_route(
                    pi["lon"], pi["lat"],
                    pj["lon"], pj["lat"],
                    passages,
                )
                if route:
                    route["from"] = pi["id"]
                    route["to"] = pj["id"]
                    routes.append(route)

        return routes


# ── Singleton accessor ────────────────────────────────────────────────────────
_engine_instance: SeaRoutingEngine | None = None


def get_sea_routing_engine(res_km: int = 20) -> SeaRoutingEngine:
    """
    Return the global SeaRoutingEngine singleton (lazy-loaded).
    Safe to call from FastAPI dependency injection.
    """
    global _engine_instance
    if _engine_instance is None:
        logger.info("Initialising SeaRoutingEngine (res=%skm)…", res_km)
        _engine_instance = SeaRoutingEngine(res_km)
    return _engine_instance
