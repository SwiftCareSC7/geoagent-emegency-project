# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Part 11

### Added — Full Backend Integration & End-to-End Workflow
- Created dedicated `server/modules/orchestration/` feature module:
  - `orchestration.constants.js`: Workflow stages (`INITIALIZING`, `VALIDATING`, `COLLECTING_CONTEXT`, `ANALYZING_SPATIAL`, `AI_REASONING`, `DECISION_EVALUATION`, `COMPLETED`, `PARTIAL`, `FAILED`), real-time event names (`emergency.analysis.started`, `emergency.analysis.completed`), and standardized units (`meters`, `km/h`, `minutes`, `seconds`, `degrees`).
  - `orchestration.validation.js`: Parameter format validator and strict tampering defense (rejects client-supplied operational fields `eta`, `traffic`, `status`, `deviation`, `decision`, `actions`, `speed`, `location`, `recommendation` with HTTP 400).
  - `orchestration.service.js`: Thin, high-level workflow orchestrator coordinating Emergency, Vehicle, Route, Trajectory, Incidents, Traffic, ETA, GeoAgent AI (advisory), and Decision Engine (authoritative).
  - `orchestration.controller.js`: Express controller for executing the complete emergency analysis workflow.
  - `orchestration.routes.js`: Protected Express router registered at `/api/orchestration`.
- Mounted `/api/orchestration` in `server/server.js`.
- Cross-module consistency enforcement:
  - Verifies Emergency vehicle matches Route vehicle (`route.vehicle == vehicle._id`).
  - Verifies Route vehicle matches Trajectory vehicle (`trajectory.vehicle == vehicle._id`).
- Graceful partial analysis handling: missing assigned vehicle, route, or trajectory returns structured partial results (`workflowStatus: "PARTIAL"`) with explicit reason codes instead of crashing or inventing data.
- Built-in three-tier epistemic breakdown:
  - `observed`: Verified telemetry facts (distance from route in meters, GPS stability, progress %, traffic level, ETA, speed km/h, correlated incidents).
  - `inferred`: Causal explanations from spatial correlation and GeoAgent reasoning.
  - `unknown`: Explicitly declared data gaps (driver verbal confirmation, hospital ER capacity).
- Real-time workflow notifications: Emits `emergency.analysis.started` and `emergency.analysis.completed` to `control-room` and `emergency:${id}` rooms.
- Added comprehensive automated test suite `server/test-part11.js` verifying happy path, partial failure handling, client tampering rejection, cross-module consistency, and unit standards.
- Updated `AI_MEMORY.md`, `README.md`, and `WALKTHROUGH.md`.

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
- Added comprehensive automated test suite `server/test-part10.js` covering 16 scenarios.

## [Unreleased] - Part 9

### Added — Real-Time Backend (Socket.IO & Live Event Streaming)
- Created dedicated `server/modules/realtime/` feature module with handshake JWT authentication and room management.
- Attached Socket.IO to Express HTTP server via `http.createServer(app)`.
- Integrated real-time event emissions into core domain services.
- Added automated test suite `server/test-part9.js`.

## [Unreleased] - Part 8

### Added — GeoAgent AI Backend Integration
- Refactored `server/modules/geoagents/` into a complete production feature module with Gemini function calling and fallback.
- Added automated test suite `server/test-part8.js`.

## [Unreleased] - Part 7

### Added — Backend Intelligence Layer (Route Deviation, Traffic, ETA, Situation Analysis)
- Added `server/modules/deviation/`, `server/modules/traffic/`, and `server/modules/analysis/`.
- Added test suite `server/test-part7.js`.

## [Unreleased] - Part 6
### Added
- Added Route model, provider abstraction (Mock/Google/Mapbox), GeoJSON LineString validation, and Turf.js calculations.

## [Unreleased] - Part 5
### Added
- Added Trajectory model, GPS ingestion API, compound index `{ vehicle: 1, timestamp: -1 }`, and clock-skew validation.

## [Unreleased] - Part 4
### Added
- Added Emergency and Incident models with `2dsphere` indexes, soft deletions, and vehicle assignment transactions.
