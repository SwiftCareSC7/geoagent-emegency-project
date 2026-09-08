# GeoAgentic Emergency Response System — AI Memory

## 1. Project Purpose & Scope
The **GeoAgentic Emergency Response System** (SwiftCare GeoAgent) is an intelligent decision-support and dispatch platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic congestion or road hazards, calculate delays, recommend alternative routes, evaluate V2X green-wave corridor clearances, run advisory Gemini AI reasoning, and evaluate authoritative operational decisions in real time.

**Repository Scope**:
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React (located at root `/app`, `/components`, `/lib`, `/public`).
- **Backend Core**: Node.js (ESM), Express, MongoDB + Mongoose 8, Socket.IO 4.8 (located at `/server`).
- **Spatial Routing Engine**: Python standalone spatial analysis, corridor deviation, and V2X engine (located at `/routing-engine`).
- **Target Repository**: `https://github.com/SwiftCareSC7/geoagent-emegency-project.git`

---

## 2. Technology Stack

### Frontend Core
- **Framework**: Next.js 16 (Turbopack, App Router)
- **UI Components**: React 19, Tailwind CSS v4, Lucide React, Base UI
- **Language**: TypeScript (`@/*` path aliasing)
- **Target Port**: `http://localhost:3000`

### Backend Core
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js + Node HTTP Server
- **Real-Time Layer**: Socket.IO 4.8 (room-isolated push streaming, handshake JWT authentication)
- **Database**: MongoDB (v6.0+)
- **ODM**: Mongoose (v8.4+)
- **Security**: `bcryptjs` (salt rounds: 12), `jsonwebtoken`, `helmet`, `cors`, `cookie-parser`
- **Geospatial Processing**: `@turf/turf` (v7.4+, WGS84, GeoJSON Point & LineString)
- **AI Decision Support**: `@google/genai` (v2.19+, Google Gemini 2.5 Flash SDK)
- **Target Port**: `http://localhost:5000`

### Python Spatial Routing Engine (Member 2)
- **Runtime**: Python 3.11+
- **Algorithms**: Haversine formula, cross-track error, bearing, corridor intersection, V2X green-wave signal clearance scoring
- **Visualizer**: Leaflet.js interactive map (`routing-engine/map_visualizer.html`)

---

## 3. System Architecture

```text
                                  CLIENT / OPERATOR UI
                         (Next.js 16 App Router + Tailwind v4)
                                          │
                         ┌────────────────┴────────────────┐
                         ▼                                 ▼
                 REST API (Express)               Real-Time (Socket.IO)
                         │                                 │
                         ▼                                 │
              Authentication & RBAC                        │
         (JWT in Cookie / Bearer Header)                   │
                         │                                 │
                         ▼                                 │
                Domain Feature Modules                     │
 ┌───────────────────────┼───────────────────────┐         │
 │                       │                       │         │
 ▼                       ▼                       ▼         │
Vehicles            Emergencies              Incidents     │
 │                       │                       │         │
 ▼                       ▼                       │         │
Trajectories          Routes                     │         │
 │                       │                       │         │
 └───────────┬───────────┘                       │         │
             ▼                                   │         │
      Deviation Engine                           │         │
             │                                   │         │
             ▼                                   │         │
      Traffic Engine                             │         │
             │                                   │         │
             ▼                                   │         │
     ETA & Delay Engine                          │         │
             │                                   │         │
             └───────────────────┬───────────────┘         │
                                 ▼                         │
                       Situation Analysis                  │
                                 │                         │
                                 ▼                         │
                       GeoAgent AI (Gemini)                │
                           (Advisory)                      │
                                 │                         │
                                 ▼                         │
                     Decision Engine (Rules)               │
                          (Authoritative)                  │
                                 │                         │
                                 ▼                         │
                       Orchestration Service               │
                                 │                         │
                   ┌─────────────┴─────────────┐           │
                   ▼                           ▼           ▼
             MongoDB Database          Socket.IO Broadcast
```

---

## 4. Current File Structure

```text
/
├── app/                                      # Next.js App Router Pages
│   ├── layout.tsx                            # Root layout with AuthProvider & fonts
│   ├── page.tsx                              # Landing page
│   ├── login/page.tsx                        # Real authenticated login interface
│   ├── signup/page.tsx                       # Real authenticated registration interface
│   ├── driver/dashboard/page.tsx             # Protected driver telemetry & operations dashboard
│   ├── emergencies/[id]/page.tsx             # Emergency corridor analysis & intelligence view
│   └── admin/page.tsx                        # Admin system observability & database explorer
├── components/                               # React UI Components
│   ├── admin/                                # Admin console components
│   │   ├── admin-overview.tsx                # System metrics, DB health & latency ping
│   │   └── admin-database-explorer.tsx       # Tabbed collection browser & sanitized inspector
│   ├── auth/                                 # Authentication UI Components
│   │   ├── LoginForm.tsx                     # Production login form with validation & errors
│   │   ├── SignupForm.tsx                    # Production registration with password rules
│   │   └── ProtectedRoute.tsx                # Client route guard & role access control
│   ├── dashboard/                            # Mission dashboard widgets
│   │   ├── dashboard-topbar.tsx              # Top bar with authenticated user, role badge & admin link
│   │   ├── driver-dashboard.tsx              # Dual-tab dashboard (operations / telemetry) with offline fallback
│   │   ├── real-interactive-map.tsx          # Real Leaflet GIS map with Bengaluru routing, V2X & simulation
│   │   ├── map-placeholder.tsx               # Wrapper delegating to RealInteractiveMap
│   │   ├── emergency-summary-cards.tsx       # Dynamic operational counters
│   │   ├── active-emergencies-panel.tsx      # Filterable emergency call stream
│   │   ├── vehicle-fleet-panel.tsx           # Fleet registry & deployment status
│   │   ├── road-incidents-panel.tsx          # Road hazards & spatial disruptions
│   │   ├── eta-summary.tsx                   # ETA comparison widget
│   │   ├── geoagent-card.tsx                 # AI recommendation card with executive takeaways & meters
│   │   ├── route-status-cards.tsx            # Route status cards
│   │   ├── stat-card.tsx                     # Statistical metric card
│   │   └── timeline-panel.tsx                # Event timeline panel
│   ├── emergency-detail/                     # Deep-dive corridor intelligence components
│   │   ├── emergency-detail-view.tsx         # Master coordinator with concurrent data fetching
│   │   ├── emergency-overview-card.tsx       # Emergency metadata, priority & assigned unit
│   │   ├── vehicle-movement-panel.tsx        # Latest GPS fix strip & paginated trajectory table
│   │   ├── route-analysis-panel.tsx          # Planned route details & provider attribution
│   │   ├── deviation-analysis-panel.tsx      # Deviation metrics, progress meter & evidence tags
│   │   ├── correlated-incidents-panel.tsx    # Road hazards along response corridor
│   │   ├── route-comparison-card.tsx         # Trade-off matrix & "What if do nothing" projection
│   │   ├── prediction-intelligence-panel.tsx # ETA prediction, delay risk, confidence meter & factors
│   │   ├── decision-approval-card.tsx        # Authoritative decision approval & state machine
│   │   └── epistemic-breakdown-card.tsx      # 3-tier breakdown (OBSERVED / INFERRED / UNKNOWN)
│   ├── landing/                              # Landing page sections
│   └── ui/                                   # Base UI primitives
├── lib/                                      # Frontend Utilities & API Client
│   ├── api/                                  # Centralized typed API client
│   │   ├── client.ts                         # Fetch wrapper (credentials: 'include', network error normalization)
│   │   ├── types.ts                          # Full TypeScript interfaces derived from backend schemas
│   │   ├── auth.ts                           # Auth API methods (register, login, logout, getMe)
│   │   ├── vehicles.ts                       # Vehicle CRUD API
│   │   ├── emergencies.ts                    # Emergency management API
│   │   ├── incidents.ts                      # Road hazards API
│   │   ├── trajectories.ts                   # GPS telemetry API
│   │   ├── routes.ts                         # Planned routes & comparison API
│   │   ├── analysis.ts                       # Situation analysis & prediction API
│   │   ├── decisions.ts                      # Decision lifecycle API
│   │   ├── orchestration.ts                  # Unified workflow analyze API
│   │   ├── admin.ts                          # Admin stats, health & collection explorer API
│   │   └── index.ts                          # API barrel export
│   ├── auth/                                 # Client-side Auth State & Session
│   │   ├── types.ts                          # AuthState & AuthContextType interfaces
│   │   ├── session.ts                        # Session retrieval (401 vs network error handling)
│   │   └── context.tsx                       # AuthContext with resilient local development fallback
│   ├── socket/                               # Real-time WebSocket layer
│   │   ├── client.ts                         # Socket.IO client singleton with auto-reconnect
│   │   └── useRealtime.ts                    # React hooks (useSocketStatus, useRealtimeEmergency)
│   ├── mock-data.ts                          # Static fallback & demo dashboard data
│   └── utils.ts                              # Classname styling utilities
├── public/                                   # Frontend Static Assets
├── routing-engine/                           # Python Spatial Routing & V2X Module
│   ├── routes_engine.py                      # Main routing & green-wave calculation
│   ├── geo_utils.py                          # Spatial math utilities
│   ├── simulate_telemetry_stream.py          # GPS simulation streamer
│   ├── demo_member2.py                       # Demo entry point
│   ├── map_visualizer.html                   # Leaflet interactive map visualizer
│   ├── routes_geojson.json                   # Exported route GeoJSON data
│   ├── telemetry_output.json                 # Simulated telemetry output
│   └── MEMBER2_GUIDE.md                      # Guide for routing engine
├── server/
│   ├── server.js                             # Express server entry + graceful shutdown
│   ├── config/
│   │   └── db.js                             # MongoDB connection & non-crashing handler
│   ├── modules/
│   │   ├── auth/                             # User auth, JWT, cookies, RBAC
│   │   ├── vehicles/                         # Vehicle fleet registry & CRUD
│   │   ├── emergencies/                      # Emergency calls & vehicle dispatch
│   │   ├── incidents/                        # Road hazards & spatial correlation
│   │   ├── trajectories/                     # GPS ingestion & trajectory history
│   │   ├── routes/                           # Routing engine & Google Routes provider
│   │   ├── deviation/                        # Route deviation detection & jitter filtering
│   │   ├── traffic/                          # Traffic abstraction & Google Traffic provider
│   │   ├── analysis/                         # Situation analysis & prediction engine v1.3
│   │   ├── geoagents/                        # Gemini 2.5 Flash function-calling (9 tools)
│   │   ├── decisions/                        # Authoritative Decision Engine & state machine
│   │   ├── orchestration/                    # Full end-to-end mission coordinator
│   │   ├── admin/                            # Secure admin stats & collection explorer
│   │   ├── health/                           # Upstream provider health evaluation
│   │   └── realtime/                         # Socket.IO handlers, room streaming
│   ├── shared/
│   │   └── middleware/                       # Centralized error handler & security
│   ├── test-auth-e2e.js                      # 10-Scenario contract test suite (31 assertions)
│   ├── test-*.js                             # Integration test suites (Parts 7-12)
│   └── test-security.js                      # 23-Point automated security suite
└── docs/
    ├── openapi.yaml                          # OpenAPI 3.0 specification
    ├── socket-events.md                      # WebSocket event dictionary
    ├── database.md                           # Database schemas and indexes
    └── environment.md                        # Environment variables reference
```

