# GeoAgentic Emergency Response System - Developer Walkthrough

This document serves as a guide for developers to understand the full-stack architecture, features, and setup of the GeoAgentic Emergency Response System (SwiftCare GeoAgent).

---

## 1. Architecture Overview

The system is composed of three layers:

```text
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js App Router, TypeScript)               │
│  ├── Landing Page, Login, Signup                         │
│  ├── Driver Dashboard (ETA, Map, Timeline, GeoAgent)     │
│  └── API Adapter (lib/api.ts → mock data or backend)     │
├─────────────────────────────────────────────────────────┤
│  Backend (Express.js, Node.js)                           │
│  ├── Modular Feature Architecture (7 modules)            │
│  ├── REST API with JWT auth + role-based access          │
│  └── GeoAgent AI (Gemini function-calling PoC)           │
├─────────────────────────────────────────────────────────┤
│  Database (MongoDB)                                      │
│  ├── 6 Collections: User, Vehicle, Emergency, Incident,  │
│  │   Trajectory, Route                                   │
│  └── 2dsphere geospatial indexes                         │
└─────────────────────────────────────────────────────────┘
```

### Backend Request Flow
```text
Request
  ↓
Middleware (Auth, Rate Limiting, CORS)
  ↓
Route (Role authorization & schema validation)
  ↓
Controller (Thin: parses req, calls service, formats res)
  ↓
Service (Fat: core business logic, DB transactions)
  ↓
Model (Mongoose schema)
  ↓
MongoDB
```

### Frontend Data Flow
```text
Page Component (Server or Client)
  ↓
lib/api.ts (getDashboard)
  ↓
lib/mock-data.ts (static data today)
    ── or ──
GET /api/dashboard/:ambulanceId (when backend connects)
  ↓
Dashboard Components (ETA, Map, Timeline, etc.)
```

---

## 2. What Was Built (Parts 1–6: Backend)

- **Part 1 (Foundation)**: Express setup, global error handling, Helmet for security, CORS, MongoDB connection.
- **Part 2 (Authentication)**: `User` model, JWT token generation, HTTP-only cookie delivery, auth middleware, and Role-Based Access Control (`CONTROL_ROOM`, `ADMIN`).
- **Part 3 (Vehicles)**: `Vehicle` module for managing emergency vehicles. Setup of the modular architecture.
- **Part 4 (Emergencies & Incidents)**: `Emergency` and `Incident` models with GeoJSON locations, `2dsphere` indexes, soft deletions, and vehicle assignment transactions.
- **Part 5 (GPS & Trajectories)**: `Trajectory` model for individual GPS pings, compound indexing, pagination, clock-skew validation.
- **Part 6 (Routing & Geospatial)**: `Route` model, provider abstraction (Google/Mapbox/OSRM/Mock), `@turf/turf` geospatial service, GeoJSON `LineString` storage.

---

## 3. What Part 7 Added (Frontend + GeoAgent AI)

Part 7 introduces the **SwiftCare GeoAgent** frontend prototype and a **Gemini-powered AI** proof-of-concept.

### 3.1 Frontend — SwiftCare GeoAgent Prototype

A Next.js (App Router, TypeScript) application built at the project root. It is a **prototype UI** — all data is mock, authentication is bypassed, and the map is an SVG schematic.

#### Design System
- **Tailwind CSS v4** with custom CSS variables in `app/globals.css`.
- **SwiftCare Brand Palette**: Navy (`#17365d`), warm background (`#f4f1eb`), borders (`#ddd7ca`).
- **Semantic Colors**: Critical (red), Warning (amber), Success (green).
- **Route Colors**: Planned (blue), Actual (green), Recommended (purple).
- **Typography**: Inter for body text, Plus Jakarta Sans for display headings.

#### Pages

