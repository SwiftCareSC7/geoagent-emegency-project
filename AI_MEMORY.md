# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide end-to-end decision support to emergency control room operators via an AI agent (GeoAgent) and a deterministic Decision & Dispatch Engine.

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance. The system requires an end-to-end integration and orchestration layer that connects Emergency Calls, Vehicle Tracking, GPS Trajectories, Route Deviation, Live Traffic, Incident Correlation, ETA Calculation, Advisory AI Reasoning, and Authoritative Decision Support into a single resilient workflow.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (`ADMIN`, `CONTROL_ROOM`).
- Entity tracking: Vehicles, Emergencies, Incidents, Trajectories, Routes, Decisions.
- Route deviation detection (distance, bearing, stability, threshold classification).
- Route progress analysis (distance along route, percentage, remaining distance).
- Traffic conditions abstraction & mock provider.
- Incident correlation (proximity to vehicle & route).
- ETA & Delay calculation (deterministic arithmetic, speed blending, zero-speed guards).
- Structured vehicle-route situation analysis for the AI decision engine.
- GeoAgent AI decision engine (Gemini tool-calling) — advisory only.
- Deterministic Decision & Dispatch Engine — authoritative operational decisions.
- Full Backend Integration & Orchestration Layer — end-to-end workflow execution with 3-tier epistemic discipline (OBSERVED, INFERRED, UNKNOWN).
- Real-Time Communication Layer (Socket.IO with handshake JWT authentication and room-based event streaming).
- Frontend prototype UI (SwiftCare GeoAgent) for driver dashboard and landing pages.

## Technology Stack

### Backend
- **Node.js** + **Express.js** + **HTTP Server** (REST API & Socket.IO Host)
- **Socket.IO** (Real-Time Bidirectional Event Streaming)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)
- **@turf/turf** (Geospatial processing & calculations)
- **@google/genai** (Gemini AI SDK for GeoAgent advisory)
- **dotenv**, **cookie-parser**, **nodemon** (Utilities)

### Frontend (SwiftCare GeoAgent Prototype)
- **Next.js** (App Router, TypeScript)
- **Tailwind CSS v4** + **tw-animate-css** + **shadcn** (Styling)
- **class-variance-authority** (CVA) + **clsx** + **tailwind-merge** (Utility classes)
- **@base-ui/react** (Headless UI primitives — Button)
- **Lucide React** (Iconography)
- **@vercel/analytics** (Production analytics)
- **Google Fonts**: Inter (body), Plus Jakarta Sans (display headings)

## System Architecture
```text
                         CLIENT
                           │
                           ▼
                        EXPRESS
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
           REST API    ORCHESTRATION   REALTIME
              │            │
              │            ▼
              │      CURRENT SITUATION
              │            │
              │     ┌──────┼──────┐
              │     ▼      ▼      ▼
              │   GPS    Route  Incident
              │     │      │      │
              │     └──────┼──────┘
              │            ▼
              │        Traffic
              │            │
              │           ETA
              │            │
              │            ▼
              │        GEOAGENT (ADVISORY)
              │            │
              │            ▼
              │      DECISION ENGINE (AUTHORITATIVE)
              │            │
              └────────────┼────────────┐
                           ▼            ▼
                       MongoDB      Socket.IO
```

## Backend Architecture
**Feature-Based (Modular) Architecture**:
- `server/modules/auth`: User authentication, JWT, cookies, role checks.
- `server/modules/vehicles`: Vehicle registry and lifecycle management.
- `server/modules/emergencies`: Emergency call handling and vehicle dispatch assignment.
- `server/modules/incidents`: Incident management, proximity tagging, soft deletes.
- `server/modules/trajectories`: GPS ingestion, compound index history, clock-skew protection.
- `server/modules/routes`: Route models, provider abstraction (Mock/Google/Mapbox), GeoJSON LineStrings.
- `server/modules/deviation`: Route deviation engine, threshold classification, bearing comparison, GPS jitter stability.
- `server/modules/traffic`: Traffic abstraction layer, congestion ratios, mock traffic provider.
- `server/modules/analysis`: Situation analysis orchestrator, ETA & delay engine, evidence generator.
- `server/modules/geoagents`: Production GeoAgent AI decision engine with Gemini function calling, system prompts, output validation, and fallback mechanisms.
- `server/modules/decisions`: Authoritative Decision Engine, deterministic rules, state machine, and action execution.
- `server/modules/orchestration`: High-level end-to-end workflow service connecting all domain services into a single normalized operational response.
- `server/modules/realtime`: Central Socket.IO server, handshake JWT authentication, authorized room channels (`control-room`, `emergency:${id}`, `vehicle:${id}`), and versioned event broadcasting.
- `server/shared/`: Shared middleware (`errorHandler`, `roleMiddleware`) and services (`geospatial.service.js`).

