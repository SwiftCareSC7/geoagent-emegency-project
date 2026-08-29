# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Final Backend Documentation & Handoff

### Added
- **Complete OpenAPI 3.0 Specification**:
  - Created [`docs/openapi.yaml`](docs/openapi.yaml) documenting all 40+ REST API endpoints, schemas, authentication schemes, and responses.
- **Real-Time Socket.IO Reference**:
  - Created [`docs/socket-events.md`](docs/socket-events.md) detailing connection handshake auth, room isolation (`control-room`, `emergency:${id}`, `vehicle:${id}`), and server-emitted operational events.
- **Database Architecture Reference**:
  - Created [`docs/database.md`](docs/database.md) detailing all 7 Mongoose schemas, relationships, compound indexes, GeoJSON conventions, and soft delete lifecycle rules.
- **Environment Reference**:
  - Created [`docs/environment.md`](docs/environment.md) detailing core server, database, auth, AI, routing, and threshold configuration variables.
- **Comprehensive Documentation Updates**:
  - Updated [`README.md`](README.md) into the primary public-facing backend guide with setup instructions, architecture diagram, feature status table, and frontend integration handoff.
  - Updated [`WALKTHROUGH.md`](WALKTHROUGH.md) with complete Part 1 through Part 12 deep dives and end-to-end emergency operational lifecycle walkthrough.
  - Updated [`AI_MEMORY.md`](AI_MEMORY.md) synchronizing all module inventories, models, indexes, APIs, security rules, and setting status to `CORE IMPLEMENTATION COMPLETE`.

## [Unreleased] - Part 12

### Added — Final Backend Hardening, Security, Performance & Testing
- Refactored `server/shared/middleware/errorHandler.js` to preserve `err.status || err.statusCode` for operational errors (400, 401, 403, 404, 409).
- Enhanced `server/modules/auth/auth.middleware.js` with dual transport support (HTTP-only cookies + `Authorization: Bearer <token>`).
- Added compound indexes to `Emergency`, `Incident`, and `Vehicle` models.
- Hardened trajectory pagination against `NaN`, negative numbers, and unbounded query limits.
- Added graceful shutdown handlers (`SIGINT`, `SIGTERM`) in `server/server.js`.
- Created comprehensive regression test suite `server/test-part12.js`.

## [Unreleased] - Part 11

### Added — Full Backend Integration & End-to-End Workflow
- Created dedicated `server/modules/orchestration/` feature module.
- Added `POST /api/orchestration/emergencies/:emergencyId/analyze` executing the complete end-to-end workflow.
- Added three-tier epistemic breakdown (`OBSERVED`, `INFERRED`, `UNKNOWN`).
- Added automated test suite `server/test-part11.js`.

## [Unreleased] - Part 10

### Added — Decision & Dispatch Engine
- Created dedicated `server/modules/decisions/` feature module with deterministic operational rules, severity levels, status state machine, audit trail, and real-time event broadcasting.
- Added automated test suite `server/test-part10.js`.

## [Unreleased] - Part 9

### Added — Real-Time Backend (Socket.IO & Live Event Streaming)
- Created dedicated `server/modules/realtime/` feature module with handshake JWT authentication and room management.
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
