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
- **AI**: @google/genai (Gemini SDK)
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
- **Frontend Landing Page & Prototype Dashboard** (SwiftCare UI)
- **GeoAgent AI PoC** (Gemini function-calling script)

### PLANNED
- **Full GeoAgent Express API Integration** (`POST /api/geoagent/recommend`)
- **Frontend ↔ Backend Live Integration** (replacing mock adapter with live API)
- **Real-Time WebSocket Updates** (Socket.IO for live driver and operator dashboards)
- **Live Traffic API Providers** (Google Routes / Mapbox Traffic integration)
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
│   │   └── geoagents/                # GeoAgent AI PoC (Gemini)
│   ├── shared/
│   │   ├── middleware/               # errorHandler, roleMiddleware
│   │   └── services/                 # geospatial.service.js (Turf.js)
│   ├── server.js                     # Express entry point
│   ├── test-part7.js                 # Unit & logic verification tests
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
   # GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run Unit & Logic Tests**:
   ```bash
   node test-part7.js
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Frontend Setup

1. **Install dependencies** (from project root):
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the SwiftCare prototype UI.

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

#### Example Situation Analysis Response:
```json
{
  "success": true,
  "message": "Vehicle situation analysis generated",
  "data": {
    "vehicleId": "AMB-001",
    "routeId": "ROUTE-9A4B3C2D",
    "emergencyId": "EMG-0001",
    "analyzedAt": "2026-08-29T18:00:00.000Z",
    "status": {
      "route": "DEVIATED",
      "traffic": "HEAVY"
    },
    "deviation": {
      "status": "DEVIATED",
      "distanceFromRouteMeters": 182.4,
      "nearestPointOnRoute": {
        "type": "Point",
        "coordinates": [77.5950, 12.9720]
      },
      "bearingDifferenceDegrees": 74.2,
      "vehicleBearing": 145.0,
      "routeBearing": 70.8,
      "gpsStability": "STABLE",
      "sustainedDeviation": true,
      "confidence": "HIGH"
    },
    "progress": {
      "progressPercentage": 42.5,
      "distanceAlongRouteMeters": 2125.0,
      "remainingDistanceMeters": 2875.0,
      "totalRouteDistanceMeters": 5000.0
    },
    "traffic": {
      "level": "HEAVY",
      "speedKmh": 12.0,
      "freeFlowSpeedKmh": 45.0,
      "congestionRatio": 0.73,
      "source": "MOCK"
    },
    "eta": {
      "currentMinutes": 15,
      "originalMinutes": 10,
      "remainingDistanceMeters": 2875.0,
      "estimatedSpeedKmh": 12.0,
      "status": "AVAILABLE"
    },
    "delay": {
      "delayMinutes": 5,
      "timeSavedMinutes": 0
    },
    "incidents": [
      {
        "incidentId": "INC-0001",
        "type": "ACCIDENT",
        "severity": "HIGH",
        "distanceFromVehicleMeters": 350.0,
        "distanceFromRouteMeters": 45.0
      }
    ],
    "evidence": [
      "ROUTE_DEVIATION",
      "HEAVY_TRAFFIC",
      "ACCIDENT_NEAR_ROUTE",
      "LOW_VEHICLE_SPEED"
    ]
  }
}
```