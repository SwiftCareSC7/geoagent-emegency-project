# GeoAgentic Emergency Response System — Technical Walkthrough

This document provides a comprehensive technical walkthrough of the **SwiftCare GeoAgentic Emergency Response System** across all architectural tiers, development parts, and illustrates a complete end-to-end emergency operational lifecycle.

---

## 1. Full-Stack System Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 App Router, React 19, TypeScript) │
│  ├── Landing Page (/), Login (/login), Signup (/signup)  │
│  ├── Driver Dashboard (/driver/dashboard)               │
│  │   (Live ETA, Route Status, Timeline, GeoAgent Card)   │
│  └── Client API Adapter (lib/api.ts → REST + Socket.IO) │
├─────────────────────────────────────────────────────────┤
│  Python Spatial Routing & V2X Engine (Member 2)         │
│  ├── Dynamic Corridor Path Calculation                  │
│  ├── Haversine & Cross-Track Deviation Detection        │
│  ├── V2X Green-Wave Traffic Signal Preemption Scoring   │
│  └── Interactive Leaflet.js Map Visualizer              │
├─────────────────────────────────────────────────────────┤
│  Backend (Express.js, Node.js, HTTP Server)              │
│  ├── End-to-End Orchestration Layer (Part 11)           │
│  ├── Authoritative Decision & Dispatch Engine (Part 10) │
│  ├── Real-Time Push Layer (Part 9 - Socket.IO)          │
│  ├── GeoAgent AI Decision Engine (Part 8 - Gemini LLM)  │
│  ├── Deterministic Intelligence Engine (Part 7)         │
│  ├── Modular Domain Services (Auth, Vehicles,           │
│  │   Emergencies, Incidents, Trajectories, Routes)      │
│  └── REST API with JWT Auth + Role-Based Access Control │
├─────────────────────────────────────────────────────────┤
│  Database (MongoDB)                                      │
│  ├── 7 Collections: User, Vehicle, Emergency, Incident,  │
│  │   Trajectory, Route, Decision                         │
│  └── 2dsphere & Compound Indexes                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Part-by-Part Development Deep Dive

### Part 1: Backend Foundation & Security
- **Goal**: Establish a hardened Express server, MongoDB connection, CORS, Helmet headers, and centralized error handling.
- **Key Files**: `server/server.js`, `server/config/db.js`, `server/shared/middleware/errorHandler.js`.
- **Decisions**: Centralized error middleware catches unhandled rejections and preserves exact operational status codes (400, 401, 403, 404, 409).

### Part 2: Authentication & RBAC
- **Goal**: Secure user registration, login, JWT token issuance, and role-based permissions (`ADMIN`, `CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`).
- **Key Files**: `server/modules/auth/user.model.js`, `server/modules/auth/auth.service.js`, `server/modules/auth/auth.middleware.js`, `server/modules/auth/jwt.utils.js`.
- **Decisions**: Dual authentication transport supports both HTTP-only cookies (`token=...`) and standard `Authorization: Bearer <token>` headers. Passwords hashed with bcrypt (12 rounds) and never returned in API payloads.

### Part 3: Vehicle Management
- **Goal**: Emergency vehicle fleet registry, lifecycle state management (`AVAILABLE`, `DISPATCHED`, `EN_ROUTE`, `AT_SCENE`, `TRANSPORTING`, `MAINTENANCE`), and soft deletion.
- **Key Files**: `server/modules/vehicles/vehicle.model.js`, `server/modules/vehicles/vehicle.service.js`, `server/modules/vehicles/vehicle.controller.js`.
- **Decisions**: Unique business IDs (`vehicleId: "AMB-101"`) and compound index `{ status: 1, isDeleted: 1 }` ensure fast allocation without loading entire collections.

### Part 4: Emergency Call Intake & Incidents
- **Goal**: Intake emergency calls, triage priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), vehicle dispatch assignment, and road incident reporting.
- **Key Files**: `server/modules/emergencies/emergency.model.js`, `server/modules/emergencies/emergency.service.js`, `server/modules/incidents/incident.model.js`, `server/modules/incidents/incident.service.js`.
- **Decisions**: Spatial `2dsphere` indexes on `location` and `destination` GeoJSON points. Soft deletion prevents accidental data loss.

### Part 5: GPS Tracking & Trajectory Ingestion
- **Goal**: Ingest high-frequency vehicle GPS fixes and retrieve windowed trajectory histories.
- **Key Files**: `server/modules/trajectories/trajectory.model.js`, `server/modules/trajectories/trajectory.service.js`.
- **Decisions**: Compound index `{ vehicle: 1, timestamp: -1 }` enables sub-millisecond retrieval of the latest position and rolling historical windows. Sanitized pagination guards against `NaN` and negative limits.

### Part 6: Geospatial Analytics & Routing Engine
- **Goal**: Provider abstraction for navigation routing (Mock, Google, Mapbox, OSRM) and Turf.js spatial operations.
- **Key Files**: `server/modules/routes/route.model.js`, `server/modules/routes/routing.service.js`, `server/shared/services/geospatial.service.js`.
- **Decisions**: Enforces standard WGS84 GeoJSON coordinate ordering (`[longitude, latitude]`). LineString geometries stored with `2dsphere` indexes.

### Part 7: Route Deviation, Traffic & ETA Engine
- **Goal**: Detect cross-track route deviations, bearing divergence, incident proximity correlation, and speed-blended ETA calculations.
- **Key Files**: `server/modules/deviation/deviation.service.js`, `server/modules/traffic/traffic.service.js`, `server/modules/analysis/analysis.service.js`.
- **Decisions**: Rolling multi-sample window filters momentary GPS jitter. Speed blending (`Math.max(speed, 5)`) prevents division-by-zero or infinite ETA. Standardized SI units: distance in `meters`, speed in `km/h`, duration in `seconds`, ETA in `minutes`.

