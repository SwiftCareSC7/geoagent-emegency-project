# GeoAgentic Emergency Response System - Developer Walkthrough

This document is a technical guide for developers explaining the full architecture, implementation, and inner workings of the GeoAgentic Emergency Response System backend and frontend.

---

## 1. System Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js App Router, TypeScript)               │
│  ├── Landing Page, Login, Signup                         │
│  ├── Driver Dashboard (ETA, Map, Timeline, GeoAgent)     │
│  └── API Adapter (lib/api.ts → mock data or backend)     │
├─────────────────────────────────────────────────────────┤
│  Backend (Express.js, Node.js)                           │
│  ├── Modular Architecture (Auth, Vehicles, Emergencies, │
│  │   Incidents, Trajectories, Routes, Deviation,        │
│  │   Traffic, Analysis, GeoAgents)                      │
│  ├── Deterministic Intelligence Engine                   │
│  └── REST API with JWT Auth + Role-Based Access Control │
├─────────────────────────────────────────────────────────┤
│  Database (MongoDB)                                      │
│  ├── 6 Collections: User, Vehicle, Emergency, Incident,  │
│  │   Trajectory, Route                                   │
│  └── 2dsphere & Compound Indexes                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Part 7 Deep Dive: Intelligence Layer (Deviation, Traffic, ETA, Situation Analysis)

### 2.1 What Part 7 Accomplishes
Part 7 builds the **deterministic intelligence engine** that continuously evaluates an active emergency vehicle's operational state without relying on LLMs for mathematics. It answers key questions:
1. **Has the ambulance deviated from its planned route?**
2. **What is the current severity of the deviation?**
3. **What is the vehicle's progress along the route?**
4. **What are current traffic conditions?**
5. **Are there nearby incidents (accidents, road closures) causing issues?**
6. **What is the estimated time of arrival (ETA) and expected delay?**
7. **What structured evidence explains the situation?**

---

### 2.2 Why Deviation Detection is Deterministic
LLMs are non-deterministic, slow, and prone to mathematical hallucinations when calculating spatial metrics like Euclidean or Haversine distances, geometric projections, and angular differences. 

In our architecture:
- **Backend algorithms** compute exact distances in meters, bearings in degrees, and speed ratios using `@turf/turf`.
- **Downstream AI agents** (the GeoAgent) consume structured, validated metrics to generate explanations and natural language decision recommendations.

---

### 2.3 How GPS and Route Data are Combined

```text
Current GPS Point [lng, lat] (Trajectory)
                 │
                 ▼
        nearestPointOnLine
                 │
  ┌──────────────┴──────────────┐
  ▼                             ▼
Distance from Route (m)     Nearest Point on Route
  │                             │
  ▼                             ▼
Route Segment Bearing      Distance Along Route (m)
  │                             │
  ▼                             ▼
Bearing Difference (°)     Remaining Distance (m)
```

1. **Distance to Route**: `turf.pointToLineDistance` calculates the shortest perpendicular distance (in meters) from the vehicle's coordinates to the planned route `LineString`.
2. **Nearest Point on Route**: `turf.nearestPointOnLine` finds the exact projection point and the segment index along the route.
3. **Bearing Comparison**: 
   - Forward bearing of the route segment is calculated via `getRouteBearingAtPoint`.
   - Vehicle heading from GPS is compared to route bearing: `|((vehicleHeading - routeBearing + 180) % 360) - 180|` gives an angular divergence between 0° and 180°.
4. **Deviation Classification**:
   - `ON_ROUTE`: distance < `ROUTE_WARNING_DISTANCE_METERS` (50m)
   - `WARNING`: distance >= 50m, or approaching threshold with high bearing divergence
   - `DEVIATED`: distance >= `ROUTE_DEVIATION_DISTANCE_METERS` (100m)
   - `CRITICAL_DEVIATION`: distance >= `ROUTE_CRITICAL_DISTANCE_METERS` (250m)

---

