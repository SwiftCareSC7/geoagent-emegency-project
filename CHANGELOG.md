# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Interactive Map Integration

## [1.5.0] - Admin Database Administration & System Observability Layer

### Added
- **ADMIN-Only Security & Authorization Architecture**:
  - Gated all `/api/admin/*` routes behind `protect` and `requireRole('ADMIN')`.
  - Rejects unauthenticated requests with `401 Unauthorized` and non-ADMIN roles (`CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`) with `403 Forbidden: Insufficient privileges`.
  - Zero raw database exposure: No arbitrary MongoDB command execution, no client-submitted query operators (`$where`, `$regex`), and zero credential/URI leaks.
- **Backend Admin Module (`server/modules/admin/`)**:
  - `admin.validation.js`: Bounded pagination (`limit <= 100`), allowlisted sort fields, and input sanitization stripping reserved MongoDB operator characters.
  - `admin.service.js`:
    - `getSystemStats()`: Real counts across all 8 verified collections (`users`, `vehicles`, `emergencies`, `incidents`, `trajectories`, `routes`, `decisions`, `predictions`). Uses `Trajectory.estimatedDocumentCount()` for $O(1)$ fast count over high-frequency GPS fixes.
    - `getDatabaseHealth()`: Safe live ping latency test via `mongoose.connection.db.admin().ping()`. Reports `CONNECTED`, `DEGRADED`, or `DISCONNECTED` with roundtrip latency in ms without exposing credentials.
    - `getSystemHealthSummary()`: Combines database health with provider statuses (Google Routes, Google Roads, Gemini AI, Socket.IO).
    - Paginated readers with safe projection: `getUsers` (strictly omits `password`), `getVehicles`, `getEmergencies`, `getIncidents`, `getRoutes`, `getTrajectories` (bounded slices), `getPredictions`, `getDecisions`.
  - `admin.controller.js`: Structured JSON audit logging (endpoint, userId, action, resource, durationMs, statusCode).
  - Mounted router at `/api/admin` in `server/server.js`.
- **Model Index Optimization**:
  - Added indexes: `{ role: 1, createdAt: -1 }` on `User`, and `{ createdAt: -1 }` on `Vehicle`, `Emergency`, `Incident`, `Route` for high-performance sorting and pagination.
- **Frontend Admin Console (`/admin`)**:
  - Created protected page `app/admin/page.tsx` with `<ProtectedRoute allowedRoles={['ADMIN']}>`.
  - `AdminOverview`: Real-time system counters, MongoDB primary health card, upstream provider status grid, and 24h operational flow window.
  - `AdminDatabaseExplorer`: Tabbed dataset browser for all 8 collections with pagination controls, filters, and a record inspector drawer with formatted view and sanitized JSON debug view.
  - `DashboardTopbar`: Added "Admin Console" link button for authenticated `ADMIN` users.
  - `lib/api/admin.ts`: Strongly typed API client methods.
- **Automated Verification**:
  - Created `server/test-admin-e2e.js` with 60 automated assertions verifying RBAC, stats, ping latency, sensitive field exclusion, query hardening, and paginated collections (100% pass rate). Total project assertion count: 272/272 passing.

## [1.4.0] - Real-Time Intelligence & External Data Integration

