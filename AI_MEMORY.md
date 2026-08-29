# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide decision support to emergency control room operators via an AI agent (GeoAgent) and a deterministic Decision & Dispatch Engine.

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance. Even with AI recommendations, control rooms need a deterministic, auditable, human-in-the-loop operational decision layer that authoritatively reconciles advisory AI output with safety rules and operator authority.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (`ADMIN`, `CONTROL_ROOM`).
- Entity tracking: Vehicles, Emergencies, Incidents, Trajectories, Routes, Decisions.
- Route deviation detection (distance, bearing, stability, threshold classification).
- Route progress analysis (distance along route, percentage, remaining distance).
- Traffic conditions abstraction & mock provider.
- Incident correlation (proximity to vehicle & route).
- ETA & Delay calculation (deterministic arithmetic, speed blending, zero-speed guards).
- Structured vehicle-route situation analysis for the AI decision engine.
- GeoAgent AI decision engine (Gemini tool-calling) — advisory only.
- Deterministic Decision & Dispatch Engine — authoritative operational decisions.
- Frontend prototype UI (SwiftCare GeoAgent) for driver dashboard and landing pages.

## Technology Stack

### Backend
- **Node.js** + **Express.js** (REST API)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)
- **@turf/turf** (Geospatial processing & calculations)
- **@google/genai** (Gemini AI SDK for GeoAgent advisory)
- **dotenv**, **cookie-parser**, **nodemon** (Utilities)
- **socket.io** + **socket.io-client** (Real-time push)

### Frontend (SwiftCare GeoAgent Prototype)
- **Next.js** (App Router, TypeScript)
- **Tailwind CSS v4** + **tw-animate-css** + **shadcn** (Styling)
- **class-variance-authority** (CVA) + **clsx** + **tailwind-merge** (Utility classes)
- **@base-ui/react** (Headless UI primitives — Button)
- **Lucide React** (Iconography)
- **@vercel/analytics** (Production analytics)
- **Google Fonts**: Inter (body), Plus Jakarta Sans (display headings)

### Legacy Frontend (Scaffold)
- **Next.js** (App Router, JavaScript) in `geoagent-emergency-project/` — default create-next-app scaffold, unused.

## System Architecture
```text
                     VEHICLE
                        │
                        ▼
                  TRAJECTORY
                        │
                        ▼
                  CURRENT GPS
                        │
                        ▼
                  PLANNED ROUTE
                        │
               ┌────────┴────────┐
               ▼                 ▼
        GEO PROCESSING       INCIDENTS
               │                 │
               ▼                 │
         DEVIATION ENGINE        │
               │                 │
               └────────┬────────┘
                        ▼
                  TRAFFIC SERVICE
                        │
                        ▼
                    ETA ENGINE
                        │
                        ▼
                  DELAY ANALYSIS
                        │
                        ▼
               SITUATION ANALYSIS
                        │
                        ▼
                  GEOAGENT (ADVISORY)
                        │
                        ▼
                 DECISION ENGINE (AUTHORITATIVE)
                        │
                        ▼
              OPERATIONAL DECISION
                        │
                        ▼
              PENDING_OPERATOR_ACTION
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        APPROVED     REJECTED   CANCELLED
            │
            ▼
        EXECUTED
```

## Backend Architecture
**Feature-Based (Modular) Architecture**:
The backend is structured into modular feature domains:
- `server/modules/auth`: User authentication, JWT, cookies, role checks.
- `server/modules/vehicles`: Vehicle registry and lifecycle management.
- `server/modules/emergencies`: Emergency call handling and vehicle dispatch assignment.
- `server/modules/incidents`: Incident management, proximity tagging, soft deletes.
- `server/modules/trajectories`: GPS ingestion, compound index history, clock-skew protection.
- `server/modules/routes`: Route models, provider abstraction (Mock/Google/Mapbox), GeoJSON LineStrings.
- `server/modules/deviation`: Route deviation engine, threshold classification, bearing comparison, GPS jitter stability.
- `server/modules/traffic`: Traffic abstraction layer, congestion ratios, mock traffic provider.
- `server/modules/analysis`: Situation analysis orchestrator, ETA & delay engine, evidence generator.
- `server/modules/geoagents`: Standalone Gemini function-calling advisory AI for rerouting recommendations.
- `server/modules/decisions`: **Deterministic Decision & Dispatch Engine** — authoritative operational decisions, human-in-the-loop approval, audit trail, controlled action execution.
- `server/modules/realtime`: Socket.IO real-time event streaming with handshake JWT auth and room isolation.
- `server/shared/`: Shared middleware (`errorHandler`, `roleMiddleware`) and services (`geospatial.service.js`).