---

## 5. Security & Engineering Standards

1. **Authentication**: Passwords encrypted with `bcrypt` (12 rounds) and never returned in API payloads. JWT tokens validated from HTTP-only cookies or `Authorization: Bearer <token>` headers.
2. **Database Integrity**: All spatial geometries strictly adhere to WGS84 GeoJSON `[longitude, latitude]` format. Mongoose models use `2dsphere` indexes. Soft deletion (`isDeleted`) protects data records.
3. **Deterministic Authority**: AI suggestions (`GeoAgent AI`) remain purely advisory; all state transitions are evaluated by the authoritative deterministic `Decision Engine`.
4. **Idempotency**: All decisions are deduplicated with SHA-256 situational fingerprint hashes with a 30-second sliding lock.
5. **Epistemic Breakdown**: All orchestrated responses enforce a strict 3-tier classification:
   - `OBSERVED`: Physical, measured telemetry.
   - `INFERRED`: Calculated and model-derived estimates.
   - `UNKNOWN`: Missing operational context and unobserved variables.

---

## 6. Frontend Authentication System (CURRENT ACTUAL STATE)

- **Authentication Architecture**:
  - Cookie-based session transport with `credentials: 'include'` on all client requests.
  - `AuthProvider` wraps root layout in `app/layout.tsx`.
  - On initialization, `getSession()` requests `GET /api/auth/me`. Expected 401 returns `{ user: null }` without throwing, while network connection errors (status 0) surface a friendly connectivity message.
- **Contract Endpoints Used**:
  - `POST /api/auth/register`: `{ name, email, password }` -> 201 Created. Backend assigns `role: 'CONTROL_ROOM'` and does not set a cookie. Frontend notifies user and automatically authenticates.
  - `POST /api/auth/login`: `{ email, password }` -> 200 OK. Backend issues HTTP-only `token` cookie (`SameSite=Strict`, 7-day max-age). The JWT is omitted from JSON payloads.
  - `GET /api/auth/me`: 200 OK with `SafeUser` `{ id, name, email, role }` or 401 Unauthorized.
  - `POST /api/auth/logout`: 200 OK. Clears the HTTP-only `token` cookie.
- **Route Protection**:
  - `<ProtectedRoute>` wraps `/driver/dashboard`.
  - Prevents content flash with accessible loading state while checking session.
  - Redirects unauthenticated visitors to `/login?redirect=<current_path>`.
  - Supports optional `allowedRoles?: UserRole[]` for granular role enforcement.
- **Role Support**:
  - Active backend roles: `CONTROL_ROOM`, `ADMIN`.
  - User role badge and identity displayed in `DashboardTopbar`.

---

## 7. Frontend Live Backend REST Connection (CURRENT ACTUAL STATE)

- **Architecture & Data Flow**:
  - The driver/operator dashboard (`/driver/dashboard`) connects to live Express REST endpoints backed by MongoDB.
  - All calls are transmitted over HTTP with `credentials: 'include'` using the centralized client (`lib/api/client.ts`).
  - View switcher provides instantaneous toggling between:
    - **Operations Live Overview**: Real-time MongoDB feeds for fleet status, active emergency call streams, and corridor road hazards with live aggregated counter metrics.
    - **Corridor Telemetry & Route**: Preserved active corridor navigation view with SVG map placeholder, ETA breakdown, route timeline, deviation metrics, and GeoAgent explanation.
- **REST Endpoints Connected**:
  - `GET /api/vehicles`: Returns `{ success: true, count: number, data: Vehicle[] }`. Supports `?status=` and `?type=` filters.
  - `GET /api/emergencies`: Returns `{ success: true, count: number, data: Emergency[] }`. Supports `?status=`, `?priority=`, and `?type=` filters. Populates `assignedVehicle` reference with vehicle ID and registration number.
  - `GET /api/incidents`: Returns `{ success: true, count: number, data: Incident[] }`. Supports `?status=`, `?severity=`, and `?type=` filters.
- **Components Implemented**:
  - `components/dashboard/emergency-summary-cards.tsx`: Computes dynamic metric cards (Active Calls, Critical Calls, Deployed Units, Fleet Ready, Road Hazards) with loading skeletons.
  - `components/dashboard/vehicle-fleet-panel.tsx`: Displays fleet units with status badges, vehicle type icons, hospital assignment, driver contact, status filter chips, and honest empty states.
  - `components/dashboard/active-emergencies-panel.tsx`: Displays live emergency calls with priority badges, status badges, GeoJSON location coordinates, assigned unit summary, priority filter chips, and honest empty states.
  - `components/dashboard/road-incidents-panel.tsx`: Displays traffic disruptions and road hazards with severity badges, GeoJSON coordinates, source details, severity filter chips, and honest empty states.
