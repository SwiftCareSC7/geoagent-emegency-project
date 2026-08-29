# GeoAgentic Emergency Response System — AI Memory

## Project Purpose
To monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays and ETA, recommend alternative routes, and provide decision support to emergency control room operators via an AI agent (GeoAgent).

## Problem Statement
Current emergency response systems lack intelligent, real-time spatial awareness. Control rooms struggle to monitor active deviations from optimal routes and don't have automated context (like nearby incidents or traffic) to provide immediate driver assistance.

## Core Requirements
- Secure backend foundation.
- Authentication & Role-based Access (ADMIN, CONTROL_ROOM).
- Entity tracking: Vehicles, Emergencies, Incidents, Trajectories, Routes.
- Frontend prototype UI (SwiftCare GeoAgent) for driver dashboard and landing pages.
- GeoAgent AI decision engine (Gemini integration for route recommendations).
- Future capabilities: Live route deviation detection, real-time traffic analysis, Socket.IO, live map integration.

## Technology Stack

### Backend
- **Node.js** + **Express.js** (REST API)
- **MongoDB** + **Mongoose** (Database & ODM)
- **bcryptjs** + **jsonwebtoken** + **helmet** + **cors** (Security)
- **@turf/turf** (Geospatial utilities)
- **@google/genai** (Gemini AI SDK for GeoAgent)
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
Modular HTTP API → Business Logic (Services) → NoSQL Document DB with Geospatial (`2dsphere`) indexes.
Separate Next.js frontend (prototype UI) → API Adapter layer → Mock data today, backend API tomorrow.

## Backend Architecture
**Feature-Based (Modular) Architecture**:
Instead of monolithic folders, the app is structured by feature:
`server/modules/auth`
`server/modules/vehicles`
`server/modules/emergencies`
`server/modules/incidents`
`server/modules/trajectories`
`server/modules/routes`
`server/modules/geoagents`
Cross-cutting concerns and shared utilities live in `server/shared/`.

## Frontend Architecture
**Branding**: "SwiftCare GeoAgent" — emergency ambulance routing prototype.
**Framework**: Next.js App Router with TypeScript (`app/` directory at project root).
**Styling**: Tailwind CSS v4 with custom CSS variables for a SwiftCare brand palette (navy, critical red, warning amber, success green, route colors for planned/actual/recommended).
**Design System**: Custom design tokens in `globals.css`, reusable UI primitives (`Button`, `Modal`), and a `StatCard` component for dashboard metrics.
**Data Layer**: `lib/api.ts` adapter pattern — currently returns mock data from `lib/mock-data.ts`; designed to swap to real `GET /api/dashboard/:ambulanceId` when backend is ready.
**Demo Scenario**: Bengaluru-based ambulance (KA-01-AMB-108) rerouted due to an accident on 100 Feet Road, Indiranagar.

### Frontend Pages
| Route | Description |
|---|---|
| `/` | Landing page (Hero, Feature Cards, Contact Section) |
| `/login` | Login form (prototype — bypasses auth, redirects to dashboard) |
| `/signup` | Registration form with Driver/Operator role selection |
| `/driver/dashboard` | Driver dashboard: ETA summary, schematic map, timeline, deviation analysis, GeoAgent recommendation |

