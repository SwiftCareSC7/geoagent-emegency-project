# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Part 10

### Added — Decision & Dispatch Engine
- Created dedicated `server/modules/decisions/` feature module with strict separation of concerns:
  - `decision.constants.js`: Decision enums (`CONTINUE`, `REROUTE`, `CONSIDER_BACKUP`, `ALERT_CONTROL_ROOM`, `NO_ACTION`), severity (`NORMAL`, `WARNING`, `CRITICAL`), status state machine, reason codes, and configurable thresholds (`CRITICAL_ETA_THRESHOLD_MINUTES`, `MAX_ACCEPTABLE_DELAY_MINUTES`, `BACKUP_TIME_ADVANTAGE_MINUTES`, `CRITICAL_DEVIATION_DISTANCE_METERS`, `BACKUP_SEARCH_RADIUS_KM`, `MAX_ALTERNATIVE_ROUTES`).
  - `decision.rules.js`: Pure deterministic rule engine — deviation-driven reroute, traffic-driven reroute, delay/ETA threshold, critical incident blocking, alternative route scoring, backup evaluation, AI conflict detection, insufficient-data safety net.
  - `decision.model.js`: Mongoose Decision model with unique `decisionId`, compact `inputSnapshot`, `situationHash` (idempotency), and full audit fields.
  - `decision.service.js`: Orchestrator that loads situation server-side, reconciles GeoAgent advisory, persists the decision, enforces state-machine transitions, and runs a controlled action executor.
  - `decision.controller.js`: REST controllers for analyze, get, approve, reject, execute, and list-by-emergency.
  - `decision.routes.js`: Express routes registered at `/api/decisions`, protected by `protect` + `requireRole('CONTROL_ROOM', 'ADMIN')`.
  - `decision.validation.js`: Strict request validation that rejects any client-supplied operational field with HTTP 400.
- New endpoints:
  - `POST /api/decisions/analyze` — generate a deterministic operational decision.
  - `GET /api/decisions/:decisionId` — retrieve a single decision with audit fields.
  - `GET /api/emergencies/:emergencyId/decisions` — paginated decision history.
  - `PATCH /api/decisions/:decisionId/approve` — operator approval (human-in-the-loop).
  - `PATCH /api/decisions/:decisionId/reject` — operator rejection (records operator + reason).
  - `PATCH /api/decisions/:decisionId/execute` — execute an APPROVED decision via the controlled action service.
- New real-time events: `decision.created`, `decision.approved`, `decision.rejected`, `decision.executed` (broadcast to `control-room`, `emergency:${id}`, `vehicle:${id}` rooms).
- Decision state machine with explicit allowed transitions; invalid transitions return HTTP 409.
- Idempotency via SHA-256 `situationHash` with a 30-second reuse window to avoid duplicate decisions on re-analysis of unchanged state.
- Backup candidate ranking using a deterministic per-vehicle ETA (screening estimate; operator approval is still required).
- Real-time realtime service extended with new event methods; realtime constants extended with four new event names.
- `.env.example` updated with the new decision-engine thresholds (prototype policy values, not medically validated).
- Added comprehensive automated test suite `server/test-part10.js` covering 16 scenarios: continue / reroute / backup / insufficient data / AI conflict / state machine / end-to-end analyze→approve→execute / rejection / invalid transitions / idempotency / 401 / 403 / 400 (client-supplied operational fields) / real-time event broadcast / list-by-emergency.
- Updated `AI_MEMORY.md`, `README.md`, and `WALKTHROUGH.md` to document the Decision Engine architecture, rules, persistence, audit trail, real-time events, and safety principles.

## [Unreleased] - Part 9

### Added — Real-Time Backend (Socket.IO & Live Event Streaming)
- Created dedicated `server/modules/realtime/` feature module:
  - `realtime.constants.js`: Centralized definitions for 12 operational event names (`vehicle.location.updated`, `route.deviation.detected`, `eta.updated`, `geoagent.analysis.created`, etc.), client commands, and room naming conventions.
  - `realtime.events.js`: Standardized, versioned event envelope builder (`version: 1`) and payload normalization helpers.
  - `realtime.handlers.js`: Socket.IO handshake authentication middleware (validating JWT tokens from cookies or authorization headers) and client event handlers with server-side DB validation (`join.emergency`, `join.vehicle`, `join.control_room`).
  - `realtime.service.js`: Singleton Socket.IO management service exposing safe emission methods.
