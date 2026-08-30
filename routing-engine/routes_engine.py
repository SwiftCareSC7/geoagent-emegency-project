"""
Routing & Trajectory Engine for Member 2 (Maps & Routing Specialist)
GeoAgent Emergency Vehicle Movement Framework

Implements:
- Planned route calculation & polylines
- Telemetry processing & point-to-route deviation detection
- Incident & traffic delay calculations
- Alternative routes generation and scoring
- Standardized JSON telemetry export for backend and GeoAgent tools
"""

from typing import List, Tuple, Dict, Any
from geo_utils import (
    haversine_distance_km,
    point_to_polyline_distance_meters,
    line_to_geojson,
    point_to_geojson,
    to_geojson_feature_collection
)

# Configuration defaults
DEVIATION_THRESHOLD_METERS = 100.0  # 100 meters drift triggers deviation warning

# Preset Bangalore Landmarks for Realistic Demo
LOCATION_MG_ROAD = (12.9716, 77.5946)           # Start / Ambulance Dispatch
LOCATION_MANIPAL_HOSPITAL = (12.9582, 77.6483)  # Destination Hospital
LOCATION_ACCIDENT_ZONE = (12.9725, 77.6180)     # Accident on Trinity / Airport Rd junction


class Route:
    def __init__(
        self,
        route_id: str,
        name: str,
        coordinates: List[Tuple[float, float]],
        distance_km: float,
        eta_minutes: float,
        traffic_condition: str = "normal",
        description: str = ""
    ):
        self.route_id = route_id
        self.name = name
        self.coordinates = coordinates
        self.distance_km = round(distance_km, 2)
        self.eta_minutes = round(eta_minutes, 1)
        self.traffic_condition = traffic_condition
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "route_id": self.route_id,
            "name": self.name,
            "distance_km": self.distance_km,
            "eta_minutes": self.eta_minutes,
            "traffic_condition": self.traffic_condition,
            "description": self.description,
            "waypoints_count": len(self.coordinates)
        }


