# GeoAgentic Emergency Response System - Developer Walkthrough

This document serves as a guide for developers to understand the backend architecture, features, and setup of the GeoAgentic Emergency Response System.

---

## 1. Architecture

The backend follows a **Feature-Based (Modular) Architecture**. This ensures that as the system grows (adding GPS, GeoAgents, routing), features do not become entangled.

```text
Request
  ↓
Middleware (Auth, Rate Limiting, CORS)
  ↓
Route (Role authorization & schema validation)
  ↓
Controller (Thin: parses req, calls service, formats res)
  ↓
Service (Fat: core business logic, DB transactions)
  ↓
Model (Mongoose schema)
  ↓
MongoDB
```

---

## 2. What Was Already Built (Parts 1–4)

- **Part 1 (Foundation)**: Express setup, global error handling, Helmet for security, CORS, MongoDB connection.
- **Part 2 (Authentication)**: `User` model, JWT token generation, HTTP-only cookie delivery, auth middleware, and Role-Based Access Control (`CONTROL_ROOM`, `ADMIN`).
- **Part 3 (Vehicles)**: `Vehicle` module for managing emergency vehicles. Setup of the modular architecture.
- **Part 4 (Emergencies & Incidents)**: `Emergency` and `Incident` models with GeoJSON locations, `2dsphere` indexes, soft deletions, and vehicle assignment transactions.

---

## 3. What Part 5 Added (GPS & Trajectories)

Part 5 implements the foundation for tracking emergency vehicles over time.
- **`Trajectory` Model**: Stores individual GPS ping observations instead of storing a massive array inside the `Vehicle` model. This prevents unbounded MongoDB document growth.
- **GeoJSON**: GPS location data is validated strictly as `[longitude, latitude]`.
- **Compound Indexes**: Utilizes highly optimized indexes (`{ vehicle: 1, timestamp: -1 }`) to efficiently fetch the latest and recent trajectories without full collection scans.
- **Safe Pagination**: Caps query limits to prevent memory crashes.

---

## 4. File-by-File Explanation (Part 5 Additions)

### Trajectories (`server/modules/trajectories/`)
- **`trajectory.model.js`**: Defines the `Trajectory` schema. References the `Vehicle` ObjectId. Enforces ranges for `speed` (0-250) and `heading` (0-360). Creates the crucial compound index for performance.
- **`trajectory.validation.js`**: Reuses GeoJSON validation. Prevents future clock-skews in `timestamp` (no more than 5 minutes ahead). Rejects unreasonable speeds and headings.
- **`trajectory.service.js`**: The core business logic. 
  - **Duplicate/Out-of-Order strategy**: Ingestion simply accepts incoming GPS data as-is, relying on the actual `timestamp`. Since queries sort by `timestamp: -1`, out-of-order data automatically rights itself on retrieval. 
  - Verifies that the vehicle exists and is in a tracking-appropriate status (`DISPATCHED`, `EN_ROUTE`, etc.).
- **`trajectory.controller.js`**: API handlers returning data safely. Ensures the requested `vehicleId` is attached to responses while hiding internal ObjectIds.
- **`trajectory.routes.js`**: Exposes POST (ingest), GET latest, GET recent, and GET history. Protected by `CONTROL_ROOM` and `ADMIN` auth.

---

## 5. Trajectory Data Flow

### GPS Ingestion Flow
```text
POST /api/trajectories
        ↓
`authMiddleware` + `roleMiddleware`
        ↓
`trajectory.validation.js` (validates speed, heading, GeoJSON, timestamp skew)
        ↓
`trajectory.service.js` -> Checks if Vehicle exists and status != OFFLINE/MAINTENANCE
        ↓
MongoDB `Trajectory` Collection (Saves point)
```

### Latest Location Flow
```text
GET /api/trajectories/AMB-001/latest
        ↓
Service resolves Vehicle ObjectId
        ↓
MongoDB Query: find({ vehicle }).sort({ timestamp: -1 }).limit(1)
(Executes instantly via compound index)
```

---

## 6. Database Relationships

```text
User
 │
 ├── creates → Emergency
 │
 └── reports → Incident

Vehicle
 │
 └── (has many) → Trajectory

Emergency
 │
 └── assignedVehicle → Vehicle

Incident
 │
 └── optionally references → Emergency
```

---

## 7. GeoJSON & Coordinate Ordering

Coordinates are stored strictly as `[longitude, latitude]`. This is the standard mandated by the GeoJSON spec and MongoDB. If stored as `[latitude, longitude]`, MongoDB's `2dsphere` indexes will calculate distances incorrectly or fail entirely.

---

## 8. Security Walkthrough (Part 5 Additions)

