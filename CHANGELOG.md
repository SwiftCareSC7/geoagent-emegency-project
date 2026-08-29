# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

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
- Updated `AI_MEMORY.md`, `README.md`, and `WALKTHROUGH.md`.

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