### Frontend Component Map
```
components/
├── brand-logo.tsx              # BrandLogo with image fallback
├── dashboard/
│   ├── dashboard-topbar.tsx    # Top header bar (emergency status, driver info)
│   ├── driver-dashboard.tsx    # Main dashboard layout (actions, grid, modals)
│   ├── eta-summary.tsx         # ETA card (new ETA, time saved, destination)
│   ├── geoagent-card.tsx       # AI recommendation explanation card
│   ├── map-placeholder.tsx     # SVG schematic map with route lines & markers
│   ├── route-status-cards.tsx  # 8 stat cards (deviation & benefit analysis)
│   ├── stat-card.tsx           # Reusable stat card with tone-based styling
│   └── timeline-panel.tsx      # Evidence & timeline (event log with dots)
├── landing/
│   ├── contact-section.tsx     # Contact info + 24/7 availability card
│   ├── feature-cards.tsx       # 3 feature cards (monitoring, prediction, rerouting)
│   ├── hero.tsx                # Full-bleed hero with CTA buttons
│   └── site-header.tsx         # Sticky header with nav (Contact, Help, Login)
└── ui/
    ├── button.tsx              # CVA-based Button (6 variants, 8 sizes)
    └── modal.tsx               # Accessible modal dialog (Esc, backdrop, focus trap)
```

## GeoAgent AI Module
**Location**: `server/modules/geoagents/`
**Purpose**: Experimental AI agent powered by Google Gemini (`gemini-3.6-flash`) for emergency vehicle rerouting decisions.
**Architecture**: Function-calling pattern:
1. Agent sends a prompt describing the emergency to Gemini.
2. Gemini requests the `getNewRoute` tool call.
3. The tool returns mock alternative routes (A/B/C with ETAs and traffic levels).
4. A second Gemini call analyzes the routes and returns a recommended route, ETA, time saved, and reasoning.
**Status**: Proof-of-concept standalone script (`testAgent()` in `geoAgent.service.js`). Not yet integrated into the Express API or frontend.

## Database Architecture
MongoDB utilizing References (ObjectId) rather than deep embedding. 
Geospatial Data is strictly modeled as `GeoJSON Point` or `GeoJSON LineString`.

## Authentication Architecture
- Users: JWT stored in HTTP-only cookies.
- Frontend: Prototype UI bypasses authentication — login/signup forms redirect directly to the driver dashboard.
- Vehicles/Devices: Not yet implemented (will be separated from User auth).

## Current Development Stage
Part 7 — Frontend Prototype UI + GeoAgent AI PoC

## Completed Parts
Part 1 — Backend Foundation
Part 2 — Authentication
Part 3 — Vehicle Management
Part 4 — Emergency + Incident Management
Part 5 — GPS Tracking + Trajectory Management
Part 6 — Geospatial Processing + Routing
Part 7 — Frontend Prototype UI + GeoAgent AI PoC

## Completed Features
- Setup Express, Helmet, CORS, Global Error Handling.
- Auth: Register, Login, Logout, JWT Cookies.
- Vehicles: CRUD, Immutable IDs (`AMB-001`).
- Emergencies & Incidents: CRUD, Soft Deletions, Vehicle Assignment Transaction.
- Trajectories: Secure GPS Ingestion, Pagination, `2dsphere` & Compound Indexing, Safe Out-of-order handling.
- Routing: Routing Provider Abstraction, Mock Provider, GeoJSON LineString Routes, `@turf/turf` Geospatial utilities.
- Frontend: Landing Page, Login, Signup, Driver Dashboard (ETA, Map Placeholder, Timeline, Deviation Analysis, GeoAgent Card).
- GeoAgent AI: Gemini function-calling PoC for route recommendation.