## Frontend Architecture
**Branding**: "SwiftCare GeoAgent" — emergency ambulance routing prototype.
**Framework**: Next.js App Router with TypeScript (`app/` directory at project root).
**Styling**: Tailwind CSS v4 with custom CSS variables for SwiftCare brand palette.
**Data Layer**: `lib/api.ts` adapter pattern (mock ↔ real data toggle).

## Geospatial Architecture
- GeoJSON standards (`Point`, `LineString`) strictly enforced. Coordinates strictly `[longitude, latitude]`.
- Calculations handled deterministically via `@turf/turf`:
  - `validateCoordinates([lng, lat])`
  - `createPoint(lng, lat)`
  - `calculateDistance(point1, point2)` (meters & kilometers)
  - `distanceToRoute(point, lineString)` (meters)
  - `nearestPointOnRoute(point, lineString)` (nearest GeoJSON Point + distance)
  - `calculateBearing(point1, point2)` (0-360 degrees)
  - `calculateRouteLength(lineString)` (meters & kilometers)
  - `calculateRouteProgress(point, lineString)` (percentage, distanceAlong, remainingDistance)
  - `getRouteBearingAtPoint(lineString, point)` (forward route bearing at closest segment)

## Deviation Architecture
- **Deterministic calculations**:
  - Distance from route via `distanceToRoute`.
  - Bearing difference: `|((vehicleHeading - routeBearing + 180) % 360) - 180|`.
  - GPS noise & jitter reduction: evaluates recent N trajectory points (`GPS_STABILITY_WINDOW`), computing standard deviation of distance to route.
- **Threshold Classification** (configurable via environment variables):
  - `ON_ROUTE`: distance < `ROUTE_WARNING_DISTANCE_METERS` (default: 50m)
  - `WARNING`: distance >= 50m or approaching threshold with high bearing divergence
  - `DEVIATED`: distance >= `ROUTE_DEVIATION_DISTANCE_METERS` (default: 100m) confirmed by sustained window or bearing
  - `CRITICAL_DEVIATION`: distance >= `ROUTE_CRITICAL_DISTANCE_METERS` (default: 250m)

## Traffic Architecture
- **Normalized representation**:
  - Levels: `FREE`, `LIGHT`, `MODERATE`, `HEAVY`, `SEVERE`, `UNKNOWN`
  - Metrics: `speedKmh`, `freeFlowSpeedKmh`, `congestionRatio` (`1 - speed/freeFlow`), `source`
- **Provider abstraction**:
  - `traffic.service.js` selects provider via `TRAFFIC_PROVIDER` env variable (default: `mock`).
  - `mockTrafficProvider.js`: deterministic coordinate-seeded traffic generator.

## ETA & Delay Architecture
- **Speed Blending**: When moving (>10 km/h), blends 40% current speed + 60% traffic speed; otherwise relies on traffic speed.
- **Safety Guards**: Minimum speed clamped to 5 km/h to prevent division-by-zero or `Infinity`.
- **Delay Arithmetic**:
  - `delayMinutes = Math.max(0, currentETAMinutes - originalETAMinutes)`
  - `timeSavedMinutes = Math.max(0, originalETAMinutes - currentETAMinutes)`

## Incident Correlation Architecture
- Reuses existing `Incident` collection.
- Queries active incidents within `INCIDENT_PROXIMITY_RADIUS_METERS` (default: 500m) of either the vehicle position or the planned route LineString.
- Generates structured evidence tags (`ACCIDENT_NEAR_ROUTE`, `ROAD_CLOSURE_NEAR_ROUTE`, etc.).

## Situation Analysis Architecture
- Orchestrates Vehicle + Route + Trajectory + Deviation + Traffic + Incidents + ETA + Delay into a single normalized JSON object.
- Produces structured evidence array for downstream AI consumption without invoking LLM for math.

## Decision & Dispatch Engine Architecture
The Decision Engine is the **backend authority** for operational decisions. GeoAgent is **advisory only**.

