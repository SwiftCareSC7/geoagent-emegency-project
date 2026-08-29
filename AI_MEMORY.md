# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide decision support to emergency control room operators via an AI agent (GeoAgent).

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (`ADMIN`, `CONTROL_ROOM`).
- Entity tracking: Vehicles, Emergencies, Incidents, Trajectories, Routes.
- Route deviation detection (distance, bearing, stability, threshold classification).
- Route progress analysis (distance along route, percentage, remaining distance).
- Traffic conditions abstraction & mock provider.
- Incident correlation (proximity to vehicle & route).
- ETA & Delay calculation (deterministic arithmetic, speed blending, zero-speed guards).
- Structured vehicle-route situation analysis for future AI decision engine.
- GeoAgent AI decision engine proof-of-concept (Gemini tool-calling).
- Frontend prototype UI (SwiftCare GeoAgent) for driver dashboard and landing pages.

## Technology Stack

### Backend
- **Node.js** + **Express.js** (REST API)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)
- **@turf/turf** (Geospatial processing & calculations)
- **@google/genai** (Gemini AI SDK for GeoAgent PoC)
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
                  FUTURE AI
                   GEOAGENT
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
- `server/modules/geoagents`: Standalone Gemini function-calling PoC for rerouting recommendations.
- `server/shared/`: Shared middleware (`errorHandler`, `roleMiddleware`) and services (`geospatial.service.js`).

## Frontend Architecture
**Branding**: "SwiftCare GeoAgent" — emergency ambulance routing prototype.
**Framework**: Next.js App Router with TypeScript (`app/` directory at project root).
**Styling**: Tailwind CSS v4 with custom CSS variables for SwiftCare brand palette.
**Data Layer**: `lib/api.ts` adapter pattern (mock ↔ real data toggle).

## Geospatial Architecture
- GeoJSON standards (`Point`, `LineString`) strictly enforced. Coordinates strictly `[longitude, latitude]`.
- Calculations handled deterministically via `@turf/turf`:
  - `validateCoordinates([lng, lat])`
  - `createPoint(lng, lat)`
  - `calculateDistance(point1, point2)` (meters & kilometers)
  - `distanceToRoute(point, lineString)` (meters)
  - `nearestPointOnRoute(point, lineString)` (nearest GeoJSON Point + distance)
  - `calculateBearing(point1, point2)` (0-360 degrees)
  - `calculateRouteLength(lineString)` (meters & kilometers)
  - `calculateRouteProgress(point, lineString)` (percentage, distanceAlong, remainingDistance)
  - `getRouteBearingAtPoint(lineString, point)` (forward route bearing at closest segment)

## Deviation Architecture
- **Deterministic calculations**:
  - Distance from route via `distanceToRoute`.
  - Bearing difference: `|((vehicleHeading - routeBearing + 180) % 360) - 180|`.
  - GPS noise & jitter reduction: evaluates recent N trajectory points (`GPS_STABILITY_WINDOW`), computing standard deviation of distance to route.
- **Threshold Classification** (configurable via environment variables):
  - `ON_ROUTE`: distance < `ROUTE_WARNING_DISTANCE_METERS` (default: 50m)
  - `WARNING`: distance >= 50m or approaching threshold with high bearing divergence
  - `DEVIATED`: distance >= `ROUTE_DEVIATION_DISTANCE_METERS` (default: 100m) confirmed by sustained window or bearing
  - `CRITICAL_DEVIATION`: distance >= `ROUTE_CRITICAL_DISTANCE_METERS` (default: 250m)

## Traffic Architecture
- **Normalized representation**:
  - Levels: `FREE`, `LIGHT`, `MODERATE`, `HEAVY`, `SEVERE`, `UNKNOWN`
  - Metrics: `speedKmh`, `freeFlowSpeedKmh`, `congestionRatio` (`1 - speed/freeFlow`), `source`
- **Provider abstraction**:
  - `traffic.service.js` selects provider via `TRAFFIC_PROVIDER` env variable (default: `mock`).
  - `mockTrafficProvider.js`: deterministic coordinate-seeded traffic generator.

