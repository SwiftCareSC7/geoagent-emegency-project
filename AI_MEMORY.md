# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide end-to-end decision support to emergency control room operators via an AI agent (GeoAgent) and a deterministic Decision & Dispatch Engine.

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance. The system requires an end-to-end integration and orchestration layer that connects Emergency Calls, Vehicle Tracking, GPS Trajectories, Route Deviation, Live Traffic, Incident Correlation, ETA Calculation, Advisory AI Reasoning, and Authoritative Decision Support into a single resilient, hardened workflow.

## Core Requirements
- Secure backend foundation with centralized error handling and exact status code preservation.
- Authentication & Role-based Access (`ADMIN`, `CONTROL_ROOM`) with cookie and `Authorization: Bearer` support.
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
- Final Backend Hardening (Query bounds, NaN safety, GeoJSON coordinate boundaries, compound index optimizations).
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
- `server/modules/auth`: User authentication, JWT, cookies, Bearer header support, role checks.
- `server/modules/vehicles`: Vehicle registry, lifecycle management, compound indexes.
- `server/modules/emergencies`: Emergency call handling, vehicle dispatch assignment, compound indexes.
- `server/modules/incidents`: Incident management, proximity tagging, soft deletes, compound indexes.
- `server/modules/trajectories`: GPS ingestion, compound indexed history, NaN-safe pagination, clock-skew protection.
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
├── test-part12.js                      # Part 12 tests (Hardening, Security & End-to-End)
└── .env.example
```

## API Inventory
**Auth**: `POST /api/auth/register`, `/login`, `/logout`, `GET /me`
**Vehicles**: `GET /api/vehicles`, `/:vehicleId`, `POST /`, `PATCH /:vehicleId`, `DELETE /:vehicleId`
**Emergencies**: `GET /api/emergencies`, `/:emergencyId`, `POST /`, `PATCH /:emergencyId`, `PATCH /:emergencyId/assign`, `DELETE /:emergencyId`, `GET /:emergencyId/routes`, `GET /:emergencyId/decisions`
**Incidents**: `GET /api/incidents`, `/:incidentId`, `POST /`, `PATCH /:incidentId`, `DELETE /:incidentId`
**Trajectories**: `POST /api/trajectories`, `GET /:vehicleId`, `GET /:vehicleId/latest`, `GET /:vehicleId/recent`
**Routes**: `POST /api/routes`, `GET /api/routes`, `GET /api/routes/:routeId`, `GET /api/routes/:routeId/analysis`
**Deviation**: `GET /api/deviation/vehicle/:vehicleId`
**Traffic**: `GET /api/traffic/location?lng=...&lat=...`
**Analysis**: `GET /api/analysis/vehicle/:vehicleId`
**GeoAgent**: `POST /api/geoagent/analyze`, `POST /api/geoagent/analyze/vehicle/:vehicleId`
**Decisions**: `POST /api/decisions/analyze`, `POST /api/decisions/:decisionId/approve`, `POST /api/decisions/:decisionId/reject`, `POST /api/decisions/:decisionId/execute`, `GET /api/decisions/:decisionId`
**Orchestration**: `POST /api/orchestration/emergencies/:emergencyId/analyze`

## Database Models & Indexes
- `User` (name, email, password, role) — `email` (unique)
- `Vehicle` (vehicleId, registrationNumber, type, status, capacity, driverName, isDeleted) — `vehicleId` (unique), `registrationNumber` (unique), `{ status: 1, isDeleted: 1 }`
- `Emergency` (emergencyId, type, priority, status, location, destination, assignedVehicle, createdBy, isDeleted) — `emergencyId` (unique), `location` (2dsphere), `destination` (2dsphere), `{ assignedVehicle: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`
- `Incident` (incidentId, type, severity, status, location, reportedBy, emergency, isDeleted) — `incidentId` (unique), `location` (2dsphere), `{ emergency: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`
- `Trajectory` (vehicle, location, speed, heading, timestamp, source, createdAt) — `{ vehicle: 1, timestamp: -1 }`, `location` (2dsphere)
- `Route` (routeId, emergency, vehicle, origin, destination, geometry, distance, duration, provider, routeType, status, createdBy) — `routeId` (unique), `{ emergency: 1, routeType: 1 }`, `{ vehicle: 1, status: 1 }`, `geometry` (2dsphere), `origin` (2dsphere), `destination` (2dsphere)
- `Decision` (decisionId, emergency, vehicle, route, primaryAction, severity, status, reasonCodes, inputSnapshot, situationHash, approvedBy, rejectedBy, executedAt) — `decisionId` (unique), `{ emergency: 1, createdAt: -1 }`, `{ emergency: 1, situationHash: 1 }`, `{ status: 1, createdAt: -1 }`

## Standardized Units
- **Distance**: `meters`
- **Speed**: `km/h`
- **Duration**: `seconds` (internal storage)
- **ETA**: `minutes` (API presentation)
- **Bearing**: `degrees`

## Security Rules
- All orchestration, decision, AI, and analysis APIs require authentication (`protect`) and `CONTROL_ROOM` or `ADMIN` roles.
- Passwords hashed with bcrypt (salt rounds: 12), never logged, never returned in API payloads.
- HTTP-only cookies with `sameSite: strict` and conditional `secure` in production; Bearer token fallback supported for API clients.
- Cross-module consistency checks ensure `Emergency.assignedVehicle == Route.vehicle == Trajectory.vehicle`.
- Client requests cannot submit fake operational metrics (ETA, traffic, deviation, decision); any such fields in the request body are rejected with `400 Bad Request`.
- Socket.IO handshakes require valid JWTs extracted from cookies or authorization headers; anonymous connections are rejected.
- External API keys and secrets are never exposed over REST or Socket.IO responses.
- Partial failures degrade gracefully to deterministic analysis without crashing or fabricating facts.

## Part-by-Part Development History

### Part 12 — Final Backend Hardening, Security, Performance & Testing (Completed)
**Implemented**:
- Hardened centralized error handler `server/shared/middleware/errorHandler.js` to preserve `err.status || err.statusCode` for all operational errors (400, 401, 403, 404, 409).
- Hardened authentication controller and middleware:
  - Fixed named imports in `auth.controller.js`.
  - Added support for both HTTP-only cookies and `Authorization: Bearer <token>` in `auth.middleware.js`.
- Added performance and query indexes to MongoDB models:
  - `Emergency`: `{ assignedVehicle: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`.
  - `Incident`: `{ emergency: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`.
  - `Vehicle`: `{ status: 1, isDeleted: 1 }`.
- Hardened trajectory pagination: protected `getTrajectoryHistory` and `getRecentTrajectories` against `NaN` and negative limits.
- Hardened `assignVehicle` and `createRoute` to handle friendly business IDs (`EMG-0001`, `AMB-001`) as well as ObjectIds, and support standalone MongoDB installations without replica set transaction crashes.
- Created comprehensive regression and hardening test suite `server/test-part12.js` covering authentication, error handler status code preservation, query boundaries, coordinate validation (-180..180, -90..90), Socket.IO handshakes, and end-to-end orchestration.
- Verified 100% passing test status across all test suites (Parts 7, 8, 9, 10, 11, 12).

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
- Part 12 Final Backend Hardening & Testing: **COMPLETED**