## Current File Structure
```
/
├── app/                              # Next.js App Router (SwiftCare frontend)
│   ├── globals.css                   # Tailwind v4 config + SwiftCare design tokens
│   ├── layout.tsx                    # Root layout (Inter + Jakarta fonts, metadata)
│   ├── page.tsx                      # Landing page
│   ├── login/page.tsx                # Login page (prototype)
│   ├── signup/page.tsx               # Signup page with role selection
│   └── driver/dashboard/page.tsx     # Driver dashboard (server component)
├── components/                       # React components
│   ├── brand-logo.tsx
│   ├── dashboard/                    # Dashboard-specific components (8 files)
│   ├── landing/                      # Landing page components (4 files)
│   └── ui/                           # Shared UI primitives (Button, Modal)
├── lib/                              # Frontend utilities
│   ├── api.ts                        # API adapter (mock ↔ real toggle)
│   ├── mock-data.ts                  # Static demo data (Bengaluru scenario)
│   └── utils.ts                      # cn() utility (clsx + tailwind-merge)
├── public/                           # Static assets (logo, hero image, icons)
├── server/                           # Express.js Backend
│   ├── config/db.js
│   ├── modules/
│   │   ├── auth/                     # User auth (register, login, logout, JWT)
│   │   ├── vehicles/                 # Vehicle CRUD
│   │   ├── emergencies/              # Emergency CRUD + vehicle assignment
│   │   ├── incidents/                # Incident CRUD + soft delete
│   │   ├── trajectories/             # GPS ingestion + history
│   │   ├── routes/                   # Route generation + provider abstraction
│   │   │   └── providers/mockRoutingProvider.js
│   │   └── geoagents/                # GeoAgent AI (Gemini function-calling PoC)
│   │       ├── geoAgent.service.js
│   │       └── geoAgent.tools.js
│   ├── shared/
│   │   ├── middleware/               # errorHandler, roleMiddleware
│   │   └── services/
│   │       └── geospatial.service.js # Turf.js utilities
│   ├── server.js                     # Express entry point
│   └── .env.example
├── geoagent-emergency-project/       # Legacy Next.js scaffold (unused)
├── AI_MEMORY.md
├── README.md
├── CHANGELOG.md
└── WALKTHROUGH.md
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
- Frontend prototype bypasses auth (clearly labeled "Prototype UI only" with warnings).

## Environment Variables
`PORT`, `MONGO_URI`, `CLIENT_URL`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`, `GEMINI_API_KEY`.

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
5. **Frontend API Adapter Pattern**: `lib/api.ts` isolates mock vs real data; the UI never imports data directly — only this file changes when backend connects.
6. **Dual Next.js Projects**: Root-level `app/` is the active SwiftCare prototype; `geoagent-emergency-project/` is the unused scaffold and should be ignored.
7. **GeoAgent Function-Calling**: Gemini AI uses tool/function calling to request route data, analyze it, and return structured recommendations.

## Important Constraints
- GeoJSON coordinates must STRICTLY be `[longitude, latitude]`.
- Frontend is prototype-only: no real auth, no real GPS, no real medical data.
- `geoagent-emergency-project/` directory is a legacy scaffold — do not develop in it.

## Known Issues
- Real Device API-Key authentication is not implemented for trajectory ingestion.
- Frontend login/signup bypass auth entirely (prototype).
- GeoAgent AI is a standalone script, not integrated into Express routes.
- The `geoAgent.tools.js` `getNewRoute()` ignores its `currentLocation` and `destination` parameters (returns hardcoded mock routes).

## Technical Debt
- Pagination uses `skip` and `limit`.
- Map on dashboard is an SVG placeholder, not a real map (Leaflet/Mapbox).
- Mock data in `lib/mock-data.ts` is hardcoded for a single scenario (KA-01-AMB-108, Bengaluru).

## Future Development
- Part 8 — Route Deviation Detection + Traffic + ETA (live).
- Integrate GeoAgent AI into Express API endpoints.
- Replace schematic map with Leaflet/Mapbox.
- Connect frontend auth to backend JWT flow.
- Socket.IO for real-time dashboard updates.
- Control Room dashboard (operator view).

## Changelog Summary
- **Part 1-3**: Base, Auth, Vehicles.
- **Part 4**: Emergencies, Incidents, Soft-Deletes.
- **Part 5**: Trajectory Model, GPS API, GeoJSON validation.
- **Part 6**: Route Model, Geospatial service, Turf.js, Mock Routing provider.
- **Part 7**: SwiftCare Frontend (Landing, Login, Signup, Driver Dashboard), GeoAgent AI PoC (Gemini function-calling), Mock data layer, Brand design system.
