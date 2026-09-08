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

All files for the Python spatial routing module are located in `routing-engine/`:

| File | Purpose |
| :--- | :--- |
| [`geo_utils.py`](geo_utils.py) | Math functions (Haversine, Point-to-Segment projection, GeoJSON helpers). |
| [`routes_engine.py`](routes_engine.py) | Main engine: Planned route calculation, deviation detection, delay engine, alternative route generator, and team JSON payload builder. |
| [`demo_member2.py`](demo_member2.py) | Interactive CLI verification test script. |
| [`map_visualizer.html`](map_visualizer.html) | Standalone interactive Leaflet map dashboard visualizing routes & status. |
| [`telemetry_output.json`](telemetry_output.json) | Standardized telemetry JSON exported for Backend & GeoAgent AI. |
| [`routes_geojson.json`](routes_geojson.json) | Standard GeoJSON file exported for Frontend Leaflet maps. |

---

## 🚀 How to Run and Test Your Work

### 1. Run Terminal Verification
Run the verification script from the `routing-engine/` directory:
```bash
cd routing-engine
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
Open [`map_visualizer.html`](map_visualizer.html) in any modern web browser (Chrome, Edge, Firefox, Safari).
You will see:
- 🔵 **Planned Route A** (Blue line)
- 🔴 **Deviated Trajectory & Live Ambulance** (Red dashed line & marker)
- ⚠️ **Accident Zone Marker** (Red pulsing marker)
- 🟢 **Recommended Alternative Route B** (Green line - 11 min ETA)
- 📊 **Telemetry Control Panel** (Live status badges)

---

## 🤝 Team Handoff & Production Integration

### 1. For Backend & AI Services (`server/`)
The algorithms and concepts prototyped here have been operationalized in the Node.js backend:
- `deviation.service.js`: Cross-track distance, bearing divergence, and rolling jitter stability window.
- `routeComparison.service.js`: Candidate alternative scoring and "What if we do nothing?" deterministic delay projection.
- `geoAgent.tools.js`: Exposes 9 advisory tools to Gemini 2.5 Flash including `getRecentTrajectory` and `getRouteAlternatives`.

### 2. For Frontend & Interactive GIS Map (`components/dashboard/real-interactive-map.tsx`)
Member 2's Bengaluru coordinates, corridor polylines, V2X traffic signals, and Leaflet visualizer have been fully integrated into the Next.js React application as `RealInteractiveMap`, featuring:
- Live multi-route rendering (Planned Route A, Deviated Trajectory, Recommended Route B, Alternative Route C).
- Real-time GPS simulation controls (Play, Pause, Reset) along coordinates.
- Multi-horizon spatio-temporal traffic forecast (+0m, +10m, +20m, +30m).
- V2X signal preemption clearance points (Mayo Hall Junction, 100ft Rd, HAL 2nd Stage, Airport Rd).
- Emergency vehicle audio siren synthesis.

---

> [!TIP]
> The Python spatial routing prototype serves as the algorithmic foundation for the live full-stack system and remains fully runnable standalone via `python demo_member2.py`.
