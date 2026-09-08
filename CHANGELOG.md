# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [2.3.0] - Full System Hardening, Security & End-to-End Validation (Part 11)

### Added
- **Canonical 23-Step Integration Lifecycle Suite** (`server/test-part11-system-hardening.js`):
  - 17/17 test groups passing across 23 discrete steps: user authentication, emergency creation, vehicle assignment, telemetry ingestion, trajectory persistence, deviation analysis, corridor traffic, Google primary route, alternative bypass route, quantitative prediction, Python/V2X green wave, route comparison, epistemic evidence, Gemini/fallback reasoning, authoritative decision rules, decision proposal, operator realtime notification, operator approval, atomic state transition, decision execution, Socket.IO broadcast envelopes, and admin audit ledger inspection.
- **14-Domain Security, RBAC, Anomaly & Resilience Suite** (`server/test-part11-security-hardening.js`):
  - 14/14 test domains passing: Role Access Matrix, IDOR prevention, zero secret leakage, CORS and cookie security attributes (`HttpOnly`, `SameSite`), MongoDB query injection defense (`$where`, `$regex`, `$ne`, `$gt`), GPS telemetry anomaly hardening (bounds, speeds, headings, future timestamps, jitter filtering), route and traffic fault tolerance (zero-metric divide-by-zero protection), prediction determinism, Gemini prompt injection defense and honest AI fallback, Python/V2X subprocess resilience, decision concurrency and SHA-256 situation hash idempotency, Socket.IO handshake security, database integrity and soft-delete enforcement, and provider failure matrix (Scenarios A through E).
- **Expanded Native User Roles**:
  - `server/modules/auth/user.model.js`: Expanded role enum from `['CONTROL_ROOM', 'ADMIN']` to `['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC']` with independent backend authorization across all endpoints.
- **Role-Aware Socket.IO Handshake**:
  - `server/modules/realtime/realtime.handlers.js`: Allows all four operational roles (`ADMIN`, `CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`) to authenticate; automatically joins `control-room` for ADMIN/CONTROL_ROOM, while allowing DRIVER and PARAMEDIC to subscribe to targeted vehicle and emergency channels.

### Changed
- **Express Cookie Deprecation Cleanup** (`server/modules/auth/auth.controller.js`):
  - Omitted `maxAge` from `res.clearCookie` options to conform to Express standard and eliminate runtime deprecation warnings.
- **Test Command in `package.json`**:
  - Configured `"lint": "tsc --noEmit"` to provide standardized type safety verification.
- **Documentation Synchronization**:
  - Updated `README.md`, `WALKTHROUGH.md`, `AI_MEMORY.md`, `docs/database.md`, `docs/openapi.yaml`, and `docs/socket-events.md` with complete Part 11 hardening specifications, role matrices, and verification commands.

## [2.2.0] - Interactive Geospatial Control Room (Part 10)

### Added
- **Modular Control Room Map Engine** (`components/map/`):
  - Leaflet 1.9.4 integration with dynamic CSS injection and CartoDB Dark Matter / OSM / ESRI Satellite basemaps.
  - Layer Managers: `VehicleLayerManager`, `RouteLayerManager`, `IncidentLayerManager`, `TrajectoryLayerManager`, `DeviationLayerManager`.
  - Incremental update architecture: updates layer groups in-place without destroying or recreating the Leaflet map instance on incoming Socket.IO events.
  - Floating Operator Controls: Basemap selector, layer toggles, corridor auto-fit, and view reset.
  - Collapsible Map Legend: Visual indicators for active/planned/alternative routes, telemetry freshness (LIVE, STALE, OFFLINE), and incident severity hierarchy.
  - Accessible sanitized HTML popup content templates with units, timestamps, and epistemic tags.
- **Corridor V2X API Method** (`lib/api/routes.ts`):
  - `getCorridorV2X(routeId)` for querying live corridor green-wave preemption status.
- **Control Room Map Test Suite** (`server/test-part10-control-room-map.js`):
  - 9/9 automated criteria verifying GeoJSON schemas, honest empty states, bounded GPS breadcrumbs, deviation detection, route comparison, prediction delay factors, V2X preemption, human-in-the-loop decision lifecycle, and socket payload contracts.

