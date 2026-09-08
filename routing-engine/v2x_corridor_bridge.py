#!/usr/bin/env python3
"""
SwiftCare GeoAgent — V2X Corridor & Green-Wave Analysis Bridge (Python)
Maps & Routing Specialist Engine

Accepts JSON input via stdin or --json argument:
- vehicleLocation: { lat, lng }
- plannedRouteCoordinates: [[lat, lng], ...]
- speedKmh: float
- heading: float
- incidents: [{ id, location: { lat, lng }, severity }]
- signals: [{ id, name, lat, lng }] (optional, defaults to corridor preset)

Outputs standardized JSON to stdout:
- deviation: { detected, distanceFromPlannedRouteMeters, thresholdMeters }
- v2xSignals: [{ id, name, lat, lng, distanceMeters, status, crossTrafficState }]
- corridorSummary: { totalSignals, preemptedCount, civilianAlertedCount, timeSavedMinutes, corridorHealth }
- alternativeRoutes: [{ routeId, name, distanceKm, etaMinutes, greenWaveEtaMinutes }]
"""

import sys
import json
import argparse
from typing import List, Tuple, Dict, Any

from geo_utils import (
    haversine_distance_meters,
    haversine_distance_km,
    point_to_polyline_distance_meters
)
from routes_engine import GeoRoutingEngine

# Default Corridor V2X Signals along Bengaluru Emergency Corridors
DEFAULT_V2X_SIGNALS = [
    {"id": "V2X-SIG-01", "name": "Mayo Hall Junction", "lat": 12.9730, "lng": 77.6030},
    {"id": "V2X-SIG-02", "name": "100ft Rd Signal #1", "lat": 12.9760, "lng": 77.6200},
    {"id": "V2X-SIG-03", "name": "HAL 2nd Stage Signal", "lat": 12.9690, "lng": 77.6350},
    {"id": "V2X-SIG-04", "name": "Airport Rd Preempt", "lat": 12.9620, "lng": 77.6430}
]

DEVIATION_THRESHOLD_METERS = 100.0


