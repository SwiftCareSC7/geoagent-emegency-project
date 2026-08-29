# GeoAgentic Emergency Response System

The GeoAgentic Emergency Response System (SwiftCare GeoAgent) is an intelligent platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays, recommend alternative routes, and provide AI agent decision support to control room operators via REST APIs and real-time push streaming.

## Current Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + Node HTTP Server
- **Real-Time Layer**: Socket.IO
- **Database**: MongoDB
- **ODM**: Mongoose
- **Security**: bcryptjs, jsonwebtoken, helmet, cors
- **Geospatial Processing**: @turf/turf
- **AI Decision Engine**: @google/genai (Google Gemini SDK)
- **Environment**: dotenv, cookie-parser

### Frontend (SwiftCare GeoAgent Prototype)
- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS v4, tw-animate-css, shadcn
- **UI Primitives**: @base-ui/react, class-variance-authority
- **Icons**: Lucide React
- **Fonts**: Inter, Plus Jakarta Sans (Google Fonts)
- **Analytics**: @vercel/analytics

## Feature Status

### IMPLEMENTED
- **Backend Foundation** (Express, Helmet, CORS, Error Handling, MongoDB connection)
- **Authentication & Authorization** (JWT in HTTP-only cookies, Role-Based Access Control)
- **Vehicle Management** (Vehicle CRUD, immutable `vehicleId`, status tracking)
- **Emergency & Incident Management** (CRUD, GeoJSON points, `2dsphere` indexes, soft deletions)
- **GPS Tracking & Trajectories** (GPS ingestion, compound indexed history, clock-skew protection)
- **Routing Engine** (Route model, provider abstraction, Mock provider, GeoJSON LineStrings)
- **Route Deviation Engine** (Deterministic distance & bearing calculation, GPS jitter filtering)
- **Deviation Classification** (Configurable thresholds: `ON_ROUTE`, `WARNING`, `DEVIATED`, `CRITICAL_DEVIATION`)
- **Route Progress Analysis** (Percentage, distance traveled, remaining distance)
- **Traffic Conditions Abstraction** (Provider abstraction, normalized traffic levels, mock provider)
- **Incident Proximity Correlation** (Distance to vehicle and route, cause evidence tagging)
- **ETA & Delay Engine** (Deterministic arithmetic, speed blending, zero-speed guards)
- **Situation Analysis API** (`GET /api/analysis/vehicle/:vehicleId`, `GET /api/routes/:routeId/analysis`)
- **Production GeoAgent AI Decision Engine** (`POST /api/geoagent/analyze`, `POST /api/geoagent/analyze/vehicle/:vehicleId`)
- **Controlled GeoAgent AI Tools** (`getVehicleSituation`, `getAlternativeRoutes`, `getNearbyAvailableVehicles`, `getNearbyIncidents`)
- **AI Schema Validation & Sanitization** (Strict JSON structure, prompt injection defense)
- **Deterministic AI Fallback Engine** (Safe degradation if Gemini is unreachable or unconfigured)
- **Real-Time Event Streaming (Socket.IO)** (Live push updates for fleet, incidents, deviations, and AI recommendations)
- **Socket Handshake JWT Authentication & Authorization** (Restricted to `CONTROL_ROOM` and `ADMIN`)
- **Room Isolation & Management** (`control-room`, `emergency:${id}`, `vehicle:${id}`)
- **Frontend Landing Page & Prototype Dashboard** (SwiftCare UI)
- **Decision & Dispatch Engine** (deterministic operational rules, severity, status state machine, human-in-the-loop approval, audit trail, real-time decision events, idempotency via situation hash)

### PLANNED
- **Decision Dashboard & Operator Workflow UX** (Decision queue UI, auto-expiry of stale PENDING decisions, automatic ALTERNATIVE route persistence on REROUTE approval)
- **Frontend ↔ Backend Live Integration** (Replacing mock adapter with live backend API + Socket.IO client)
- **Live Traffic API Providers** (Google Routes / Mapbox Traffic live integration)
- **Control Room Multi-Vehicle Dashboard**

## Project Structure

