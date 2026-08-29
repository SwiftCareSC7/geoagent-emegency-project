# GeoAgentic Emergency Response System

The GeoAgentic Emergency Response System (SwiftCare GeoAgent) is a platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic or accidents, calculate delays, recommend alternative routes, and provide AI agent decision support to control room operators.

## Current Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Security**: bcryptjs, jsonwebtoken, helmet, cors
- **Geospatial**: @turf/turf
- **AI**: @google/genai (Gemini SDK)
- **Environment**: dotenv, cookie-parser

### Frontend (SwiftCare GeoAgent Prototype)
- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS v4, tw-animate-css, shadcn
- **UI Primitives**: @base-ui/react, class-variance-authority
- **Icons**: Lucide React
- **Fonts**: Inter, Plus Jakarta Sans (Google Fonts)
- **Analytics**: @vercel/analytics

## Current Features

- **Backend Foundation**            COMPLETED
- **Authentication**                COMPLETED
- **Vehicle Management**            COMPLETED
- **Emergency Management**          COMPLETED
- **Incident Management**           COMPLETED
- **GPS Tracking**                  COMPLETED
- **Routing**                       COMPLETED
- **Frontend Landing Page**         COMPLETED
- **Frontend Login / Signup**       COMPLETED (prototype, no auth)
- **Frontend Driver Dashboard**     COMPLETED (mock data)
- **GeoAgent AI (Gemini PoC)**      COMPLETED (standalone)
- **Live Map Integration**          PLANNED
- **Frontend ↔ Backend Connect**    PLANNED
- **Real-Time (Socket.IO)**         PLANNED
- **Route Deviation Detection**     PLANNED
- **Traffic Analysis**              PLANNED
- **Control Room Dashboard**        PLANNED

## Project Structure

The project has three codebases in a monorepo layout:

| Directory | Purpose |
|---|---|
| `app/`, `components/`, `lib/`, `public/` | Active Next.js frontend (SwiftCare prototype) |
| `server/` | Express.js backend API |
| `geoagent-emergency-project/` | Legacy Next.js scaffold (unused) |

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
   JWT_EXPIRES_IN=7d

   # Routing
   ROUTING_PROVIDER=mock
   # GOOGLE_MAPS_API_KEY=your_key
   # MAPBOX_ACCESS_TOKEN=your_token

   # GeoAgent AI
   # GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Development Server**:
   ```bash
   npm run dev
   ```

4. **Production Start**:
   ```bash
   npm start
   ```

## Frontend Setup

1. **Install dependencies** (from the project root):
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend is a prototype UI — it uses mock data and does not require the backend to be running.

## Frontend Pages

| Route | Component | Description |
|---|---|---|
| `/` | `LandingPage` | Hero section, feature cards, contact info |
| `/login` | `LoginPage` | Login form (prototype — any credentials work) |
| `/signup` | `SignupPage` | Registration with driver/operator role selector |
| `/driver/dashboard` | `DriverDashboardPage` | Real-time route status, ETA, deviation analysis, GeoAgent recommendation |

> **Note**: The frontend is a prototype UI. Authentication is not implemented — login and signup redirect directly to the driver dashboard.

## API Documentation

*Base URL: `http://localhost:5000`*

### Health
- `GET /api/health` 
  - **Auth**: None
  - **Returns**: Server health status

### Authentication (`/api/auth`)
- `POST /register`
  - **Auth**: None
  - **Body**: `{ name, email, password }`
- `POST /login`
  - **Auth**: None
  - **Body**: `{ email, password }`
  - **Returns**: HTTP-only JWT Cookie
- `POST /logout`
  - **Auth**: None
- `GET /me`
  - **Auth**: Required
  - **Returns**: Current authenticated user details

### Vehicles (`/api/vehicles`)
- `POST /`
  - **Auth**: ADMIN
  - **Body**: `{ vehicleId, registrationNumber, type, driverName, capacity }`
- `GET /`
  - **Auth**: CONTROL_ROOM, ADMIN
- `GET /:vehicleId`
  - **Auth**: CONTROL_ROOM, ADMIN
- `PATCH /:vehicleId`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: Allowlist updates (`status`, `capacity`, etc.)
- `DELETE /:vehicleId`
  - **Auth**: ADMIN

### Emergencies (`/api/emergencies`)
- `POST /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: `{ type, priority, callerName, callerContact, description, location, destination }` (Requires valid GeoJSON Points)
- `GET /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Query**: `?status=PENDING&priority=CRITICAL`
- `GET /:emergencyId`
  - **Auth**: CONTROL_ROOM, ADMIN
- `PATCH /:emergencyId`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: Allowlist updates (`status`, `priority`, etc.)
- `PATCH /:emergencyId/assign`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: `{ vehicleId }`
- `DELETE /:emergencyId`
  - **Auth**: ADMIN (Soft-deletes the emergency)

### Incidents (`/api/incidents`)
- `POST /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: `{ type, severity, description, location }` (Requires valid GeoJSON Point)
- `GET /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Query**: `?status=ACTIVE&severity=HIGH`
- `GET /:incidentId`
  - **Auth**: CONTROL_ROOM, ADMIN
- `PATCH /:incidentId`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: Allowlist updates
- `DELETE /:incidentId`
  - **Auth**: ADMIN (Soft-deletes the incident)

### GPS Trajectories (`/api/trajectories`)
- `POST /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: `{ vehicleId, location, speed, heading, timestamp, source }`
  - **Note**: Ingests GeoJSON GPS points. `speed` must be `>= 0` and `<= 250`. `heading` between `0` and `360`. Vehicle must be active.
- `GET /:vehicleId/latest`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Returns**: The absolute latest GPS point for the given vehicle based on timestamp.
- `GET /:vehicleId`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Query**: `?page=1&limit=50` (Limit is hard-capped at 100 for safety).
  - **Returns**: Historical trajectory arrays.
- `GET /:vehicleId/recent`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Query**: `?limit=20`
  - **Returns**: Last N trajectory points. Optimized for live map display.

### Routing (`/api/routes`)
- `POST /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Body**: `{ emergencyId, vehicleId, routeType, origin, destination }`
  - **Note**: The backend dynamically connects to the `ROUTING_PROVIDER` to generate and persist a GeoJSON `LineString`.
- `GET /`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Query**: Filters like `?emergencyId=...`
- `GET /:routeId`
  - **Auth**: CONTROL_ROOM, ADMIN
- `GET /api/emergencies/:emergencyId/routes`
  - **Auth**: CONTROL_ROOM, ADMIN
  - **Returns**: All routes attached to a specific emergency.