## Current Backend File Structure
```text
server/
├── config/
│   └── db.js
├── modules/
│   ├── auth/
│   ├── vehicles/
│   ├── emergencies/
│   ├── incidents/
│   ├── trajectories/
│   ├── routes/
│   ├── deviation/
│   ├── traffic/
│   ├── analysis/
│   ├── geoagents/
│   ├── decisions/
│   ├── orchestration/
│   │   ├── orchestration.constants.js  # Stages, event names, standard units
│   │   ├── orchestration.validation.js # Validation & client operational field rejection
│   │   ├── orchestration.service.js    # End-to-end workflow coordinator & epistemic parser
│   │   ├── orchestration.controller.js # HTTP controller for workflow execution
│   │   └── orchestration.routes.js     # Protected router mounted at /api/orchestration
│   └── realtime/
├── shared/
│   ├── middleware/
│   └── services/
├── server.js                           # Express entry point
├── test-part7.js                       # Part 7 tests
├── test-part8.js                       # Part 8 tests
├── test-part9.js                       # Part 9 tests
├── test-part10.js                      # Part 10 tests
├── test-part11.js                      # Part 11 tests
└── .env.example
```

## API Inventory
**Auth**: `POST /api/auth/register`, `/login`, `/logout`, `GET /me`
**Vehicles**: `GET /api/vehicles`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Emergencies**: `GET /api/emergencies`, `/:id`, `POST /`, `PATCH /:id`, `PATCH /:id/assign`, `DELETE /:id`, `GET /:id/routes`, `GET /:id/decisions`
**Incidents**: `GET /api/incidents`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Trajectories**: `POST /api/trajectories`, `GET /:vehicleId`, `GET /:vehicleId/latest`, `GET /:vehicleId/recent`
**Routes**: `POST /api/routes`, `GET /api/routes`, `GET /api/routes/:routeId`, `GET /api/routes/:routeId/analysis`
**Deviation**: `GET /api/deviation/vehicle/:vehicleId`
**Traffic**: `GET /api/traffic/location?lng=...&lat=...`
**Analysis**: `GET /api/analysis/vehicle/:vehicleId`
**GeoAgent**: `POST /api/geoagent/analyze`, `POST /api/geoagent/analyze/vehicle/:vehicleId`
**Decisions**: `POST /api/decisions/analyze`, `POST /api/decisions/:decisionId/approve`, `POST /api/decisions/:decisionId/reject`, `POST /api/decisions/:decisionId/execute`, `GET /api/decisions/:decisionId`
**Orchestration**: `POST /api/orchestration/emergencies/:emergencyId/analyze`

## Database Models
- `User` (name, email, password, role)
- `Vehicle` (vehicleId, registrationNumber, type, status, capacity, driverName, isDeleted)
- `Emergency` (emergencyId, type, priority, status, location, destination, assignedVehicle, createdBy, isDeleted)
- `Incident` (incidentId, type, severity, status, location, reportedBy, emergency, isDeleted)
- `Trajectory` (vehicle, location, speed, heading, timestamp, source, createdAt)
- `Route` (routeId, emergency, vehicle, origin, destination, geometry, distance, duration, provider, routeType, status, createdBy)
- `Decision` (decisionId, emergency, vehicle, route, primaryAction, severity, status, reasonCodes, inputSnapshot, situationHash, approvedBy, rejectedBy, executedAt)