| Route | Type | What It Does |
|---|---|---|
| `/` | Client | Landing page: hero image, feature cards, contact info, help modal |
| `/login` | Client | Login form — any credentials redirect to `/driver/dashboard` |
| `/signup` | Client | Registration with Driver/Operator role selection and driver-specific fields |
| `/driver/dashboard` | Server → Client | Loads mock data via `getDashboard()`, renders the full driver dashboard |

#### Dashboard Components

The driver dashboard is the core UI. It consists of:

1. **DashboardTopbar** — Brand logo, ambulance ID, driver name, emergency status badge (active/standby), last-updated timestamp.
2. **Action Bar** — Refresh Route button, View Alternative Route toggle, Contact Control Room button (opens confirmation modal).
3. **EtaSummary** — Large ETA display (10 min), time saved (6 min via Route B), destination (Manipal Hospital).
4. **MapPlaceholder** — SVG-based schematic map with:
   - City block grid background
   - Three route lines: planned (blue dashed), actual (green solid), recommended (purple solid)
   - Four markers: ambulance, accident, congestion, destination (HTML overlay with Lucide icons)
   - Legend with route/marker colors
5. **TimelinePanel** — Chronological evidence log showing how GeoAgent reached its recommendation (4 events with severity dots).
6. **RouteStatusCards** — 8 `StatCard` components: Route Status, Likely Cause, Original ETA, Current Route ETA, Alternative Route B ETA, Time Saved, Backup Ambulance, Recommendation.
7. **GeoAgentCard** — AI explanation card: "A high-severity accident near Indiranagar is affecting the planned route..."

#### Reusable UI Components

- **`Button`** — CVA-based with 6 variants (default, outline, secondary, ghost, destructive, link) and 8 sizes. Built on `@base-ui/react`.
- **`Modal`** — Accessible dialog: Escape to close, backdrop with blur, focus management, close button.
- **`BrandLogo`** — Next.js `<Image>` loading `swiftcare-logo.png` with text fallback on error.
- **`StatCard`** — Metric card with icon, label, value, optional hint, and tone-based styling (6 tones).

#### Data Layer

- **`lib/api.ts`**: API adapter with a `USE_MOCK` toggle. Today returns `AMB_01_DASHBOARD` from mock data. When backend is ready, swap for `fetch('/api/dashboard/:id')`.
- **`lib/mock-data.ts`**: Complete `DashboardData` type and a static Bengaluru scenario:
  - Ambulance KA-01-AMB-108, driver Ananya Rao
  - En route from Koramangala to Manipal Hospital, HAL Old Airport Road
  - Road accident on 100 Feet Road, Indiranagar
  - Route B via Domlur recommended, saving 6 minutes
  - 4 timeline events (accident → congestion → deviation → recommendation)
  - 4 map markers (ambulance, accident, congestion, destination)

### 3.2 GeoAgent AI Module

**Location**: `server/modules/geoagents/`

A proof-of-concept AI agent using Google Gemini's function-calling capability:

#### `geoAgent.service.js`
```text
1. Define a `getNewRoute` function declaration for Gemini
2. Send prompt: "An ambulance is stuck in heavy traffic. Find alternative routes."
3. Gemini responds with a function call to `getNewRoute`
4. Execute `getNewRoute()` → returns 3 mock routes (A/B/C)
5. Send routes back to Gemini with analysis prompt
6. Gemini returns: recommended route, ETA, time saved, reasoning
```

#### `geoAgent.tools.js`
Returns hardcoded mock routes:
- Route A: 16 min ETA, Heavy traffic
- Route B: 11 min ETA, Moderate traffic
- Route C: 14 min ETA, Medium traffic

**Status**: Standalone script (runs via `node geoAgent.service.js`). Not yet integrated into Express routes or the frontend dashboard.

---

## 4. File-by-File Explanation (Parts 5–6 Backend)