- **Data Seeder & Verification**:
  - `server/seed-dashboard-data.js`: Seeds 5 realistic vehicles, 4 emergencies, and 3 road incidents with referential integrity to MongoDB.
  - `server/test-dashboard-e2e.js`: 47/47 automated assertions passing covering route protection, operator authentication, empty database responses, query filtering, and populated references.
  - `server/test-auth-e2e.js`: 31/31 automated assertions passing.
  - `server/test-security.js`: 23/23 automated assertions passing.
  - Next.js build: Clean compilation with Turbopack and 0 TypeScript errors (`npx tsc --noEmit`).

---

## 8. Frontend Emergency Detail & Analysis View (CURRENT ACTUAL STATE)

- **Architecture & Routing**:
  - Dynamic route `/emergencies/[id]` (`app/emergencies/[id]/page.tsx`) wrapped in `<ProtectedRoute>` and integrated with `DashboardTopbar`.
  - Accessible via "Track & Analyze Corridor →" on each emergency card in `active-emergencies-panel.tsx`.
  - Master container component `components/emergency-detail/emergency-detail-view.tsx` coordinates sub-resource loading using concurrent `Promise.allSettled`.
  - Section-level error boundaries isolate failures so missing optional sub-resources (such as an unassigned route) never crash the emergency overview.
  - Dedicated 404 state handles non-existent emergencies with a clear navigational recovery link back to `/driver/dashboard`.
- **Backend APIs Integrated**:
  - `GET /api/emergencies/:id`: Primary emergency record with caller details, GeoJSON coordinates, priority, and assigned vehicle.
  - `GET /api/emergencies/:emergencyId/routes`: Resolves emergency business ID (e.g. `EMG-2026-001`) to ObjectId and returns planned routes. Fixed critical `CastError` in `server/modules/routes/route.service.js`.
  - `GET /api/routes/:routeId`: Returns single route with populated `emergency` and `vehicle` references.
  - `GET /api/trajectories/:vehicleId`: Paginated telemetry GPS fixes with page/limit parameters.
  - `GET /api/trajectories/:vehicleId/latest`: Most recent GPS telemetry fix. Safely handles 404 (0 points recorded) via `trajectoryApi.getLatestSafe`.
  - `GET /api/analysis/vehicle/:vehicleId`: Deterministic situation analysis containing cross-track error, bearing divergence, GPS stability, traffic congestion, and correlated corridor incidents.
  - `POST /api/orchestration/emergencies/:emergencyId/analyze`: Full mission analysis executing situational reasoning, GeoAgent recommendation, decision engine rules, and 3-tier epistemic breakdown.
- **UI Components Created**:
  - `components/emergency-detail/emergency-overview-card.tsx`: Type icon, priority badge (with pulse for CRITICAL), status pill, formatted timestamps, caller details, and copyable WGS84 GPS coordinates.
  - `components/emergency-detail/vehicle-movement-panel.tsx`: Latest fix telemetry strip (coordinates, speed in km/h, cardinal heading direction, source) and paginated bounded GPS trajectory table.
  - `components/emergency-detail/route-analysis-panel.tsx`: Route ID, provider attribution (`MOCK Provider (Local Simulation)`), total distance (m/km), planned duration (mins), status, origin/destination points, and waypoint vertices count.
  - `components/emergency-detail/deviation-analysis-panel.tsx`: Deviation status pill (`ON_ROUTE`, `WARNING`, `DEVIATED`, `CRITICAL_DEVIATION`, `UNKNOWN`), cross-track distance (meters), bearing divergence (°), GPS stability (`STABLE` / `UNSTABLE`), traffic congestion level & speed, ETA & delay metrics, and structured evidence tags.
  - `components/emergency-detail/correlated-incidents-panel.tsx`: Incidents within 500m of corridor or 2,000m of vehicle with distance offsets and honest empty states.
  - `components/emergency-detail/epistemic-breakdown-card.tsx`: Explicit 3-tier epistemic breakdown separating verified physical observations (`OBSERVED`), algorithmic inferences (`INFERRED`), and unobserved operational variables (`UNKNOWN`).
- **Scope Safeguards Strictly Maintained**:
  - NO interactive map (Mapbox, Google Maps, Leaflet deferred; geometric verification relies on GeoJSON spatial indexing).
  - NO Socket.IO live streaming in this view (telemetry labeled "Latest received position" and "Last updated at [timestamp]").
  - Zero mock data fallback (empty database responses render honest, informative empty states).
- **Automated Verification**:
  - `server/test-emergency-detail-e2e.js`: 63/63 passing assertions.
  - Full backend regression suite: 164 total passing assertions (0 failures).
  - TypeScript checking (`npx tsc --noEmit`): 0 errors.
  - Next.js production build (`npm run build`): Successfully compiled in under 2 seconds.

---

## 9. Real-Time Intelligence & External Data Integration (CURRENT ACTUAL STATE)

- **Architecture & System Flow**:
  - The system has moved from mock routing/traffic behavior to real external data and real-time intelligence:
    `Real Vehicle Telemetry → Trajectory Processing → Google Roads / Routes → Real Traffic-Aware Routing → ETA / Delay Prediction → Gemini Decision Reasoning → Decision Engine → Socket.IO → Control Room Frontend`.