```text
/
├── app/                              # Next.js App Router (SwiftCare frontend)
├── components/                       # React components (Dashboard, Landing, UI)
├── lib/                              # Frontend utilities & API adapter (mock data)
├── public/                           # Static assets
├── server/                           # Express.js Backend
│   ├── config/db.js                  # MongoDB connection
│   ├── modules/
│   │   ├── auth/                     # Authentication & JWT
│   │   ├── vehicles/                 # Vehicle CRUD & registry
│   │   ├── emergencies/              # Emergency calls & vehicle assignment
│   │   ├── incidents/                # Incident management & soft deletes
│   │   ├── trajectories/             # GPS ingestion & trajectory history
│   │   ├── routes/                   # Routing engine & provider abstraction
│   │   ├── deviation/                # Route deviation detection & classification
│   │   ├── traffic/                  # Traffic abstraction & mock provider
│   │   ├── analysis/                 # Situation analysis orchestrator & ETA engine
│   │   ├── geoagents/                # Production GeoAgent AI module
│   │   ├── decisions/                # Decision & Dispatch Engine
│   │   │   ├── decision.constants.js # enums, thresholds, state machine
│   │   │   ├── decision.rules.js     # pure deterministic rules
│   │   │   ├── decision.model.js     # Mongoose model
│   │   │   ├── decision.service.js   # orchestrator + action executor
│   │   │   ├── decision.controller.js
│   │   │   ├── decision.routes.js
│   │   │   └── decision.validation.js
│   │   └── realtime/                 # Real-time Socket.IO module
│   │       ├── realtime.constants.js # Event names, commands, room definitions
│   │       ├── realtime.events.js    # Versioned envelope builder & payload formatters
│   │       ├── realtime.handlers.js  # Handshake JWT authentication & room validators
│   │       └── realtime.service.js   # Central Socket.IO singleton & emitter functions
│   ├── shared/
│   │   ├── middleware/               # errorHandler, roleMiddleware
│   │   └── services/                 # geospatial.service.js (Turf.js)
│   ├── server.js                     # Express + HTTP Server + Socket.IO entry point
│   ├── test-part7.js                 # Part 7 tests
│   ├── test-part8.js                 # Part 8 tests
│   ├── test-part9.js                 # Part 9 tests
│   ├── test-part10.js                # Part 10 tests (Decision & Dispatch Engine)
│   └── .env.example
├── geoagent-emergency-project/       # Legacy Next.js scaffold (unused)
├── AI_MEMORY.md
├── README.md
├── CHANGELOG.md
└── WALKTHROUGH.md
```

## Real-Time Event Architecture (Socket.IO)

Socket.IO is attached to the main Express HTTP server. All connections require valid JWT authentication during the handshake.

### Room Channels
- `control-room`: Joined automatically by all connected operators. Receives global events.
- `emergency:${emergencyId}`: Scoped channel for updates pertaining to a specific active case.
- `vehicle:${vehicleId}`: Scoped channel for vehicle-specific telemetry, assignment, and deviation alerts.

### Event Envelope
All events are wrapped in a standard versioned envelope:
```json
{
  "version": 1,
  "event": "vehicle.location.updated",
  "timestamp": "2026-08-29T18:40:00.000Z",
  "data": { ... }
}
```

### Supported Events
| Event Name | Trigger | Target Rooms |
|---|---|---|
| `vehicle.location.updated` | GPS trajectory ingested | `control-room`, `vehicle:${id}` |
| `vehicle.status.updated` | Vehicle status modified | `control-room`, `vehicle:${id}` |
| `trajectory.created` | Trajectory saved to DB | `control-room`, `vehicle:${id}` |
| `emergency.created` | Emergency case registered | `control-room` |
| `emergency.updated` | Case details/status modified | `control-room`, `emergency:${id}` |
| `incident.created` | Hazard reported | `control-room` |
| `incident.updated` | Hazard modified/resolved | `control-room` |
| `route.updated` | New route generated | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `route.deviation.detected`| Significant deviation detected | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `traffic.updated` | Congestion changes | `control-room` |
| `eta.updated` | ETA / delay recalculated | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `geoagent.analysis.created`| AI recommendation generated | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `decision.created` | New decision generated | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `decision.approved` | Operator approved a decision | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `decision.rejected` | Operator rejected a decision | `control-room`, `emergency:${id}`, `vehicle:${id}` |
| `decision.executed` | Approved decision executed | `control-room`, `emergency:${id}`, `vehicle:${id}` |

