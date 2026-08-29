# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide intelligent decision support to emergency control room operators via an AI agent (GeoAgent).

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents, live traffic, or candidate backup vehicles) to provide immediate driver assistance.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (`ADMIN`, `CONTROL_ROOM`).
- Entity tracking: Vehicles, Emergencies, Incidents, Trajectories, Routes.
- Route deviation detection (distance, bearing, stability, threshold classification).
- Route progress analysis (distance along route, percentage, remaining distance).
- Traffic conditions abstraction & mock provider.
- Incident correlation (proximity to vehicle & route).
- ETA & Delay calculation (deterministic arithmetic, speed blending, zero-speed guards).
- Structured vehicle-route situation analysis for AI consumption.
- Production-grade GeoAgent AI decision engine using Google Gemini tool-calling.
- Real-time communication layer using Socket.IO with handshake JWT authentication and room-based event streaming.
- Frontend prototype UI (SwiftCare GeoAgent) for driver dashboard and landing pages.

## Technology Stack

### Backend
- **Node.js** + **Express.js** + **HTTP Server** (REST API & Socket.IO Host)
- **Socket.IO** (Real-Time Bidirectional Event Streaming)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)
- **@turf/turf** (Geospatial processing & calculations)
- **@google/genai** (Google Gemini AI SDK for GeoAgent function calling)
- **dotenv**, **cookie-parser**, **nodemon** (Utilities)

### Frontend (SwiftCare GeoAgent Prototype)
- **Next.js** (App Router, TypeScript)
- **Tailwind CSS v4** + **tw-animate-css** + **shadcn** (Styling)
- **class-variance-authority** (CVA) + **clsx** + **tailwind-merge** (Utility classes)
- **@base-ui/react** (Headless UI primitives — Button)
- **Lucide React** (Iconography)
- **@vercel/analytics** (Production analytics)
- **Google Fonts**: Inter (body), Plus Jakarta Sans (display headings)

### Legacy Frontend (Scaffold)
- **Next.js** (App Router, JavaScript) in `geoagent-emergency-project/` — default create-next-app scaffold, unused.

## System Architecture
```text
                    VEHICLE
                       │
                       ▼
                  TRAJECTORY
                       │
                       ▼
                  CURRENT GPS
                       │
                       ▼
                 PLANNED ROUTE
                       │
              ┌────────┴────────┐
              ▼                 ▼
       GEO PROCESSING       INCIDENTS
              │                 │
              ▼                 │
        DEVIATION ENGINE        │
              │                 │
              └────────┬────────┘
                       ▼
                 TRAFFIC SERVICE
                       │
                       ▼
                   ETA ENGINE
                       │
                       ▼
                 DELAY ANALYSIS
                       │
                       ▼
              SITUATION ANALYSIS
                       │
                       ▼
                   GEOAGENT
                  (Gemini LLM)
                 ┌─────┴─────┐
                 ▼           ▼
             Tool Calls   Structured
             (Backend)  Recommendation
                       │
                       ▼
             REAL-TIME SERVICE (Socket.IO)
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   control-room    emergency:id   vehicle:id
```

