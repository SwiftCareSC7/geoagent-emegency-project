# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Part 12

### Added — Final Backend Hardening, Security, Performance & Testing
- **Error Handler Hardening**:
  - Refactored `server/shared/middleware/errorHandler.js` to preserve `err.status || err.statusCode` for all operational errors (400, 401, 403, 404, 409), ensuring proper HTTP status codes are returned to clients.
- **Authentication & Token Enhancements**:
  - Fixed named imports in `server/modules/auth/auth.controller.js` (`registerUser`, `loginUser`).
  - Enhanced `server/modules/auth/auth.middleware.js` to support both HTTP-only cookies and `Authorization: Bearer <token>` headers seamlessly.
- **Database Model & Index Optimizations**:
  - Added compound indexes to `Emergency` model: `{ assignedVehicle: 1, isDeleted: 1 }` and `{ status: 1, isDeleted: 1 }`.
  - Added compound indexes to `Incident` model: `{ emergency: 1, isDeleted: 1 }` and `{ status: 1, isDeleted: 1 }`.
  - Added compound index to `Vehicle` model: `{ status: 1, isDeleted: 1 }`.
- **Query Boundary & Parameter Protection**:
  - Hardened `getTrajectoryHistory` and `getRecentTrajectories` in `server/modules/trajectories/trajectory.service.js` with fallback logic against `NaN`, negative limits, and unbounded queries (capped at 100).
  - Hardened `assignVehicle` and `createRoute` to resolve both friendly business IDs (`EMG-0001`, `AMB-001`) and ObjectIds, with graceful execution on standalone MongoDB installations.
- **Comprehensive Part 12 Test Suite**:
  - Created `server/test-part12.js` covering registration hashing/stripping, cookie + bearer token auth, error handler status code preservation, NaN query boundaries, GeoJSON coordinate boundaries (-180..180, -90..90), Socket.IO authenticated handshakes, and end-to-end orchestration workflows.
  - Verified 100% test pass rate across all 6 test suites (`test-part7.js` through `test-part12.js`).
- Updated `AI_MEMORY.md`, `README.md`, and `WALKTHROUGH.md`.

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
