# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Full-Stack Monorepo, Frontend & Routing Engine Integration

### Added
- **Root Next.js 16 Frontend Configuration**:
  - Configured Next.js 16 (App Router, Turbopack) at the root level with React 19, TypeScript, and Tailwind CSS v4.
  - Implemented core pages: Landing (`/`), Login (`/login`), Signup (`/signup`), and Driver Dashboard (`/driver/dashboard`).
  - Added [next.config.mjs](next.config.mjs), [tsconfig.json](tsconfig.json), [postcss.config.mjs](postcss.config.mjs), and updated root [package.json](package.json).
- **Member 2 Python Spatial Routing & V2X Engine**:
  - Integrated `routing-engine/` with Haversine distance, cross-track deviation detection, corridor preemption, and V2X green-wave scoring.
  - Created interactive Leaflet.js map visualizer (`map_visualizer.html`) and real-time GPS telemetry streamer simulation.
  - Added documentation in [`routing-engine/MEMBER2_GUIDE.md`](routing-engine/MEMBER2_GUIDE.md).
- **Repository Migration**:
  - Reconfigured git remotes and tracking to target `https://github.com/SwiftCareSC7/geoagent-emegency-project.git`.
  - Added root [`.gitignore`](.gitignore) protecting against environment secrets, build caches, and Python bytecode.

## [1.0.0] - Final Backend Hardening, Documentation & Security

### Added
- **Complete OpenAPI 3.0 Specification**:
  - Created [`docs/openapi.yaml`](docs/openapi.yaml) documenting all 40+ REST API endpoints, schemas, authentication schemes, and responses.
- **Real-Time Socket.IO Reference**:
  - Created [`docs/socket-events.md`](docs/socket-events.md) detailing connection handshake auth, room isolation (`control-room`, `emergency:${id}`, `vehicle:${id}`), and server-emitted operational events.
- **Database Architecture Reference**:
  - Created [`docs/database.md`](docs/database.md) detailing all 7 Mongoose schemas, relationships, compound indexes, GeoJSON conventions, and soft delete lifecycle rules.
- **Environment Reference**:
  - Created [`docs/environment.md`](docs/environment.md) detailing core server, database, auth, AI, routing, and threshold configuration variables.
- **Dedicated 23-Point Security Suite**:
  - Created `server/test-security.js` validating password hashing, injection defense, JWT tampering, CORS headers, and IDOR protection.

## [0.9.0] - Part 12: Backend Hardening, Status Codes & Query Boundaries
- Refactored `server/shared/middleware/errorHandler.js` to preserve `err.status || err.statusCode` for operational errors (400, 401, 403, 404, 409).
- Enhanced `server/modules/auth/auth.middleware.js` with dual transport support (HTTP-only cookies + `Authorization: Bearer <token>`).
- Added compound indexes to `Emergency`, `Incident`, and `Vehicle` models.
- Hardened trajectory pagination against `NaN`, negative numbers, and unbounded query limits.
- Added graceful shutdown handlers (`SIGINT`, `SIGTERM`) in `server/server.js`.
- Created comprehensive regression test suite `server/test-part12.js`.

## [0.8.0] - Part 11: Full Backend Integration & End-to-End Workflow
- Created dedicated `server/modules/orchestration/` feature module.
- Added `POST /api/orchestration/emergencies/:emergencyId/analyze` executing the complete end-to-end workflow.
- Added three-tier epistemic breakdown (`OBSERVED`, `INFERRED`, `UNKNOWN`).
- Added automated test suite `server/test-part11.js`.

## [0.7.0] - Part 10: Decision & Dispatch Engine
- Created dedicated `server/modules/decisions/` feature module with deterministic operational rules, severity levels, status state machine, audit trail, and real-time event broadcasting.
- Added automated test suite `server/test-part10.js`.

## [0.6.0] - Part 9: Real-Time Backend (Socket.IO & Live Event Streaming)
- Created dedicated `server/modules/realtime/` feature module with handshake JWT authentication and room management.
- Added automated test suite `server/test-part9.js`.

## [0.5.0] - Part 8: GeoAgent AI Backend Integration
- Refactored `server/modules/geoagents/` into a complete production feature module with Gemini function calling and fallback.
- Added automated test suite `server/test-part8.js`.

## [0.4.0] - Part 7: Intelligence Layer (Deviation, Traffic, ETA)
- Added `server/modules/deviation/`, `server/modules/traffic/`, and `server/modules/analysis/`.
- Added test suite `server/test-part7.js`.