```text
Observed Data (Vehicle, Route, Trajectory, Incidents)
            │
            ▼
Deterministic Situation Analysis (Part 7 module)
            │
            ▼
GeoAgent Advisory Recommendation (Part 8 module)
            │
            ▼
Decision Engine Rules (decision.rules.js — pure functions)
            │
            ▼
Operational Decision (CONTINUE | REROUTE | CONSIDER_BACKUP | ALERT_CONTROL_ROOM | NO_ACTION)
            │
            ▼
Decision Persisted (PENDING_OPERATOR_ACTION)
            │
            ▼
Real-Time Event: decision.created
            │
            ▼
Human Operator (CONTROL_ROOM / ADMIN)
            │
            ├─ Approve ──> APPROVED ──> Execute ──> EXECUTED
            ├─ Reject  ──> REJECTED
            └─ Cancel  ──> CANCELLED
```

### Decision Inputs (server-loaded only)
- `emergency`: `{ id, priority, status }`
- `vehicle`: `{ id, status }`
- `route`: `{ id, status }`
- `deviation`: `{ status, distanceFromRouteMeters }`
- `traffic`: `{ level }`
- `eta`: `{ currentMinutes, originalMinutes, delayMinutes }`
- `correlatedIncidents`: array
- `alternativeRoutes`: array (3 deterministic candidates via mock routing provider)
- `availableBackupVehicles`: array (AVAILABLE vehicles ranked by deterministic ETA)
- `geoAgentRecommendation`: `{ action, confidence, fallback }`

The client **NEVER** provides operational truth. Any forbidden field in the request body is rejected with 400.

### Decision Types
Controlled enum:
- `CONTINUE`
- `REROUTE`
- `CONSIDER_BACKUP`
- `ALERT_CONTROL_ROOM`
- `NO_ACTION`

A decision may carry multiple actions. The `primaryAction` is the first action in deterministic priority order:
`ALERT_CONTROL_ROOM > REROUTE > CONSIDER_BACKUP > CONTINUE > NO_ACTION`.

### Decision Severity
- `NORMAL`
- `WARNING`
- `CRITICAL`

Severity is escalated by: critical deviation, severe traffic, ETA exceeding threshold, or critical incident blocking the route.

### Decision Statuses (State Machine)
```
PENDING_OPERATOR_ACTION
       │
   ┌───┼────────────────┐
   ▼   ▼                ▼
APPROVED REJECTED   CANCELLED
   │
   ▼
EXECUTED
```

Invalid transitions (e.g. `REJECTED → APPROVED`) return HTTP 409.

### Decision Rules (decision.rules.js)
Pure, deterministic. Key rules:
1. **Continue**: On route AND low delay AND no severe incident → `CONTINUE / NORMAL`.
2. **Reroute**: Significant deviation OR heavy traffic OR critical incident AND a viable alternative (≥2 min faster) → `REROUTE`. If reroute needed but no viable alternative → `ALERT_CONTROL_ROOM` (do not invent).
3. **Backup**: High/critical priority AND ETA exceeds `CRITICAL_ETA_THRESHOLD_MINUTES` AND backup ETA at least `BACKUP_TIME_ADVANTAGE_MINUTES` faster → `CONSIDER_BACKUP`.
4. **Alert**: Insufficient data OR vehicle status abnormal OR no active route → `ALERT_CONTROL_ROOM / CRITICAL`.
5. **AI Conflict**: If GeoAgent action differs from the deterministic recommendation, the reason code `AI_RECOMMENDATION_CONFLICT` is added. The disagreement is auditable but never blocks the engine.

### Decision Thresholds (configurable env vars)
- `CRITICAL_ETA_THRESHOLD_MINUTES=15`
- `MAX_ACCEPTABLE_DELAY_MINUTES=8`
- `BACKUP_TIME_ADVANTAGE_MINUTES=5`
- `CRITICAL_DEVIATION_DISTANCE_METERS=250`
- `BACKUP_SEARCH_RADIUS_KM=10`
- `MAX_ALTERNATIVE_ROUTES=3`

These are **prototype policy values**, not medically validated.

### Alternative Route Evaluation
- Three deterministic candidate routes per analysis (Route A primary corridor, Route B express bypass, Route C secondary arterial).
- Heuristic scoring: `routeScore = etaScore + trafficScore + incidentScore` (lower is better).
- A route is "viable" if it improves ETA by at least 2 minutes vs current ETA.