### Trajectories (`server/modules/trajectories/`)
- **`trajectory.model.js`**: Defines the `Trajectory` schema. References the `Vehicle` ObjectId. Enforces ranges for `speed` (0-250) and `heading` (0-360). Creates the crucial compound index for performance.
- **`trajectory.validation.js`**: Reuses GeoJSON validation. Prevents future clock-skews in `timestamp` (no more than 5 minutes ahead). Rejects unreasonable speeds and headings.
- **`trajectory.service.js`**: The core business logic. 
  - **Duplicate/Out-of-Order strategy**: Ingestion simply accepts incoming GPS data as-is, relying on the actual `timestamp`. Since queries sort by `timestamp: -1`, out-of-order data automatically rights itself on retrieval. 
  - Verifies that the vehicle exists and is in a tracking-appropriate status (`DISPATCHED`, `EN_ROUTE`, etc.).
- **`trajectory.controller.js`**: API handlers returning data safely. Ensures the requested `vehicleId` is attached to responses while hiding internal ObjectIds.
- **`trajectory.routes.js`**: Exposes POST (ingest), GET latest, GET recent, and GET history. Protected by `CONTROL_ROOM` and `ADMIN` auth.

### Shared Geospatial Services (`server/shared/services/`)
- **`geospatial.service.js`**: Centralizes all geographic calculations using `@turf/turf`. It provides `validateCoordinates`, `createPoint`, `calculateDistance`, `distanceToRoute`, `nearestPointOnRoute`, `calculateBearing`, and `calculateRouteLength`.

### Routes Module (`server/modules/routes/`)
- **`route.model.js`**: Defines the `Route` schema containing `LineString` geometry, distance, duration, and relationships to `Emergency` and `Vehicle`. Includes `2dsphere` indexes.
- **`routing.service.js`**: The abstraction layer. Reads `process.env.ROUTING_PROVIDER` and returns the correct provider instance. It normalizes provider output into a standard `{ geometry, distanceMeters, durationSeconds, provider }` object.
- **`providers/mockRoutingProvider.js`**: A mock provider returning a predictable curved route.
- **`route.service.js`**: Core business logic for saving routes to the DB and querying them via pagination.
- **`route.controller.js`**: HTTP handlers.
- **`route.routes.js`**: Express router defining endpoints (`POST /`, `GET /`, `GET /:routeId`).
- **`route.validation.js`**: Validates that clients provide strict GeoJSON `Point` coordinates for the origin and destination when requesting a route.

---

## 5. Trajectory Data Flow

### GPS Ingestion Flow
```text
POST /api/trajectories
        ↓
`authMiddleware` + `roleMiddleware`
        ↓
`trajectory.validation.js` (validates speed, heading, GeoJSON, timestamp skew)
        ↓
`trajectory.service.js` -> Checks if Vehicle exists and status != OFFLINE/MAINTENANCE
        ↓
MongoDB `Trajectory` Collection (Saves point)
```

### Latest Location Flow
```text
GET /api/trajectories/AMB-001/latest
        ↓
Service resolves Vehicle ObjectId
        ↓
MongoDB Query: find({ vehicle }).sort({ timestamp: -1 }).limit(1)
(Executes instantly via compound index)
```

---

## 6. Route Creation Flow

```text
POST /api/routes
        ↓
`authMiddleware` (Verifies JWT) + `roleMiddleware` (CONTROL_ROOM, ADMIN)
        ↓
`route.validation.js` (Validates origin/destination GeoJSON Points)
        ↓
`route.controller.js` -> `route.service.js` (Verifies Vehicle and Emergency exist)
        ↓
`routing.service.js` (Selects Provider e.g. MOCK or GOOGLE)
        ↓
`mockRoutingProvider.js` (Calculates geometry, distance, duration)
        ↓
`route.service.js` (Saves the normalized route to MongoDB)
        ↓
Returns standardized Route document to client
```

---

## 7. Database Relationships