## ETA & Delay Architecture
- **Speed Blending**: When moving (>10 km/h), blends 40% current speed + 60% traffic speed; otherwise relies on traffic speed.
- **Safety Guards**: Minimum speed clamped to 5 km/h to prevent division-by-zero or `Infinity`.
- **Delay Arithmetic**:
  - `delayMinutes = Math.max(0, currentETAMinutes - originalETAMinutes)`
  - `timeSavedMinutes = Math.max(0, originalETAMinutes - currentETAMinutes)`

## Incident Correlation Architecture
- Reuses existing `Incident` collection.
- Queries active incidents within `INCIDENT_PROXIMITY_RADIUS_METERS` (default: 500m) of either the vehicle position or the planned route LineString.
- Generates structured evidence tags (`ACCIDENT_NEAR_ROUTE`, `ROAD_CLOSURE_NEAR_ROUTE`, etc.).

## Situation Analysis Architecture
- Orchestrates Vehicle + Route + Trajectory + Deviation + Traffic + Incidents + ETA + Delay into a single normalized JSON object.
- Produces structured evidence array for downstream AI consumption without invoking LLM for math.

## Current Development Stage
Part 7 — Route Deviation Detection + Traffic Abstraction + ETA Engine + Situation Analysis (Completed)

## Completed Parts
- **Part 1** — Backend Foundation (Express, Helmet, CORS, Error Handling, DB Connection)
- **Part 2** — Authentication (User model, JWT, HTTP-only cookies, Role middleware)
- **Part 3** — Vehicle Management (Vehicle model, CRUD, immutable vehicleId)
- **Part 4** — Emergency + Incident Management (Emergencies, Incidents, 2dsphere indexes, Soft-deletes, Dispatch transaction)
- **Part 5** — GPS Tracking + Trajectory Management (Trajectory model, GPS ingestion, Compound index, Clock skew validation)
- **Part 6** — Geospatial Processing + Routing (Route model, Provider abstraction, Turf.js integration, Mock routing)
- **Part 7** — Route Deviation + Traffic + ETA + Situation Analysis (Deviation engine, Traffic abstraction, ETA & Delay calculation, Incident correlation, Evidence generation)

## Completed Features
- Setup Express, Helmet, CORS, Global Error Handling.
- Auth: Register, Login, Logout, JWT Cookies.
- Vehicles: CRUD, Immutable IDs (`AMB-001`).
- Emergencies & Incidents: CRUD, Soft Deletions, Vehicle Assignment Transaction.
- Trajectories: Secure GPS Ingestion, Pagination, `2dsphere` & Compound Indexing, Safe Out-of-order handling.
- Routing: Routing Provider Abstraction, Mock Provider, GeoJSON LineString Routes, `@turf/turf` Geospatial utilities.
- Deviation Detection: Deterministic distance & bearing calculations, GPS jitter handling, configurable thresholds.
- Traffic Abstraction: Provider pattern, normalized traffic status, deterministic mock provider.
- Incident Proximity Correlation: Multi-point distance checks to vehicle and route geometry.
- ETA & Delay Engine: Non-zero speed blending, remaining distance calculations, delay and time saved.
- Situation Analysis API: Comprehensive endpoint returning normalized vehicle route situations.
- Frontend Prototype: Landing page, Login, Signup, Driver Dashboard UI (mock data).
- GeoAgent AI PoC: Gemini function-calling PoC for rerouting.

