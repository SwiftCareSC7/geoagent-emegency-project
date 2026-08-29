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
- Frontend prototype UI (SwiftCare GeoAgent) for driver dashboard and landing pages.

## Technology Stack

### Backend
- **Node.js** + **Express.js** (REST API)
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
- `server/shared/`: Shared middleware (`errorHandler`, `roleMiddleware`) and services (`geospatial.service.js`).

## GeoAgent AI Architecture
- **Role**: AI Decision-Support Layer. The LLM does NOT perform geometric calculations, coordinate validation, or database mutations.
- **Model**: Configured via `GEMINI_MODEL` (default: `gemini-2.5-flash`) through `@google/genai`.
- **System Prompt**: Enforces a three-tier epistemic discipline (`OBSERVED`, `INFERRED`, `UNKNOWN`), strict JSON output, and prompt injection defense.
- **Controlled Tool Calling**:
  - `getVehicleSituation(vehicleId)`: Calls backend `analysisService`.
  - `getAlternativeRoutes(originLng, originLat, destLng, destLat)`: Generates structured candidate routes via `routingService`.
  - `getNearbyAvailableVehicles(longitude, latitude, maxDistanceKm)`: Finds available ambulances with estimated arrival times.
  - `getNearbyIncidents(longitude, latitude, radiusMeters)`: Queries active incidents.
- **Output Schema Validation**: `geoagent.schemas.js` validates, sanitizes, and normalizes AI output before returning to clients.
- **Graceful Fallback**: If `GEMINI_API_KEY` is missing or the model times out, the service returns a deterministic recommendation (`status: "AI_ANALYSIS_UNAVAILABLE"`) with full underlying metrics intact.

## Current Development Status
- **Part 1  Backend Foundation**               COMPLETED
- **Part 2  Authentication**                   COMPLETED
- **Part 3  Vehicle Management**               COMPLETED
- **Part 4  Emergency + Incident**             COMPLETED
- **Part 5  GPS + Trajectories**               COMPLETED
- **Part 6  Geospatial + Routing**             COMPLETED
- **Part 7  Deviation + Traffic + ETA**        COMPLETED
- **Part 8  GeoAgent AI Integration**          COMPLETED
- **Part 9  Real-Time Backend (Socket.IO)**    PLANNED
- **Part 10 Decision / Dispatch Engine**       PLANNED
- **Part 11 Full Fullstack Integration**       PLANNED
- **Part 12 Hardening + Load Testing**         PLANNED

## Current Development Stage
Part 8 — GeoAgent AI Backend Integration (Completed)

## Module Inventory
```text
server/
├── modules/
│   ├── auth/                     # User auth (register, login, logout, JWT)
│   ├── vehicles/                 # Vehicle CRUD & registry
│   ├── emergencies/              # Emergency CRUD + vehicle assignment
│   ├── incidents/                # Incident CRUD + soft delete
│   ├── trajectories/             # GPS ingestion + history
│   ├── routes/                   # Route generation + provider abstraction
│   ├── deviation/                # Route deviation engine & threshold classification
│   ├── traffic/                  # Traffic conditions abstraction
│   ├── analysis/                 # Situation analysis orchestrator & ETA engine
│   └── geoagents/                # Production GeoAgent AI module
│       ├── geoagent.constants.js # Constants, action & cause enums
│       ├── geoagent.schemas.js   # JSON validation & sanitization
│       ├── geoagent.tools.js     # Declarations and execution handlers
│       ├── geoagent.validation.js# Input validation
│       ├── geoagent.controller.js# HTTP handlers
│       ├── geoagent.routes.js    # Express route definitions
│       ├── geoAgent.service.js   # Gemini tool orchestration & fallback
│       └── prompts/
│           └── geoagent.system.js# System prompt & injection guardrails
├── shared/
│   ├── middleware/               # errorHandler, roleMiddleware
│   └── services/
│       └── geospatial.service.js # Turf.js utilities + progress & bearing
├── server.js                     # Express entry point
├── test-part7.js                 # Part 7 tests
├── test-part8.js                 # Part 8 tests
└── .env.example
```

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

## Database Models
- `User` (name, email, password, role)
- `Vehicle` (vehicleId, registrationNumber, type, status, capacity, driverName)
- `Emergency` (emergencyId, type, priority, status, location, destination, assignedVehicle, createdBy, isDeleted)
- `Incident` (incidentId, type, severity, status, location, reportedBy, emergency, isDeleted)
- `Trajectory` (vehicle, location, speed, heading, timestamp, source, createdAt)
- `Route` (routeId, emergency, vehicle, origin, destination, geometry, distance, duration, provider, routeType, status, createdBy)