- **Pagination Bounds**: The Trajectory History endpoint (`GET /api/trajectories/:vehicleId`) hard-caps the `limit` query param to 100, regardless of what the user requests. This prevents malicious "fetch all" requests from OOM-crashing the Node server.
- **Clock Skew Prevention**: GPS payloads containing timestamps extremely far into the future (e.g. year 2099) are rejected. 
- **Vehicle Status Gating**: GPS endpoints reject data for vehicles in `OFFLINE` or `MAINTENANCE` status.

---

## 9. Testing Walkthrough

To test the APIs using `curl` or Postman:

1. **Login** to get your HTTP-only cookie.
2. **Ingest GPS Point**:
   ```json
   POST /api/trajectories
   {
     "vehicleId": "AMB-001",
     "location": {
       "type": "Point",
       "coordinates": [77.5946, 12.9716]
     },
     "speed": 65,
     "heading": 90,
     "timestamp": "2026-08-27T10:00:00.000Z",
     "source": "SIMULATOR"
   }
   ```
3. **Get Latest Point**:
   ```
   GET /api/trajectories/AMB-001/latest
   ```
4. **Get History (Paginated)**:
   ```
   GET /api/trajectories/AMB-001?page=1&limit=50
   ```

---

## 10. Future Connection (Part 5)

This module lays the groundwork for the core intelligence of the system. In future steps:
- **Routing & Geospatial Engine**: Will consume the latest location to compute live ETAs.
- **Deviation Detection**: Will compare the `recent` trajectory points against the assigned route to detect if the driver has gone off-path.
- **GeoAgent**: The AI will query `Incident` collections near the latest `Trajectory.location` to proactively warn control rooms of impending delays.

---

## 11. What Part 6 Added (Routing & Geospatial Processing)

Part 6 introduces the engine that calculates, stores, and analyzes emergency vehicle routes.
- **`Route` Model**: A dedicated MongoDB collection to store planned and alternative routes. By separating routes into their own collection rather than embedding them in `Emergency` or `Vehicle`, we allow for multiple historical routes, alternative routes, and independent route querying.
- **Routing Provider Abstraction**: A decoupled architecture (`routing.service.js`) that allows the backend to switch between routing APIs (Google, Mapbox, OSRM, Mock) based on the `ROUTING_PROVIDER` environment variable without changing core controller logic.
- **Mock Routing Provider**: A deterministic development provider (`mockRoutingProvider.js`) that generates a curved `LineString` between an origin and destination. This allows frontend/backend development without burning API credits.
- **Geospatial Service**: A shared utility service (`geospatial.service.js`) powered by `@turf/turf`. It handles complex geographic mathematics (distance between points, nearest point on route, point-to-line distance, and bearing) efficiently in Node.js.
- **Strict GeoJSON Storage**: Route geometry is stored as a valid GeoJSON `LineString`, enabling future MongoDB `2dsphere` queries (like finding all routes intersecting a new traffic incident).

## 12. File-by-File Explanation (Part 6 Additions)

### Shared Geospatial Services (`server/shared/services/`)
- **`geospatial.service.js`**: Centralizes all geographic calculations using `@turf/turf`. It provides `validateCoordinates`, `createPoint`, `calculateDistance`, `distanceToRoute`, `nearestPointOnRoute`, `calculateBearing`, and `calculateRouteLength`.

### Routes Module (`server/modules/routes/`)
- **`route.model.js`**: Defines the `Route` schema containing `LineString` geometry, distance, duration, and relationships to `Emergency` and `Vehicle`. Includes `2dsphere` indexes.
- **`routing.service.js`**: The abstraction layer. Reads `process.env.ROUTING_PROVIDER` and returns the correct provider instance. It normalizes provider output into a standard `{ geometry, distanceMeters, durationSeconds, provider }` object.
- **`providers/mockRoutingProvider.js`**: A mock provider returning a predictable curved route.
- **`route.service.js`**: Core business logic for saving routes to the DB and querying them via pagination.
- **`route.controller.js`**: HTTP handlers.
- **`route.routes.js`**: Express router defining endpoints (`POST /`, `GET /`, `GET /:routeId`).
- **`route.validation.js`**: Validates that clients provide strict GeoJSON `Point` coordinates for the origin and destination when requesting a route.

## 13. API Flow (Route Creation)

```text
POST /api/routes
        ↓
`authMiddleware` (Verifies JWT) + `roleMiddleware` (CONTROL_ROOM, ADMIN)
        ↓
`route.validation.js` (Validates origin/destination GeoJSON Points)
        ↓
`route.controller.js` -> `route.service.js` (Verifies Vehicle and Emergency exist)
        ↓
`routing.service.js` (Selects Provider e.g. MOCK or GOOGLE)
        ↓
`mockRoutingProvider.js` (Calculates geometry, distance, duration)
        ↓
`route.service.js` (Saves the normalized route to MongoDB)
        ↓
Returns standardized Route document to client
```