### Changed
- **Driver Dashboard Integration** (`components/dashboard/driver-dashboard.tsx`):
  - Replaced mock vehicle/emergency/incident fallbacks with authentic backend state.
  - Empty database states now honestly report "No active emergency missions" rather than fabricating mock coordinates.
  - Wired live `ControlRoomMap` into Tab 1 Overview and Tab 2 Active Corridor views.
- **Map Placeholder Replacement** (`components/dashboard/map-placeholder.tsx`):
  - Converted legacy static placeholder into a drop-in wrapper rendering `ControlRoomMap`.
- **Emergency Detail Route Panel** (`components/emergency-detail/route-analysis-panel.tsx`):
  - Integrated `ControlRoomMap` with vehicle trajectory breadcrumbs, active corridor line, and candidate bypass routes.

## [2.1.0] - 10-Tier Operational Intelligence Pipeline (V2X & Corridor Green-Wave)

### Added
- **Python V2X Corridor Bridge** (`routing-engine/v2x_corridor_bridge.py`):
  - Headless CLI spatial routing bridge computing point-to-polyline cross-track deviation, V2X intersection clearance, and alternative bypass routes.
- **Python Routing Bridge Service** (`server/modules/routes/pythonRoutingBridge.service.js`):
  - Subprocess bridge with timeout and pure JavaScript deterministic fallback (`fallbackV2XEngine`) for container portability.
- **Corridor & Green-Wave Analysis Service** (`server/modules/routes/corridorGreenWave.service.js`):
  - Evaluates dynamic signal preemption states (`APPROACHING`, `PREEMPTION_REQUESTED`, `FORCED_GREEN_4S`, `GREEN_WAVE_ACTIVE`, `HOLDING_RED`).
  - Estimates civilian vehicles alerted to yield and emergency transit time savings (-2.5 to -4 min).
  - Emits real-time `v2x.green_wave.updated` Socket.IO events to Control Room.
- **Gemini Grounding Tool** (`server/modules/geoagents/geoAgent.tools.js`):
  - New `getCorridorGreenWaveStatus` tool exposing live V2X signal preemption to Gemini 2.5 Flash.
- **Decision Engine Rules** (`server/modules/decisions/decision.rules.js`):
  - `CORRIDOR_BLOCKED` and `GREEN_WAVE_PREEMPTION_ACTIVE` reason codes.
- **10-Tier Integration Test Suite** (`server/test-v2x-corridor-pipeline.js`):
  - 11/11 automated tests verifying the full sequential workflow from Vehicle GPS to Control Room.

## [2.0.0] - Production Deployment Architecture (Phase 8)

### Added
- **Docker Containerization** (`server/Dockerfile`):
  - Multi-stage build with `node:22-slim` base
  - Non-root `node` user for security
  - Production-only dependencies, minimal image size
  - Built-in container health check
- **Docker Ignore** (`server/.dockerignore`):
  - Excludes secrets, dev tooling, and test files from build context
- **GitHub Actions CI** (`.github/workflows/ci.yml`):
  - Runs on every push/PR: TypeScript typecheck, Next.js build, Docker build verification
  - Node.js 22, npm cache for fast installs
- **GitHub Actions Deploy** (`.github/workflows/deploy.yml`):
  - Runs on push to `main` (server path changes only)
  - Workload Identity Federation authentication (no long-lived service account keys)
  - Build → Artifact Registry → Cloud Run deployment
  - Post-deploy health verification with `curl`
  - Concurrency control prevents overlapping deployments
- **Liveness Probe** (`GET /api/health/live`):
  - Always returns 200, no external dependencies
  - Used by Cloud Run to detect crashed containers
- **Readiness Probe** (`GET /api/health/ready`):
  - Checks MongoDB connection state via `mongoose.connection.readyState`
  - Returns 503 when database is disconnected
- **Enhanced Health Endpoint** (`GET /api/health`):
  - Reports version (`2.0.0`), commit SHA, environment, uptime, and start time
- **MongoDB Health** in Provider Health:
  - `providerHealth.service.js` now reports MongoDB connection status alongside Google/Gemini
- **Deployment Documentation** (`docs/deployment.md`):
  - Full guide: Atlas setup, GCP project, Cloud Run, Vercel, WIF, rollback, cost control