- **Backend External Providers**:
  - **Google Routes Provider** (`server/modules/routes/providers/googleRoutingProvider.js`):
    - Implements Google Routes API (`computeRoutes`) with explicit field masks: `routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.warnings,routes.description`.
    - Implements custom high-precision polyline decoder producing standard GeoJSON `[longitude, latitude]` LineStrings.
    - Requests `TRAFFIC_AWARE_OPTIMAL` routing and parses alternative routes (primary + up to 2 alternative candidates).
    - 60-second in-memory caching to avoid redundant API quota usage.
    - Honest fallback: when `ROUTING_PROVIDER=mock` or API key is absent, falls back to deterministic local routing.
  - **Google Roads Provider** (`server/modules/routes/providers/googleRoadsProvider.js`):
    - Batches GPS coordinates in chunks <= 100 points.
    - 5-minute in-memory caching.
    - Seamless Turf.js spatial nearest-point fallback when key is not configured or network unavailable.
    - Static speed-limit context lookup labeled strictly as non-realtime metadata.
  - **Google Traffic Provider** (`server/modules/traffic/providers/googleTrafficProvider.js`):
    - Derives traffic congestion ratio deterministically from Google Routes `durationSeconds` vs `staticDurationSeconds`.
    - Explicitly categorizes `epistemicType: 'DERIVED'` (distinguishing `OBSERVED`, `DERIVED`, and `UNKNOWN`).
  - **Provider Health & Safety** (`server/modules/health/providerHealth.service.js` & `GET /api/health/providers`):
    - Evaluates Google Routes, Google Roads, and Gemini AI status (`AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, `NOT_CONFIGURED`).
    - Zero credential leak: never returns API keys or internal secrets in JSON payloads.
- **Telemetry Ingestion Hardening** (`server/modules/trajectories/trajectory.service.js`):
  - Validates coordinate bounds: longitude in `[-180, 180]`, latitude in `[-90, 90]`.
  - Rejects impossible future timestamps (> 2 minutes in future).
  - Validates speed bounds (`0 - 250 km/h`) and heading (`0 - 360°`).
  - Implements teleport anomaly detection: flags sudden jumps > 1,000m within 10 seconds.
- **Real-Time Prediction Engine** (`server/modules/analysis/prediction.service.js` & `prediction.model.js`):
  - Calculates rolling exponential moving average (EMA) speed trend from recent trajectory fixes.
  - Computes remaining route distance using Turf.js slicing.
  - Accounts for Google traffic delays, deviation penalties, and incident obstruction penalties.
  - Generates delay risk classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and route risk urgency.
  - Persists prediction snapshots in MongoDB with index on `vehicleId` and `createdAt`.
  - Exposes `GET /api/analysis/vehicle/:vehicleId/prediction` REST endpoint.
- **GeoAgent & Decision Engine Integration** (`server/modules/geoagents/geoAgent.service.js` & `decision.service.js`):
  - Gemini 2.5 Flash acts as advisory reasoning engine; deterministic safety rules make authoritative decisions.
  - Generates comparative trade-off matrix: "Why did the route change?" (evidence-based triggers) and "What if we do nothing?" (delay and risk penalties).
  - Enforces state machine requiring operator approval: decisions transition to `PENDING_OPERATOR_ACTION` and require operator `/approve` or `/reject` actions before execution.
- **Socket.IO Real-Time Streaming** (`server/modules/realtime/` & `lib/socket/`):
  - Authenticated WebSocket handshake using JWT token or HTTP-only cookie.
  - Isolated rooms: `control-room`, `emergency:${id}`, `vehicle:${id}`.
  - Streams `prediction.updated` events whenever a new prediction is calculated.
  - Client singleton (`lib/socket/client.ts`) with automatic reconnection and envelope unwrapping.
  - React hooks (`lib/socket/useRealtime.ts`): `useSocketStatus()` and `useRealtimeEmergency()`.
- **Frontend Intelligence UI**:
  - `components/emergency-detail/prediction-intelligence-panel.tsx`: Real-time ETA, delay risk badge, model confidence, structured predictive factors, and LIVE/STALE freshness badge.
  - `components/emergency-detail/route-comparison-card.tsx`: Trade-off matrix comparing Active Corridor vs Best Alternative Candidate with time savings and distance delta.
  - `components/emergency-detail/decision-approval-card.tsx`: Authoritative decision state with operator approve/reject controls.
  - `lib/api/decisions.ts`: Typed decision client (`analyze`, `get`, `list`, `approve`, `reject`, `execute`).
- **Automated Verification**:
  - `server/test-realtime-external-e2e.js`: 48/48 passing assertions.
  - `server/test-emergency-detail-e2e.js`: 63/63 passing assertions.
  - `server/test-dashboard-e2e.js`: 47/47 passing assertions.
  - `server/test-auth-e2e.js`: 31/31 passing assertions.
  - `server/test-security.js`: 23/23 passing assertions.
  - Total automated assertions passing: 212/212 (100% pass rate).
  - TypeScript checking (`npx tsc --noEmit`): 0 errors.
  - Next.js production build (`npm run build`): Successfully compiled.

---

## 13. Admin Database Administration & System Observability Layer

- **Architecture & Boundary**:
  `ADMIN -> Frontend Admin Console (/admin) -> Express Admin API (/api/admin/*) -> protect + requireRole('ADMIN') -> Mongoose -> MongoDB`.
  Strictly NOT a raw database browser: zero arbitrary MongoDB command execution, no client-side `$where` or `$regex` evaluation, and zero database credential or URI exposure.
- **Role Exclusivity**:
  - Only `ADMIN` role can access `/api/admin/*` endpoints and `/admin` frontend route.
  - Unauthenticated requests are rejected with `401 Unauthorized`.
  - Non-ADMIN roles (`CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`) are rejected with `403 Forbidden: Insufficient privileges`.
- **Backend Admin Module** (`server/modules/admin/`):
  - `admin.validation.js`: Bounded pagination (`limit <= 100`), allowlisted sort fields, strip dangerous `$`/`.` keys.
  - `admin.service.js`:
    - `getSystemStats()`: Real operational counts across all 8 verified collections (`users`, `vehicles`, `emergencies`, `incidents`, `trajectories`, `routes`, `decisions`, `predictions`). Uses `Trajectory.estimatedDocumentCount()` for $O(1)$ constant-time count over high-frequency GPS fixes.
    - `getDatabaseHealth()`: Safe ping latency test via `mongoose.connection.db.admin().ping()`. Reports `CONNECTED`, `DEGRADED`, or `DISCONNECTED` with roundtrip latency in ms without exposing credentials.
    - `getSystemHealthSummary()`: Combines database health with provider statuses (Google Routes, Google Roads, Gemini 2.5 Flash, Socket.IO).
    - Paginated readers with safe projection: `getUsers` (strictly omits `password`), `getVehicles`, `getEmergencies`, `getIncidents`, `getRoutes`, `getTrajectories` (bounded slices), `getPredictions`, `getDecisions`.
  - `admin.controller.js`: Request handlers with structured JSON audit logging (endpoint, userId, action, resource, durationMs, statusCode).
  - `admin.routes.js`: Protected by `protect` and `requireRole('ADMIN')`.
  - Mounted at `/api/admin` in `server/server.js`.
- **Verified Mongoose Models & Index Optimizations**:
  - `User`: `{ email: 1 }` (unique), `{ role: 1, createdAt: -1 }`.
  - `Vehicle`: `{ vehicleId: 1 }` (unique), `{ registrationNumber: 1 }` (unique), `{ status: 1, isDeleted: 1 }`, `{ createdAt: -1 }`.
  - `Emergency`: `{ location: '2dsphere' }`, `{ destination: '2dsphere' }`, `{ assignedVehicle: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`, `{ createdAt: -1 }`.
  - `Incident`: `{ location: '2dsphere' }`, `{ emergency: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`, `{ createdAt: -1 }`.
  - `Trajectory`: `{ vehicle: 1, timestamp: -1 }`, `{ location: '2dsphere' }`.
  - `Route`: `{ routeId: 1 }` (unique), `{ emergency: 1, routeType: 1 }`, `{ vehicle: 1, status: 1 }`, `{ geometry: '2dsphere' }`, `{ origin: '2dsphere' }`, `{ destination: '2dsphere' }`, `{ createdAt: -1 }`.
  - `Decision`: `{ emergency: 1, createdAt: -1 }`, `{ emergency: 1, situationHash: 1 }`, `{ status: 1, createdAt: -1 }`.
  - `Prediction`: `{ vehicle: 1, createdAt: -1 }`, `{ emergency: 1, createdAt: -1 }`, `{ delayRisk: 1 }`.
- **Frontend Admin Console** (`/admin`):
  - Protected with `<ProtectedRoute allowedRoles={['ADMIN']}>`.
  - `components/admin/admin-overview.tsx`: Real-time system counters, MongoDB health card (status, latency ms, DB name), upstream provider health grid, and 24h operational flow window.
  - `components/admin/admin-database-explorer.tsx`: Tabbed dataset browser for all 8 collections with pagination controls, filters, and a record inspector drawer with formatted view and sanitized JSON debug view.
  - `components/dashboard/dashboard-topbar.tsx`: Displays an "Admin Console" link button for authenticated `ADMIN` users.
  - `lib/api/admin.ts`: Strongly typed API client methods.
- **Developer Local Inspection**:
  - Use **MongoDB Compass** connected to local MongoDB (`mongodb://127.0.0.1:27017`) for direct development queries. The app console remains an operational observability interface.
- **Automated Verification**:
  - `server/test-admin-e2e.js`: 60/60 passing assertions covering RBAC, stats, ping latency, sensitive field exclusion, query hardening, and paginated collections.
  - Total test suite assertions across project: 272/272 passing (100% pass rate).
  - Next.js production build (`npm run build`): Successfully compiled with `/admin` route.

---

## 14. Real-Time Intelligence Pipeline & Route Comparison Engine

- **End-to-End Pipeline**:
  `Real GPS Telemetry → Trajectory Processing → Deviation Analysis → Current Vehicle State → Google Routes API (Traffic-Aware) → ETA / Delay Prediction → Candidate Route Comparison ("What if we do nothing?") → Structured Evidence → Gemini 2.5 Flash Advisory Reasoning → Deterministic Decision Engine → Operator Approval → Execution → Socket.IO Streaming → Control Room Frontend`.
- **Google Routes Provider Hardening** (`server/modules/routes/providers/googleRoutingProvider.js`):
  - Pre-request coordinate validation (`validateCoordinates`) enforcing WGS84 boundaries: longitude `[-180, 180]`, latitude `[-90, 90]`.
  - Enforces maximum 25 intermediate waypoints supported by computeRoutes.
  - Supports `TRAFFIC_AWARE_OPTIMAL` and `TRAFFIC_AWARE` routing preferences with explicit field masks (`routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.warnings,routes.description`).
  - Strict honesty: when `ROUTING_PROVIDER=google` fails or key is absent, returns explicit HTTP 503 / `PROVIDER_NOT_CONFIGURED` without silent mock downgrading.
  - Bounded in-memory route caching (60s TTL) by coordinate hash to optimize external call budgets.
- **Route Candidate Comparison & What-If Service** (`server/modules/routes/routeComparison.service.js`):
  - Deterministic evaluation comparing active response corridor against candidate alternatives.
  - Calculates `distanceDeltaMeters`, `durationSeconds`, `etaMinutes`, `trafficDelaySeconds`, `trafficDelayDeltaSeconds`, and `timeSavedMinutes`.
  - Deterministic "What if we do nothing?" scenario projection (`scenario: 'MAINTAIN_CURRENT_CORRIDOR'`, `projectedDelayMinutes`, `operationalRisk: NOMINAL | ELEVATED | HIGH | CRITICAL`, `etaDeltaVsBestMinutes`, `summary`, `reasons`).
  - Deterministic "Why did the route change?" causal evidence tags (`whyRouteChanged`).
  - Mounted on backend at `GET /api/routes/:routeId/compare` and integrated into `lib/api/routes.ts` (`routeApi.compare(routeId)`).
- **Prediction Engine Hardening** (`server/modules/analysis/prediction.service.js` & `prediction.model.js`):
  - Model Version: `v1.3-exponential-traffic-blend`.
  - Integrated vehicle-scoped historical speed benchmark (15% historical blend, zero cross-emergency or cross-vehicle leakage).
  - Epistemic classification on all predictive factors (`OBSERVED`, `DERIVED`, `INFERRED`, `UNKNOWN`).
- **GeoAgent Advisory Tools Registry** (`server/modules/geoagents/geoAgent.tools.js`):
  - Full suite of 9 required intelligence tools defined in `geoAgentToolDeclarations` and executable in `executeGeoAgentTool`:
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
- **Telemetry Ingestion & Real-Time Payload Emission** (`server/modules/trajectories/trajectory.service.js`):
  - Fixed parameter reference bug (`location` -> `validLocation`) ensuring real-time location payload formatting and Socket.IO emission succeed on every GPS fix.
  - Added throttled background prediction trigger on ingestion (position delta >= 100m or >= 30s elapsed) to keep ingestion fast (< 20ms).
- **Automated Verification**:
  - `server/test-intelligence-pipeline.js`: 26/26 passing assertions.
  - Total automated verification assertions: **298 / 298 passing (100% pass rate)**.
  - TypeScript typecheck (`npx tsc --noEmit`): 0 errors.

---

## 15. Interactive Leaflet GIS Map & Bengaluru Corridor Simulation

- **Map Architecture (`components/dashboard/real-interactive-map.tsx`)**:
  - Client-rendered Leaflet GIS map dynamically loaded with `window.L` checking to avoid SSR hydration conflicts.
  - Centered on Bengaluru metropolitan emergency corridor (`[12.968, 77.622]`).
  - Replaces legacy SVG placeholder while preserving the component interface through `components/dashboard/map-placeholder.tsx`.
- **Live Bengaluru Routes & Trajectories**:
  - **Planned Route A (Blue Solid)**: MG Road Metro → Mayo Hall → Trinity Circle → Command Hospital Junction → Domlur Flyover → Murugeshpalya → Manipal Hospital.
  - **Deviated Trajectory (Red Dashed)**: Divergence along Indiranagar 100ft Road with animated live ambulance marker.
  - **Recommended Route B (Green Solid)**: 100ft Rd bypass → HAL 2nd Stage → Airport Rd bypass → Manipal Hospital (11.0 min ETA, saves 5.0 mins).
  - **Alternative Route C (Amber Dashed)**: Shanthi Nagar → Inner Ring Rd → Ejipura Flyover → Manipal Hospital.
- **Client-Side Simulation Engine**:
  - Full playback controls: Play, Pause, Reset.
  - Advances ambulance coordinate step-by-step along waypoints.
  - Dynamically computes live telemetry: instantaneous speed, bearing heading, and cross-track deviation distance in meters.
  - Web Audio API synthesizer generates emergency vehicle siren audio cues on toggle.

---

## 16. Spatio-Temporal Forecasting, Traffic Layers & V2X Preemption

- **Multi-Tile Map Layer Switcher**:
  - **Dark Mode**: High-contrast operational night view (CartoDB Dark Matter).
  - **Google Traffic Layer**: Live traffic flow overlay highlighting severe congestion bottlenecks in red/amber.
  - **Satellite Imagery**: High-resolution ESRI World Imagery for topographical and building context.
- **Predictive Spatio-Temporal Traffic Forecast**:
  - Interactive horizon selector: `+0m` (Current), `+10m`, `+20m`, `+30m`.
  - Simulates dynamic traffic wave propagation along major arteries.
  - Updates corridor friction metrics and recalculates estimated time savings across alternative bypass routes.
- **V2X Green-Wave Traffic Signal Preemption**:
  - Real-time preemption status points at 4 critical corridor intersections:
    1. Mayo Hall Junction: `GREEN_WAVE_ACTIVE`
    2. 100ft Rd Signal #1: `FORCED_GREEN_4S`
    3. HAL 2nd Stage Signal #2: `PREEMPTION_QUEUED`
    4. Airport Rd Bypass Signal #3: `CLEAR_CORRIDOR`
  - Visual signal markers with status-dependent pulsing rings and corridor clearance timers.

---

## 17. Patient Severity Triage Routing & Clinical Protocol Adjustment

- **Triage Priority Selector**:
  - `CRITICAL_CARDIAC`: Immediate life support protocol, prioritizes Cath Lab facility readiness, alerts Manipal Hospital cardiac team.
  - `SEVERE_TRAUMA`: Multi-system trauma protocol, prioritizes Level-1 Trauma Centers with dedicated surgical bays.
  - `MODERATE`: Standard emergency dispatch protocol.
- **Clinical Protocol Routing Impact**:
  - Adjusts dynamic ETA thresholds and delay tolerance: Critical Cardiac triggers deviation alarms at lower thresholds (> 50m).
  - Hospital bed capacity warnings surface in real time when trauma or cardiac ICU beds are occupied.

---

## 18. Analytics UI Polish, Offline Graceful Degradation & Local Dev Resilience

- **User-Friendly Analytics Panels**:
  - `geoagent-card.tsx`: Added executive takeaway callouts and visual progress meters for route efficiency.
  - `deviation-analysis-panel.tsx`: Progress meter indicating cross-track divergence versus warning/critical thresholds.
  - `prediction-intelligence-panel.tsx`: Visual model confidence meters and live factor attribution tags.
- **Offline & Local Development Resilience**:
  - `driver-dashboard.tsx`: When backend Express APIs are offline or return empty collections, gracefully falls back to structured demonstration fixtures (`MOCK_VEHICLES`, `MOCK_EMERGENCIES`, `MOCK_INCIDENTS`), removing intrusive red sync banners for a polished user experience.
  - `lib/auth/context.tsx`: Resilient local session fallback preventing unhandled login drops when developing detached from MongoDB.
  - `server/config/db.js`: Non-crashing connection handler allowing the Express server to stay alive for offline mock responses if MongoDB is temporarily stopped.

---

## 19. Production Deployment Architecture (Phase 8)

- **Target Stack**:
  - Backend: Google Cloud Run (containerized Node.js/Express/Socket.IO)
  - Frontend: Vercel (Next.js)
  - Database: MongoDB Atlas (managed)
  - CI/CD: GitHub Actions (lint, typecheck, build, Docker, deploy)
- **Dockerfile** (`server/Dockerfile`):
  - Multi-stage build: `node:22-slim` builder → slim runner
  - Non-root user (`node`), production-only dependencies
  - Health check built into container definition
- **CI Pipeline** (`.github/workflows/ci.yml`):
  - Runs on every push/PR: TypeScript typecheck, Next.js build, Docker build verification
- **Deploy Pipeline** (`.github/workflows/deploy.yml`):
  - Runs on push to `main` (server changes only)
  - Workload Identity Federation authentication (no long-lived keys)
  - Build → Artifact Registry → Cloud Run deployment
  - Post-deploy health verification
- **Server Hardening** (`server/server.js`):
  - Environment validation: `JWT_SECRET` and `MONGO_URI` required in production (fatal if missing)
  - Bind `0.0.0.0` for Cloud Run container networking
  - Liveness probe: `GET /api/health/live` (no external deps)
  - Readiness probe: `GET /api/health/ready` (checks MongoDB)
  - Version/uptime metadata in `GET /api/health`
  - Production error suppression (no stack traces)
- **Database Security** (`server/config/db.js`):
  - Connection string redacted from logs (masks credentials)
  - Production fail-fast: crashes if MongoDB unreachable (no silent fallback)
- **Cross-Domain Auth** (`server/modules/auth/auth.controller.js`):
  - `SameSite=None; Secure; HttpOnly` in production (Vercel → Cloud Run)
  - `SameSite=Lax` in development (localhost same-origin)
  - Logout uses same cookie options for consistent clearing
- **Socket.IO CORS** (`server/modules/realtime/realtime.service.js`):
  - Dynamic origin check function matching Express CORS pattern
  - Vercel subdomain regex: `/^https:\/\/.*\.vercel\.app$/`
  - Single-instance constraint documented (no Redis adapter)
- **Provider Health** (`server/modules/health/providerHealth.service.js`):
  - MongoDB health via `mongoose.connection.readyState`
  - Non-invasive check (no ping query)
- **Security Hardening**:
  - `.gitignore`: blocks `service-account*.json`, `gcp-key*.json`, `credentials*.json`, `*.key`
  - No secrets in committed code
  - Credential separation: GCP Secret Manager for production, `.env` for development
- **Documentation**:
  - `docs/deployment.md`: Full deployment guide (Atlas, Cloud Run, Vercel, WIF, rollback)
  - `docs/deployment-checklist.md`: Pre/post-deployment operator checklists
- **Socket.IO Scaling Constraint**: Cloud Run must use `--max-instances=1` because the in-memory adapter does not support multi-instance broadcasting. Future work: add `@socket.io/redis-adapter`.
- **Python Routing Engine**: Standalone spatial tool now integrated via headless CLI bridge (`v2x_corridor_bridge.py`) with zero-dependency Node.js fallback (`fallbackV2XEngine`).

---

## 20. 10-Tier Operational Intelligence Pipeline (V2X & Corridor Green-Wave)

- **Target Pipeline Architecture**:
  1. `Vehicle GPS`: Live telemetry coordinate fixes (`lat`, `lng`, `speed`, `heading`, `timestamp`).
  2. `Node.js Telemetry`: `server/modules/trajectories/trajectory.service.js` ingests, validates, writes to MongoDB, updates vehicle state, and triggers throttled background prediction & V2X corridor analysis.
  3. `Python Routing / V2X Engine`: `routing-engine/v2x_corridor_bridge.py` + `server/modules/routes/pythonRoutingBridge.service.js`. Runs high-precision Python spatial engine for cross-track deviation and V2X intersection calculations. Includes seamless in-process JS fallback (`fallbackV2XEngine`) for container environments without Python.
  4. `Corridor + Green-Wave Analysis`: `server/modules/routes/corridorGreenWave.service.js`. Evaluates dynamic signal preemption states (`APPROACHING`, `PREEMPTION_REQUESTED`, `FORCED_GREEN_4S`, `GREEN_WAVE_ACTIVE`, `HOLDING_RED`), civilian vehicle yield alerts, and minutes saved by traffic light clearance.
  5. `Google Traffic-Aware Routes`: `server/modules/routes/providers/googleRoutingProvider.js` evaluates live congestion on primary corridor vs alternative bypass routes.
  6. `Prediction Engine`: `server/modules/analysis/prediction.service.js` incorporates V2X green-wave delay reductions into ETA calculations.
  7. `Route Comparison`: `server/modules/routes/routeComparison.service.js` factors corridor clearance and green-wave feasibility into deterministic "What if we do nothing?" scenario analysis.
  8. `Gemini Reasoning`: Gemini 2.5 Flash grounded with tools including `getCorridorGreenWaveStatus`.
  9. `Decision Engine`: `server/modules/decisions/decision.service.js` authoritative deterministic rules evaluating `CORRIDOR_BLOCKED` and `GREEN_WAVE_PREEMPTION_ACTIVE` reason codes.
  10. `Control Room`: Real-time Socket.IO emission (`v2x.green_wave.updated`, `orchestration.completed`) updating the Control Room operator dashboard with 3-tier epistemic breakdown and dynamic signal states.
- **Test Suite**: `server/test-v2x-corridor-pipeline.js` (11/11 tests passing).

---

## 21. Part 10 — Interactive Geospatial Control Room (Operational Map Engine)

- **Architecture Overview**:
  - Transitioned the Control Room from static placeholders into a production-grade, modular geospatial engine powered by Leaflet (`1.9.4`).
  - Strict Grounding Constraint: **Zero Fake Data**. No fake movement, no fake routes, no fake traffic, no fake incidents, no fake ETA values. Clean empty states ("No active emergency missions") when database collections are unpopulated.
  - Performance Rule: **No Map Destruction**. Leaflet instance is instantiated once inside `MapView`. Real-time Socket.IO events update individual Leaflet layer groups incrementally via in-place `setLatLng` and polyline coordinate mutations without losing operator zoom/pan context.
  - Security Boundary: **Frontend Visualization Only**. Google Routes/Roads server API keys remain strictly backend-only. The frontend map consumes public tile layers (CartoDB Dark Matter default, OpenStreetMap standard, ESRI World Imagery satellite) and GeoJSON geometries emitted by the Node.js backend.
- **Component Architecture** (`components/map/`):
  - `types.ts`: TypeScript contracts for `MapVehicle`, `MapEmergency`, `MapRoute`, `MapIncident`, `MapTrajectory`, `MapDeviation`, `MapPrediction`, `MapLayerVisibility`, `MapSelectionState`. Coordinate translation utilities `toLatLng` and `toLatLngArray` ([lng, lat] GeoJSON to [lat, lng] Leaflet). Telemetry freshness classification (`<15s` LIVE, `15s–60s` STALE, `>60s` OFFLINE).
  - `popup-content.ts`: Sanitized, high-contrast, accessible HTML popup templates for vehicles, emergencies, routes, incidents, and deviation alerts with units, timestamps, and epistemic tags.
  - `layers/vehicle-layer.ts`: `VehicleLayerManager` managing Leaflet markers with heading rotation, live/stale/offline pulsing halos, and smooth position updates without marker recreation.
  - `layers/route-layer.ts`: `RouteLayerManager` rendering actual GeoJSON `LineString` paths for `PLANNED` (blue), `CURRENT`/`ACTIVE` (emerald), and `ALTERNATIVE` (amber dashed) routes with origin (🚩) and destination hospital (🏥) pin markers.
  - `layers/incident-layer.ts`: `IncidentLayerManager` rendering road hazard markers with severity color hierarchy (`CRITICAL` rose with pulse, `HIGH` orange, `MEDIUM` amber, `LOW` slate).
  - `layers/trajectory-layer.ts`: `TrajectoryLayerManager` rendering bounded recent GPS breadcrumbs as a cyan dashed trail.
  - `layers/deviation-layer.ts`: `DeviationLayerManager` rendering warning circles and cross-track indicators when backend reports `DEVIATED` or `CRITICAL_DEVIATION`.
  - `map-view.tsx`: Core Leaflet map wrapper with dynamic CSS injection, tile layers, and standard layer groups.
  - `map-controls.tsx`: Floating operator control group (zoom in/out, fit selected corridor, layer toggles, basemap switcher, reset view).
  - `map-legend.tsx`: Collapsible operational legend.
  - `control-room-map.tsx`: Main map orchestrator integrating REST initial state, incremental Socket.IO event updates, corridor selection, reconnect re-sync, and honest empty states.
  - `components/dashboard/map-placeholder.tsx`: Drop-in wrapper delegating directly to `ControlRoomMap`.
- **Integrated Surfaces**:
  - `components/dashboard/driver-dashboard.tsx`: Overview tab and Corridor tab now render live `ControlRoomMap` using actual backend state; all legacy mock fallback arrays removed.
  - `components/emergency-detail/route-analysis-panel.tsx`: Emergency detail corridor map renders live `ControlRoomMap` with vehicle trajectory breadcrumbs and candidate route geometries.
- **Verification Suite**: `server/test-part10-control-room-map.js` (9/9 criteria passing).

---

## 22. Part 11 — Full System Hardening, Security & End-to-End Validation

- **System Objectives**: Proved that the complete SwiftCare GeoAgent system operates safely, correctly, securely, and predictably under real conditions, attacks, anomalies, edge cases, and external provider failures without fake data or ungrounded assertions.
- **Role Architecture**: Expanded native backend user roles to four independently verified personas:
  - `ADMIN`: Full platform oversight, user management, fleet provisioning, audit log inspection, system stats.
  - `CONTROL_ROOM`: Emergency mission creation, vehicle dispatch, decision proposal reviews, route approval/rejection.
  - `DRIVER`: Assigned vehicle telemetry ingestion, turn-by-turn waypoint tracking, navigation guidance.
  - `PARAMEDIC`: Clinical triage priority updates, patient status transmission, hospital bay readiness monitoring.
- **Role Access Matrix**:
  | Resource / Endpoint | ADMIN | CONTROL_ROOM | DRIVER | PARAMEDIC | Unauthenticated |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `GET /api/admin/*` | READ | 403 Forbidden | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
  | `POST /api/vehicles` | CREATE | 403 Forbidden | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
  | `GET /api/vehicles` | READ | READ | READ | READ | 401 Unauthorized |
  | `POST /api/emergencies` | CREATE | CREATE | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
  | `GET /api/emergencies/:id` | READ | READ | READ | READ | 401 Unauthorized |
  | `POST /api/trajectories` | CREATE | CREATE | CREATE | 403 Forbidden | 401 Unauthorized |
  | `POST /api/decisions/:id/approve`| APPROVE | APPROVE | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
  | `POST /api/decisions/:id/reject` | REJECT | REJECT | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
  | `POST /api/decisions/:id/execute`| EXECUTE | EXECUTE | 403 Forbidden | 403 Forbidden | 401 Unauthorized |
- **Security & Reliability Domains Verified** (`server/test-part11-security-hardening.js` — 14/14 Passed):
  1. *Role Access Matrix & Independent Backend Authorization*: Strict endpoint-level middleware enforcement blocks privilege escalation.
  2. *IDOR Prevention & Resource Isolation*: Non-existent/unowned entities return 404; path traversal/SQL/Mongo injection payloads safely rejected.
  3. *Zero Secret Leakage*: Audit confirmed zero exposure of `AIzaSy`, `sk-ant-`, `mongodb+srv://`, `JWT_SECRET`, or `NEXT_PUBLIC_*` sensitive tokens across client bundles.
  4. *Cookie Security Attributes*: Authentication tokens set with `HttpOnly=true`, `SameSite=Lax` (dev) / `SameSite=None` (prod), `Secure=true` (prod).
  5. *MongoDB Query Injection Defense*: Operators `$where`, `$regex`, `$ne`, `$gt`, and unauthorized sort fields rejected with 400 Bad Request.
  6. *GPS Telemetry Anomaly Hardening*: Rejects out-of-bound coordinates (`lat < -90` or `> 90`, `lng < -180` or `> 180`), negative speeds (`< 0`), impossible speeds (`> 250 km/h`), invalid headings (`< 0` or `>= 360`), and future timestamps (`> 2 min`). GPS jitter analyzed via temporal windowing.
  7. *Route & Traffic Fault Tolerance*: Zero-distance and zero-speed edge conditions calculate gracefully without divide-by-zero or NaN bugs.
  8. *Prediction Determinism*: Identical telemetry, route, and traffic inputs produce deterministic delay projections and confidence metrics.
  9. *Prompt Injection Defense & Transparent AI Fallback*: `sanitizeText` strips executable scripts/markup; untrusted descriptions encapsulated in `untrustedCallerDescription`; offline Gemini triggers explicit `AI_ANALYSIS_UNAVAILABLE` status without spoofing AI reasoning.
  10. *Python / V2X Subprocess Security & Status*: In-process JS fallback engine guarantees zero shell injection vectors while matching Python schema.
  11. *Concurrency & Idempotency*: `situationHash` prevents duplicate proposal generation; atomic state transitions reject concurrent double-approvals.
  12. *Socket.IO Handshake Security & Payload Integrity*: Unauthenticated socket handshakes rejected; payloads strictly typed without leaking internal DB hashes.
  13. *Database Integrity & Soft-Delete Enforcement*: Soft-deleted vehicles (`isDeleted: true`) strictly excluded from active dispatch queries.
  14. *Provider Failure Matrix*: Verified degradation paths across all 5 operational configurations (Scenarios A through E).
- **Canonical 23-Step System Integration Test** (`server/test-part11-system-hardening.js` — 17/17 Passed):
  - Step 1: User authentication and JWT issuance.
  - Step 2: Emergency E1 creation with GeoJSON coordinates.
  - Step 3: Vehicle V1 assignment to Emergency E1.
  - Steps 4 & 5: Telemetry ingestion & trajectory persistence.
  - Step 6: Route matching and geodesic deviation analysis.
  - Step 7: Corridor traffic analysis and congestion penalty calculation.
  - Steps 8 & 9: Google primary route and alternative bypass candidate lookup.
  - Step 10: Quantitative prediction engine ETA & delay projection.
  - Step 11: Python / V2X corridor green-wave preemption calculation.
  - Steps 12 & 13: Deterministic route candidate comparison & 3-tier epistemic evidence.
  - Step 14: Gemini advisory reasoning / honest fallback generation.
  - Steps 15 & 16: Deterministic decision engine proposal generation & situation hash validation.
  - Step 17: Real-time operator notification contract emission.
  - Steps 18, 19 & 20: Operator approval & atomic state transition (`PENDING_OPERATOR_ACTION` -> `APPROVED`).
  - Step 21: Decision execution (`APPROVED` -> `EXECUTED`).
  - Step 22: Socket.IO broadcast envelopes and frontend TypeScript contract conformance.
  - Step 23: Admin observability and audit trail ledger inspection without credential leakage.

---

## 23. Part 12 — Final Production & Demo Readiness (Release Candidate)

- **Phase Objective**: Complete final system hardening, establish a canonical and repeatable demonstration scenario, enforce truthful data labeling, audit provider health and security boundaries, and deliver a production release candidate.
- **Canonical Demonstration Scenario**:
  - **Emergency**: `E-DEMO-001` (Priority: `CRITICAL`, Type: `MEDICAL`, Description: Acute myocardial infarction near Mayo Hall Junction).
  - **Vehicle**: `AMB-DEMO-01` (Registration: `KA-01-DEMO-991`, Status: `EN_ROUTE`, Assigned to `E-DEMO-001`).
  - **Planned Route**: `ROUTE-DEMO-01` (5.5 km primary corridor via Mayo Hall → Trinity Circle → Manipal Hospital HAL).
  - **Alternative Bypass**: `ROUTE-DEMO-ALT` (5.2 km via 100ft Rd bypass corridor with V2X signal preemption).
  - **Road Incident**: `INC-DEMO-01` (Multi-vehicle collision blocking Trinity Overpass).
  - **Personnel**: Operator `operator@swiftcare.local` (Password: `Operator123!`), Admin `admin@swiftcare.local` (Password: `AdminPassword123!`).
  - **Canonical Seeder**: `node server/seed-demo-scenario.js [--clean]` (Isolated, repeatable, non-destructive to production).
  - **Controlled Telemetry Playback Engine**: `node server/demo-telemetry-player.js`
    - Stage 0 (`00:00`): Normal speed (45 km/h, ON_ROUTE, 0m cross-track, LOW risk).
    - Stage 1 (`00:20`): Speed dropping approaching Trinity Circle bottleneck (26 km/h, DEVIATED, MEDIUM risk).
    - Stage 2 (`00:40`): Severe traffic jam behind incident (11 km/h, +8.4 min delay, CRITICAL risk).
    - Stage 3 (`01:00`): Driver diverges onto bypass link (32 km/h, DEVIATED 175m, HIGH risk).
    - Stage 4 (`01:20`): Real-time prediction engine recalculates delay (+9.5 min projected delay).
    - Stage 5 (`01:40`): Alternative corridor bypass & V2X green-wave evaluated (signals cleared: 2/4, -1.6m saved).
    - Stage 6 (`02:00`): Advisory reasoning & deterministic rules propose decision (`DEC-XXXX`, `PENDING_OPERATOR_ACTION`).
    - Stage 7 (`02:20`): Control Room operator approves decision; state atomically transitions to `APPROVED` then `EXECUTED`; active route switches to `ROUTE-DEMO-ALT`.
- **Truth in Data Labeling**:
  - Distinguishes `REAL DATA` (hardware GPS, verified Google Routes/Traffic) from `DEMO / SIMULATION` (`source: SIMULATOR`, `source: MOCK`).
  - Telemetry strips and popups display explicit `SIMULATOR` badges when running playback.
- **Provider Health Infrastructure**:
  - Expanded `server/modules/health/providerHealth.service.js` to report all 6 services:
    1. `mongodb`: Connection state and live latency ping.
    2. `googleRoutes`: Google Routes API key validation and mode.
    3. `googleRoads`: Google Roads API key validation and mode.
    4. `gemini`: Google Gemini 2.5 Flash SDK and advisory reasoning status.
    5. `pythonV2X`: Python 3.12 subprocess availability vs in-process JS fallback engine.
    6. `socketIO`: Live broadcast push readiness.
  - Admin Overview dashboard (`components/admin/admin-overview.tsx`) renders dedicated status badges for all 6 subsystems.
- **Concurrency & Key Generation Hardening**:
  - Replaced naive `countDocuments() + 1` ID generation with monotonic check and conflict retry loop for decisions (`DEC-XXXX`), emergencies (`EMG-XXXX`), and incidents (`INC-XXXX`).
  - Completely eliminates MongoDB `E11000 duplicate key error` under concurrent socket/REST triggers.
- **Data Retention & TTL Recommendations**:
  - `trajectories`: Rolling 30–90 day TTL index on `timestamp` recommended for production scale.
  - `predictions`: Rolling 30-day retention for resolved emergencies.
  - `emergencies`, `vehicles`, `decisions`: Permanent audit log; soft-deletion enforced.

---

## 24. Part 13 — Combined Final Integration, CARTO Map Fix & Prediction Validation

- **Critical Map Fix (CARTO Dark Matter Authentication)**:
  - **Mapping Library**: Leaflet 1.9.4 (client-only dynamic import, `components/map/map-view.tsx`, `components/dashboard/real-interactive-map.tsx`).
  - **Tile Provider**: CARTO Dark Matter raster basemap (`carto_dark`).
  - **Root Cause of Watermark**: CARTO instituted mandatory API key enforcement on hosted raster basemaps (`basemaps.cartocdn.com`). Unauthenticated tile requests return tiles stamped with "API KEY REQUIRED" watermark.
  - **Configuration**: Added `NEXT_PUBLIC_CARTO_API_KEY` environment variable. Authenticated tile template: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}` (subdomains `abcd`, maxZoom 19).
  - **Provider Health & Error Handling**:
    - Added `MapProviderHealth` type (`AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, `NOT_CONFIGURED`).
    - Added `darkTiles.on('tileerror')` listener in `map-view.tsx` to detect tile load dropouts and report `DEGRADED`.
    - Added non-intrusive operational notice banner in `components/map/control-room-map.tsx` when unconfigured, allowing one-click instant switch to OpenStreetMap (`osm`).
    - Overlays (vehicles, emergencies, routes, incidents, trajectories, deviations, V2X signals) remain architecturally isolated and fully interactive regardless of basemap tile availability.
  - **Separation of Architectural Responsibilities**:
    - *Visualization*: Leaflet + CARTO basemap tiles (browser client).
    - *Routing*: Google Routes API (strictly backend-only via `GOOGLE_MAPS_API_KEY`).
    - *Spatial Computation*: Turf.js (backend geodesic projection & corridor deviation).
    - *V2X Clearance*: Python spatial engine (`routing-engine/corridor_green_wave.py`) with JS fallback.

- **Real-World Prediction Ground-Truth Validation**:
  - **Model Version**: `v1.3-exponential-traffic-blend`.
  - **Model Classification**: Truthfully categorized as **Heuristic / Statistical-Kinematic (Deterministic Rule-Based, Non-ML)**. It is not an artificial neural network or black-box ML model.
  - **Ground-Truth Evaluation Methodology**: Historical predictions are evaluated against completed emergencies (`status: 'RESOLVED'` or `status: 'AT_SCENE'`).
    - Compares `predictedEta` against actual arrival timestamp (`emergency.updatedAt` / trajectory completion).
    - Calculates Mean Absolute Error (MAE), Median Absolute Error, and Maximum Error.
    - Calculates tolerance buckets: percentage within $\le 1$ min, $\le 3$ min, $\le 5$ min.
  - **Small-Sample Size Protection**:
    - Requires $N \ge 5$ completed ground-truth cases before computing tolerance percentages.
    - If $N < 5$, explicitly flags `INSUFFICIENT_DATA` with message: *"Sample size (N) is insufficient for certified accuracy claims (< 5 completed ground-truth cases). Baseline calibration in progress."* Never reports misleading $0\%$ or $100\%$ claims from 1–2 emergencies.
  - **Delay-Risk Matrix & Safety Priority**:
    - Evaluates predicted risk (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) vs actual delay.
    - Prioritizes severe-delay misses: situations where model predicted LOW/MEDIUM risk but actual delay became severe ($\ge 10$ min). Surfaces these prominently.
  - **Counterfactual Route Recommendation Honesty**:
    - Alternative route time savings are explicitly marked `ESTIMATED / COUNTERFACTUAL`.
    - Untraversed alternative routes are never claimed as observed physical facts.
  - **AI Governance & Epistemic Separation**:
    - Explicitly decouples: (1) Gemini advisory recommendation, (2) Deterministic safety policy action, (3) Human operator decision (`APPROVED`/`REJECTED`), and (4) Actual physical outcome.
    - Tracks agreement rates while emphasizing that agreement with deterministic safety rules reflects policy alignment, not ground-truth physical accuracy.
  - **Model Governance**:
    - Model weights are frozen and deterministic. Live emergency data is never used for automatic uncontrolled model retraining.

- **Admin Observability & Prediction Dashboard**:
  - `components/admin/admin-overview.tsx` now renders:
    - 6-provider health grid including CARTO Basemap tile status.
    - Dedicated **Prediction Model Performance & Ground-Truth Validation** dashboard card showing model name, version, type, sample size $N$, MAE, median error, 3-minute tolerance, high-risk miss count, and AI governance stats.
  - Backend API: `GET /api/admin/prediction-analytics` powered by `admin.service.js` `getPredictionAnalytics()`.

- **Security & Secret Scan**:
  - Scanned repository for secret leaks: 0 real credentials committed.
  - Verified no backend secrets (`GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, `JWT_SECRET`, `MONGO_URI`) exist in client-side code or under `NEXT_PUBLIC_*`.
  - Only `NEXT_PUBLIC_CARTO_API_KEY` is permitted client-side for raster basemap tiles.

- **Verification**: `server/test-final-integration-audit.js` (37/37 passed, 100%).

- **Future Roadmap**:
  1. Field-driver mobile app (React Native / Android).
  2. Direct city traffic signal controller integration (NTCIP / SCATS protocol).
  3. City-scale deep learning spatio-temporal traffic flow prediction.
  4. Multi-region horizontal Socket.IO scaling via Redis adapter.