## Module Inventory
```text
server/
├── modules/
│   ├── auth/                     # User auth (register, login, logout, JWT)
│   ├── vehicles/                 # Vehicle CRUD
│   ├── emergencies/              # Emergency CRUD + vehicle assignment
│   ├── incidents/                # Incident CRUD + soft delete
│   ├── trajectories/             # GPS ingestion + history
│   ├── routes/                   # Route generation + provider abstraction
│   │   └── providers/mockRoutingProvider.js
│   ├── deviation/                # Route deviation engine & threshold classification
│   │   ├── deviation.config.js
│   │   ├── deviation.service.js
│   │   ├── deviation.controller.js
│   │   ├── deviation.routes.js
│   │   └── deviation.validation.js
│   ├── traffic/                  # Traffic conditions abstraction
│   │   ├── traffic.config.js
│   │   ├── traffic.service.js
│   │   ├── traffic.controller.js
│   │   ├── traffic.routes.js
│   │   └── providers/mockTrafficProvider.js
│   ├── analysis/                 # Situation analysis orchestrator & ETA engine
│   │   ├── analysis.service.js
│   │   ├── analysis.controller.js
│   │   ├── analysis.routes.js
│   │   └── analysis.validation.js
│   └── geoagents/                # GeoAgent AI (Gemini function-calling PoC)
│       ├── geoAgent.service.js
│       └── geoAgent.tools.js
├── shared/
│   ├── middleware/               # errorHandler, roleMiddleware
│   └── services/
│       └── geospatial.service.js # Turf.js utilities + progress & bearing
├── server.js                     # Express entry point
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
- Control Room & Admin authorization required for all operational analysis APIs.
- Control Room cannot DELETE operational records.
- Deletions are Soft Deletes (`isDeleted: true`).
- Routes are generated server-side via external routing providers (or Mock); clients cannot supply arbitrary GeoJSON geometry.
- Pagination uses hard limits (max 100) to prevent OOM DOS attacks.
- External API keys (Google Maps, Mapbox, Gemini) are strictly server-side (`process.env`) and never exposed to clients.
- Generic `502 Bad Gateway` responses mask upstream routing/traffic provider failures.
- No dynamic database collections for calculations; analysis is computed on-the-fly to prevent stale state storage.

## Environment Variables
- `PORT`, `MONGO_URI`, `CLIENT_URL`, `NODE_ENV`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`
- `TRAFFIC_PROVIDER`, `DEFAULT_FREE_FLOW_SPEED_KMH`
- `ROUTE_WARNING_DISTANCE_METERS`, `ROUTE_DEVIATION_DISTANCE_METERS`, `ROUTE_CRITICAL_DISTANCE_METERS`
- `BEARING_WARNING_DEGREES`, `BEARING_DEVIATION_DEGREES`, `GPS_STABILITY_WINDOW`
- `INCIDENT_PROXIMITY_RADIUS_METERS`
- `GEMINI_API_KEY`

## Part-by-Part Development History

### Part 7 — Route Deviation + Traffic + ETA (Current)
**Implemented**:
- Route deviation analysis with distance-to-route and bearing difference calculations.
- Configurable deviation threshold classification (`ON_ROUTE`, `WARNING`, `DEVIATED`, `CRITICAL_DEVIATION`).
- GPS stability and jitter mitigation using trajectory window analysis.
- Route progress analysis (percentage, distance along route, remaining distance).
- Traffic conditions abstraction and deterministic mock traffic provider with congestion ratios.
- Active incident proximity correlation against vehicle location and route geometry.
- Deterministic ETA and delay calculation with speed blending and zero-speed guards.
- Structured evidence tag generation for AI consumption.
- Normalized Situation Analysis endpoints: `GET /api/analysis/vehicle/:vehicleId` and `GET /api/routes/:routeId/analysis`.
- Standalone deviation API (`GET /api/deviation/vehicle/:vehicleId`) and traffic API (`GET /api/traffic/location`).

**Architecture Decisions**:
- Deterministic geospatial calculations via Turf.js — LLM is NOT used for math.
- Dynamic calculation on request rather than storing redundant calculated state in MongoDB.
- Provider abstractions for routing and traffic to support pluggable external providers.
- Configurable thresholds via environment variables with safe fallbacks.

## Known Issues
- Real Device API-Key authentication is not implemented for trajectory ingestion (devices currently use user session/token).
- Live Traffic currently uses the deterministic Mock provider; Google Traffic API integration is pending.
- Frontend prototype currently uses mock data in `lib/mock-data.ts` rather than fetching from the live backend analysis endpoint.

## Technical Debt
- MongoDB queries for history use `skip` and `limit` (cursor pagination recommended for large scale).
- Incident proximity uses Turf distance iteration over active incidents; spatial `$near` / `$geoWithin` query can be optimized for high-volume incident datasets.

## Future Development / Next Backend Task
- **Part 8**: Full GeoAgent AI Integration — wire the Gemini AI decision engine into Express API endpoints (`POST /api/geoagent/recommend`) consuming the structured situation analysis data created in Part 7.
- Connect frontend dashboard to backend analysis API (`/api/analysis/vehicle/:vehicleId`).
- Real-time updates via Socket.IO.