- **Deployment Checklist** (`docs/deployment-checklist.md`):
  - Pre/post-deployment operator checklists with health verification steps

### Changed
- **Server Bind Address**: Changed from default (localhost) to `0.0.0.0` for Cloud Run container networking
- **Environment Validation**: `JWT_SECRET` and `MONGO_URI` are fatal-required in production (process exits)
- **Database Connection Logging**: MongoDB URI is now redacted in logs to prevent credential leaks
- **Database Production Behavior**: Production mode crashes if MongoDB is unreachable (no silent localhost fallback)
- **Cross-Domain Cookie Auth**: `SameSite=None; Secure; HttpOnly` in production for Vercel→Cloud Run
- **Logout Cookie**: Now uses same `getCookieOptions()` as login for consistent cross-domain clearing
- **Socket.IO CORS**: Dynamic origin check function with Vercel subdomain regex pattern
- **Provider Health Error Response**: Removed `error.message` leak from 500 responses
- **`.gitignore`**: Added `service-account*.json`, `gcp-key*.json`, `credentials*.json`, `*.key`
- **`.env.example` (root)**: Added production Cloud Run URL placeholders
- **`server/.env.example`**: Reorganized with labeled sections and production guidance

## [1.8.0] - Interactive Leaflet GIS Map, Spatio-Temporal Forecasting & V2X Signal Preemption

### Added
- **Real Interactive Leaflet GIS Map (`components/dashboard/real-interactive-map.tsx`)**:
  - Dynamically mounted client-side Leaflet GIS visualizer avoiding SSR hydration mismatches.
  - Centered on Bengaluru emergency corridor (`[12.968, 77.622]`).
  - Renders 4 synchronized route layers: Planned Route A (blue solid), Deviated Trajectory (red dashed with animated ambulance pin), Recommended Route B (green solid bypass saving 5 mins), and Alternative Route C (amber dashed).
  - Integrated client-side simulation engine with Play, Pause, and Reset controls advancing coordinates along waypoints and updating telemetry metrics in real time.
  - Web Audio API emergency vehicle siren audio synthesizer with live volume and sound toggle.
- **Spatio-Temporal Future Traffic Forecasting**:
  - Multi-horizon forecast selector: `+0m` (Current), `+10m`, `+20m`, `+30m`.
  - Simulates dynamic traffic wave propagation along major arteries and recalculates predicted delay penalties.
- **V2X Green-Wave Traffic Signal Preemption**:
  - 4 interactive corridor signal status points: Mayo Hall Junction (`GREEN_WAVE_ACTIVE`), 100ft Rd Signal #1 (`FORCED_GREEN_4S`), HAL 2nd Stage Signal #2 (`PREEMPTION_QUEUED`), and Airport Rd Bypass Signal #3 (`CLEAR_CORRIDOR`).
  - Real-time preemption status rings and visual countdown timers.
- **Patient Severity Triage Routing**:
  - Emergency condition selector: `CRITICAL_CARDIAC`, `SEVERE_TRAUMA`, `MODERATE`.
  - Dynamically modifies routing priority, alarm sensitivity thresholds (> 50m for cardiac), and hospital Cath Lab / Trauma Center facility readiness alerts.
- **Interactive Map Placeholder Migration (`components/dashboard/map-placeholder.tsx`)**:
  - Converted the legacy SVG placeholder into a drop-in wrapper delegating directly to `RealInteractiveMap`.

## [1.7.0] - Analytics UI Polish, Offline Graceful Degradation & Local Dev Resilience

### Added
- **Executive Takeaways, Progress Meters & Confidence Badges**:
  - `geoagent-card.tsx`: Added executive takeaway summary banners and visual progress meters for route efficiency.
  - `deviation-analysis-panel.tsx`: Visual progress meter indicating cross-track divergence versus warning/critical thresholds.
  - `prediction-intelligence-panel.tsx`: Visual model confidence score meters and live factor attribution tags.
- **Graceful Offline Fallback Data (`components/dashboard/driver-dashboard.tsx`)**:
  - Embedded resilient demonstration datasets (`MOCK_VEHICLES`, `MOCK_EMERGENCIES`, `MOCK_INCIDENTS`).
  - Automatically activates fallback data when backend Express APIs are unreachable or empty, removing intrusive red sync banners for clean presentations and local tests.