### 2.4 GPS Noise and Jitter Mitigation
A single inaccurate GPS reading (e.g. urban canyon multipath reflection) shouldn't trigger a critical alarm. The `evaluateGPSStability` method analyzes the last N points (`GPS_STABILITY_WINDOW = 3`):
- Computes the standard deviation of distances across the window.
- If standard deviation is high (>35m), the trajectory is flagged as `UNSTABLE` with `LOW` confidence, downgrading sudden spikes to `WARNING`.
- If all points in the window are consistently beyond the threshold, it flags `sustainedDeviation: true` with `HIGH` confidence.

---

### 2.5 Route Progress Analysis
Using `calculateRouteProgress(point, lineString)`:
- `distanceAlongRouteMeters`: Distance traveled along the route from origin to projection point.
- `remainingDistanceMeters`: `totalRouteDistanceMeters - distanceAlongRouteMeters`.
- `progressPercentage`: `(distanceAlongRouteMeters / totalRouteDistanceMeters) * 100`.

---

### 2.6 Traffic Conditions Abstraction
The `TrafficService` uses a provider pattern:
- Normalized metrics: `level` (`FREE`, `LIGHT`, `MODERATE`, `HEAVY`, `SEVERE`, `UNKNOWN`), `speedKmh`, `freeFlowSpeedKmh`, `congestionRatio`, `source`.
- Congestion ratio formula: `Math.max(0, Math.min(1, 1 - (speedKmh / freeFlowSpeedKmh)))`.
- `MockTrafficProvider`: Uses coordinate trigonometry hashing to simulate localized traffic density deterministically.

---

### 2.7 Incident Correlation
The `AnalysisService`:
1. Queries all active, non-deleted `Incident` records from MongoDB.
2. Calculates distance from vehicle to incident and distance from route to incident.
3. If either distance is `<= INCIDENT_PROXIMITY_RADIUS_METERS` (500m), the incident is attached to the situation report.
4. Generates structured evidence tags: `ACCIDENT_NEAR_ROUTE`, `ROAD_CLOSURE_NEAR_ROUTE`, `ROAD_WORK_NEAR_ROUTE`, `TRAFFIC_JAM_NEAR_ROUTE`.

---

### 2.8 ETA and Delay Methodology
- **Effective Speed Calculation**:
  - If vehicle is moving (>10 km/h): `effectiveSpeed = 0.4 * currentSpeed + 0.6 * trafficSpeed`.
  - If vehicle is stopped / slow: `effectiveSpeed = trafficSpeed`.
  - Guarded with `Math.max(5, effectiveSpeed)` to prevent division by zero or negative speeds.
- **Current ETA**: `remainingDistanceMeters / (effectiveSpeed / 3.6)` converted to whole minutes.
- **Delay**: `Math.max(0, currentETAMinutes - originalETAMinutes)`.
- **Time Saved**: `Math.max(0, originalETAMinutes - currentETAMinutes)`.

---

### 2.9 Situation Analysis Data Flow

```text
GET /api/analysis/vehicle/:vehicleId
                  │
                  ▼
          Auth & Role Check
                  │
                  ▼
         Find Vehicle & Route
                  │
                  ▼
         Fetch Trajectory Data
                  │
                  ▼
    ┌───────────────────────────┐
    │ Parallel Processing       │
    │ 1. Deviation Engine       │
    │ 2. Route Progress         │
    │ 3. Traffic Provider       │
    │ 4. Incident Correlation   │
    └─────────────┬─────────────┘
                  │
                  ▼
          ETA & Delay Engine
                  │
                  ▼
         Build Evidence List
                  │
                  ▼
      Return Normalized JSON
```

---

## 3. File-by-File Explanation (Part 7 Additions)

