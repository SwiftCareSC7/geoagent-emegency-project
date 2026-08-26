# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide decision support to emergency control room operators via an AI agent.

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (ADMIN, CONTROL_ROOM).
- Entity tracking: Vehicles, Emergencies, Incidents, Trajectories, Routes.
- Future capabilities: Route deviation detection, Traffic analysis, GeoAgent decision engine.

## Technology Stack
- **Node.js** + **Express.js** (Backend)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)
- **@turf/turf** (Geospatial utilities)

## System Architecture
Modular HTTP API → Business Logic (Services) → NoSQL Document DB with Geospatial (`2dsphere`) indexes.

## Backend Architecture
**Feature-Based (Modular) Architecture**:
Instead of monolithic folders, the app is structured by feature:
`server/modules/auth`
`server/modules/vehicles`
`server/modules/emergencies`
`server/modules/incidents`
`server/modules/trajectories`
`server/modules/routes`
Cross-cutting concerns and shared utilities live in `server/shared/`.

## Frontend Architecture
Not implemented yet.

## Database Architecture
MongoDB utilizing References (ObjectId) rather than deep embedding. 
Geospatial Data is strictly modeled as `GeoJSON Point` or `GeoJSON LineString`.

## Authentication Architecture
- Users: JWT stored in HTTP-only cookies.
- Vehicles/Devices: Not yet implemented (will be separated from User auth).

## Current Development Stage
Part 6 — Geospatial Processing + Routing

## Completed Parts
Part 1 — Backend Foundation
Part 2 — Authentication
Part 3 — Vehicle Management
Part 4 — Emergency + Incident Management
Part 5 — GPS Tracking + Trajectory Management
Part 6 — Geospatial Processing + Routing

## Current Part
Part 6 is completed.

## Completed Features
- Setup Express, Helmet, CORS, Global Error Handling.
- Auth: Register, Login, Logout, JWT Cookies.
- Vehicles: CRUD, Immutable IDs (`AMB-001`).
- Emergencies & Incidents: CRUD, Soft Deletions, Vehicle Assignment Transaction.
- Trajectories: Secure GPS Ingestion, Pagination, `2dsphere` & Compound Indexing, Safe Out-of-order handling.
- Routing: Routing Provider Abstraction, Mock Provider, GeoJSON LineString Routes, `@turf/turf` Geospatial utilities.

## Current File Structure
```
server/
├── config/
│   └── db.js
├── modules/
│   ├── auth/
│   ├── emergencies/
│   ├── incidents/
│   ├── routes/
│   │   └── providers/
│   │       └── mockRoutingProvider.js
│   ├── trajectories/
│   └── vehicles/
├── shared/
│   ├── middleware/
│   └── services/
│       └── geospatial.service.js
├── .env
├── server.js
```

## API Inventory
**Auth**: `POST /api/auth/register`, `/login`, `/logout`, `GET /me`
**Vehicles**: `GET /api/vehicles`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Emergencies**: `GET /api/emergencies`, `/:id`, `POST /`, `PATCH /:id`, `PATCH /:id/assign`, `DELETE /:id`, `GET /:id/routes`
**Incidents**: `GET /api/incidents`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Trajectories**: `POST /api/trajectories`, `GET /:vehicleId`, `GET /:vehicleId/latest`, `GET /:vehicleId/recent`
**Routes**: `POST /api/routes`, `GET /api/routes`, `GET /api/routes/:routeId`

## Database Models
- `User` (name, email, password, role)
- `Vehicle` (vehicleId, registrationNumber, type, status, capacity, driverName)
- `Emergency` (emergencyId, type, priority, status, location, destination, assignedVehicle, createdBy, isDeleted)
- `Incident` (incidentId, type, severity, status, location, reportedBy, emergency, isDeleted)
- `Trajectory` (vehicle, location, speed, heading, timestamp, source, createdAt)
- `Route` (routeId, emergency, vehicle, origin, destination, geometry, distance, duration, provider, routeType, status, createdBy)

## Model Relationships
- User `creates` Emergency.
- User `reports` Incident.
- User `creates` Route.
- Emergency `assignedVehicle` -> Vehicle.
- Incident optionally references Emergency.
- Trajectory `vehicle` -> Vehicle.
- Route `emergency` -> Emergency.
- Route `vehicle` -> Vehicle.

## Security Rules
- Control Room cannot DELETE operational records.
- Deletions are Soft Deletes (`isDeleted: true`).
- Routes are generated server-side via external routing providers (or Mock); clients cannot supply arbitrary GeoJSON geometry to create routes.
- Pagination uses hard limits (max 100) to prevent OOM DOS attacks.
- External routing API keys are strictly server-side (`process.env`) and never exposed to clients.
- External routing errors yield generic `502 Bad Gateway` responses so provider signatures aren't leaked.

## Environment Variables
`PORT`, `MONGO_URI`, `CLIENT_URL`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`.

## Geospatial Architecture
- GeoJSON structures (`Point`, `LineString`) strictly enforced.
- Complex geometric math (distance to route, nearest point on route, bearing) is powered by `@turf/turf` in a centralized `geospatial.service.js`.

## Routing Architecture
- **Provider Abstraction**: The `routing.service.js` chooses a provider (Google, Mapbox, OSRM, Mock) based on `ROUTING_PROVIDER` env variable.
- **Mock Routing**: A deterministic fallback provider returning a curved `LineString` to allow development without API keys.
- **Route Engine Ownership**: Routes are "owned" by the backend engine; clients ask for a route between points, the backend handles the generation and persistence.

## Important Architecture Decisions
1. **Modular Architecture over Layered**: Files grouped by feature.
2. **Trajectory Separation**: GPS updates are in a dedicated collection.
3. **Routing Abstraction**: Decoupled the frontend/DB logic from specific route mapping providers (Google vs Mapbox).
4. **Turf.js Integration**: Prevented writing custom Haversine formulas in favor of robust, industry-standard NPM package.

## Important Constraints
- GeoJSON coordinates must STRICTLY be `[longitude, latitude]`.

## Known Issues
- Real Device API-Key authentication is not implemented for trajectory ingestion.

## Technical Debt
- Pagination uses `skip` and `limit`.

## Future Development
- Part 7 — Route Deviation Detection + Traffic + ETA.

## Next Part
Part 7 — Route Deviation Detection + Traffic + ETA.

## Do Not Implement Yet
- Maps, Socket.IO, Live frontend, Route Deviation Engine, GeoAgent, OpenAI/Gemini, automated dispatch.

## Changelog Summary
- **Part 1-3**: Base, Auth, Vehicles.
- **Part 4**: Emergencies, Incidents, Soft-Deletes.
- **Part 5**: Trajectory Model, GPS API, GeoJSON validation.
- **Part 6**: Route Model, Geospatial service, Turf.js, Mock Routing provider.