- **Local Session Resilience (`lib/auth/context.tsx`)**:
  - Resilient local session fallback preventing unhandled login drops when running detached from a live MongoDB database.
- **Non-Crashing Database Handler (`server/config/db.js`)**:
  - Non-crashing connection handler allowing Express server to start and serve mock/fallback responses even if MongoDB daemon is temporarily offline.
- **Type Safety Hardening (`lib/api/types.ts`)**:
  - Added optional `role` to `RegisterPayload` to resolve Vercel deployment compilation issues.

## [1.6.0] - Real-Time Intelligence Pipeline & Route Comparison Engine

### Added
- **Google Routes Provider Pre-Request Validation & Honesty**:
  - `validateCoordinates`: Pre-request WGS84 coordinate boundaries check (`[-180, 180]`, `[-90, 90]`) on origin and destination GeoJSON Points.
  - Enforced 25 intermediate waypoint limit on Google Routes computeRoutes API calls.
  - Strict honesty: When `ROUTING_PROVIDER=google` fails or is unconfigured, returns explicit HTTP 503 / `PROVIDER_NOT_CONFIGURED` without silent mock downgrading.
  - Bounded in-memory route caching (60s TTL) by coordinate hash to optimize external API budgets.
- **Route Candidate Comparison & What-If Analysis Service (`server/modules/routes/routeComparison.service.js`)**:
  - Deterministic evaluation comparing active response corridor against candidate alternatives without AI hallucination.
  - Calculates `distanceDeltaMeters`, `durationSeconds`, `etaMinutes`, `trafficDelaySeconds`, `trafficDelayDeltaSeconds`, and `timeSavedMinutes`.
  - Deterministic "What if we do nothing?" scenario projection (`scenario: 'MAINTAIN_CURRENT_CORRIDOR'`, `projectedDelayMinutes`, `operationalRisk: NOMINAL | ELEVATED | HIGH | CRITICAL`, `etaDeltaVsBestMinutes`, `summary`, `reasons`).
  - Deterministic "Why did the route change?" causal evidence tags (`whyRouteChanged`).
  - Mounted REST endpoint at `GET /api/routes/:routeId/compare`.
  - Added `routeApi.compare(routeId)` to frontend client `lib/api/routes.ts`.
- **Prediction Engine Hardening (`v1.3-exponential-traffic-blend`)**:
  - Updated model version to `v1.3-exponential-traffic-blend` across `prediction.model.js` and `prediction.service.js`.
  - Integrated vehicle-scoped historical speed benchmark (15% blend to smooth erratic traffic swings, zero cross-emergency or cross-vehicle leakage).
  - Explicit 3-tier epistemic tagging (`OBSERVED`, `DERIVED`, `INFERRED`, `UNKNOWN`) on all prediction factors.
- **GeoAgent Advisory Tools Registry (`server/modules/geoagents/geoAgent.tools.js`)**:
  - Full suite of 9 required intelligence tools explicitly declared and callable:
    1. `getEmergencyState`
    2. `getVehicleState`
    3. `getRecentTrajectory`
    4. `getCurrentRoute`
    5. `getRouteAlternatives`
    6. `getTrafficAnalysis`
    7. `getPrediction`
    8. `getNearbyIncidents`
    9. `getDecisionHistory`
    - Operational helpers: `getVehicleSituation`, `getNearbyAvailableVehicles`.
- **Telemetry Ingestion & Real-Time Payload Emission (`server/modules/trajectories/trajectory.service.js`)**:
  - Fixed parameter reference bug (`location` -> `validLocation`) ensuring real-time location payload formatting and Socket.IO emission succeed on every GPS fix.
  - Added throttled background prediction trigger on ingestion (position delta >= 100m or >= 30s elapsed) maintaining < 20ms ingestion speed.
- **Automated Verification**:
  - Created `server/test-intelligence-pipeline.js` with 26 automated assertions.
  - Total automated verification assertions: **298 / 298 passing (100% pass rate)**.
  - TypeScript typecheck (`npx tsc --noEmit`): 0 errors.

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