### Shared Geospatial Services
- [`server/shared/services/geospatial.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/shared/services/geospatial.service.js):
  - Added `calculateRouteProgress(point, lineString)`: Uses Turf to calculate route progress percentage, distance traveled, and remaining distance.
  - Added `getRouteBearingAtPoint(lineString, point)`: Finds closest route segment and calculates forward bearing in degrees.

### Deviation Module (`server/modules/deviation/`)
- [`deviation.config.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/deviation/deviation.config.js): Defines configurable distance thresholds (warning: 50m, deviation: 100m, critical: 250m), bearing thresholds (30°, 60°), and stability window (3 points).
- [`deviation.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/deviation/deviation.service.js): Implements `analyzeDeviation`, `evaluateGPSStability`, `calculateBearingDifference`, and `getDeviationForVehicle`.
- [`deviation.controller.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/deviation/deviation.controller.js): Handles HTTP requests for `GET /api/deviation/vehicle/:vehicleId`.
- [`deviation.routes.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/deviation/deviation.routes.js): Registers protected routes with `protect` and `requireRole('CONTROL_ROOM', 'ADMIN')`.
- [`deviation.validation.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/deviation/deviation.validation.js): Validates vehicleId parameter.

### Traffic Module (`server/modules/traffic/`)
- [`traffic.config.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/traffic/traffic.config.js): Configures default free flow speed (45 km/h) and congestion ratio thresholds.
- [`traffic.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/traffic/traffic.service.js): Pluggable traffic abstraction layer selecting configured provider.
- [`providers/mockTrafficProvider.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/traffic/providers/mockTrafficProvider.js): Deterministic mock traffic provider for point and route queries.
- [`traffic.controller.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/traffic/traffic.controller.js): Handles `GET /api/traffic/location?lng=...&lat=...`.
- [`traffic.routes.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/traffic/traffic.routes.js): Registers traffic endpoints with auth.

### Analysis Module (`server/modules/analysis/`)
- [`analysis.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/analysis/analysis.service.js): Orchestrates deviation, traffic, incidents, ETA, delay, and evidence into a unified `VehicleSituation`.
- [`analysis.controller.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/analysis/analysis.controller.js): Handles `GET /api/analysis/vehicle/:vehicleId`.
- [`analysis.routes.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/analysis/analysis.routes.js): Registers protected analysis routes.
- [`analysis.validation.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/analysis/analysis.validation.js): Validates request parameters.

### Route Extension
- [`server/modules/routes/route.controller.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/routes/route.controller.js): Added `getRouteAnalysis` handler.
- [`server/modules/routes/route.routes.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/routes/route.routes.js): Added `GET /:routeId/analysis` route.

### Server & Configuration
- [`server/server.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/server.js): Mounted `/api/deviation`, `/api/traffic`, and `/api/analysis`.
- [`server/.env.example`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/.env.example): Added configuration defaults for deviation, traffic, and incident proximity.
- [`server/test-part7.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/test-part7.js): Unit and logic verification test suite.

---

## 4. Database & Performance Considerations

- **No New Collections**: Calculations are computed dynamically to ensure 100% fresh real-time state and eliminate stale cache synchronization issues.
- **Bounded Queries**: Trajectory fetching uses `limit(GPS_STABILITY_WINDOW)` over the compound index `{ vehicle: 1, timestamp: -1 }`, ensuring sub-millisecond query execution.
- **Soft Deletion Filtering**: Incidents and Vehicles are always checked for `isDeleted: false`.

---

## 5. Security & Failure Handling

- **Authentication**: All analysis endpoints require valid JWT cookies and `CONTROL_ROOM` or `ADMIN` roles.
- **Safe Degradation**:
  - Missing vehicle → 404
  - Missing route → 404 (`No active route found`)
  - Missing trajectory → 404 (`No trajectory data available`)
  - Zero / invalid speed → ETA engine clamps to minimum 5 km/h to prevent `Infinity` / NaN
  - Upstream provider errors → masked with safe fallbacks

---

## 6. How to Run & Verify

1. **Run Unit & Logic Tests**:
   ```bash
   cd server
   node test-part7.js
   ```
2. **Start Backend**:
   ```bash
   npm run dev
   ```
3. **Query Situation Analysis**:
   ```bash
   # After logging in and obtaining cookie:
   curl -b cookies.txt http://localhost:5000/api/analysis/vehicle/AMB-001
   ```
