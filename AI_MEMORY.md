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
│   ├── layout.tsx                            # Root layout with fonts & analytics
│   ├── page.tsx                              # Landing page
│   ├── login/page.tsx                        # Login interface
│   ├── signup/page.tsx                       # Signup interface
│   └── driver/dashboard/page.tsx             # Driver telemetry mission dashboard
├── components/                               # React UI Components
│   ├── dashboard/                            # Mission dashboard widgets
│   ├── landing/                              # Landing page sections
│   └── ui/                                   # Base UI primitives
├── lib/                                      # Frontend Utilities & API Client
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