## Standardized Units
- **Distance**: `meters`
- **Speed**: `km/h`
- **Duration**: `seconds` (internal storage)
- **ETA**: `minutes` (API presentation)
- **Bearing**: `degrees`

## Security Rules
- All orchestration, decision, AI, and analysis APIs require authentication (`protect`) and `CONTROL_ROOM` or `ADMIN` roles.
- Cross-module consistency checks ensure `Emergency.assignedVehicle == Route.vehicle == Trajectory.vehicle`.
- Client requests cannot submit fake operational metrics (ETA, traffic, deviation, decision); any such fields in the request body are rejected with `400 Bad Request`.
- Socket.IO handshakes require valid JWTs extracted from cookies or authorization headers; anonymous connections are rejected.
- External API keys and secrets are never exposed over REST or Socket.IO responses.
- Partial failures degrade gracefully to deterministic analysis without crashing or fabricating facts.

## Part-by-Part Development History

### Part 11 — Full Backend Integration & End-to-End Workflow (Completed)
**Implemented**:
- `server/modules/orchestration/` — thin orchestration module coordinating domain services into a single unified workflow.
- Endpoint: `POST /api/orchestration/emergencies/:emergencyId/analyze`.
- End-to-end flow: Emergency → Vehicle Assignment → Route → Trajectory → Incidents → Traffic → ETA → GeoAgent AI Advisory → Decision Engine Evaluation → Real-Time Event Broadcast.
- Strict cross-module consistency validation:
  - Verifies Emergency exists and assigned Vehicle exists.
  - Verifies Route belongs to the assigned Vehicle (`route.vehicle == vehicle._id`).
  - Verifies Trajectory belongs to the assigned Vehicle (`trajectory.vehicle == vehicle._id`).
- Graceful partial analysis handling: missing assigned vehicle, route, or trajectory returns structured partial results (`workflowStatus: "PARTIAL"`) with explicit reason codes instead of crashing.
- Three-tier epistemic breakdown:
  - `observed`: Verified telemetry facts (deviation meters, progress %, traffic speed km/h, correlated incidents).
  - `inferred`: Causal explanations from spatial correlation and GeoAgent reasoning.
  - `unknown`: Explicitly declared data gaps (driver verbal confirmation, hospital ER capacity).
- Real-time events: Emits `emergency.analysis.started` and `emergency.analysis.completed` to `control-room` and `emergency:${id}` rooms.
- Comprehensive test suite `server/test-part11.js` verifying happy path, partial failure handling, client tampering rejection, and unit standards.

## Implementation Status
- Part 1  Backend Foundation: **COMPLETED**
- Part 2  Authentication: **COMPLETED**
- Part 3  Vehicle Management: **COMPLETED**
- Part 4  Emergency + Incident Management: **COMPLETED**
- Part 5  GPS + Trajectories: **COMPLETED**
- Part 6  Geospatial + Routing: **COMPLETED**
- Part 7  Deviation + Traffic + ETA: **COMPLETED**
- Part 8  GeoAgent AI Integration: **COMPLETED**
- Part 9  Real-Time Backend: **COMPLETED**
- Part 10 Decision & Dispatch Engine: **COMPLETED**
- Part 11 Full Backend Integration: **COMPLETED**

---

## NEXT DEVELOPMENT TASK:
### Part 12 — Frontend ↔ Backend Live Integration & Real-Time Dashboard Wiring

**Why it comes next**:
With all backend intelligence, AI advisory, authoritative decision engine, real-time push events, and end-to-end orchestration endpoints fully complete and tested, the final phase is connecting the Next.js frontend prototype to live backend endpoints and Socket.IO channels.

**Dependencies**:
- `server/modules/orchestration/`: `POST /api/orchestration/emergencies/:emergencyId/analyze`
- `server/modules/decisions/`: `POST /api/decisions/:id/approve`, `POST /api/decisions/:id/reject`
- `server/modules/realtime/`: Socket.IO client connection for live telemetry, deviation alerts, and decision updates.