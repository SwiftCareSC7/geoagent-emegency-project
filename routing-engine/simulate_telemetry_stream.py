"""
Live Telemetry & Incident Simulation Stream for Member 2
GeoAgent Emergency Vehicle Movement Framework

Simulates minute-by-minute telemetry stream:
10:00 -> Ambulance En Route (Normal)
10:01 -> Traffic Congestion building
10:02 -> Accident Reported on HAL Airport Rd
10:03 -> Ambulance Deviates off route (Indiranagar 100ft Rd)
10:04 -> Deviation Detected & Alternative Route B Calculated
10:05 -> Rerouted to Manipal Hospital (ETA 11 min)
"""

import sys
import time
import json
from routes_engine import GeoRoutingEngine

# Ensure UTF-8 output encoding for Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


def run_live_simulation(delay_seconds: float = 1.5):
    engine = GeoRoutingEngine()

    timeline = [
        {
            "time": "10:00",
            "status": "normal",
            "lat": 12.9716,
            "lng": 77.5946,
            "desc": "Ambulance A102 dispatched from MG Road. ETA: 10 min.",
            "incident": False,
            "deviation": False
        },
        {
            "time": "10:01",
            "status": "normal",
            "lat": 12.9730,
            "lng": 77.6030,
            "desc": "Passing Mayo Hall. Speed: 42 km/h. Traffic smooth.",
            "incident": False,
            "deviation": False
        },
        {
            "time": "10:02",
            "status": "incident_ahead",
            "lat": 12.9735,
            "lng": 77.6110,
            "desc": "⚠️ INCIDENT DETECTED: Accident near Trinity Junction. Traffic backing up.",
            "incident": True,
            "deviation": False
        },
        {
            "time": "10:03",
            "status": "deviating",
            "lat": 12.9745,
            "lng": 77.6120,
            "desc": "🚨 AMBULANCE DEVIATING: Turning towards Indiranagar 100ft Road.",
            "incident": True,
            "deviation": True
        },
        {
            "time": "10:04",
            "status": "rerouted",
            "lat": 12.9760,
            "lng": 77.6200,
            "desc": "🧠 GEOAGENT DECISION: Route B recommended. New ETA: 11 min (Saved 5 min).",
            "incident": True,
            "deviation": True
        }
    ]

    print("=" * 70)
    print("🎬 LIVE AMBULANCE TELEMETRY SIMULATION STREAM (MEMBER 2)")
    print("=" * 70)

    for step in timeline:
        print(f"\n⏰ [{step['time']}] Location: ({step['lat']}, {step['lng']})")
        print(f"   Status: {step['status'].upper()}")
        print(f"   Message: {step['desc']}")
        
        if step["deviation"]:
            deviation = engine.check_route_deviation((step["lat"], step["lng"]), engine.get_planned_route())
            print(f"   🚨 Deviation Alarm: {deviation['distance_from_planned_route_meters']}m off planned route!")
            
        time.sleep(delay_seconds)

    print("\n" + "=" * 70)
    print("✅ SIMULATION COMPLETE: Ready to connect live stream to Backend (Member 3)!")
    print("=" * 70)


if __name__ == "__main__":
    run_live_simulation()
