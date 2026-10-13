# SwiftCare GeoAgent — Local Development & Contributing Guide

This guide walks you through setting up a complete local development environment for the **SwiftCare GeoAgent Emergency Response System**, including the Next.js frontend, Express backend, MongoDB persistence, and optional Python V2X routing engine.

---

## 1. Prerequisites & Environment Runtimes

Before running the system locally, ensure you have the following installed:

| Requirement | Minimum Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `v20.0.0` | `v22.x` or `v24.x` | `node -v` |
| **npm** | `v10.0.0` | `v10.8+` | `npm -v` |
| **MongoDB** | `v7.0.0` | MongoDB Atlas or Local 7.0+ | `mongod --version` or Docker |
| **Python** *(optional)* | `3.10` | `3.11+` | `python3 --version` |

> [!NOTE]
> MongoDB is required for backend services and persistence. You can either run MongoDB locally on `mongodb://127.0.0.1:27017/geoagent-emergency` or provide a MongoDB Atlas connection string.

---

## 2. Step-by-Step Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/SwiftCareSC7/geoagent-emegency-project.git
cd geoagent-emegency-project
```

### Step 2: Configure Environment Variables
Create the local environment files from the provided examples:

```bash
# Frontend environment
cp .env.example .env.local

# Backend environment
cp server/.env.example server/.env
```

Key variables to verify:
- In `.env.local`:
  ```ini
  NEXT_PUBLIC_API_URL=http://localhost:5001/api
  NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
  ```
- In `server/.env`:
  ```ini
  PORT=5001
  MONGO_URI=mongodb://127.0.0.1:27017/geoagent-emergency
  JWT_SECRET=development-only-secret-replace-in-production-min-32-chars
  CLIENT_URL=http://localhost:3000
  AI_PROVIDER=auto
  ```

*(Optional AI Keys: `OPENROUTER_API_KEY` or `OPENCODE_API_KEY` for live LLM epistemic reasoning. If omitted, the system seamlessly uses deterministic rule-based fallbacks).*

### Step 3: Install Frontend Dependencies
```bash
npm install
```

### Step 4: Install Backend Dependencies
```bash
cd server
npm install
cd ..
```

### Step 5: (Optional) Python V2X Routing Engine Setup
If you want to run the native microscopic Python spatial engine (otherwise pure JS fallback handles all V2X math):
```bash
cd routing-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

---

## 3. Seeding Demo Scenarios

SwiftCare includes pre-packaged Bengaluru emergency corridors (MG Road, Indiranagar, Domlur Flyover, Indiranagar 100ft Road, Manipal Hospital HAL):

```bash
# Seed initial demo emergencies, vehicles, and road incidents
npm run seed:demo

# Or reset existing collections and re-seed cleanly
npm run seed:demo:reset
```

Default seeded credentials:
- **Control Room Dispatcher**: `dispatcher@swiftcare.local` / `DispatchPass123!`
- **Ambulance Driver (AMB-01)**: `driver01@swiftcare.local` / `DriverPass123!`
- **Paramedic**: `paramedic@swiftcare.local` / `ParamedicPass123!`
- **System Administrator**: `admin@swiftcare.local` / `AdminPass123!`

---

## 4. Running the Development Servers

You will typically run the backend and frontend in two separate terminal sessions:

### Terminal 1: Backend Server (Port 5001)
```bash
cd server
npm run dev
# Starts Express REST & Socket.IO server on http://localhost:5001
```

### Terminal 2: Next.js Frontend (Port 3000)
```bash
npm run dev
# Starts Next.js development server on http://localhost:3000
```

### Terminal 3 (Optional): Python V2X Service (Port 8000)
```bash
cd routing-engine
source venv/bin/activate
python main.py
```

### Local Application Portals
Once running, open your browser to:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Control Room Dashboard**: [http://localhost:3000/control-room](http://localhost:3000/control-room)
- **Ambulance Driver HUD**: [http://localhost:3000/driver/dashboard](http://localhost:3000/driver/dashboard)
- **Paramedic Triage**: [http://localhost:3000/paramedic](http://localhost:3000/paramedic)
- **What-If Scenario Simulator**: [http://localhost:3000/diff](http://localhost:3000/diff)
- **Backend Health Check**: [http://localhost:5001/api/health/live](http://localhost:5001/api/health/live)

---

## 5. Development Scripts Reference

| Command | Working Directory | Action |
|---|---|---|
| `npm run dev` | Root | Starts Next.js development server on port 3000 |
| `npm run build` | Root | Compiles production Next.js application bundle |
| `npm run lint` | Root | Runs TypeScript static typecheck (`tsc --noEmit`) |
| `npm run seed:demo` | Root | Seeds demo emergencies and vehicles into MongoDB |
| `npm run seed:demo:reset` | Root | Wipes demo collections and re-seeds scenarios |
| `npm run test` | Root | Runs Playwright tests on `lib/` components |
| `npm run test:e2e` | Root | Runs Playwright end-to-end browser specifications |
| `npm run dev` | `server/` | Starts Express server with nodemon file watcher |
| `npm start` | `server/` | Starts Express server in production Node mode |

---

## 6. Testing & Quality Assurance Verification

SwiftCare enforces comprehensive algorithmic and integration test suites:

### 1. TypeScript Static Typecheck
```bash
npx tsc --noEmit
# Expected: Exits with 0 errors
```

### 2. GeoAgent AI & Algorithmic Unit Tests
```bash
node --test tests/geoagent*.test.mjs
# Expected: 25 / 25 passed
# Tests: Tool calling loop, price guards, model fallback, prompt injection defense
```

### 3. Coordinate Conversion & Polyline Safety
```bash
node server/test-coordinate-conversions.js
# Expected: 5 / 5 passed
# Tests: Lat/lng inversion guard, Google polyline decoding, anti-straight-line routing
```

### 4. V2X Clearance & Reroute State Machine
```bash
node server/test-clearance-v2x.js
# Expected: 100% passed
# Tests: Dynamic signal preemption, civilian yield states, candidate verification
```

### 5. 10-Tier Operational Intelligence Pipeline
```bash
node server/test-v2x-corridor-pipeline.js
# Expected: 11 / 11 passed
# Tests: End-to-end telemetry ingestion ➔ deviation ➔ V2X ➔ GeoAgent ➔ Decision Engine
```

---

## 7. Troubleshooting Common Issues

### Issue 1: MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
- **Cause**: Local MongoDB daemon is not running.
- **Fix**: Start MongoDB locally (`brew services start mongodb-community` on macOS, or `docker run -d -p 27017:27017 mongo:7`). Alternatively, set `MONGO_URI` in `server/.env` to a MongoDB Atlas cluster URI.

### Issue 2: Cross-Origin (CORS) Errors on Socket.IO or REST
- **Cause**: Frontend origin does not match backend `CLIENT_URL`.
- **Fix**: Verify `server/.env` contains `CLIENT_URL=http://localhost:3000`.

### Issue 3: Port 5001 Already in Use
- **Cause**: macOS AirPlay Receiver occasionally binds to port 5000/5001, or another process is running.
- **Fix**: Disable AirPlay Receiver in System Settings > General > AirDrop & AirPlay, or run `lsof -i :5001` and terminate the orphaned process.

### Issue 4: GeoAgent AI Rate Limit (429) or Provider Timeout
- **Behavior**: The system gracefully falls back to deterministic rule-based decisions (`fallback: true`).
- **Fix**: No action required. If desired, configure `AI_PROVIDER=auto` or supply an alternate free-tier model in `server/.env`.