### Backup Vehicle Selection
- Query `Vehicle.find({ status: 'AVAILABLE' })` with deterministic per-vehicle hash for distance estimate.
- Filter by `BACKUP_SEARCH_RADIUS_KM`.
- Rank by estimated arrival (using `DEFAULT_FREE_FLOW_SPEED_KMH`).
- Backup ETA does not auto-dispatch — it is a recommendation only.

### GeoAgent vs Decision Engine
| | GeoAgent | Decision Engine |
|---|---|---|
| Role | Advisory | Authoritative |
| May mutate state? | No (read-only tools) | No (decisions are pending by default) |
| Confidence used as? | Tie-breaker / informational | Never as probability; never overrides deterministic rules |
| Output | Recommendation (action + summary) | Operational decision (actions + severity + status) |

When the two disagree, the response includes both `geoAgentRecommendation` and the engine's `actions` / `reasonCodes`, and the `AI_RECOMMENDATION_CONFLICT` reason code is attached.

### Human-in-the-Loop Approval
- Default state: `PENDING_OPERATOR_ACTION`.
- Only `ADMIN` and `CONTROL_ROOM` roles may approve or reject.
- The engine NEVER autonomously dispatches vehicles.

### Controlled Action Execution
Approved decisions are executed via `decisionService._executeAction` which:
- Emits real-time alert events for `ALERT_CONTROL_ROOM`.
- Emits `route.updated` suggestion for `REROUTE` (does not auto-create a new Route document).
- Records the backup recommendation on the decision for `CONSIDER_BACKUP` (does not auto-assign).
- Writes `NO_ACTION` or `CONTINUE` to the audit log without side effects.