## Backend Setup & Testing

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your credentials:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/geoagent-emergency
   CLIENT_URL=http://localhost:3000
   JWT_SECRET=your_jwt_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run Automated Test Suites**:
   ```bash
   # Run Part 7 (Deviation, Traffic, ETA logic)
   node test-part7.js

   # Run Part 8 (GeoAgent AI, tools, validation, fallback)
   node test-part8.js

   # Run Part 9 (Real-time Socket.IO, handshake auth, rooms, events)
   node test-part9.js

   # Run Part 10 (Decision & Dispatch Engine)
   node test-part10.js
   ```

## Decision & Dispatch Engine (Part 10)

The Decision Engine is the **backend authority** for operational decisions. It is intentionally separated from the GeoAgent (advisory) layer.

```text
Observed Data
   │
   ▼
Deterministic Situation Analysis
   │
   ▼
GeoAgent Advisory Recommendation
   │
   ▼
Decision Engine Rules
   │
   ▼
Operational Decision (PENDING_OPERATOR_ACTION)
   │
   ▼
Human Operator (CONTROL_ROOM / ADMIN) Approves or Rejects
   │
   ▼
Controlled Action Execution
```

### Decision Types
`CONTINUE`, `REROUTE`, `CONSIDER_BACKUP`, `ALERT_CONTROL_ROOM`, `NO_ACTION`

### Decision Severity
`NORMAL`, `WARNING`, `CRITICAL`

### Decision Status State Machine
```
PENDING_OPERATOR_ACTION ──> APPROVED ──> EXECUTED
            │
            ├──> REJECTED (terminal)
            └──> CANCELLED (terminal)
```

### Decision APIs
- `POST /api/decisions/analyze` — generate decision for an emergency
- `GET /api/decisions/:decisionId` — retrieve one decision
- `GET /api/emergencies/:emergencyId/decisions` — paginated history
- `PATCH /api/decisions/:decisionId/approve` — operator approval
- `PATCH /api/decisions/:decisionId/reject` — operator rejection
- `PATCH /api/decisions/:decisionId/execute` — execute approved decision

### AI Recommendation vs Backend Decision
- GeoAgent produces a **recommendation** (`action`, `confidence`).
- Decision Engine produces an **operational decision** (`actions`, `severity`, `status`, `reasonCodes`).
- The two may disagree; in that case the decision carries the `AI_RECOMMENDATION_CONFLICT` reason code and both outputs are returned for auditability.
- The LLM's confidence is never used as a probability to override deterministic safety rules.

### Decision Persistence
Decisions are persisted to MongoDB with a compact `inputSnapshot` (no full document duplication) and a SHA-256 `situationHash` for idempotency (30-second reuse window). Audit fields (`approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`, `executedAt`, `executionSummary`) capture operator actions.

### Backup Selection
`Vehicle.find({ status: 'AVAILABLE' })` candidates are filtered by `BACKUP_SEARCH_RADIUS_KM` and ranked by a deterministic per-vehicle ETA. The decision records the recommended candidate but does **not** auto-dispatch.

### Security
- All decision endpoints require `CONTROL_ROOM` or `ADMIN` role.
- The request body may contain **only** `emergencyId`. Any attempt to supply operational fields (`eta`, `traffic`, `deviation`, `incidents`, `geoAgentRecommendation`, `severity`, `actions`, etc.) returns HTTP 400.
- Decision state transitions are explicitly enforced. Invalid transitions return HTTP 409.
- No credentials, API keys, or private LLM chain-of-thought are persisted.

### Decision Configuration (prototype policy)
```env
CRITICAL_ETA_THRESHOLD_MINUTES=15
MAX_ACCEPTABLE_DELAY_MINUTES=8
BACKUP_TIME_ADVANTAGE_MINUTES=5
CRITICAL_DEVIATION_DISTANCE_METERS=250
BACKUP_SEARCH_RADIUS_KM=10
MAX_ALTERNATIVE_ROUTES=3
```

These values are prototype policy, not medically validated.

### Limitations
- Backup ETA is a deterministic screening estimate; a future iteration should call the routing service for accurate provider-based ETAs.
- The action executor does not auto-create new `Route` documents for `REROUTE`; it emits a real-time suggestion only.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```