### Part 8: GeoAgent AI (Google Gemini 2.5 Flash)
- **Goal**: Integrate Google Gemini LLM with controlled function calling as an advisory decision-support assistant.
- **Key Files**: `server/modules/geoagents/geoAgent.service.js`, `server/modules/geoagents/geoAgent.tools.js`, `server/modules/geoagents/geoagent.schemas.js`.
- **Decisions**: AI operates through controlled read-only tools (`getVehicleSituation`, `getAlternativeRoutes`, `getNearbyAvailableVehicles`, `getNearbyIncidents`). Strict JSON schema validation and prompt injection defense. Deterministic fallback ensures the pipeline never fails if the LLM is unreachable.

### Part 9: Real-Time Communication Layer (Socket.IO)
- **Goal**: Bidirectional, room-isolated live event streaming for fleet tracking, deviation alerts, and operational decisions.
- **Key Files**: `server/modules/realtime/realtime.service.js`, `server/modules/realtime/realtime.events.js`.
- **Decisions**: Handshake JWT authentication verifies user roles before allowing connection. Room isolation (`control-room`, `emergency:${id}`, `vehicle:${id}`) prevents global message leakage.

### Part 10: Authoritative Decision & Dispatch Engine
- **Goal**: Deterministic rules engine that reconciles AI recommendations with strict operational safety policies.
- **Key Files**: `server/modules/decisions/decision.model.js`, `server/modules/decisions/decision.service.js`, `server/modules/decisions/decision.rules.js`.
- **Decisions**: AI recommendations remain advisory; Decision Engine is authoritative. Finite state machine (`PENDING_OPERATOR_ACTION` → `APPROVED` / `REJECTED` → `EXECUTED`). SHA-256 `situationHash` enforces 30-second decision idempotency.

### Part 11: Full Backend Integration & Orchestration
- **Goal**: Unified orchestration coordinator executing the entire operational pipeline with a single call.
- **Key Files**: `server/modules/orchestration/orchestration.service.js`, `server/modules/orchestration/orchestration.routes.js`.
- **Decisions**: Generates a **Three-Tier Epistemic Breakdown**:
  - `OBSERVED`: Verified physical telemetry (GPS position, route distance, corridor traffic).
  - `INFERRED`: Algorithmic deductions (incident-induced congestion, AI rationale).
  - `UNKNOWN`: Missing operational context (driver intent, hospital ER bed capacity).

### Part 12: Core Hardening, Performance & Regression Testing
- **Goal**: Parameter boundary protection, status code preservation in error middleware, compound index optimizations, and comprehensive test suites.
- **Key Files**: `server/shared/middleware/errorHandler.js`, `server/test-part12.js`, `server/test-security.js`.
- **Decisions**: Hardened query boundaries against `NaN` and unbounded limits. Graceful `SIGINT`/`SIGTERM` shutdown handlers close HTTP, Socket.IO, and Mongoose connections cleanly.

---

## 3. End-to-End Emergency Operational Lifecycle

Here is the exact step-by-step lifecycle of an emergency mission from intake to resolution:

```text
1. EMERGENCY CALL INTAKE (POST /api/emergencies)
   Dispatcher creates emergency: type=ACCIDENT, priority=CRITICAL, location=[77.5946, 12.9716]
   MongoDB: Saves Emergency document (status="REPORTED")
   Socket.IO: Emits "emergency.created" to room "control-room"

2. VEHICLE DISPATCH (PATCH /api/emergencies/EMG-0001/assign)
   Dispatcher assigns vehicle AMB-101
   MongoDB: Sets emergency.status="DISPATCHED", vehicle.status="DISPATCHED"
   Socket.IO: Emits "emergency.updated" and "vehicle.status_updated"

3. PLANNED ROUTE GENERATION (POST /api/routes)
   Routing provider calculates optimal route geometry from ambulance to scene and hospital
   MongoDB: Saves Route LineString (distance=5896m, duration=720s, status="ACTIVE")

4. GPS TELEMETRY STREAMING (POST /api/trajectories)
   Ambulance logs coordinates every few seconds: [77.5980, 12.9730], speed=42km/h
   MongoDB: Inserts Trajectory point (indexed on { vehicle: 1, timestamp: -1 })
   Socket.IO: Emits "trajectory.ingested"

5. DEVIATION & INCIDENT CORRELATION
   Ambulance diverts around a road hazard (cross-track distance=194m)
   Incident detected at 180m from corridor
   Deviation status classified as "DEVIATED" (Stability: STABLE)

6. AI REASONING & ADVISORY RECOMMENDATIONS
   Gemini AI analyzes the corridor and proposes alternative route via Richmond Road (+2m faster)
   Advisory recommendation output: "Recommend reroute to alternative route ALT-02"

7. AUTHORITATIVE DECISION EVALUATION
   Decision Engine checks thresholds: delay > 8 mins, critical deviation > 250m
   Creates Decision Action: rerouteRecommended=true, requiresOperatorApproval=true
   Socket.IO: Emits "decision.created" to control room

8. OPERATOR APPROVAL & EXECUTION (POST /api/decisions/:id/approve)
   Operator approves alternative route in UI
   MongoDB: Sets decision.status="APPROVED", approvedBy="USR-101"
   Socket.IO: Emits "decision.updated" to ambulance driver and control room
```