## Database Relationships
- User `creates` Emergency.
- User `reports` Incident.
- User `creates` Route.
- Emergency `assignedVehicle` -> Vehicle.
- Incident optionally references Emergency.
- Trajectory `vehicle` -> Vehicle.
- Route `emergency` -> Emergency.
- Route `vehicle` -> Vehicle.

## Security Rules
- All GeoAgent and operational analysis APIs require authentication (`protect`) and `CONTROL_ROOM` or `ADMIN` roles.
- No direct database queries or arbitrary SQL/Mongoose injection from LLMs.
- AI tools are read-only; no uncontrolled automated vehicle dispatch or data mutation from AI.
- Prompt injection protection: External user, caller, and incident description text is explicitly sanitized and labeled as untrusted data in prompts.
- Output validation: All AI JSON is strictly validated against schemas before being returned.
- External API keys (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, etc.) are kept strictly in server-side `process.env` and never leaked.

## Environment Variables
- `PORT`, `MONGO_URI`, `CLIENT_URL`, `NODE_ENV`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`
- `TRAFFIC_PROVIDER`, `DEFAULT_FREE_FLOW_SPEED_KMH`
- `ROUTE_WARNING_DISTANCE_METERS`, `ROUTE_DEVIATION_DISTANCE_METERS`, `ROUTE_CRITICAL_DISTANCE_METERS`
- `BEARING_WARNING_DEGREES`, `BEARING_DEVIATION_DEGREES`, `GPS_STABILITY_WINDOW`
- `INCIDENT_PROXIMITY_RADIUS_METERS`
- `GEMINI_API_KEY`, `GEMINI_MODEL`

## Part-by-Part Development History

### Part 8 — GeoAgent AI Backend Integration (Current)
**Purpose**:
Convert the existing Gemini proof-of-concept into a robust, secure, production-structured backend decision-support service.

**Implemented**:
- Complete GeoAgent feature module: `geoagent.constants.js`, `geoagent.schemas.js`, `geoagent.tools.js`, `prompts/geoagent.system.js`, `geoAgent.service.js`, `geoagent.validation.js`, `geoagent.controller.js`, `geoagent.routes.js`.
- Four controlled AI tools for Gemini function calling (`getVehicleSituation`, `getAlternativeRoutes`, `getNearbyAvailableVehicles`, `getNearbyIncidents`).
- Robust output validation schema ensuring clean, normalized JSON responses.
- Prompt injection defense and string sanitization.
- Safe deterministic fallback mechanism for unconfigured API keys, timeouts, or network failures.
- Express API endpoints: `POST /api/geoagent/analyze` and `POST /api/geoagent/analyze/vehicle/:vehicleId`.
- Automated test suite `server/test-part8.js`.

**Architecture Decisions**:
- The LLM is strictly an interpretation and reasoning layer; all mathematical and spatial metrics are computed deterministically by backend services.
- Read-only tools prevent hallucinated or unauthorized database mutations.
- Dynamic calculation on request avoids stale state persistence.

## Known Limitations
- Candidate alternative routes currently utilize deterministic curves and mock routing; live external multi-route provider integration will be enhanced in future stages.
- Backup ambulance distance in `getNearbyAvailableVehicles` currently uses base station estimates rather than live continuous GPS positions of all standby units.

## Technical Debt
- AI requests currently execute synchronously per HTTP request; background queuing (e.g. BullMQ / Redis) can be considered if AI latency impacts scale.

---

## NEXT DEVELOPMENT TASK:
### Part 9 — Real-Time Backend (Socket.IO & Live Event Streaming)

**Why it comes next**:
Now that the deterministic intelligence layer (Part 7) and GeoAgent AI decision engine (Part 8) are fully functional, the platform needs a bidirectional real-time communication backbone. Control rooms and active drivers require sub-second push notifications when route deviations occur, traffic changes, or GeoAgent recommendations are generated.

**Dependencies**:
- `server/modules/trajectories/`: Emits GPS updates on ingestion.
- `server/modules/deviation/`: Emits deviation alert events when status changes to `DEVIATED` or `CRITICAL_DEVIATION`.
- `server/modules/geoagents/`: Pushes new AI recommendations to active ambulance channels and control room dashboards.

**Expected Files to Touch**:
- `server/server.js` (HTTP server wrapper with Socket.IO)
- `server/modules/realtime/` (New module: socket handlers, room management, event emitters)
- `server/package.json` (add `socket.io`)

**What it must NOT modify**:
- Must not alter existing REST API contracts.
- Must not modify frontend code.