### Decision Persistence
Decisions are persisted to MongoDB with:
- Unique `decisionId` (e.g. `DEC-0001`).
- Compact `inputSnapshot` (no full MongoDB doc duplication).
- `situationHash` (SHA-256 of material inputs) for **idempotency**.
- Idempotency window: 30 seconds. Re-analyzing identical state returns the existing decision.
- Audit fields: `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `executedAt`, `executionSummary`.
- Status enum enforced by Mongoose.
- Indexes: `{ emergency: 1, createdAt: -1 }`, `{ emergency: 1, situationHash: 1 }`, `{ status: 1, createdAt: -1 }`, plus a `situationHash` field index.

No credentials, API keys, or private LLM chain-of-thought are stored.

### Real-Time Decision Events
- `decision.created`: emitted after persistence of a new decision.
- `decision.approved`: emitted after an operator approval transition.
- `decision.rejected`: emitted after an operator rejection.
- `decision.executed`: emitted after execution via the action service.

Events are broadcast to `control-room`, `emergency:${id}`, and `vehicle:${id}` rooms.

## Current Development Stage
Part 10 — Decision & Dispatch Engine (Completed)

## Completed Parts
- **Part 1** — Backend Foundation (Express, Helmet, CORS, Error Handling, DB Connection)
- **Part 2** — Authentication (User model, JWT, HTTP-only cookies, Role middleware)
- **Part 3** — Vehicle Management (Vehicle model, CRUD, immutable vehicleId)
- **Part 4** — Emergency + Incident Management (Emergencies, Incidents, 2dsphere indexes, Soft-deletes, Dispatch transaction)
- **Part 5** — GPS Tracking + Trajectory Management (Trajectory model, GPS ingestion, Compound index, Clock skew validation)
- **Part 6** — Geospatial Processing + Routing (Route model, Provider abstraction, Turf.js integration, Mock routing)
- **Part 7** — Route Deviation + Traffic + ETA + Situation Analysis (Deviation engine, Traffic abstraction, ETA & Delay calculation, Incident correlation, Evidence generation)
- **Part 8** — GeoAgent AI Integration (Gemini tool-calling, deterministic fallback, validation, prompt-injection defense)
- **Part 9** — Real-Time Backend (Socket.IO, handshake JWT, room isolation, versioned envelopes)
- **Part 10** — Decision & Dispatch Engine (Deterministic rules, severity, status state machine, approval flow, persistence with idempotency, controlled action execution, real-time decision events)

## Completed Features
- Setup Express, Helmet, CORS, Global Error Handling.
- Auth: Register, Login, Logout, JWT Cookies.
- Vehicles: CRUD, Immutable IDs (`AMB-001`).
- Emergencies & Incidents: CRUD, Soft Deletions, Vehicle Assignment Transaction.
- Trajectories: Secure GPS Ingestion, Pagination, `2dsphere` & Compound Indexing, Safe Out-of-order handling.
- Routing: Routing Provider Abstraction, Mock Provider, GeoJSON LineString Routes, `@turf/turf` Geospatial utilities.
- Deviation Detection: Deterministic distance & bearing calculations, GPS jitter handling, configurable thresholds.
- Traffic Abstraction: Provider pattern, normalized traffic status, deterministic mock provider.
- Incident Proximity Correlation: Multi-point distance checks to vehicle and route geometry.
- ETA & Delay Engine: Non-zero speed blending, remaining distance calculations, delay and time saved.
- Situation Analysis API: Comprehensive endpoint returning normalized vehicle route situations.
- Frontend Prototype: Landing page, Login, Signup, Driver Dashboard UI (mock data).
- GeoAgent AI: Gemini function-calling advisory, deterministic fallback, sanitization, validation, read-only tools.
- Real-Time Backend: Socket.IO handshake JWT auth, room isolation, 12 domain events, versioned envelopes.
- **Decision Engine** (Part 10): Deterministic rules, severity, status state machine, approval / rejection / execution flow, persistent audit trail, idempotency via situation hash, real-time decision events.

## Module Inventory
```text
server/
├── modules/
│   ├── auth/                     # User auth (register, login, logout, JWT)
│   ├── vehicles/                 # Vehicle CRUD
│   ├── emergencies/              # Emergency CRUD + vehicle assignment
│   ├── incidents/                # Incident CRUD + soft delete
│   ├── trajectories/             # GPS ingestion + history
│   ├── routes/                   # Route generation + provider abstraction
│   │   └── providers/mockRoutingProvider.js
│   ├── deviation/                # Route deviation engine & threshold classification
│   │   ├── deviation.config.js
│   │   ├── deviation.service.js
│   │   ├── deviation.controller.js
│   │   ├── deviation.routes.js
│   │   └── deviation.validation.js
│   ├── traffic/                  # Traffic conditions abstraction
│   │   ├── traffic.config.js
│   │   ├── traffic.service.js
│   │   ├── traffic.controller.js
│   │   ├── traffic.routes.js
│   │   └── providers/mockTrafficProvider.js
│   ├── analysis/                 # Situation analysis orchestrator & ETA engine
│   │   ├── analysis.service.js
│   │   ├── analysis.controller.js
│   │   ├── analysis.routes.js
│   │   └── analysis.validation.js
│   ├── geoagents/                # GeoAgent AI advisory (Gemini function-calling PoC)
│   │   ├── geoAgent.service.js
│   │   ├── geoAgent.tools.js
│   │   ├── geoagent.constants.js
│   │   ├── geoagent.schemas.js
│   │   ├── geoagent.controller.js
│   │   ├── geoagent.routes.js
│   │   ├── geoagent.validation.js
│   │   └── prompts/geoagent.system.js
│   ├── decisions/                # Decision & Dispatch Engine (Part 10)
│   │   ├── decision.constants.js   # enums, thresholds, state machine
│   │   ├── decision.rules.js       # pure deterministic rule engine
│   │   ├── decision.model.js       # Mongoose Decision model
│   │   ├── decision.service.js     # orchestrator + action executor
│   │   ├── decision.controller.js  # REST controllers
│   │   ├── decision.routes.js      # Express routes
│   │   └── decision.validation.js  # request validation
│   └── realtime/                 # Real-Time Socket.IO module
│       ├── realtime.constants.js
│       ├── realtime.events.js
│       ├── realtime.handlers.js
│       └── realtime.service.js
├── shared/
│   ├── middleware/               # errorHandler, roleMiddleware
│   └── services/
│       └── geospatial.service.js # Turf.js utilities + progress & bearing
├── server.js                     # Express entry point
├── test-part7.js
├── test-part8.js
├── test-part9.js
├── test-part10.js                # Part 10 tests
└── .env.example
```

## API Inventory
**Auth**: `POST /api/auth/register`, `/login`, `/logout`, `GET /me`
**Vehicles**: `GET /api/vehicles`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Emergencies**: `GET /api/emergencies`, `/:id`, `POST /`, `PATCH /:id`, `PATCH /:id/assign`, `DELETE /:id`, `GET /:id/routes`, `GET /:id/decisions`
**Incidents**: `GET /api/incidents`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Trajectories**: `POST /api/trajectories`, `GET /:vehicleId`, `GET /:vehicleId/latest`, `GET /:vehicleId/recent`
**Routes**: `POST /api/routes`, `GET /api/routes`, `GET /api/routes/:routeId`, `GET /api/routes/:routeId/analysis`
**Deviation**: `GET /api/deviation/vehicle/:vehicleId`
**Traffic**: `GET /api/traffic/location?lng=...&lat=...`
**Analysis**: `GET /api/analysis/vehicle/:vehicleId`
**GeoAgent**: `POST /api/geoagent/analyze`, `POST /api/geoagent/analyze/vehicle/:vehicleId`
**Decisions (Part 10)**:
- `POST /api/decisions/analyze` — generate deterministic decision
- `GET /api/decisions/:decisionId` — retrieve one decision
- `PATCH /api/decisions/:decisionId/approve` — operator approval
- `PATCH /api/decisions/:decisionId/reject` — operator rejection
- `PATCH /api/decisions/:decisionId/execute` — execute approved decision

## Database Models
- `User` (name, email, password, role)
- `Vehicle` (vehicleId, registrationNumber, type, status, capacity, driverName)
- `Emergency` (emergencyId, type, priority, status, location, destination, assignedVehicle, createdBy, isDeleted)
- `Incident` (incidentId, type, severity, status, location, reportedBy, emergency, isDeleted)
- `Trajectory` (vehicle, location, speed, heading, timestamp, source, createdAt)
- `Route` (routeId, emergency, vehicle, origin, destination, geometry, distance, duration, provider, routeType, status, createdBy)
- `Decision` (decisionId, emergency, vehicle, route, severity, actions, primaryAction, backup, reasonCodes, geoAgentRecommendation, inputSnapshot, situationHash, status, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, executedAt, executionSummary)

## Database Relationships
- User `creates` Emergency.
- User `reports` Incident.
- User `creates` Route.
- Emergency `assignedVehicle` -> Vehicle.
- Incident optionally references Emergency.
- Trajectory `vehicle` -> Vehicle.
- Route `emergency` -> Emergency.
- Route `vehicle` -> Vehicle.
- Decision `emergency` -> Emergency.
- Decision `vehicle` -> Vehicle.
- Decision `route` -> Route.
- Decision `approvedBy` / `rejectedBy` -> User.

## Security Rules
- Control Room & Admin authorization required for all operational analysis APIs.
- Control Room cannot DELETE operational records.
- Deletions are Soft Deletes (`isDeleted: true`).
- Routes are generated server-side via external routing providers (or Mock); clients cannot supply arbitrary GeoJSON geometry.
- Pagination uses hard limits (max 100) to prevent OOM DOS attacks.
- External API keys (Google Maps, Mapbox, Gemini) are strictly server-side (`process.env`) and never exposed to clients.
- Generic `502 Bad Gateway` responses mask upstream routing/traffic provider failures.
- No dynamic database collections for calculations; analysis is computed on-the-fly to prevent stale state storage.
- Decision engine: clients cannot supply operational truth (eta, traffic, deviation, etc.); all such fields are rejected with 400 if present in the request body.
- No autonomous dispatch. Decisions begin in `PENDING_OPERATOR_ACTION` and require ADMIN / CONTROL_ROOM approval.
- No credentials, API keys, or private LLM chain-of-thought are persisted on decisions.

## Environment Variables
- `PORT`, `MONGO_URI`, `CLIENT_URL`, `NODE_ENV`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`
- `TRAFFIC_PROVIDER`, `DEFAULT_FREE_FLOW_SPEED_KMH`
- `ROUTE_WARNING_DISTANCE_METERS`, `ROUTE_DEVIATION_DISTANCE_METERS`, `ROUTE_CRITICAL_DISTANCE_METERS`
- `BEARING_WARNING_DEGREES`, `BEARING_DEVIATION_DEGREES`, `GPS_STABILITY_WINDOW`
- `INCIDENT_PROXIMITY_RADIUS_METERS`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- **Decision Engine (Part 10)**:
  - `CRITICAL_ETA_THRESHOLD_MINUTES`
  - `MAX_ACCEPTABLE_DELAY_MINUTES`
  - `BACKUP_TIME_ADVANTAGE_MINUTES`
  - `CRITICAL_DEVIATION_DISTANCE_METERS`
  - `BACKUP_SEARCH_RADIUS_KM`
  - `MAX_ALTERNATIVE_ROUTES`

