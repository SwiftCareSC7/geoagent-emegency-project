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