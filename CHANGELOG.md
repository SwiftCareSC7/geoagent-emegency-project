# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Part 7

### Added — Backend Intelligence Layer (Route Deviation, Traffic, ETA, Situation Analysis)
- Added `server/modules/deviation/` module:
  - `deviation.config.js`: Configurable deviation distance & bearing thresholds and GPS stability window.
  - `deviation.service.js`: Deterministic deviation calculation (distance to route, nearest point, bearing comparison, GPS jitter stability analysis, threshold classification).
  - `deviation.controller.js`: Controller for standalone vehicle deviation analysis.
  - `deviation.routes.js`: Protected API route `GET /api/deviation/vehicle/:vehicleId`.
  - `deviation.validation.js`: Input validation for vehicle deviation requests.
- Added `server/modules/traffic/` module:
  - `traffic.config.js`: Traffic levels (`FREE`, `LIGHT`, `MODERATE`, `HEAVY`, `SEVERE`, `UNKNOWN`) and congestion thresholds.
  - `traffic.service.js`: Pluggable traffic service abstraction.
  - `providers/mockTrafficProvider.js`: Deterministic mock traffic generator for points and LineString routes.
  - `traffic.controller.js` & `traffic.routes.js`: Protected endpoint `GET /api/traffic/location`.
- Added `server/modules/analysis/` module:
  - `analysis.service.js`: Situation analysis orchestrator combining vehicle, trajectory, route, deviation, traffic, incident correlation, route progress, ETA, delay, and evidence generation.
  - `analysis.controller.js`: Controller for full vehicle situation analysis.
  - `analysis.routes.js`: Protected endpoint `GET /api/analysis/vehicle/:vehicleId`.
  - `analysis.validation.js`: Validation for vehicle analysis requests.
- Extended `server/shared/services/geospatial.service.js`:
  - Added `calculateRouteProgress(point, lineString)` returning progress percentage, distance traveled, and remaining distance.
  - Added `getRouteBearingAtPoint(lineString, point)` calculating forward route bearing at closest segment.
- Extended `server/modules/routes/`:
  - Added `GET /api/routes/:routeId/analysis` endpoint to analyze specific routes.
- Added test suite `server/test-part7.js` for unit and logic verification.
- Updated `server/server.js` with new route registrations.
- Updated `server/.env.example` with Part 7 configuration parameters.

### Added — Frontend (SwiftCare GeoAgent Prototype)
- Added Next.js App Router frontend at project root (`app/`, `components/`, `lib/`)
- Added root layout with Inter + Plus Jakarta Sans fonts, SEO metadata, favicon setup
- Added Tailwind CSS v4 design system with SwiftCare brand palette
- Added Landing Page (`/`), Login Page (`/login`), Signup Page (`/signup`), and Driver Dashboard (`/driver/dashboard`)
- Added mock data adapter layer `lib/api.ts` and static scenario in `lib/mock-data.ts`

### Added — GeoAgent AI PoC
- Added `server/modules/geoagents/geoAgent.service.js` — Gemini function-calling PoC for rerouting suggestions
- Added `server/modules/geoagents/geoAgent.tools.js` — mock alternative route tool

## [Unreleased] - Part 6
### Added
- Added Route model to store emergency vehicle paths
- Added Routing service abstraction layer (google, mapbox, osrm, mock)
- Added Mock routing provider for deterministic development routes
- Added Route creation and retrieval APIs (`POST /api/routes`, `GET /api/routes`, `GET /api/routes/:routeId`)
- Added GeoJSON LineString support and strict Point validation
- Added distance and duration calculations via `@turf/turf`

## [Unreleased] - Part 5
### Added
- Added Trajectory model for vehicle GPS history
- Added GPS ingestion API (`POST /api/trajectories`)
- Added Latest Location API (`GET /api/trajectories/:vehicleId/latest`)
- Added Trajectory History API with pagination (`GET /api/trajectories/:vehicleId`)
- Added Recent Trajectory API (`GET /api/trajectories/:vehicleId/recent`)
- Added MongoDB `2dsphere` index and compound index `{ vehicle: 1, timestamp: -1 }`

## [Unreleased] - Part 4
### Added
- Added Emergency and Incident models with `2dsphere` indexes and soft deletes
- Added Emergency and Incident CRUD APIs
- Added vehicle assignment workflow with MongoDB transaction structure
- Refactored backend into modular architecture (`modules/auth`, `modules/vehicles`, `modules/emergencies`, `modules/incidents`)