## Part-by-Part Development History

### Part 10 — Decision & Dispatch Engine (Current)
**Implemented**:
- `server/modules/decisions/` — full feature module with constants, validation, deterministic rules, Mongoose model, service, controller, and routes.
- Decision types: `CONTINUE`, `REROUTE`, `CONSIDER_BACKUP`, `ALERT_CONTROL_ROOM`, `NO_ACTION`.
- Decision severity: `NORMAL`, `WARNING`, `CRITICAL`.
- Decision status state machine: `PENDING_OPERATOR_ACTION → APPROVED → EXECUTED`, with `REJECTED` and `CANCELLED` terminal states. Invalid transitions return 409.
- Deterministic rule engine (pure functions in `decision.rules.js`) covering: vehicle status sanity, deviation-driven reroute, traffic-driven reroute, delay/ETA threshold, critical incident, alternative route viability scoring, backup evaluation, insufficient data safety net, and AI recommendation conflict detection.
- Server-side input loading via `analysisService.getVehicleSituation`, `routingService.getRoute`, GeoAgent advisory, and a deterministic backup candidate generator.
- Idempotency via SHA-256 `situationHash` with a 30-second reuse window.
- Persistent audit trail: `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `executedAt`, `executionSummary`.
- Controlled action execution service that emits real-time events but never autonomously dispatches vehicles.
- Real-time events: `decision.created`, `decision.approved`, `decision.rejected`, `decision.executed` (broadcast to `control-room`, `emergency:${id}`, `vehicle:${id}` rooms).
- Strict request validation rejecting client-supplied operational fields with 400.
- Configurable thresholds via env vars (`CRITICAL_ETA_THRESHOLD_MINUTES`, `MAX_ACCEPTABLE_DELAY_MINUTES`, `BACKUP_TIME_ADVANTAGE_MINUTES`, `CRITICAL_DEVIATION_DISTANCE_METERS`, `BACKUP_SEARCH_RADIUS_KM`, `MAX_ALTERNATIVE_ROUTES`).
- Test suite `server/test-part10.js` covering 16 scenarios: continue, reroute, backup, insufficient data, AI conflict, state machine, end-to-end analyze→approve→execute, rejection, invalid transitions, idempotency, 401, 403, 400 (operational field rejection), real-time event broadcast, and list-by-emergency.

**Architecture Decisions**:
- The Decision Engine is AUTHORITATIVE; GeoAgent is ADVISORY.
- Confidence from the LLM is recorded but never used as a probability to override deterministic safety rules.
- AI conflicts are surfaced via the `AI_RECOMMENDATION_CONFLICT` reason code for auditability.
- Compact `inputSnapshot` (no full document duplication) is persisted on every decision.
- `situationHash` provides cheap idempotency without complex version counters.
- No transaction is needed for `approve` / `reject` / `execute` (single-document update with audit fields).
- The action executor is a controlled `switch` over the decision's action list; unknown actions produce a `no_effect` audit entry rather than an error.

## Known Issues
- Real Device API-Key authentication is not implemented for trajectory ingestion (devices currently use user session/token).
- Live Traffic currently uses the deterministic Mock provider; Google Traffic API integration is pending.
- Frontend prototype currently uses mock data in `lib/mock-data.ts` rather than fetching from the live backend analysis endpoint.
- Backup ETA is computed from a deterministic per-vehicle hash, not from a routing provider call, to avoid provider cost. This is a screening estimate only — operator approval should still treat the value as advisory.

## Technical Debt
- MongoDB queries for history use `skip` and `limit` (cursor pagination recommended for large scale).
- Incident proximity uses Turf distance iteration over active incidents; spatial `$near` / `$geoWithin` query can be optimized for high-volume incident datasets.
- Decision idempotency window is fixed at 30 seconds. In high-frequency operator workflows this may need tuning.
- Backup ETA does not currently invoke the routing service per candidate; switching to a real provider will require rate limiting and caching.

## Future Development / Next Backend Task
- **Part 11**: Decision Dashboard & Operator Workflow UX (server-side only if scope is limited; otherwise full-stack). Wire the Decision Engine to a control-room decision queue with operator-specific audit, auto-expiry of stale PENDING decisions, and the ability to chain a fresh `REROUTE` to actually persist a new ALTERNATIVE route via `routingService`.
- Real-time updates already in place via Socket.IO.
- Frontend live integration of the Decision API to replace the current mock dashboard.