## Backend Architecture
**Feature-Based (Modular) Architecture**:
The backend is structured into modular feature domains:
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
│   └── realtime/
│       ├── realtime.constants.js # Event names, commands, room definitions
│       ├── realtime.events.js    # Versioned envelope builder & payload formatters
│       ├── realtime.handlers.js  # Handshake JWT authentication & room validators
│       └── realtime.service.js   # Central Socket.IO singleton & emitter functions
├── shared/
│   ├── middleware/
│   └── services/
├── server.js                     # Express + HTTP Server + Socket.IO entry point
├── test-part7.js                 # Part 7 tests
├── test-part8.js                 # Part 8 tests
├── test-part9.js                 # Part 9 tests
└── .env.example
```

## Real-Time Architecture & Event Dictionary

### Rooms
- `control-room`: Automatic channel for all connected `CONTROL_ROOM` and `ADMIN` operators. Receives global fleet, emergency, incident, and deviation alerts.
- `emergency:${emergencyId}`: Scoped channel for updates pertaining to a specific active case (route updates, ETA changes, specific GeoAgent advice).
- `vehicle:${vehicleId}`: Scoped channel for vehicle-specific telemetry, assignment, and deviation alerts.

### Versioned Event Envelope
All Socket.IO events use a standardized envelope:
```json
{
  "version": 1,
  "event": "vehicle.location.updated",
  "timestamp": "2026-08-29T18:40:00.000Z",
  "data": { ... }
}
```

### Event Names
- `vehicle.location.updated`: Live GPS point ingested and persisted.
- `vehicle.status.updated`: Vehicle state change (`AVAILABLE`, `DISPATCHED`, `EN_ROUTE`, etc.).
- `trajectory.created`: Confirmed trajectory saved to MongoDB.
- `emergency.created`: New emergency case registered.
- `emergency.updated`: Priority, status, destination, or vehicle assignment updated.
- `incident.created`: Hazard/accident reported.
- `incident.updated`: Hazard severity/status changed or resolved.
- `route.updated`: New planned or rerouted LineString generated.
- `route.deviation.detected`: Real-time deviation event with distance and bearing difference.
- `traffic.updated`: Congestion or speed update along active corridor.
- `eta.updated`: Recalculated ETA or delay based on current speed and traffic.
- `geoagent.analysis.created`: Structured AI decision-support recommendation generated.

## API Inventory
**Auth**: `POST /api/auth/register`, `/login`, `/logout`, `GET /me`
**Vehicles**: `GET /api/vehicles`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Emergencies**: `GET /api/emergencies`, `/:id`, `POST /`, `PATCH /:id`, `PATCH /:id/assign`, `DELETE /:id`, `GET /:id/routes`
**Incidents**: `GET /api/incidents`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Trajectories**: `POST /api/trajectories`, `GET /:vehicleId`, `GET /:vehicleId/latest`, `GET /:vehicleId/recent`
**Routes**: `POST /api/routes`, `GET /api/routes`, `GET /api/routes/:routeId`, `GET /api/routes/:routeId/analysis`
**Deviation**: `GET /api/deviation/vehicle/:vehicleId`
**Traffic**: `GET /api/traffic/location?lng=...&lat=...`
**Analysis**: `GET /api/analysis/vehicle/:vehicleId`
**GeoAgent**: `POST /api/geoagent/analyze`, `POST /api/geoagent/analyze/vehicle/:vehicleId`

## Security Rules
- All GeoAgent and operational analysis APIs require authentication (`protect`) and `CONTROL_ROOM` or `ADMIN` roles.
- Socket.IO handshakes require valid JWTs extracted from cookies or authorization headers; anonymous connections are rejected.
- Only authenticated operators (`CONTROL_ROOM`, `ADMIN`) can connect to Socket.IO.
- Client commands (`join.emergency`, `join.vehicle`) validate entity existence in MongoDB before granting room membership.
- AI tools are strictly read-only; no automated database mutations or vehicle control.
- External API keys and secrets are never exposed over Socket.IO or REST responses.

## Part-by-Part Development History

### Part 9 — Real-Time Backend (Socket.IO) (Completed)
**Purpose**:
Provide a secure, low-latency push communication layer to broadcast live operational events to control rooms and vehicles without polling.

**Implemented**:
- Dedicated `server/modules/realtime/` module with `realtime.constants.js`, `realtime.events.js`, `realtime.handlers.js`, and `realtime.service.js`.
- Attached Socket.IO to Express HTTP server with strict CORS and handshake JWT authentication.
- Room isolation: `control-room`, `emergency:${id}`, `vehicle:${id}` with MongoDB entity verification.
- Standardized versioned event envelopes (`version: 1`).
- Integrated event emission hooks across `trajectory.service.js`, `emergency.service.js`, `incident.service.js`, `route.service.js`, `vehicle.service.js`, and `geoAgent.service.js`.
- Automated test suite `server/test-part9.js` testing handshake auth, invalid token rejection, room broadcasting, and disconnect cleanup.

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

---

## NEXT DEVELOPMENT TASK:
### Part 10 — Dispatch & Escalation Decision Engine (Automated Reroute & Response Protocol)

**Why it comes next**:
With real-time event streaming and GeoAgent AI recommendations now in place, the system needs an automated escalation and dispatch engine to transition recommendations into actionable control room workflows (e.g., automated reroute approval, backup ambulance dispatch triggers, driver notification queuing).

**Dependencies**:
- `server/modules/geoagents/`: Generates candidate recommendations.
- `server/modules/realtime/`: Pushes dispatch and reroute requests.
- `server/modules/emergencies/`: Updates emergency and vehicle status upon approved dispatch/reroute.
