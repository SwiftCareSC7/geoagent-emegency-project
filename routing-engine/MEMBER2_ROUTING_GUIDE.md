# Member 2: Emergency Spatial Routing, Deviation Engine & Differentiation Framework

This documentation details the implementation of **Member 2 (Maps & Routing Specialist)** within the `geoagent-emegency-project` repository.

---

## 🚀 Key Differentiators: GeoAgent Emergency Routing vs. Google Maps

Consumer navigation apps like Google Maps are designed for everyday civilian commuters. The GeoAgent Emergency Routing Engine is specifically engineered for Emergency Vehicle Dispatch and Hospital Trauma Operations:

1. **Spatial Point-to-Polyline Deviation Alarm**:
   - *Google Maps*: Silently recalculates a driver's route when they turn without alerting anyone.
   - *GeoAgent*: Computes perpendicular distance from live GPS telemetry to the planned polyline. If drift > 100 meters, it triggers a **CRITICAL CONTROL ROOM ALARM** and initiates cause classification.

2. **Patient Medical Severity & ICU Readiness Matching**:
   - *Google Maps*: Routes to the nearest physical hospital building.
   - *GeoAgent*: Evaluates receiving hospital ICU bed availability, specialist readiness, and patient triage score to determine the optimal emergency destination.

3. **Emergency Corridor V2X Green-Wave Synchronization**:
   - *Google Maps*: Expects vehicles to wait at red traffic lights and in congestion queues.
   - *GeoAgent*: Scores alternative routes based on V2X traffic light green-wave synchronization capability to clear bottleneck intersections ahead of the vehicle.

4. **Automated Secondary Backup Dispatch Evaluation**:
   - *Google Maps*: Operates on a single vehicle instance.
   - *GeoAgent*: Evaluates whether predicted delay (+6 min) exceeds critical thresholds to advise whether a secondary backup ambulance should be dispatched simultaneously.

---

## 🛠️ Engine Architecture & File Structure

Path: `routing-engine/`

| File | Description |
| :--- | :--- |
| [`geo_utils.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/geo_utils.py) | Haversine distance, perpendicular point-to-segment projection, and GeoJSON generators. |
| [`routes_engine.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/routes_engine.py) | Core engine: Planned route generation, deviation detection, traffic delay modeling, alternative route scoring, and JSON contract generator. |
| [`demo_member2.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/demo_member2.py) | Verification test script running Day 1 & Day 2 goals. |
| [`simulate_telemetry_stream.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/simulate_telemetry_stream.py) | Real-time minute-by-minute telemetry stream simulator. |
| [`map_visualizer.html`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/map_visualizer.html) | Interactive Leaflet control room dashboard visualizing routes & status. |
| [`telemetry_output.json`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/telemetry_output.json) | Standardized JSON contract for Backend API & AI GeoAgent tools. |
| [`routes_geojson.json`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-emegency-project/routing-engine/routes_geojson.json) | Standard GeoJSON feature collection for Leaflet / React map layers. |

---

## 🧪 How to Run & Verify

1. **Execute Verification Script**:
   ```bash
   cd routing-engine
   python demo_member2.py
   ```

2. **Execute Live Telemetry Stream**:
   ```bash
   python simulate_telemetry_stream.py
   ```

3. **Open Visual Map**:
   Open `map_visualizer.html` in Chrome or Edge to view the interactive Leaflet control-room map.
