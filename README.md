# GeoAgentic Emergency Response System

The GeoAgentic Emergency Response System (SwiftCare GeoAgent) is an intelligent platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays, recommend alternative routes, and provide AI agent decision support to control room operators.

## Current Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
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
- **Frontend Landing Page & Prototype Dashboard** (SwiftCare UI)

### PLANNED
- **Real-Time WebSocket Updates** (Socket.IO for live driver and operator dashboards)
- **Decision Engine Execution Layer** (Operational action dispatch and approval workflows)
- **Frontend ↔ Backend Live Integration** (Replacing mock adapter with live backend API)
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
│   │   └── geoagents/                # Production GeoAgent AI module
│   │       ├── geoagent.constants.js # Constants, action & cause enums
│   │       ├── geoagent.schemas.js   # JSON validation & sanitization
│   │       ├── geoagent.tools.js     # Tool declarations & handlers
│   │       ├── geoagent.validation.js# Request validators
│   │       ├── geoagent.controller.js# HTTP controllers
│   │       ├── geoagent.routes.js    # Express route definitions
│   │       ├── geoAgent.service.js   # Gemini tool orchestration & fallback
│   │       └── prompts/
│   │           └── geoagent.system.js# System prompt & guardrails
│   ├── shared/
│   │   ├── middleware/               # errorHandler, roleMiddleware
│   │   └── services/                 # geospatial.service.js (Turf.js)
│   ├── server.js                     # Express entry point
│   ├── test-part7.js                 # Part 7 tests
│   ├── test-part8.js                 # Part 8 tests
│   └── .env.example
├── geoagent-emergency-project/       # Legacy Next.js scaffold (unused)
├── AI_MEMORY.md
├── README.md
├── CHANGELOG.md
└── WALKTHROUGH.md
```

## Backend Setup

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and configure:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   JWT_SECRET=replace_with_a_long_random_secret
   JWT_EXPIRES_IN=30d

   # Routing
   ROUTING_PROVIDER=mock
   # GOOGLE_MAPS_API_KEY=your_key
   # MAPBOX_ACCESS_TOKEN=your_token

   # Traffic
   TRAFFIC_PROVIDER=mock
   DEFAULT_FREE_FLOW_SPEED_KMH=45

   # Deviation Thresholds
   ROUTE_WARNING_DISTANCE_METERS=50
   ROUTE_DEVIATION_DISTANCE_METERS=100
   ROUTE_CRITICAL_DISTANCE_METERS=250
   BEARING_WARNING_DEGREES=30
   BEARING_DEVIATION_DEGREES=60
   GPS_STABILITY_WINDOW=3

   # Incident Proximity
   INCIDENT_PROXIMITY_RADIUS_METERS=500

   # GeoAgent AI
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. **Run Unit & Integration Tests**:
   ```bash
   node test-part7.js
   node test-part8.js
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## API Documentation

*Base URL: `http://localhost:5000`*

### Health
- `GET /api/health` — Server health status (Public)

### Authentication (`/api/auth`)
- `POST /register` — Register new user `{ name, email, password }`
- `POST /login` — Login with credentials, sets HTTP-only cookie
- `POST /logout` — Clear auth cookie
- `GET /me` — Current authenticated user details

### Vehicles (`/api/vehicles`)
- `POST /` — Create vehicle (`ADMIN`)
- `GET /` — List vehicles (`CONTROL_ROOM`, `ADMIN`)
- `GET /:vehicleId` — Get vehicle details (`CONTROL_ROOM`, `ADMIN`)
- `PATCH /:vehicleId` — Update vehicle (`CONTROL_ROOM`, `ADMIN`)
- `DELETE /:vehicleId` — Delete vehicle (`ADMIN`)

### Emergencies (`/api/emergencies`)
- `POST /` — Create emergency with GeoJSON location (`CONTROL_ROOM`, `ADMIN`)
- `GET /` — List emergencies with query filters
- `GET /:emergencyId` — Get emergency details
- `PATCH /:emergencyId` — Update emergency details
- `PATCH /:emergencyId/assign` — Assign vehicle to emergency
- `DELETE /:emergencyId` — Soft-delete emergency (`ADMIN`)
- `GET /:emergencyId/routes` — Get routes attached to emergency

### Incidents (`/api/incidents`)
- `POST /` — Report incident with GeoJSON location (`CONTROL_ROOM`, `ADMIN`)
- `GET /` — List active incidents
- `GET /:incidentId` — Get incident details
- `PATCH /:incidentId` — Update incident status/severity
- `DELETE /:incidentId` — Soft-delete incident (`ADMIN`)

### GPS Trajectories (`/api/trajectories`)
- `POST /` — Ingest GPS point `{ vehicleId, location, speed, heading, timestamp, source }`
- `GET /:vehicleId/latest` — Absolute latest GPS point for vehicle
- `GET /:vehicleId` — Paginated GPS history (`?page=1&limit=50`)
- `GET /:vehicleId/recent` — Last N GPS points for live map display (`?limit=20`)

### Routing (`/api/routes`)
- `POST /` — Generate and save a new route `{ emergencyId, vehicleId, routeType, origin, destination }`
- `GET /` — List routes with filters
- `GET /:routeId` — Get route details
- `GET /:routeId/analysis` — Get complete situation analysis for a specific route

### Deviation Engine (`/api/deviation`)
- `GET /vehicle/:vehicleId` — Standalone deviation analysis for an active vehicle

### Traffic (`/api/traffic`)
- `GET /location?lng=77.5946&lat=12.9716` — Get traffic conditions at coordinates

### Situation Analysis (`/api/analysis`)
- `GET /vehicle/:vehicleId` — Comprehensive vehicle situation analysis (Deviation + Progress + Traffic + Incidents + ETA + Delay + Evidence)

### GeoAgent AI Decision Engine (`/api/geoagent`)
- `POST /analyze` — Trigger AI decision analysis for an emergency:
  ```json
  {
    "emergencyId": "EMG-0001"
  }
  ```
- `POST /analyze/vehicle/:vehicleId` — Trigger AI decision analysis for a vehicle

#### Example GeoAgent AI Response:
```json
{
  "success": true,
  "message": "GeoAgent emergency analysis generated",
  "data": {
    "status": "ANALYZED",
    "vehicleId": "AMB-001",
    "emergencyId": "EMG-0001",
    "assessment": {
      "routeStatus": "DEVIATED",
      "likelyCause": "ACCIDENT_INDUCED_CONGESTION",
      "confidence": 0.92
    },
    "eta": {
      "currentMinutes": 15,
      "originalMinutes": 10,
      "delayMinutes": 5
    },
    "recommendation": {
      "action": "REROUTE",
      "routeId": "ROUTE-0002",
      "summary": "Reroute via bypass to avoid high severity accident corridor"
    },
    "backup": {
      "recommended": false,
      "reason": "Primary ambulance delay is manageable via Route B bypass",
      "candidateVehicleId": null
    },
    "observations": {
      "observed": [
        "Ambulance is 182m from planned route",
        "Traffic is heavy with congestion ratio 0.73",
        "High-severity accident reported 350m ahead on primary route"
      ],
      "inferred": [
        "Driver deviated to avoid accident-induced queue"
      ],
      "unknown": [
        "Driver audio communication"
      ]
    },
    "reasoning": "The ambulance is currently experiencing heavy congestion due to an accident on the primary corridor. Taking Route B via the bypass saves 5 minutes and avoids the bottleneck.",
    "analyzedAt": "2026-08-29T18:00:00.000Z"
  }
}
```