# SwiftCare GeoAgent — Emergency Vehicle Movement & Corridor Clearance System

The **SwiftCare GeoAgentic Emergency Response System** is an intelligent decision-support and dispatch platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify spatial causes (such as traffic bottlenecks or road incidents), predict delays, evaluate V2X green-wave corridor clearances, run advisory Gemini AI reasoning, and evaluate authoritative operational decisions in real time.

**Repository**: [github.com/SwiftCareSC7/geoagent-emegency-project](https://github.com/SwiftCareSC7/geoagent-emegency-project)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [What Has Been Built (Completed Work)](#4-what-has-been-built-completed-work)
5. [What Still Needs to Be Done (TODO)](#5-what-still-needs-to-be-done-todo)
6. [Quick Start & Setup](#6-quick-start--setup)
7. [Running Automated Test Suites](#7-running-automated-test-suites)
8. [API & Documentation Reference](#8-api--documentation-reference)
9. [Frontend Integration & Handoff Guide](#9-frontend-integration--handoff-guide)
10. [Production Considerations](#10-production-considerations)
11. [Team & Member Contributions](#11-team--member-contributions)

---

## 1. System Architecture

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

## 2. Technology Stack

### Frontend
| Layer | Technology | Details |
|---|---|---|
| Framework | Next.js 16 | App Router, Turbopack, React 19 |
| Styling | Tailwind CSS v4 | PostCSS pipeline, custom design tokens |
| Icons | Lucide React | SVG icon library |
| UI Primitives | Base UI, CVA | class-variance-authority + tailwind-merge |
| Language | TypeScript | `@/*` path aliasing |
| Analytics | Vercel Analytics | `@vercel/analytics` |
| Dev Port | `http://localhost:3000` | — |

### Backend Core
| Layer | Technology | Details |
|---|---|---|
| Runtime | Node.js (ES Modules) | `"type": "module"` |
| Framework | Express.js | HTTP Server + CORS + Helmet |
| Real-Time | Socket.IO 4.8 | Room-isolated push, handshake JWT auth |
| Database | MongoDB (v6.0+) | Mongoose 8, 2dsphere spatial indexing |
| Auth | bcryptjs + jsonwebtoken | 12 salt rounds, HTTP-only cookies + Bearer |
| Geospatial | @turf/turf (v7.4+) | WGS84, GeoJSON Point & LineString |
| AI | @google/genai (v2.19+) | Gemini 2.5 Flash, structured function calling |
| Dev Port | `http://localhost:5000` | — |

### Python Spatial Routing Engine (Member 2)
| Layer | Technology | Details |
|---|---|---|
| Runtime | Python 3.11+ | Standalone spatial analysis |
| Algorithms | Haversine, cross-track error | Corridor intersection, bearing calculation |
| V2X | Green-wave scoring | Traffic signal preemption evaluation |
| Visualizer | Leaflet.js | Interactive map (`map_visualizer.html`) |

---

## 3. Project Structure

```text
/
├── app/                                      # Next.js App Router Pages
│   ├── layout.tsx                            # Root layout with fonts & analytics
│   ├── page.tsx                              # Landing page
│   ├── globals.css                           # Global styles & design tokens
│   ├── login/page.tsx                        # Login interface
│   ├── signup/page.tsx                       # Signup interface
│   └── driver/dashboard/page.tsx             # Driver telemetry mission dashboard
├── components/                               # React UI Components
│   ├── brand-logo.tsx                        # SVG brand logo
│   ├── dashboard/                            # Mission dashboard widgets
│   │   ├── dashboard-topbar.tsx              # Top bar with ambulance info
│   │   ├── driver-dashboard.tsx              # Main dashboard layout
│   │   ├── eta-summary.tsx                   # ETA comparison widget
│   │   ├── geoagent-card.tsx                 # AI recommendation card
│   │   ├── map-placeholder.tsx               # SVG schematic map (NOT real map)
│   │   ├── route-status-cards.tsx            # Route status cards
│   │   ├── stat-card.tsx                     # Statistical metric card
│   │   └── timeline-panel.tsx                # Event timeline panel
│   ├── landing/                              # Landing page sections
│   │   ├── hero.tsx                          # Hero section
│   │   ├── feature-cards.tsx                 # Feature showcase cards
│   │   ├── contact-section.tsx               # Contact info section
│   │   └── site-header.tsx                   # Navigation header
│   └── ui/                                   # Base UI primitives
│       ├── button.tsx                        # Button component (CVA)
│       └── modal.tsx                         # Modal dialog component
├── lib/                                      # Frontend Utilities & API Client
│   ├── api.ts                                # API adapter (currently returns MOCK data)
│   ├── mock-data.ts                          # Static demo dashboard data
│   └── utils.ts                              # Utility functions (cn helper)
├── public/                                   # Frontend Static Assets
│   ├── hero-ambulance.png                    # Hero section image
│   ├── swiftcare-logo.png                    # Brand logo
│   └── (icons, placeholders)                 # Favicons & placeholder images
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
│   ├── test-part7.js ... test-part12.js      # Integration test suites (Parts 7-12)
│   ├── test-security.js                      # 23-Point automated security suite
│   ├── .env.example                          # Environment variable template
│   └── package.json                          # Backend dependencies
├── geoagent-emergency-project/               # Legacy nested Next.js scaffold (INACTIVE)
│   ├── components/MapView.jsx.txt            # Draft Leaflet MapView (NOT wired)
│   ├── data/mock-dashboard.json.txt          # Draft mock dashboard JSON
│   └── src/app/page.js                       # Default Next.js boilerplate (unused)
├── docs/
│   ├── openapi.yaml                          # OpenAPI 3.0 specification (40+ endpoints)
│   ├── socket-events.md                      # WebSocket event dictionary
│   ├── database.md                           # Database schemas and indexes
│   └── environment.md                        # Environment variables reference
├── AI_MEMORY.md                              # Machine-readable project state
├── CHANGELOG.md                              # Version changelog
├── WALKTHROUGH.md                            # Technical development walkthrough
└── README.md                                 # This file
```

---

## 4. What Has Been Built (Completed Work)

### ✅ Backend — FULLY IMPLEMENTED (Parts 1–12)

| Part | Feature Area | Status | Key Capabilities |
|---|---|---|---|
| 1 | **Server Foundation** | ✅ Done | Express server, MongoDB connection, CORS, Helmet, centralized error handler |
| 2 | **Authentication & RBAC** | ✅ Done | JWT issuance, bcrypt (12 rounds), dual transport (cookie + Bearer), 4 roles (`ADMIN`, `CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`) |
| 3 | **Vehicle Management** | ✅ Done | Fleet registry, CRUD, unique `vehicleId`, compound status index, lifecycle states (`AVAILABLE` → `DISPATCHED` → `EN_ROUTE` → `AT_SCENE` → `TRANSPORTING` → `MAINTENANCE`) |
| 4 | **Emergency & Incidents** | ✅ Done | Emergency intake, triage priority (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`), vehicle dispatch assignment, `2dsphere` spatial indexing, road incident reporting, soft deletion |
| 5 | **GPS Trajectories** | ✅ Done | GPS ingestion, compound index `{ vehicle: 1, timestamp: -1 }`, bounded pagination, sanitized query guards |
| 6 | **Geospatial & Routing** | ✅ Done | Turf.js calculations, GeoJSON LineStrings, provider abstraction (Mock / Google / Mapbox / OSRM) |
| 7 | **Deviation Detection** | ✅ Done | Cross-track distance, bearing divergence, GPS jitter filtering, rolling stability window, threshold classification |
| 7 | **Traffic & ETA** | ✅ Done | Speed blending, zero-speed guards, congestion ratios, arithmetic delay calculations |
| 8 | **GeoAgent AI** | ✅ Done | Gemini 2.5 Flash function-calling, 4 read-only tools, strict JSON schema, prompt injection defense, deterministic fallback |
| 9 | **Real-Time Push** | ✅ Done | Socket.IO handshake JWT auth, room isolation (`control-room`, `emergency:${id}`, `vehicle:${id}`), server-emitted events |
| 10 | **Decision Engine** | ✅ Done | Deterministic rules, state machine (`PENDING_OPERATOR_ACTION` → `APPROVED` / `REJECTED` → `EXECUTED`), SHA-256 idempotency, severity levels |
| 11 | **Orchestration** | ✅ Done | Unified pipeline execution via `POST /api/orchestration/emergencies/:id/analyze`, 3-tier epistemic breakdown (`OBSERVED` / `INFERRED` / `UNKNOWN`) |
| 12 | **Hardening & Testing** | ✅ Done | Status code preservation, compound indexes, graceful shutdown (`SIGINT`/`SIGTERM`), query boundary hardening |
| — | **Security Suite** | ✅ Done | 23-point automated security suite (password hashing, injection defense, JWT tampering, CORS, IDOR) |
| — | **Documentation** | ✅ Done | OpenAPI 3.0 spec (40+ endpoints), Socket.IO event reference, database architecture doc, environment reference |

**Backend API Modules**: 12 route files serving 40+ REST endpoints across `auth`, `vehicles`, `emergencies`, `incidents`, `trajectories`, `routes`, `deviation`, `traffic`, `analysis`, `geoagents`, `decisions`, `orchestration`.

**Test Coverage**: 72 / 72 assertions passing across 7 test suites (100% pass rate).

---

### ✅ Python Spatial Routing & V2X Engine — FULLY IMPLEMENTED (Member 2)

| Feature | Status | Details |
|---|---|---|
| **Dynamic Corridor Routing** | ✅ Done | Haversine distance, cross-track error detection |
| **V2X Green-Wave Scoring** | ✅ Done | Traffic signal preemption scoring for emergency corridor clearance |
| **GeoJSON Export** | ✅ Done | Routes exported to `routes_geojson.json` |
| **GPS Telemetry Simulator** | ✅ Done | `simulate_telemetry_stream.py` generates mock GPS data |
| **Interactive Map Visualizer** | ✅ Done | Leaflet.js map in `map_visualizer.html` showing routes, deviations, incidents |
| **Demo Script** | ✅ Done | `demo_member2.py` runs the full routing pipeline |
| **Documentation** | ✅ Done | `MEMBER2_GUIDE.md` with usage instructions |

---

### ✅ Frontend UI & Authentication — IMPLEMENTED (Auth Connected + UI Scaffold)

| Feature | Status | Details |
|---|---|---|
| **Next.js 16 App Router Setup** | ✅ Done | Turbopack, React 19, TypeScript, Tailwind CSS v4, PostCSS |
| **Authentication & Session** | ✅ Done | Real `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/auth/logout`, HTTP-only cookie transport, session persistence |
| **Protected Routes & RBAC** | ✅ Done | `<ProtectedRoute>` route guard, loading state to prevent flashing, role-aware access (`CONTROL_ROOM`, `ADMIN`) |
| **Login Page** (`/login`) | ✅ Done | Production `LoginForm` with inline validation, backend error banners, auto-redirect |
| **Signup Page** (`/signup`) | ✅ Done | Production `SignupForm` with password requirements checklist, auto-login upon creation |
| **Landing Page** (`/`) | ✅ Done | Hero section, feature cards, contact section, help modal, site header |
| **Driver Dashboard** (`/driver/dashboard`) | ✅ Done | Protected by `<ProtectedRoute>`; connects to live Express REST endpoints (`/api/vehicles`, `/api/emergencies`, `/api/incidents`) with real MongoDB feeds, status/priority filtering, dynamic counter cards, and instant toggle to Corridor Telemetry view |
| **Emergency Detail & Analysis** (`/emergencies/[id]`) | ✅ Done | Dedicated operational corridor intelligence page (`app/emergencies/[id]/page.tsx`) with concurrent REST fetching, honest empty states, and section-level error isolation |
| **Telemetry & Trajectory Log** | ✅ Done | Latest fix telemetry strip (speed, cardinal heading, coordinates, source) and paginated bounded GPS trajectory history table |
| **Expected Route Corridor Analysis** | ✅ Done | Planned route details, provider attribution (`MOCK Provider (Local Simulation)`), distance, duration, and GeoJSON LineString waypoint verification |
| **Corridor Deviation & Traffic Intelligence** | ✅ Done | Deterministic cross-track distance, bearing divergence, GPS stability (`STABLE`/`UNSTABLE`), traffic congestion level, current vs original ETA, delay calculations, and structured causal evidence tags |
| **3-Tier Epistemic Breakdown** | ✅ Done | Explicit visual separation of verified physical observations (`OBSERVED`), algorithmic inferences (`INFERRED`), and unobserved operational variables (`UNKNOWN`) |
| **Centralized API Client** | ✅ Done | `lib/api/client.ts` with `credentials: 'include'`, network error normalization, OpenAPI types, and typed client modules for `auth`, `vehicles`, `emergencies`, `incidents`, `trajectories`, `routes`, `analysis`, `orchestration` |
| **SVG Map Placeholder** | ✅ Done | Schematic SVG map with markers (preserved; interactive map intentionally deferred) |
| **Mock Data Layer** | ✅ Done | `lib/mock-data.ts` with static ambulance demo scenario (preserved for corridor telemetry view) |
| **Brand Assets** | ✅ Done | Logo, hero image, icons, favicons |
| **UI Component Library** | ✅ Done | Button (CVA), Modal, BrandLogo, LoginForm, SignupForm, ProtectedRoute, EmergencySummaryCards, VehicleFleetPanel, ActiveEmergenciesPanel, RoadIncidentsPanel, EmergencyOverviewCard, VehicleMovementPanel, RouteAnalysisPanel, DeviationAnalysisPanel, CorrelatedIncidentsPanel, EpistemicBreakdownCard, EmergencyDetailView |

---

## 5. What Still Needs to Be Done (TODO)

### 🔴 CRITICAL — Real-Time Intelligence & External Data Integration (COMPLETED IN PART 16)

Authentication, Dashboard REST domain feeds, Emergency Detail Corridor Analysis, External Providers (Google Routes, Roads, Traffic), Real-Time Prediction Engine, Decision Engine Rationale, and Socket.IO real-time streaming are **fully implemented and verified**.

| # | Task | Status | Details |
|---|---|---|---|
| 1 | **Wire `lib/api` to the real backend** | ✅ Done | Centralized API client (`lib/api/client.ts`) and typed modules (`vehicles`, `emergencies`, `incidents`, `trajectories`, `routes`, `analysis`, `decisions`, `orchestration`, `auth`) connected to Express REST endpoints. |
| 2 | **Implement real Login flow** | ✅ Done | `POST /api/auth/login` → issues HTTP-only cookie → populates session → redirects to dashboard. |
| 3 | **Implement real Signup flow** | ✅ Done | `POST /api/auth/register` → assigns `CONTROL_ROOM` → creates account → auto-authenticates. |
| 4 | **Build authenticated API client** | ✅ Done | Centralized HTTP client (`lib/api/client.ts`) with `credentials: 'include'`, typed error normalization, and session persistence. |
| 5 | **Connect Dashboard to real backend data** | ✅ Done | Connected `/driver/dashboard` to live MongoDB collections via `GET /api/vehicles`, `GET /api/emergencies`, and `GET /api/incidents` with view toggles, filter pills, error recovery, and empty state banners. |
| 6 | **Build Emergency Detail & Analysis View** | ✅ Done | Connected `/emergencies/[id]` to live backend endpoints for emergency details, planned routes, GPS trajectories, situation analysis, and 3-tier epistemic breakdown. |
| 7 | **External Google Routes Provider** | ✅ Done | Implemented Google Routes API (`directions/v2:computeRoutes`) with explicit field masks, `TRAFFIC_AWARE_OPTIMAL` routing, polyline decoding to GeoJSON LineStrings, alternative route parsing, and 60s caching. |
| 8 | **External Google Roads Provider** | ✅ Done | Batched road snapping (max 100 points), 5-minute caching, Turf.js spatial nearest-point fallback, and static speed-limit metadata. |
| 9 | **External Google Traffic Provider** | ✅ Done | Deterministic delay and congestion calculation from Google Routes duration comparisons, tagged with `epistemicType: 'DERIVED'`. |
| 10 | **Telemetry Hardening & Teleport Defense** | ✅ Done | Ingestion bounds checks (`[-180, 180]`, `[-90, 90]`), speed checks (`0 - 250 km/h`), heading (`0 - 360°`), and teleport jitter anomaly detection (> 1000m jump in 10s). |
| 11 | **Real-Time Prediction Engine** | ✅ Done | Rolling EMA speed trend, remaining route distance slicing, traffic/deviation delay penalties, delay risk enum, confidence scoring, Mongoose persistence, and REST endpoint `GET /api/analysis/vehicle/:id/prediction`. |
| 12 | **GeoAgent & Decision Engine Rationale** | ✅ Done | Comparative trade-off matrix ("Why did the route change?", "What if we do nothing?"), advisory Gemini 2.5 Flash reasoning, and `PENDING_OPERATOR_ACTION` state machine requiring operator approval. |
| 13 | **Socket.IO Real-Time Client & Streaming** | ✅ Done | Authenticated WebSocket connection (token & cookies), room isolation (`control-room`, `emergency:${id}`, `vehicle:${id}`), live `prediction.updated` push stream, and React hooks `useSocketStatus` and `useRealtimeEmergency`. |
| 14 | **Provider Health & Safe Evaluation** | ✅ Done | `GET /api/health/providers` returning safe evaluation (`AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, `NOT_CONFIGURED`) without exposing API keys. |
| 15 | **Admin Database Administration & Observability** | ✅ Done | Secure ADMIN-only layer (`/admin`) with real system counts across all 8 verified collections, live database latency ping, tabbed collection browser with safe projection and bounded pagination, and strict RBAC (`protect` + `requireRole('ADMIN')`). |

---

### 🟠 NEXT PHASE — Interactive Map & Control Room Expansion

| # | Task | Priority | Details |
|---|---|---|---|
| 16 | **Replace SVG map with real interactive map** | 🟠 High | Replace `map-placeholder.tsx` with a real Mapbox GL / Google Maps / Leaflet component showing live vehicle positions, planned routes (GeoJSON LineStrings), actual trajectories, incidents, and deviations. (Intentionally deferred during backend integration). |
| 17 | **Control Room Dashboard page** | 🟠 High | Dedicated multi-emergency overview (`/control-room/dashboard`) showing concurrent active emergency corridors, fleet readiness, and incoming deviation alerts. |
| 18 | **Emergency Creation modal/form** | 🟡 Medium | Operator UI form to trigger new emergency dispatch calls directly from the control room. |

---

### 🟡 MEDIUM — Python ↔ Backend Integration

| # | Task | Priority | Details |
|---|---|---|---|
| 23 | **Connect Python routing engine to Node.js backend** | 🟡 Medium | The Python spatial routing engine (`routing-engine/`) and the Node.js backend (`server/`) are completely independent. Options: (a) Python HTTP microservice called by Node backend, (b) subprocess spawning, (c) rewrite Python logic in JS using Turf.js (partially done in `deviation.service.js`). |
| 24 | **Unified V2X green-wave integration** | 🟡 Medium | The Python engine calculates V2X green-wave scores, but the Node.js backend does not consume or display them. Need to pipe V2X scores into the orchestration pipeline and surface them on the dashboard. |

---

### 🔵 LOW — Polish, Testing & DevOps

| # | Task | Priority | Details |
|---|---|---|---|
| 25 | **Add frontend unit/integration tests** | 🔵 Low | No frontend tests exist. Add Jest + React Testing Library or Vitest for component tests. |
| 26 | **Add E2E tests** | 🔵 Low | Add Playwright or Cypress for end-to-end testing of the full login → dashboard → decision approval flow. |
| 27 | **Clean up legacy nested project** | 🔵 Low | The `geoagent-emergency-project/` subdirectory contains an unused Next.js scaffold (default boilerplate `page.js`, draft `MapView.jsx.txt`). Either integrate useful parts or remove entirely. |
| 28 | **Docker Compose setup** | 🔵 Low | Create `docker-compose.yml` with services: `frontend` (Next.js), `backend` (Express), `mongo` (MongoDB), `routing-engine` (Python). Currently everything runs manually in separate terminals. |
| 29 | **CI/CD Pipeline** | 🔵 Low | GitHub Actions workflow: lint, build, test (backend + frontend), deploy. Not configured. |
| 30 | **Environment secrets management** | 🔵 Low | Move `JWT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY` from `.env` file to a secrets manager (AWS Secrets Manager / GCP Secret Manager / Vault). |
| 31 | **MongoDB TTL / time-series for trajectories** | 🔵 Low | High-frequency GPS data will grow unbounded. Configure TTL index or MongoDB time-series collection for automatic data lifecycle management. |
| 32 | **Production deployment configuration** | 🔵 Low | Nginx reverse proxy, PM2 process management, SSL/TLS certificates, production MongoDB (Atlas), Vercel deployment for frontend. |
| 33 | **Accessibility audit** | 🔵 Low | Run Lighthouse / axe accessibility audit on all pages. Ensure WCAG 2.1 AA compliance. |
| 34 | **Mobile responsiveness pass** | 🔵 Low | Dashboard is responsive but needs testing on actual mobile devices and tablets. |
| 35 | **Loading states & error boundaries** | 🔵 Low | Add React Suspense boundaries, skeleton loaders, and error fallback UI for failed API calls. |
| 36 | **User profile page** | 🔵 Low | Allow users to view and update their profile, change password, see activity log. |

---

## 6. Quick Start & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher (local daemon or MongoDB Atlas)
- **Python**: v3.11 or higher (optional, for standalone routing engine)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/SwiftCareSC7/geoagent-emegency-project.git
cd geoagent-emegency-project

# Install Frontend (Root) Dependencies
npm install

# Install Backend Dependencies
cd server
npm install
cp .env.example .env
cd ..
```

### 2. Configure Backend Environment (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/geoagent-emergency
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_long_random_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ROUTING_PROVIDER=mock
TRAFFIC_PROVIDER=mock
```
*(For complete environment reference, see [`docs/environment.md`](docs/environment.md)).*

### 3. Run Applications

```bash
# Terminal 1: Run Frontend (Port 3000)
npm run dev

# Terminal 2: Run Backend Server (Port 5000)
cd server
npm run dev

# Terminal 3 (Optional): Run Python Spatial Routing Demo
cd routing-engine
python demo_member2.py
```

### Health Check
```bash
curl http://localhost:5000/api/health
# Response: {"success":true,"message":"GeoAgentic backend is running"}
```

---

## 7. Running Automated Test Suites

The test suite validates the complete backend stack across 7 comprehensive test files:

```bash
cd server

# Run all 7 test suites
node test-part7.js    # Deviation, Traffic, ETA, Situation Analysis
node test-part8.js    # GeoAgent AI Function-Calling & Fallbacks
node test-part9.js    # Real-Time Socket.IO Handshake & Room Broadcasting
node test-part10.js   # Authoritative Decision & Dispatch Engine
node test-part11.js   # Full Backend Integration & Epistemic Breakdown
node test-part12.js   # Hardening, Status Codes & Query Boundaries
node test-security.js # Dedicated 23-Point Security & Privilege Suite
```
**Audit Result**: 72 / 72 assertions passing across 7 test suites (100% pass rate).

---

## 8. API & Documentation Reference

Complete API, database, and event documentation is available in the `docs/` directory:

- 📘 **[OpenAPI 3.0 Specification](docs/openapi.yaml)**: Complete REST API schema for all 40+ endpoints.
- ⚡ **[Socket.IO Event Reference](docs/socket-events.md)**: Room isolation, handshake auth, and payload structures.
- 🗄️ **[Database Architecture Reference](docs/database.md)**: Mongoose schemas, relationships, indexes, and GeoJSON rules.
- ⚙️ **[Environment Reference](docs/environment.md)**: Required vs optional configuration variables.
- 🗺️ **[Routing Engine Guide](routing-engine/MEMBER2_GUIDE.md)**: Python spatial engine & V2X green-wave documentation.
- 📖 **[Developer Walkthrough](WALKTHROUGH.md)**: Part-by-part technical implementation guide.
- 🧠 **[AI Memory](AI_MEMORY.md)**: Machine-readable repository state and system boundaries.

---

## 9. Frontend Integration & Handoff Guide

For developers connecting the frontend dashboard to the backend:

### 1. Authentication
Send credentials to `POST /api/auth/login`. The server returns an HTTP-only `token` cookie (`SameSite=Strict`, 7 days) and user profile:
```javascript
const res = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'operator@geoagent.local', password: 'SecurePassword123!' })
});
const { user } = await res.json();
// Subsequent requests automatically include the HTTP-only cookie via credentials: 'include'
```

### 2. Calling REST Endpoints
Pass `credentials: 'include'` for cookie auth or `Authorization: Bearer <token>`:
```javascript
// Trigger full end-to-end situation analysis for an emergency
const analysisRes = await fetch('http://localhost:5000/api/orchestration/emergencies/EMG-0001/analyze', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await analysisRes.json();
```

### 3. Subscribing to Real-Time Push Events
Connect to Socket.IO and join the control room:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token },
  transports: ['websocket']
});

socket.on('connect', () => {
  socket.emit('room:join', { room: 'control-room' });
  socket.emit('room:join', { room: 'emergency:EMG-0001' });
});

socket.on('deviation.detected', (payload) => console.log('Deviation Alert:', payload));
socket.on('decision.created', (payload) => console.log('New Decision Action:', payload));
```

---

## 10. Production Considerations

| Area | Current Status | Production Recommendation |
|---|---|---|
| **Live Routing** | `mock` provider | Set `ROUTING_PROVIDER=google` or `mapbox` with valid API keys in `.env` |
| **Live Traffic** | `mock` provider | Set `TRAFFIC_PROVIDER=google` with Google Maps key for live corridor congestion |
| **Interactive Map** | SVG placeholder | Replace with Leaflet / Mapbox GL JS / Google Maps component |
| **Frontend ↔ Backend** | **Disconnected** (mock data) | Wire `lib/api.ts` to real backend, implement auth flow, Socket.IO client |
| **Trajectory Archiving** | Ingests to MongoDB | Configure MongoDB TTL index or time-series collection for multi-month data lifecycle |
| **Secret Management** | `.env` file | Store `JWT_SECRET` and `GEMINI_API_KEY` in AWS Secrets Manager / Vault / GCP Secret Manager |
| **Process Management** | Node HTTP Server | Deploy behind Nginx reverse proxy with PM2 or Kubernetes cluster |
| **Frontend Deployment** | Next.js dev server | Deploy root Next.js app to Vercel with Root Directory set to `./` |
| **Rate Limiting** | Not implemented | Add `express-rate-limit` for login endpoints and API abuse prevention |
| **CI/CD** | Not configured | GitHub Actions for lint, build, test, deploy |

---

## 11. Team & Member Contributions

| Member | Responsibility | Key Deliverables |
|---|---|---|
| **Member 1** | Backend Core (Node.js) | Express server, 13 domain modules (auth → orchestration), MongoDB models, Gemini AI integration, 7 test suites, 4 documentation files, security hardening |
| **Member 2** | Python Spatial Engine | Routing engine, V2X green-wave scoring, GeoJSON export, Leaflet visualizer, telemetry simulator |
| **Member 3** | Frontend UI (Next.js) | Next.js 16 setup, landing page, login/signup pages, driver dashboard, UI component library, design tokens, draft MapView |

---

## Summary: Current State at a Glance

```
✅ Backend API (40+ endpoints, 12 modules)     → COMPLETE & TESTED (72/72 tests passing)
✅ Python Routing Engine (V2X, maps)            → COMPLETE & STANDALONE
✅ Frontend Authentication & Session            → COMPLETE & CONNECTED (HTTP-only cookies, 31/31 tests passing)
⚠️  Dashboard Telemetry Widgets                 → BUILT (Currently using mock data layer)
⏳ Real-time Socket.IO in Frontend              → NEXT TASK
❌ Real Interactive Map                          → SVG PLACEHOLDER only (Do not build yet)
❌ Control Room Dashboard                       → NOT BUILT
❌ Docker / CI-CD                               → NOT CONFIGURED
```

> **Current sprint focus**: Connect remaining dashboard widgets to domain API endpoints and configure Socket.IO push streaming.