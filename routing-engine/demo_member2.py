"""
Demo & Verification Script for Member 2 (Maps & Emergency Routing Specialist)
GeoAgent Emergency Vehicle Movement Framework

Runs Day 1 & Day 2 verification steps:
1. Calculates A -> B planned route & metrics
2. Simulates live GPS telemetry & detects route deviation (>100m)
3. Applies traffic/incident impact & calculates delayed ETA
4. Evaluates & scores alternative emergency routes
5. Exports standardized JSON & GeoJSON outputs for team integration
"""

import sys
import json
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from routes_engine import GeoRoutingEngine, LOCATION_MG_ROAD, LOCATION_MANIPAL_HOSPITAL


def run_member2_demo():
    print("=" * 70)
    print("[EMERGENCY CONTROL] MEMBER 2 (MAPS & ROUTING) - VERIFICATION DEMO")
    print("=" * 70)

    engine = GeoRoutingEngine()

    print("\n[STEP 1] Calculate Planned Route (Origin -> Destination)")
    planned_route = engine.get_planned_route()
    print(f"   - Route Name:   {planned_route.name}")
    print(f"   - Start Point:  {LOCATION_MG_ROAD} (MG Road)")
    print(f"   - Destination:  {LOCATION_MANIPAL_HOSPITAL} (Manipal Hospital)")
    print(f"   - Distance:     {planned_route.distance_km} km")
    print(f"   - Original ETA: {planned_route.eta_minutes} minutes")
    print(f"   - Waypoints:    {len(planned_route.coordinates)} coordinates calculated")

    print("\n[STEP 2] Live Telemetry Simulation & Route Deviation Check")
    trajectory, current_pos = engine.get_actual_deviated_trajectory()
    deviation = engine.check_route_deviation(current_pos, planned_route)
    print(f"   - Current GPS:                {current_pos[0]}, {current_pos[1]} (Indiranagar 100ft Rd)")
    print(f"   - Distance from Planned Path: {deviation['distance_from_planned_route_meters']} meters")
    print(f"   - Deviation Threshold:        {deviation['threshold_meters']} meters")
    if deviation["detected"]:
        print("   - [WARNING] DEVIATION STATUS: ALARM TRIGGERED (Ambulance left planned route!)")
    else:
        print("   - [OK] DEVIATION STATUS: On Planned Route")

    print("\n[STEP 3] Incident Impact & Delay Prediction")
    delay = engine.calculate_incident_delay(planned_route.eta_minutes, severity="high")
    print("   - Incident Type:  Road Accident (Trinity / Airport Rd Junction)")
    print(f"   - Original ETA:   {delay['original_eta_minutes']} min")
    print(f"   - Delay Added:    +{delay['delay_minutes']} min")
    print(f"   - Current ETA:    {delay['new_eta_minutes']} min")

    print("\n[STEP 4] Alternative Routes & Best Route Recommendation")
    alt_routes = engine.generate_alternative_routes()
    for route in alt_routes:
        print(f"   * {route.name}: {route.distance_km} km | ETA: {route.eta_minutes} min | V2X Signals: {route.green_wave_signals} | {route.description}")
    
    recommendation = engine.score_and_select_best_route(delay["new_eta_minutes"], alt_routes)
    print(f"\n   [RECOMMENDED SELECTION] {recommendation['recommended_route_name']}")
    print(f"   - Alternative ETA:       {recommendation['recommended_eta_minutes']} min")
    print(f"   - Time Saved:            {recommendation['time_saved_minutes']} min faster than delayed Route A")
    print(f"   - Decision Rationale:    {recommendation['reason']}")

    print("\n[STEP 5] Exporting Standardized Data for Team Integration")
    output_dir = Path(__file__).parent
    
    telemetry_payload = engine.build_full_telemetry_payload()
    telemetry_path = output_dir / "telemetry_output.json"
    with open(telemetry_path, "w", encoding="utf-8") as f:
        json.dump(telemetry_payload, f, indent=2)
    print(f"   [OK] Saved standardized payload: {telemetry_path.name}")

    geojson_payload = engine.export_geojson()
    geojson_path = output_dir / "routes_geojson.json"
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson_payload, f, indent=2)
    print(f"   [OK] Saved GeoJSON map layers:  {geojson_path.name}")

    print("\n" + "=" * 70)
    print("[SUCCESS] MEMBER 2 DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_member2_demo()