class GeoRoutingEngine:
    def __init__(self):
        self.origin = LOCATION_MG_ROAD
        self.destination = LOCATION_MANIPAL_HOSPITAL
        self.incident_location = LOCATION_ACCIDENT_ZONE

    def get_planned_route(self) -> Route:
        """
        Generate primary planned route from MG Road to Manipal Hospital via Old Airport Road.
        Distance: ~5.4 km, Original ETA: 10 minutes.
        """
        coords = [
            (12.9716, 77.5946),  # MG Road Metro Station (Start)
            (12.9730, 77.6030),  # Mayo Hall
            (12.9735, 77.6110),  # Trinity Circle
            (12.9725, 77.6180),  # Command Hospital / HAL Airport Rd junction (INCIDENT ZONE)
            (12.9660, 77.6300),  # Domlur Flyover
            (12.9610, 77.6400),  # Murugeshpalya
            (12.9582, 77.6483)   # Manipal Hospital (Destination)
        ]
        
        # Compute exact path distance using Haversine
        total_dist = 0.0
        for i in range(len(coords) - 1):
            total_dist += haversine_distance_km(
                coords[i][0], coords[i][1],
                coords[i+1][0], coords[i+1][1]
            )

        return Route(
            route_id="ROUTE_PLANNED_A",
            name="Route A (Old Airport Road)",
            coordinates=coords,
            distance_km=total_dist,
            eta_minutes=10.0,
            traffic_condition="heavy_congestion",
            description="Primary arterial route via Old Airport Road"
        )

    def get_actual_deviated_trajectory(self) -> Tuple[List[Tuple[float, float]], Tuple[float, float]]:
        """
        Simulates actual ambulance movement where it deviated off Old Airport Rd
        towards Indiranagar 100ft Road due to blocked accident area.
        Returns (trajectory_points, current_ambulance_location).
        """
        trajectory = [
            (12.9716, 77.5946),  # Dispatch MG Road
            (12.9730, 77.6030),  # Mayo Hall
            (12.9745, 77.6120),  # Diverging onto Ulsoor Road / Indiranagar (DEVIATION POINT)
            (12.9760, 77.6200),  # 100ft Road Indiranagar Junction (Current Position)
        ]
        current_position = trajectory[-1]
        return trajectory, current_position

    def check_route_deviation(
        self,
        current_location: Tuple[float, float],
        planned_route: Route,
        threshold_meters: float = DEVIATION_THRESHOLD_METERS
    ) -> Dict[str, Any]:
        """
        Calculate shortest distance from current ambulance GPS to planned route polyline.
        Triggers route deviation alert if distance exceeds threshold.
        """
        distance_meters = point_to_polyline_distance_meters(current_location, planned_route.coordinates)
        is_deviated = distance_meters > threshold_meters

        return {
            "detected": is_deviated,
            "distance_from_planned_route_meters": round(distance_meters, 1),
            "threshold_meters": threshold_meters,
            "current_location": {
                "lat": current_location[0],
                "lng": current_location[1]
            }
        }

    def calculate_incident_delay(
        self,
        original_eta_minutes: float,
        incident_severity: str = "high",
        severity: str = None
    ) -> Dict[str, Any]:
        """
        Calculate delay based on incident severity.
        High severity accident adds +6 minutes delay to Route A.
        """
        if severity is not None:
            incident_severity = severity
        delay_mapping = {
            "low": 2.0,
            "medium": 4.0,
            "high": 6.0,
            "critical": 12.0
        }
        delay_minutes = delay_mapping.get(incident_severity.lower(), 5.0)
        new_eta = original_eta_minutes + delay_minutes

        return {
            "original_eta_minutes": round(original_eta_minutes, 1),
            "new_eta_minutes": round(new_eta, 1),
            "delay_minutes": round(delay_minutes, 1),
            "severity": incident_severity
        }

    def generate_alternative_routes(self) -> List[Route]:
        """
        Generates alternative routes avoiding the accident area.
        Route B: via Indiranagar 100ft Road & HAL 2nd Stage (5.8 km, 11 min ETA)
        Route C: via Koramangala Inner Ring Road (6.3 km, 14 min ETA)
        """
        # Route B (Recommended Bypass via Indiranagar)
        coords_b = [
            (12.9716, 77.5946),  # MG Road
            (12.9760, 77.6200),  # Indiranagar 100ft Road
            (12.9690, 77.6350),  # HAL 2nd Stage
            (12.9620, 77.6430),  # Airport Road bypass junction
            (12.9582, 77.6483)   # Manipal Hospital
        ]
        dist_b = sum(haversine_distance_km(coords_b[i][0], coords_b[i][1], coords_b[i+1][0], coords_b[i+1][1]) for i in range(len(coords_b)-1))
        route_b = Route(
            route_id="ROUTE_ALT_B",
            name="Route B (via Indiranagar 100ft Rd)",
            coordinates=coords_b,
            distance_km=dist_b,
            eta_minutes=11.0,
            traffic_condition="moderate_moving",
            description="Bypasses Trinity accident zone via 100ft Road."
        )

        # Route C (Secondary Bypass via Koramangala Inner Ring Rd)
        coords_c = [
            (12.9716, 77.5946),  # MG Road
            (12.9600, 77.6080),  # Richmond Road / Shanthi Nagar
            (12.9500, 77.6250),  # Koramangala Inner Ring Rd
            (12.9540, 77.6400),  # Ejipura Flyover
            (12.9582, 77.6483)   # Manipal Hospital
        ]
        dist_c = sum(haversine_distance_km(coords_c[i][0], coords_c[i][1], coords_c[i+1][0], coords_c[i+1][1]) for i in range(len(coords_c)-1))
        route_c = Route(
            route_id="ROUTE_ALT_C",
            name="Route C (via Inner Ring Road)",
            coordinates=coords_c,
            distance_km=dist_c,
            eta_minutes=14.0,
            traffic_condition="moderate_traffic",
            description="Longer southern bypass route."
        )

        return [route_b, route_c]

    def score_and_select_best_route(self, current_route_eta: float, alternative_routes: List[Route]) -> Dict[str, Any]:
        """
        Score alternative routes and select the best one based on travel time saving.
        """
        best_route = min(alternative_routes, key=lambda r: r.eta_minutes)
        time_saved = current_route_eta - best_route.eta_minutes

        return {
            "recommended_route_id": best_route.route_id,
            "recommended_route_name": best_route.name,
            "recommended_eta_minutes": best_route.eta_minutes,
            "time_saved_minutes": round(time_saved, 1),
            "reason": f"{best_route.name} is {round(time_saved, 1)} minutes faster than delayed original route."
        }

    def build_full_telemetry_payload(self) -> Dict[str, Any]:
        """
        Builds the unified standardized JSON output for Member 3 (Backend),
        Member 1 (GeoAgent), and Member 4 (Frontend).
        """
        planned_route = self.get_planned_route()
        trajectory, current_pos = self.get_actual_deviated_trajectory()
        deviation = self.check_route_deviation(current_pos, planned_route)
        delay_info = self.calculate_incident_delay(planned_route.eta_minutes, severity="high")
        alt_routes = self.generate_alternative_routes()
        recommendation = self.score_and_select_best_route(delay_info["new_eta_minutes"], alt_routes)

        return {
            "ambulance_id": "A102",
            "timestamp": "2026-08-26T22:35:00Z",
            "status": "delayed_and_deviated",
            "location": {
                "lat": current_pos[0],
                "lng": current_pos[1]
            },
            "planned_route": planned_route.to_dict(),
            "planned_eta_minutes": delay_info["original_eta_minutes"],
            "current_eta_minutes": delay_info["new_eta_minutes"],
            "delay_minutes": delay_info["delay_minutes"],
            "route_deviation": deviation,
            "incident": {
                "incident_id": "INC-100",
                "type": "road_accident",
                "severity": "high",
                "location": {
                    "lat": self.incident_location[0],
                    "lng": self.incident_location[1]
                },
                "description": "Multi-vehicle collision near Command Hospital junction"
            },
            "alternative_routes": [
                {
                    "name": "Route A (Current - Delayed)",
                    "eta_minutes": delay_info["new_eta_minutes"],
                    "status": "congested"
                }
            ] + [
                {
                    "name": r.name,
                    "eta_minutes": r.eta_minutes,
                    "status": "recommended" if r.route_id == recommendation["recommended_route_id"] else "available"
                } for r in alt_routes
            ],
            "recommendation": recommendation,
            "backup_ambulance": {
                "recommended": False,
                "reason": f"Delay (+{delay_info['delay_minutes']} min) is below critical threshold (10 min). Route B handles emergency ETA effectively."
            }
        }

    def export_geojson(self) -> Dict[str, Any]:
        """Generate full GeoJSON dataset containing all map layers."""
        planned = self.get_planned_route()
        trajectory, current_pos = self.get_actual_deviated_trajectory()
        alt_routes = self.generate_alternative_routes()

        features = [
            line_to_geojson(planned.coordinates, {"id": "planned_route", "color": "#3B82F6", "name": "Planned Route A"}),
            line_to_geojson(trajectory, {"id": "actual_trajectory", "color": "#EF4444", "name": "Deviated Path", "dash": True}),
            line_to_geojson(alt_routes[0].coordinates, {"id": "alternative_b", "color": "#10B981", "name": "Alternative Route B"}),
            line_to_geojson(alt_routes[1].coordinates, {"id": "alternative_c", "color": "#F59E0B", "name": "Alternative Route C"}),
            point_to_geojson(self.origin[0], self.origin[1], {"id": "start", "label": "Start: MG Road"}),
            point_to_geojson(self.destination[0], self.destination[1], {"id": "destination", "label": "Hospital: Manipal"}),
            point_to_geojson(self.incident_location[0], self.incident_location[1], {"id": "incident", "label": "Accident Zone"}),
            point_to_geojson(current_pos[0], current_pos[1], {"id": "ambulance", "label": "Ambulance A102"})
        ]

        return to_geojson_feature_collection(features)
