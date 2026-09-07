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

### Part 13: Real Frontend Authentication & Session Management
- **Goal**: Connect Next.js 16 frontend to existing Express + MongoDB backend with production login, signup, session persistence via HTTP-only cookies, protected routes, and role awareness.
- **Key Files**: `lib/api/client.ts`, `lib/api/auth.ts`, `lib/auth/context.tsx`, `lib/auth/session.ts`, `components/auth/LoginForm.tsx`, `components/auth/SignupForm.tsx`, `components/auth/ProtectedRoute.tsx`, `components/dashboard/dashboard-topbar.tsx`, `server/test-auth-e2e.js`.
- **Decisions**:
  - **Cookie-Only Transport**: Backend sets HTTP-only `token` cookie (`SameSite=Strict`, 7 days); no JWT stored in `localStorage` or exposed in JSON payloads.
  - **Graceful Session Restoration**: Initial `GET /api/auth/me` handles expected 401 unauthenticated status without crashing, while network dropouts (status 0) surface a clear connectivity message.
  - **Auto-Authentication on Register**: After successful registration (`201 Created` with default `CONTROL_ROOM` role), frontend automatically authenticates credentials to immediately transition into the dashboard.
  - **Non-Flashing Route Protection**: `<ProtectedRoute>` renders an accessible pulsed loading state while verifying session, redirecting unauthenticated visitors to `/login?redirect=...`.
  - **Role Support & Logout**: User role (`CONTROL_ROOM`, `ADMIN`) is rendered as a verified badge on the dashboard topbar with a working `Log out` button that calls `POST /api/auth/logout`.
  - **Verification**: 31 / 31 assertions passing in `server/test-auth-e2e.js` covering registration, duplicate conflicts, invalid passwords, login, cookie setting, session refresh, logout, and post-logout protection.

### Part 14: Live Backend REST Integration & Operations Dashboard
- **Goal**: Connect the driver and operator dashboard directly to real live Express REST endpoints backed by MongoDB for vehicles, emergencies, and road incidents, eliminating mock dependency for operational views while preserving telemetry views.
- **Key Files**:
  - `lib/api/types.ts`: Strictly typed models for `Vehicle`, `Emergency`, `Incident`, `ListResponse<T>`.
  - `lib/api/vehicles.ts`: `vehicleApi.list({ status })`, `vehicleApi.get(id)`.
  - `lib/api/emergencies.ts`: `emergencyApi.list({ status, priority, type })`, `emergencyApi.get(id)`.
  - `lib/api/incidents.ts`: `incidentApi.list({ status, severity, type })`, `incidentApi.get(id)`.
  - `components/dashboard/emergency-summary-cards.tsx`: Dynamic metric calculation for Active Calls, Critical Calls, Deployed Units, Fleet Ready, and Road Hazards.
  - `components/dashboard/vehicle-fleet-panel.tsx`: Live fleet registry with status badges, vehicle type icons, hospital assignment, driver contact, and status filter chips.
  - `components/dashboard/active-emergencies-panel.tsx`: Live emergency calls stream with priority badges, status badges, GeoJSON location coordinates, assigned unit summary, and priority filter chips.
  - `components/dashboard/road-incidents-panel.tsx`: Road hazards and traffic disruptions with severity badges, GeoJSON coordinates, source details, and severity filter chips.
  - `components/dashboard/driver-dashboard.tsx`: Dual-mode view switcher between Operations Live Overview and Corridor Telemetry, with live refetching and error handling.
  - `server/seed-dashboard-data.js`: MongoDB demonstration seeder populating realistic vehicles, emergencies, and incidents.
  - `server/test-dashboard-e2e.js`: Comprehensive 47-point end-to-end contract test suite.
- **Verification**: 47 / 47 assertions passing in `server/test-dashboard-e2e.js`, 31 / 31 assertions passing in `server/test-auth-e2e.js`, 23 / 23 assertions passing in `server/test-security.js`, and clean Next.js build compilation.

### Part 14: Emergency Detail & Corridor Analysis View (`/emergencies/[id]`)
- **Goal**: Build a dedicated operational corridor analysis page answering:
  1. What emergency is happening (type, priority, caller, coordinates)
  2. What incidents affect it (corridor hazards within 500m of route or 2000m of vehicle)
  3. Where the vehicle has been (paginated raw GPS fixes, speed, cardinal heading, timestamps)
  4. What route it was expected to follow (planned LineString, distance, duration, provider attribution)
  5. Whether it deviated (cross-track distance in meters, bearing divergence, stability filtering)
  6. Delay information (original ETA vs current estimated duration, traffic congestion friction)
  7. 3-tier epistemic breakdown (`OBSERVED`, `INFERRED`, `UNKNOWN`)
- **Key Files**:
  - `app/emergencies/[id]/page.tsx`: Dynamic route protected by `<ProtectedRoute>`.
  - `components/emergency-detail/emergency-detail-view.tsx`: Master coordinator with concurrent `Promise.allSettled` fetching, reload, and re-run analysis triggers.
  - `components/emergency-detail/emergency-overview-card.tsx`: Status, priority, WGS84 coordinates, and assigned vehicle.
  - `components/emergency-detail/vehicle-movement-panel.tsx`: Latest fix telemetry strip and paginated bounded GPS trajectory table.
  - `components/emergency-detail/route-analysis-panel.tsx`: Planned route details and `MOCK Provider (Local Simulation)` attribution.
  - `components/emergency-detail/deviation-analysis-panel.tsx`: Cross-track distance, bearing divergence, traffic metrics, delay calculations, and causal evidence tags.
  - `components/emergency-detail/correlated-incidents-panel.tsx`: Road disruptions near the corridor.
  - `components/emergency-detail/epistemic-breakdown-card.tsx`: 3-tier epistemic breakdown.
  - `lib/api/routes.ts`, `lib/api/analysis.ts`, `lib/api/orchestration.ts`: Typed API client modules.
  - `server/modules/routes/route.service.js`: Fixed Mongoose `CastError` and populate fields.
  - `server/seed-dashboard-data.js`: Seeded planned routes and 15 sequential GPS trajectory fixes.
  - `server/test-emergency-detail-e2e.js`: 63-point automated integration test suite (100% pass rate).
- **Verification**: 63 / 63 assertions passing in `server/test-emergency-detail-e2e.js`, 0 TypeScript errors (`npx tsc --noEmit`), clean Next.js production build (`npm run build`).

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
