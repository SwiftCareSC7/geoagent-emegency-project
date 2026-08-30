"""
Geospatial Utilities for Member 2 (Maps & Emergency Routing Specialist)
GeoAgent Emergency Vehicle Movement Framework

Provides:
- Haversine distance calculations (meters/kilometers)
- Point-to-segment and point-to-polyline perpendicular distance calculations
- GeoJSON export helpers for control-room map visualization
"""

import math
from typing import List, Tuple, Dict, Any

EARTH_RADIUS_KM = 6371.0
EARTH_RADIUS_METERS = 6371000.0


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth in meters
    using the Haversine formula.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_METERS * c


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Haversine distance in kilometers."""
    return haversine_distance_meters(lat1, lon1, lat2, lon2) / 1000.0


def point_to_segment_distance_meters(
    p_lat: float, p_lon: float,
    a_lat: float, a_lon: float,
    b_lat: float, b_lon: float
) -> float:
    """
    Calculate the shortest perpendicular distance in meters from point P
    to a line segment AB defined by start point A and end point B.
    Projected onto local metric coordinate space.
    """
    ref_lat_rad = math.radians(p_lat)
    meters_per_lat_degree = 111000.0
    meters_per_lon_degree = 111000.0 * math.cos(ref_lat_rad)

    px = (p_lon - a_lon) * meters_per_lon_degree
    py = (p_lat - a_lat) * meters_per_lat_degree

    bx = (b_lon - a_lon) * meters_per_lon_degree
    by = (b_lat - a_lat) * meters_per_lat_degree

    ab_squared = bx * bx + by * by

    if ab_squared == 0:
        return haversine_distance_meters(p_lat, p_lon, a_lat, a_lon)

    t = max(0.0, min(1.0, (px * bx + py * by) / ab_squared))

    cx = t * bx
    cy = t * by

    dx = px - cx
    dy = py - cy

    return math.sqrt(dx * dx + dy * dy)


def point_to_polyline_distance_meters(
    point: Tuple[float, float],
    polyline: List[Tuple[float, float]]
) -> float:
    """
    Find minimum perpendicular distance in meters from GPS point (lat, lon)
    to a polyline defined as a list of (lat, lon) coordinates.
    """
    if not polyline or len(polyline) < 2:
        if polyline:
            return haversine_distance_meters(point[0], point[1], polyline[0][0], polyline[0][1])
        return 0.0

    p_lat, p_lon = point
    min_dist = float('inf')

    for i in range(len(polyline) - 1):
        a_lat, a_lon = polyline[i]
        b_lat, b_lon = polyline[i + 1]
        dist = point_to_segment_distance_meters(p_lat, p_lon, a_lat, a_lon, b_lat, b_lon)
        if dist < min_dist:
            min_dist = dist

    return min_dist


def to_geojson_feature_collection(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Wrap a list of GeoJSON features into a FeatureCollection."""
    return {
        "type": "FeatureCollection",
        "features": features
    }


def line_to_geojson(
    coordinates: List[Tuple[float, float]],
    properties: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Convert list of (lat, lon) tuples to GeoJSON LineString feature [lon, lat]."""
    geojson_coords = [[lon, lat] for lat, lon in coordinates]
    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": geojson_coords
        },
        "properties": properties or {}
    }


def point_to_geojson(
    lat: float, lon: float,
    properties: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Convert (lat, lon) to GeoJSON Point feature [lon, lat]."""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": properties or {}
    }
