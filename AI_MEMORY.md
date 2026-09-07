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
│   └── driver/dashboard/page.tsx             # Protected driver telemetry mission dashboard
├── components/                               # React UI Components
│   ├── auth/                                 # Authentication UI Components
│   │   ├── LoginForm.tsx                     # Production login form with validation & errors
│   │   ├── SignupForm.tsx                    # Production registration with password rules
│   │   └── ProtectedRoute.tsx                # Client route guard & role access control
│   ├── dashboard/                            # Mission dashboard widgets
│   │   └── dashboard-topbar.tsx              # Top bar with authenticated user & logout
│   ├── landing/                              # Landing page sections
│   └── ui/                                   # Base UI primitives
├── lib/                                      # Frontend Utilities & API Client
│   ├── api/                                  # Centralized typed API client
│   │   ├── client.ts                         # Fetch wrapper (credentials: 'include', network error normalization)
│   │   ├── types.ts                          # Full TypeScript interfaces derived from OpenAPI 3.0
│   │   ├── auth.ts                           # Auth API methods (register, login, logout, getMe)
│   │   ├── vehicles.ts                       # Vehicle CRUD API
│   │   ├── emergencies.ts                    # Emergency management API
│   │   ├── incidents.ts                      # Road hazards API
│   │   ├── trajectories.ts                   # GPS telemetry API
│   │   └── index.ts                          # API barrel export
│   ├── auth/                                 # Client-side Auth State & Session
│   │   ├── types.ts                          # AuthState & AuthContextType interfaces
│   │   ├── session.ts                        # Session retrieval (401 vs network error handling)
│   │   └── context.tsx                       # AuthContext, AuthProvider & useAuth hook
│   ├── api.ts                                # Legacy adapter (mock data fallback)
│   ├── mock-data.ts                          # Static demo dashboard data
│   └── utils.ts                              # Classname styling utilities
├── public/                                   # Frontend Static Assets
├── next.config.mjs                           # Next.js build configuration
├── tsconfig.json                             # TypeScript configuration
├── postcss.config.mjs                        # Tailwind CSS v4 configuration
├── routing-engine/                           # Python Spatial Routing & V2X Module
│   ├── routes_engine.py                      # Main routing & green-wave calculation
│   ├── geo_utils.py                          # Spatial math utilities
│   ├── simulate_telemetry_stream.py          # GPS simulation streamer
│   ├── map_visualizer.html                   # Leaflet interactive map visualizer
│   └── MEMBER2_GUIDE.md                      # Guide for routing engine
├── server/
│   ├── config/
│   │   └── db.js                             # MongoDB connection & error handler
│   ├── modules/
│   │   ├── auth/                             # User auth, JWT, cookies, RBAC
│   │   ├── vehicles/                         # Vehicle fleet registry & CRUD
│   │   ├── emergencies/                      # Emergency calls & vehicle dispatch
│   │   ├── incidents/                        # Road hazards & spatial correlation
│   │   ├── trajectories/                     # GPS ingestion & trajectory history
│   │   ├── routes/                           # Routing engine & provider abstraction
│   │   ├── deviation/                        # Route deviation detection & jitter filtering
│   │   ├── traffic/                          # Traffic abstraction & mock provider
│   │   ├── analysis/                         # Situation analysis orchestrator & ETA engine
│   │   ├── geoagents/                        # Production GeoAgent AI (Gemini function-calling)
│   │   ├── decisions/                        # Authoritative Decision Engine & state machine
│   │   ├── orchestration/                    # Full end-to-end mission coordinator
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