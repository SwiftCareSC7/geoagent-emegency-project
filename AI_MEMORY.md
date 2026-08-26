# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide decision support to emergency control room operators via an AI agent.

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (ADMIN, CONTROL_ROOM).
- Entity tracking: Vehicles, Emergencies, and Incidents.
- High-frequency GPS Trajectory ingestion and querying.
- Future capabilities: Route engine, deviation detection, GeoAgent decision engine.

## Technology Stack
- **Node.js** + **Express.js** (Backend)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)

## System Architecture
Modular HTTP API → Business Logic (Services) → NoSQL Document DB with Geospatial (`2dsphere`) indexes.

## Backend Architecture
**Feature-Based (Modular) Architecture**:
Instead of monolithic folders (`controllers/`, `services/`), the app is structured by feature:
`server/modules/auth`
`server/modules/vehicles`
`server/modules/emergencies`
`server/modules/incidents`
`server/modules/trajectories`
Cross-cutting concerns live in `server/shared/middleware/`.

## Frontend Architecture
Not implemented yet.

## Database Architecture
MongoDB utilizing References (ObjectId) rather than deep embedding. 
Geospatial Data is strictly modeled as `GeoJSON Point [longitude, latitude]`.

## Authentication Architecture
- Users: JWT stored in HTTP-only cookies.
- Vehicles/Devices: Not yet implemented (will be separated from User auth).

## AI Agent Architecture
Not implemented yet.

## Current Development Stage
Part 5 — GPS Tracking + Trajectory Management

## Completed Parts
Part 1 — Backend Foundation
Part 2 — Authentication
Part 3 — Vehicle Management
Part 4 — Emergency + Incident Management
Part 5 — GPS Tracking + Trajectory Management

## Current Part
Part 5 is completed.

## Completed Features
- Setup Express, Helmet, CORS, Global Error Handling.
- Auth: Register, Login, Logout, JWT Cookies.
- Vehicles: CRUD, Immutable IDs (`AMB-001`).
- Emergencies & Incidents: CRUD, Soft Deletions, Vehicle Assignment Transaction.
- Trajectories: Secure GPS Ingestion, Pagination, `2dsphere` & Compound Indexing, Safe Out-of-order handling.

## Current File Structure
```
server/
├── config/
│   └── db.js
├── modules/
│   ├── auth/
│   ├── emergencies/
│   ├── incidents/
│   ├── trajectories/
│   └── vehicles/
├── shared/
│   └── middleware/
├── .env
├── server.js
AI_MEMORY.md
CHANGELOG.md
README.md
WALKTHROUGH.md
```

## API Inventory
**Auth**: `POST /api/auth/register`, `/login`, `/logout`, `GET /me`
**Vehicles**: `GET /api/vehicles`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Emergencies**: `GET /api/emergencies`, `/:id`, `POST /`, `PATCH /:id`, `PATCH /:id/assign`, `DELETE /:id`
**Incidents**: `GET /api/incidents`, `/:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
**Trajectories**: `POST /api/trajectories`, `GET /:vehicleId`, `GET /:vehicleId/latest`, `GET /:vehicleId/recent`

## Database Models
- `User` (name, email, password, role)
- `Vehicle` (vehicleId, registrationNumber, type, status, capacity, driverName)
- `Emergency` (emergencyId, type, priority, status, location, destination, assignedVehicle, createdBy, isDeleted)
- `Incident` (incidentId, type, severity, status, location, reportedBy, emergency, isDeleted)
- `Trajectory` (vehicle, location, speed, heading, timestamp, source, createdAt)

## Model Relationships
- User `creates` Emergency.
- User `reports` Incident.
- Emergency `assignedVehicle` -> Vehicle.
- Incident optionally references Emergency.
- Trajectory `vehicle` -> Vehicle.

## Security Rules
- Control Room cannot DELETE operational records (Emergencies, Incidents). Only ADMIN can.
- Deletions are Soft Deletes (`isDeleted: true`).
- GPS Trajectories reject coordinates outside `-180/180` and `-90/90`.
- GPS timestamp cannot be > 5 mins in the future.
- Trajectories only ingested if Vehicle status is appropriate (`DISPATCHED`, `EN_ROUTE`, etc.).
- Explicit property allowlists are used for PATCH updates to prevent mass assignment.

## Environment Variables
`PORT`, `MONGO_URI`, `CLIENT_URL`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

## External APIs
None integrated yet.

## AI Agent Skills
None currently defined in backend logic.

## AI Agent Tools
None currently defined in backend logic.

## Important Architecture Decisions
1. **Modular Architecture over Layered**: Files grouped by feature (`modules/auth`) for scalability.
2. **Soft Deletions**: To preserve historical AI context, `Emergency` and `Incident` records are never `remove()`'d.
3. **Trajectory Separation**: GPS updates are not appended to a `Vehicle.history` array; they go into a dedicated `Trajectory` collection to prevent unbounded document growth.
4. **Out-of-Order GPS**: We ingest GPS data immediately with actual timestamps. We don't overwrite newer data if it arrives late. Querying relies on `.sort({ timestamp: -1 })`.

## Important Constraints
- GeoJSON coordinates must STRICTLY be `[longitude, latitude]`.

## Known Issues
- Real Device API-Key authentication is not implemented (currently relies on User JWT for testing).

## Technical Debt
- Pagination uses `skip` and `limit`, which is acceptable for early stages but may need cursor-based pagination as Trajectory records grow into the millions.

## Future Development
- Device Authentication Layer.
- Geospatial Processing & Routing integrations.

## Next Part
Part 6 — Geospatial Processing + Routing

## Do Not Implement Yet
- Maps, Socket.IO, Live frontend, Route Deviation, GeoAgent, OpenAI/Gemini, automated dispatch.

## Development Notes
- The `Trajectory` collection uses a compound index `{ vehicle: 1, timestamp: -1 }` to make `/latest` and `/recent` queries instantly resolve without full collection scans.

## Changelog Summary
- **Part 1-3**: Base, Auth, Vehicles.
- **Part 4**: Emergencies, Incidents, Soft-Deletes.
- **Part 5**: Trajectory Model, GPS API, GeoJSON validation.