```text
User
 │
 ├── creates → Emergency
 │
 ├── reports → Incident
 │
 └── creates → Route

Vehicle
 │
 └── (has many) → Trajectory

Emergency
 │
 ├── assignedVehicle → Vehicle
 │
 └── (has many) → Route

Incident
 │
 └── optionally references → Emergency
```

---

## 8. GeoJSON & Coordinate Ordering

Coordinates are stored strictly as `[longitude, latitude]`. This is the standard mandated by the GeoJSON spec and MongoDB. If stored as `[latitude, longitude]`, MongoDB's `2dsphere` indexes will calculate distances incorrectly or fail entirely.

---

## 9. Security Walkthrough

### Backend Security
- **Pagination Bounds**: The Trajectory History endpoint hard-caps the `limit` query param to 100 to prevent OOM-crashing the Node server.
- **Clock Skew Prevention**: GPS payloads containing timestamps far into the future are rejected.
- **Vehicle Status Gating**: GPS endpoints reject data for vehicles in `OFFLINE` or `MAINTENANCE` status.
- **Route Engine Ownership**: Routes are generated server-side via routing providers; clients cannot supply arbitrary GeoJSON geometry.
- **External API Key Isolation**: Routing API keys are strictly in `process.env` and never exposed to clients.
- **Generic Error Responses**: External routing errors yield `502 Bad Gateway` so provider signatures aren't leaked.

### Frontend Security
- **Prototype Notice**: Login and signup pages clearly display "Prototype UI only" warnings with `ShieldCheck` icons.
- **No Real Data**: All data is mock — no real GPS, medical data, or user accounts.
- **Auth Bypass**: Login/signup forms redirect directly to the dashboard without verification.

---

## 10. Testing Walkthrough

### Backend Testing (curl / Postman)

1. **Login** to get your HTTP-only cookie.
2. **Ingest GPS Point**:
   ```json
   POST /api/trajectories
   {
     "vehicleId": "AMB-001",
     "location": {
       "type": "Point",
       "coordinates": [77.5946, 12.9716]
     },
     "speed": 65,
     "heading": 90,
     "timestamp": "2026-08-27T10:00:00.000Z",
     "source": "SIMULATOR"
   }
   ```
3. **Get Latest Point**:
   ```
   GET /api/trajectories/AMB-001/latest
   ```
4. **Get History (Paginated)**:
   ```
   GET /api/trajectories/AMB-001?page=1&limit=50
   ```

### Frontend Testing
1. Run `npm run dev` from the project root.
2. Visit `http://localhost:3000` for the landing page.
3. Click "Register Now" or "View Driver Dashboard" to explore.
4. The driver dashboard shows a complete demo scenario with mock data.

### GeoAgent AI Testing
1. Set `GEMINI_API_KEY` in `server/.env`.
2. Run `node server/modules/geoagents/geoAgent.service.js`.
3. The script logs Gemini's function call request, mock route results, and the AI's final recommendation.

---

## 11. Future Connections

### Frontend ↔ Backend Integration
- Replace `USE_MOCK = true` in `lib/api.ts` with a real `fetch()` to the backend.
- Connect login/signup forms to `POST /api/auth/login` and `/register`.
- Replace the SVG map placeholder with Leaflet or Mapbox.

### Real-Time Updates
- Socket.IO for live dashboard updates (new GPS points, route changes, incident alerts).

### GeoAgent AI Integration
- Create Express endpoints for GeoAgent AI (e.g., `POST /api/geoagent/recommend`).
- Wire dashboard's "Refresh Route" button to the AI endpoint.
- Replace hardcoded mock routes in `geoAgent.tools.js` with real routing provider calls.

### Route Deviation Detection
- Compare `recent` trajectory points against the assigned route geometry.
- Use `geospatial.service.js` functions (distanceToRoute, nearestPointOnRoute) to detect deviations.
- Trigger GeoAgent AI recommendations when deviation exceeds a threshold.
