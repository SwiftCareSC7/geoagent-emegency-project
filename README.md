# GeoAgentic Emergency Response System

The GeoAgentic Emergency Response System (SwiftCare GeoAgent) is an intelligent platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays, recommend alternative routes, and provide end-to-end AI agent decision support to control room operators via REST APIs and real-time push streaming.

## Current Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + Node HTTP Server
- **Real-Time Layer**: Socket.IO
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
- **Decision & Dispatch Engine** (Deterministic operational rules, severity, status state machine, human-in-the-loop approval, audit trail, real-time decision events, idempotency via situation hash)
- **Real-Time Event Streaming (Socket.IO)** (Live push updates for fleet, incidents, deviations, decisions, and AI recommendations)
- **Socket Handshake JWT Authentication & Authorization** (Restricted to `CONTROL_ROOM` and `ADMIN`)
- **Room Isolation & Management** (`control-room`, `emergency:${id}`, `vehicle:${id}`)
- **Full Backend Integration & Orchestration** (`POST /api/orchestration/emergencies/:emergencyId/analyze` executing end-to-end workflow)
- **Three-Tier Epistemic Breakdown** (`OBSERVED` facts vs `INFERRED` causes vs `UNKNOWN` data gaps)
- **Frontend Landing Page & Prototype Dashboard** (SwiftCare UI)

### PLANNED
- **Frontend ↔ Backend Live Integration** (Replacing mock adapter with live backend API + Socket.IO client)
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
│   │   ├── geoagents/                # Production GeoAgent AI module
│   │   ├── decisions/                # Decision & Dispatch Engine
│   │   ├── orchestration/            # End-to-End Orchestration Layer
│   │   │   ├── orchestration.constants.js  # Stages, event names, standard units
│   │   │   ├── orchestration.validation.js # Request validator & tampering defense
│   │   │   ├── orchestration.service.js    # Workflow coordinator & epistemic parser
│   │   │   ├── orchestration.controller.js # HTTP controller
│   │   │   └── orchestration.routes.js     # Protected router
│   │   └── realtime/                 # Real-time Socket.IO module
│   ├── shared/
│   │   ├── middleware/               # errorHandler, roleMiddleware
│   │   └── services/                 # geospatial.service.js (Turf.js)
│   ├── server.js                     # Express + HTTP Server + Socket.IO entry point
│   ├── test-part7.js                 # Part 7 tests
│   ├── test-part8.js                 # Part 8 tests
│   ├── test-part9.js                 # Part 9 tests
│   ├── test-part10.js                # Part 10 tests (Decision Engine)
│   ├── test-part11.js                # Part 11 tests (Full Backend Integration)
│   └── .env.example
├── geoagent-emergency-project/       # Legacy Next.js scaffold (unused)
├── AI_MEMORY.md
├── README.md
├── CHANGELOG.md
└── WALKTHROUGH.md
```

## End-to-End Orchestration Flow

```text
POST /api/orchestration/emergencies/:emergencyId/analyze
                      │
                      ▼
            Auth & Role Validation
                      │
                      ▼
         Load & Validate Emergency
                      │
         Load & Validate Assigned Vehicle
                      │
         Load & Validate Active Route
                      │
         Load Latest GPS Trajectory
                      │
         Run Deterministic Spatial Analysis
      (Deviation, Progress, Traffic, Incidents, ETA)
                      │
                      ▼
        Run GeoAgent AI (Advisory)
                      │
                      ▼
        Run Decision Engine (Authoritative)
                      │
                      ▼
    Generate Three-Tier Epistemic Breakdown
       (OBSERVED, INFERRED, UNKNOWN)
                      │
                      ▼
      Emit Real-Time Workflow Events
                      │
                      ▼
       Normalized Operational Response
```

## Backend Setup & Testing

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your credentials:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/geoagent-emergency
   CLIENT_URL=http://localhost:3000
   JWT_SECRET=your_jwt_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run Automated Test Suites**:
   ```bash
   # Run all test suites
   node test-part7.js
   node test-part8.js
   node test-part9.js
   node test-part10.js
   node test-part11.js
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```