- Attached Socket.IO to Express HTTP server via `http.createServer(app)` in `server/server.js`.
- Integrated real-time event emissions into core domain services:
  - `trajectory.service.js`: Emits `trajectory.created` and `vehicle.location.updated`.
  - `emergency.service.js`: Emits `emergency.created` and `emergency.updated`.
  - `incident.service.js`: Emits `incident.created` and `incident.updated`.
  - `route.service.js`: Emits `route.updated`.
  - `vehicle.service.js`: Emits `vehicle.status.updated`.
  - `geoAgent.service.js`: Emits `geoagent.analysis.created`.
- Added automated test suite `server/test-part9.js` verifying handshake authentication, rejection of unauthenticated/invalid connections, room authorization, and live event broadcasting.
- Updated documentation in `AI_MEMORY.md`, `README.md`, and `WALKTHROUGH.md`.

## [Unreleased] - Part 8

### Added — GeoAgent AI Backend Integration
- Refactored `server/modules/geoagents/` into a complete production feature module:
  - `geoagent.constants.js`: System configuration (`GEMINI_MODEL`, `MAX_TOOL_CALL_ROUNDS`), recommendation action enums (`CONTINUE`, `REROUTE`, `MONITOR`, `CONSIDER_BACKUP`), and likely cause enums.
  - `geoagent.schemas.js`: Output validation schemas, number clamping, and HTML/script sanitization functions for AI responses.
  - `geoagent.tools.js`: Declarative Gemini tool definitions and secure execution handlers (`getVehicleSituation`, `getAlternativeRoutes`, `getNearbyAvailableVehicles`, `getNearbyIncidents`).
  - `prompts/geoagent.system.js`: Dedicated system prompt establishing decision-support role, fact grounding, 3-tier epistemic discipline (`OBSERVED`, `INFERRED`, `UNKNOWN`), strict JSON output, and prompt injection defenses.
  - `geoAgent.service.js`: Main orchestration service managing situation context assembly, Gemini tool calling loop, output parsing, schema validation, and deterministic fallback generation.
  - `geoagent.validation.js`: Input validation middleware for emergencyId and vehicleId parameters.
  - `geoagent.controller.js`: Controllers for `POST /api/geoagent/analyze` and `POST /api/geoagent/analyze/vehicle/:vehicleId`.
  - `geoagent.routes.js`: Protected Express route endpoints requiring `CONTROL_ROOM` or `ADMIN` roles.
- Extended `server/server.js` with `geoagentRoutes` registration.
- Added `server/test-part8.js` comprehensive test suite for tool execution, sanitization, schema validation, and fallback mechanisms.
- Updated `server/.env.example` with `GEMINI_MODEL`.

## [Unreleased] - Part 7

### Added — Backend Intelligence Layer (Route Deviation, Traffic, ETA, Situation Analysis)
- Added `server/modules/deviation/` module for deterministic route deviation detection, bearing comparison, GPS jitter filtering, and threshold classification.
- Added `server/modules/traffic/` module for pluggable traffic abstraction, congestion ratios, and mock traffic generation.
- Added `server/modules/analysis/` module for Situation Analysis orchestration, ETA & delay arithmetic, and structured evidence tagging.
- Extended `server/shared/services/geospatial.service.js` with `calculateRouteProgress` and `getRouteBearingAtPoint`.
- Extended `server/modules/routes/` with `GET /api/routes/:routeId/analysis`.
- Added test suite `server/test-part7.js`.

### Added — Frontend (SwiftCare GeoAgent Prototype)
- Added Next.js App Router frontend at project root (`app/`, `components/`, `lib/`).
- Added SwiftCare design system, landing page, login/signup forms, and driver dashboard prototype.

## [Unreleased] - Part 6
### Added
- Added Route model, provider abstraction (Mock/Google/Mapbox), GeoJSON LineString validation, and Turf.js calculations.

## [Unreleased] - Part 5
### Added
- Added Trajectory model, GPS ingestion API, compound index `{ vehicle: 1, timestamp: -1 }`, and clock-skew validation.

## [Unreleased] - Part 4
### Added
- Added Emergency and Incident models with `2dsphere` indexes, soft deletions, and vehicle assignment transactions.