### Added
- **External Routing & Traffic Providers**:
  - `GoogleRoutingProvider`: Implements Google Routes API (`directions/v2:computeRoutes`) with explicit field masks, `TRAFFIC_AWARE_OPTIMAL` routing, high-precision polyline decoding to GeoJSON `LineString`, candidate alternative route parsing, and 60-second in-memory caching.
  - `GoogleRoadsProvider`: Batched road-snapping with max 100 points, 5-minute caching, Turf.js spatial nearest-point fallback, and static speed-limit context lookup.
  - `GoogleTrafficProvider`: Deterministic traffic delay and congestion calculation from Google Routes duration comparisons, labeled with `epistemicType: 'DERIVED'`.
  - `ProviderHealthService`: Evaluates live health status (`AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, `NOT_CONFIGURED`) of Google Routes, Google Roads, and Gemini AI without leaking keys at `GET /api/health/providers`.
- **Telemetry Ingestion Hardening**:
  - Added strict coordinate bounds check (`[-180, 180]`, `[-90, 90]`), future timestamp rejection (> 2 min), speed validation (`0 - 250 km/h`), heading validation (`0 - 360°`), and teleport jitter anomaly detection (> 1000m jump within 10s).
- **Real-Time Prediction Engine**:
  - `PredictionService` and `Prediction` Mongoose model: Rolling exponential moving average (EMA) speed trend, remaining distance slicing, traffic-aware delay estimation, deviation/incident penalties, risk classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and evidence-based confidence scoring.
  - Exposed `GET /api/analysis/vehicle/:vehicleId/prediction` REST endpoint.
- **GeoAgent & Decision Engine Rationale**:
  - Integrated Gemini 2.5 Flash as advisory reasoning partner with deterministic fallback.
  - Generated trade-off matrix: "Why did the route change?" (evidence tags) and "What if we do nothing?" (delay & risk projection).
  - Enforced `PENDING_OPERATOR_ACTION` state machine requiring operator approval before execution.
- **Socket.IO Real-Time Streaming**:
  - Authenticated WebSocket handshake supporting JWT tokens and HTTP-only cookies.
  - Event streaming for `prediction.updated` across isolated rooms (`control-room`, `emergency:${id}`, `vehicle:${id}`).
  - Client singleton `lib/socket/client.ts` with auto-reconnect, and React hooks `useSocketStatus` and `useRealtimeEmergency`.
- **Frontend Intelligence UI**:
  - `PredictionIntelligencePanel`: Displays live predicted ETA, delay risk badge, model confidence, structured predictive factors, and LIVE/STALE freshness badge.
  - `RouteComparisonCard`: Interactive corridor comparison matrix contrasting Active Corridor vs Best Alternative Candidate.
  - `DecisionApprovalCard`: Displays authoritative decision state with operator approve/reject controls.
- **Automated Verification**:
  - Created `server/test-realtime-external-e2e.js` with 48 automated assertions verifying health status, routing polyline decoding, roads batching, traffic epistemic logic, telemetry hardening, prediction engine, decision rationales, and Socket.IO room streaming (100% pass rate).

## [1.3.0] - Emergency Detail & Corridor Analysis View

### Added
- **Emergency Detail & Corridor Analysis Page (`/emergencies/[id]`)**:
  - Created dynamic route `app/emergencies/[id]/page.tsx` wrapped in `<ProtectedRoute>` and integrated with `DashboardTopbar`.
  - Created master container `EmergencyDetailView` with concurrent sub-resource requests (`Promise.allSettled`), independent error isolation, and 404 handling.
  - Added "Track & Analyze Corridor →" navigational action link to emergency cards in `ActiveEmergenciesPanel`.
- **UI Component Suite**:
  - `EmergencyOverviewCard`: Type icon, priority badge (with pulse for CRITICAL), status pill, formatted timestamps, caller details, and copyable WGS84 GPS coordinates.
  - `VehicleMovementPanel`: Latest fix telemetry strip (coordinates, speed in km/h, cardinal heading direction, source) and paginated bounded GPS trajectory table with prev/next controls.
  - `RouteAnalysisPanel`: Planned route ID, provider attribution (`MOCK Provider (Local Simulation)`), distance, duration, and GeoJSON LineString waypoint verification.
  - `DeviationAnalysisPanel`: Cross-track distance (meters), bearing divergence (°), GPS stability (`STABLE`/`UNSTABLE`), traffic congestion metrics, ETA comparison, calculated delay, and structured evidence badges.
  - `CorrelatedIncidentsPanel`: Incidents affecting the response corridor with distance offsets from vehicle and route centerline.
  - `EpistemicBreakdownCard`: Strict 3-tier epistemic breakdown (`OBSERVED`, `INFERRED`, `UNKNOWN`).
- **Frontend API Client Layer**:
  - Added typed API modules: `lib/api/routes.ts` (`routeApi`), `lib/api/analysis.ts` (`analysisApi`), and `lib/api/orchestration.ts` (`orchestrationApi`).
  - Added `trajectoryApi.getLatestSafe` to handle 404 empty states gracefully without throwing uncaught errors.
  - Expanded `lib/api/types.ts` with exact backend interfaces for `Route`, `SituationAnalysis`, `DeviationAnalysis`, `TrafficAnalysis`, `OrchestrationWorkflowResult`, and `EpistemicBreakdown`.
- **Backend Compatibility Fix**:
  - Fixed Mongoose `CastError` in `server/modules/routes/route.service.js` by resolving friendly `emergencyId` (e.g. `EMG-2026-001`) and `vehicleId` to ObjectIds prior to querying `Route`.
  - Corrected populate field names from `caseId` to `emergencyId` and removed non-existent `callSign` on Vehicle model.
- **Database Seeder & Test Suite**:
  - Extended `server/seed-dashboard-data.js` to seed active planned routes and 15 sequential GPS trajectory points for `AMB-102`.
  - Created `server/test-emergency-detail-e2e.js` with 63 automated assertions testing emergency retrieval, route resolution, trajectory pagination, situation analysis, orchestration, and empty state handling (100% pass rate).

## [1.2.0] - Part 14: Live Backend REST Integration & Operations Dashboard

### Added
- **Live Dashboard REST Feeds**:
  - Connected `/driver/dashboard` directly to live MongoDB Express endpoints (`/api/vehicles`, `/api/emergencies`, `/api/incidents`) over authenticated cookie transport.
  - Added dual-view toggle between **Operations Live Overview** (live database feeds) and **Corridor Telemetry & Route** (active corridor map view).
  - Built `EmergencySummaryCards` displaying real aggregated counters for Active Calls, Critical Calls, Deployed Units, Fleet Ready, and Road Hazards with skeleton loading states.
  - Built `VehicleFleetPanel` with status badges, vehicle type icons, hospital assignment, driver contact, status filter chips, and honest empty states.
  - Built `ActiveEmergenciesPanel` with priority badges, status badges, GeoJSON location coordinates, assigned unit summary, priority filter chips, and honest empty states.
  - Built `RoadIncidentsPanel` with severity badges, GeoJSON coordinates, source details, severity filter chips, and honest empty states.
- **Backend Compatibility Fix**:
  - Updated `vehicleService.getVehicles` and `vehicle.controller.js` to accept and pass query parameters (`status`, `type`) and filter out soft-deleted records (`isDeleted: false`).
- **Database Seeder & Test Suite**:
  - Created `server/seed-dashboard-data.js` to seed 5 realistic vehicles, 4 emergencies, and 3 road incidents into MongoDB.
  - Created `server/test-dashboard-e2e.js` validating route protection, operator authentication, empty database responses, query filtering, and populated references across 47 automated assertions (100% pass rate).

## [1.1.0] - Part 13: Real Frontend Authentication & Session Management

### Added
- **Frontend Auth Architecture**:
  - Centralized HTTP Client `lib/api/client.ts` with HTTP-only cookie support (`credentials: 'include'`) and network error normalization.
  - Auth domain API `lib/api/auth.ts` implementing `register`, `login`, `logout`, and `getMe`.
  - Client auth state management `lib/auth/context.tsx` (`AuthContext`, `AuthProvider`, `useAuth`) and session loader `lib/auth/session.ts`.
  - Production components `LoginForm.tsx`, `SignupForm.tsx`, and `ProtectedRoute.tsx`.
- **Pages & Route Protection**:
  - Updated `/login` to use `LoginForm` with auto-redirect when already authenticated.
  - Updated `/signup` to use `SignupForm` with password requirements checklist and post-registration auto-authentication.
  - Protected `/driver/dashboard` with `<ProtectedRoute>` to prevent unauthenticated access and eliminate content flashing.
  - Added role badge (`CONTROL_ROOM`, `ADMIN`) and functional `Log out` action to `DashboardTopbar`.
- **E2E Contract Verification**:
  - Created `server/test-auth-e2e.js` testing 10 operational scenarios across 31 assertions with 100% pass rate.

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
