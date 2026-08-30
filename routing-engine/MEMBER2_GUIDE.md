# Member 2 Guide: Maps, Trajectory & ETA Simulation Engine

Welcome Member 2! As the **Maps & Routing Specialist** for the **GeoAgent Framework**, your core job is to calculate emergency routes, track ambulance movement, detect when the vehicle strays off its route, compute traffic delays, score alternative routes, and feed structured data to the rest of your team.

---

## 📚 What You Learned & Built

### 1. Concepts Mastered
- **Coordinates & Polylines**: Latitude and longitude arrays forming route paths.
- **Haversine Distance**: Calculating spherical earth distance between GPS points in meters and kilometers.
- **Point-to-Polyline Deviation**: Calculating the perpendicular distance from a live GPS coordinate to a planned route segment. If distance > `100 meters`, a route deviation alarm is triggered.
- **Traffic & Incident Delay**: Modeling delay penalties (+6 min) caused by high-severity road accidents.
- **Alternative Route Scoring**: Comparing delayed primary routes against bypass routes (e.g. Route B via Indiranagar 100ft Road) to select the path that minimizes ETA.
- **GeoJSON Standard**: Converting routes, markers, and polylines into GeoJSON `FeatureCollection` format for web maps (Leaflet / Google Maps).

---

## 🛠️ Code Structure

All your files are located at:
`C:\Users\Oshika Tiwari\.gemini\antigravity\scratch\geoagent-routing\`

| File | Purpose |
| :--- | :--- |
| [`geo_utils.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/geo_utils.py) | Math functions (Haversine, Point-to-Segment projection, GeoJSON helpers). |
| [`routes_engine.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/routes_engine.py) | Main engine: Planned route calculation, deviation detection, delay engine, alternative route generator, and team JSON payload builder. |
| [`demo_member2.py`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/demo_member2.py) | Interactive CLI verification test script. |
| [`map_visualizer.html`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/map_visualizer.html) | Standalone interactive Leaflet map dashboard visualizing routes & status. |
| [`telemetry_output.json`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/telemetry_output.json) | Standardized telemetry JSON exported for Member 3 (Backend) & Member 1 (GeoAgent). |
| [`routes_geojson.json`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/routes_geojson.json) | Standard GeoJSON file exported for Member 4 (React Frontend map). |

---

## 🚀 How to Run and Test Your Work

### 1. Run Terminal Verification
Run the verification script from your workspace directory:
```bash
python demo_member2.py
```

Expected Output:
```text
[STEP 1] Calculate Planned Route -> Route A (6.22 km, 10.0 min ETA)
[STEP 2] Route Deviation Check   -> 444.7m off-route (ALARM TRIGGERED)
[STEP 3] Incident & Delay Check  -> Accident (+6 min delay, Current ETA: 16.0 min)
[STEP 4] Alternative Routes      -> Route B (ETA: 11.0 min, Saves 5.0 min)
[STEP 5] Data Export             -> Saved telemetry_output.json & routes_geojson.json
```

### 2. View the Interactive Map
Open [`map_visualizer.html`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/map_visualizer.html) in any web browser (Chrome, Edge, Firefox).
You will see:
- 🔵 **Planned Route A** (Blue line)
- 🔴 **Deviated Trajectory & Live Ambulance** (Red dashed line & marker)
- ⚠️ **Accident Zone Marker** (Red pulsing marker)
- 🟢 **Recommended Alternative Route B** (Green line - 11 min ETA)
- 📊 **Telemetry Control Panel** (Live status badges)

---

## 🤝 Team Handoff (How your code connects to teammates)

### 1. For Member 1 (AI GeoAgent)
Give Member 1 the following python tools from `routes_engine.py`:
- `engine.check_route_deviation(current_location, planned_route)`
- `engine.calculate_incident_delay(original_eta, severity)`
- `engine.generate_alternative_routes()`
- `engine.score_and_select_best_route()`

### 2. For Member 3 (Backend & Data)
Member 3's FastAPI backend will load your generated [`telemetry_output.json`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/telemetry_output.json) to serve `GET /ambulance/A102` and `GET /routes/alternative`.

### 3. For Member 4 (Frontend & Map UI)
Member 4's React dashboard will load your [`routes_geojson.json`](file:///C:/Users/Oshika%20Tiwari/.gemini/antigravity/scratch/geoagent-routing/routes_geojson.json) into Leaflet or Google Maps to render the route polylines and live ambulance position.

---

> [!TIP]
> You are fully prepared for **Day 1 & Day 2**! Your code is clean, modular, and tested.