def analyze_v2x_corridor(
    vehicle_lat: float,
    vehicle_lng: float,
    speed_kmh: float = 40.0,
    heading: float = 0.0,
    route_coords: List[Tuple[float, float]] = None,
    incidents: List[Dict[str, Any]] = None,
    signals: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes spatial deviation, V2X signal preemption, corridor health,
    and alternative bypass route options.
    """
    engine = GeoRoutingEngine()

    if not route_coords:
        route_coords = engine.get_planned_route().coordinates

    if signals is None:
        signals = DEFAULT_V2X_SIGNALS

    if incidents is None:
        incidents = []

    # 1. Point-to-polyline cross-track deviation calculation
    distance_to_route = point_to_polyline_distance_meters((vehicle_lat, vehicle_lng), route_coords)
    is_deviated = distance_to_route > DEVIATION_THRESHOLD_METERS

    # 2. V2X Signal Preemption Evaluation
    evaluated_signals = []
    preempted_count = 0
    total_civilian_alerted = 0

    for sig in signals:
        s_lat = sig.get("lat")
        s_lng = sig.get("lng")
        dist_m = haversine_distance_meters(vehicle_lat, vehicle_lng, s_lat, s_lng)

        # Signal states based on distance to approaching emergency vehicle
        if dist_m <= 150.0:
            status = "GREEN_WAVE_ACTIVE"
            cross_state = "HOLDING_RED"
            preempted = True
            civilian_alerted = 45
        elif dist_m <= 500.0:
            status = "FORCED_GREEN_4S"
            cross_state = "HOLDING_RED"
            preempted = True
            civilian_alerted = 35
        elif dist_m <= 1200.0:
            status = "PREEMPTION_REQUESTED"
            cross_state = "CLEARING_CROSS_TRAFFIC"
            preempted = True
            civilian_alerted = 25
        else:
            status = "APPROACHING"
            cross_state = "NORMAL_CYCLE"
            preempted = False
            civilian_alerted = 0

        if preempted:
            preempted_count += 1
            total_civilian_alerted += civilian_alerted

        # Estimated arrival time at this signal in seconds
        eff_speed_mps = max(5.0, (speed_kmh or 40.0) / 3.6)
        time_to_signal_sec = round(dist_m / eff_speed_mps, 1)

        evaluated_signals.append({
            "id": sig.get("id"),
            "name": sig.get("name"),
            "lat": s_lat,
            "lng": s_lng,
            "distanceMeters": round(dist_m, 1),
            "timeToSignalSeconds": time_to_signal_sec,
            "status": status,
            "crossTrafficState": cross_state,
            "civilianAlertedCount": civilian_alerted
        })

    # Sort signals by distance to emergency vehicle
    evaluated_signals.sort(key=lambda x: x["distanceMeters"])

    # 3. Corridor Incident Check (determine if corridor is physically blocked)
    corridor_has_blockage = False
    closest_incident_dist = float("inf")
    for inc in incidents:
        loc = inc.get("location") or {}
        if isinstance(loc, dict):
            i_lat = loc.get("lat") or loc.get("coordinates", [0, 0])[1]
            i_lng = loc.get("lng") or loc.get("coordinates", [0, 0])[0]
        else:
            continue

        d_route = point_to_polyline_distance_meters((i_lat, i_lng), route_coords)
        if d_route < 120.0:
            corridor_has_blockage = True
            closest_incident_dist = min(closest_incident_dist, d_route)

    # 4. Corridor Health Assessment
    if corridor_has_blockage:
        corridor_health = "CORRIDOR_BLOCKED"
    elif preempted_count >= len(signals) - 1:
        corridor_health = "GREEN_WAVE_ACTIVE"
    elif preempted_count > 0:
        corridor_health = "PARTIALLY_PREEMPTED"
    else:
        corridor_health = "APPROACHING_CORRIDOR"

    # Time savings from green-wave preemption (approx ~45 sec per preempted signal node)
    time_saved_minutes = round((preempted_count * 48.0) / 60.0, 1)

    # 5. Alternative Bypass Routes
    alt_routes = engine.generate_alternative_routes()
    alternatives_payload = []
    for r in alt_routes:
        # Green-wave benefit on alternative route (approx 1.5 - 2.5 min savings)
        gw_eta = max(1.0, round(r.eta_minutes - 2.0, 1))
        alternatives_payload.append({
            "routeId": r.route_id,
            "name": r.name,
            "distanceKm": r.distance_km,
            "etaMinutes": r.eta_minutes,
            "greenWaveEtaMinutes": gw_eta,
            "trafficCondition": r.traffic_condition,
            "description": r.description
        })

    return {
        "deviation": {
            "detected": is_deviated,
            "distanceFromPlannedRouteMeters": round(distance_to_route, 1),
            "thresholdMeters": DEVIATION_THRESHOLD_METERS,
            "status": "CRITICAL_DEVIATION" if distance_to_route > 250 else ("WARNING" if is_deviated else "NOMINAL")
        },
        "v2xSignals": evaluated_signals,
        "corridorSummary": {
            "totalSignals": len(signals),
            "preemptedCount": preempted_count,
            "civilianAlertedCount": total_civilian_alerted,
            "timeSavedMinutes": time_saved_minutes,
            "corridorHealth": corridor_health,
            "corridorClearanceRate": round((preempted_count / max(1, len(signals))) * 100, 1)
        },
        "alternativeRoutes": alternatives_payload
    }


def main():
    parser = argparse.ArgumentParser(description="V2X Corridor & Green-Wave Analysis Bridge")
    parser.add_argument("--json", type=str, help="Raw JSON input payload string")
    parser.add_argument("--file", type=str, help="Path to JSON input file")
    args = parser.parse_args()

    input_data = {}
    if args.json:
        input_data = json.loads(args.json)
    elif args.file:
        with open(args.file, "r") as f:
            input_data = json.load(f)
    else:
        import select
        try:
            if not sys.stdin.isatty() and select.select([sys.stdin], [], [], 0.02)[0]:
                stdin_content = sys.stdin.read().strip()
                if stdin_content:
                    input_data = json.loads(stdin_content)
        except Exception:
            pass

    # Default fallback values for demonstration/testing
    vehicle_loc = input_data.get("vehicleLocation") or {"lat": 12.9730, "lng": 77.6030}
    lat = float(vehicle_loc.get("lat", 12.9730))
    lng = float(vehicle_loc.get("lng", 77.6030))
    speed = float(input_data.get("speedKmh", 42.0))
    heading = float(input_data.get("heading", 85.0))

    raw_coords = input_data.get("plannedRouteCoordinates")
    route_coords = None
    if raw_coords:
        route_coords = [(float(c[0]), float(c[1])) for c in raw_coords]

    incidents = input_data.get("incidents", [])
    signals = input_data.get("signals")

    result = analyze_v2x_corridor(
        vehicle_lat=lat,
        vehicle_lng=lng,
        speed_kmh=speed,
        heading=heading,
        route_coords=route_coords,
        incidents=incidents,
        signals=signals
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
