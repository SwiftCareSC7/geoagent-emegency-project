# GeoAgentic Emergency Response System (Backend)

The **GeoAgentic Emergency Response System** is an intelligent decision-support and dispatch platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify spatial causes (such as traffic bottlenecks or nearby accidents), predict delays, run advisory Gemini AI reasoning, and evaluate authoritative operational decisions in real time.

---

## 1. System Architecture

```text
                                CLIENT / OPERATOR UI
                                         │
                          ┌──────────────┴──────────────┐
                          ▼                             ▼
                  REST API (Express)           Real-Time (Socket.IO)
                          │                             │
                          ▼                             │
               Authentication & RBAC                    │
          (JWT in Cookie / Bearer Header)               │
                          │                             │
                          ▼                             │
                 Domain Feature Modules                 │
  ┌───────────────────────┼───────────────────────┐     │
  │                       │                       │     │
  ▼                       ▼                       ▼     │
Vehicles             Emergencies              Incidents │
  │                       │                       │     │
  ▼                       ▼                       │     │
Trajectories           Routes                     │     │
  │                       │                       │     │
  └───────────┬───────────┘                       │     │
              ▼                                   │     │
       Deviation Engine                           │     │
              │                                   │     │
              ▼                                   │     │
       Traffic Engine                             │     │
              │                                   │     │
              ▼                                   │     │
      ETA & Delay Engine                          │     │
              │                                   │     │
              └───────────────────┬───────────────┘     │
                                  ▼                     │
                        Situation Analysis              │
                                  │                     │
                                  ▼                     │
                        GeoAgent AI (Gemini)            │
                            (Advisory)                  │
                                  │                     │
                                  ▼                     │
                      Decision Engine (Rules)           │
                           (Authoritative)              │
                                  │                     │
                                  ▼                     │
                        Orchestration Service           │
                                  │                     │
                    ┌─────────────┴─────────────┐       │
                    ▼                           ▼       ▼
              MongoDB Database          Socket.IO Broadcast
```

---

## 2. Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js + Node HTTP Server
- **Real-Time Push**: Socket.IO
- **Database & ODM**: MongoDB + Mongoose
- **Security & Authentication**: bcryptjs (12 salt rounds), jsonwebtoken, helmet, cors, cookie-parser
- **Geospatial Analytics**: @turf/turf (WGS84, GeoJSON Point & LineString)
- **AI Decision Support**: @google/genai (Google Gemini 2.5 Flash SDK with controlled tool calling)
- **Configuration & Utilities**: dotenv, crypto

---

## 3. Implemented Feature Status

| Feature Area | Status | Key Capabilities |
|---|---|---|
| **Authentication** | **IMPLEMENTED** | JWT, bcrypt hashing, dual transport (HTTP-only cookies + Bearer header) |
| **RBAC** | **IMPLEMENTED** | `ADMIN`, `CONTROL_ROOM`, `DRIVER`, `PARAMEDIC` role verification |
| **Vehicles** | **IMPLEMENTED** | Fleet registry, CRUD, unique `vehicleId`, compound status index |
| **Emergencies** | **IMPLEMENTED** | Intake triage, vehicle dispatch assignment, `2dsphere` spatial indexing |
| **Incidents** | **IMPLEMENTED** | Road hazard reporting, corridor proximity tagging, soft deletions |
| **Trajectories** | **IMPLEMENTED** | GPS ingestion, compound index `{ vehicle: 1, timestamp: -1 }`, bounded pagination |
| **Geospatial & Routing** | **IMPLEMENTED** | Turf.js calculations, GeoJSON LineStrings, provider abstraction (Mock/Google/Mapbox) |
| **Deviation Detection** | **IMPLEMENTED** | Cross-track distance, bearing diff, GPS jitter filtering, threshold classification |
| **Traffic & ETA** | **IMPLEMENTED** | Speed blending, zero-speed guards, congestion ratios, arithmetic delays |
| **GeoAgent AI** | **IMPLEMENTED** | Gemini function-calling, strict JSON schema, prompt injection defense, fallback |
| **Decision Engine** | **IMPLEMENTED** | Deterministic rules, state machine (`PENDING_OPERATOR_ACTION` → `APPROVED` / `REJECTED`), SHA-256 idempotency |
| **Real-Time Push** | **IMPLEMENTED** | Socket.IO handshake JWT auth, room isolation (`control-room`, `emergency`, `vehicle`) |
| **Orchestration** | **IMPLEMENTED** | Unified pipeline execution, 3-tier epistemic breakdown (`OBSERVED/INFERRED/UNKNOWN`) |
| **Automated Testing**| **IMPLEMENTED** | 6 automated test suites (49 passing assertions, 100% pass rate) |

---

## 4. Quick Start & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher (local or MongoDB Atlas)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/iwantcupcake/geoagent-emegency-project.git
cd geoagent-emegency-project/server

# 2. Install backend dependencies
npm install

# 3. Create environment configuration
cp .env.example .env
```

### Environment Setup (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/geoagent-emergency
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_long_random_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ROUTING_PROVIDER=mock
TRAFFIC_PROVIDER=mock
```
*(For complete environment reference, see [`docs/environment.md`](docs/environment.md)).*

### Running the Server
```bash
# Start in development mode (with nodemon)
npm run dev

# Start in production mode
npm start
```

### Health Check
```bash
curl http://localhost:5000/api/health
# Response: {"success":true,"message":"GeoAgentic backend is running"}
```

---

## 5. Running Automated Test Suites

The test suite validates the complete backend stack across 6 comprehensive suites:

```bash
cd server

# Run all 6 test suites
node test-part7.js   # Deviation, Traffic, ETA, Situation Analysis
node test-part8.js   # GeoAgent AI Function-Calling & Fallbacks
node test-part9.js   # Real-Time Socket.IO Handshake & Room Broadcasting
node test-part10.js  # Authoritative Decision & Dispatch Engine
node test-part11.js  # Full Backend Integration & Epistemic Breakdown
node test-part12.js  # Hardening, Security, Status Codes & Query Bounds
```
**Audit Result**: 49 / 49 tests passing (100% pass rate).

---

## 6. API & Documentation Reference

Complete API, database, and event documentation is available in the `docs/` directory:

- 📘 **[OpenAPI 3.0 Specification](docs/openapi.yaml)**: Complete REST API schema for all 40+ endpoints.
- ⚡ **[Socket.IO Event Reference](docs/socket-events.md)**: Room isolation, handshake auth, and payload structures.
- 🗄️ **[Database Architecture Reference](docs/database.md)**: Mongoose schemas, relationships, indexes, and GeoJSON rules.
- ⚙️ **[Environment Reference](docs/environment.md)**: Required vs optional configuration variables.
- 📖 **[Developer Walkthrough](WALKTHROUGH.md)**: Part-by-part technical implementation guide.
- 🧠 **[AI Memory](AI_MEMORY.md)**: Machine-readable repository state and system boundaries.

---

## 7. Frontend Integration & Handoff Guide

For developers connecting the frontend dashboard:

### 1. Authentication
Send credentials to `POST /api/auth/login`. The server returns an HTTP-only `token` cookie and a bearer token in the JSON response:
```javascript
const res = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'operator@geoagent.local', password: 'SecurePassword123!' })
});
const { token, user } = await res.json();
```

### 2. Calling REST Endpoints
Pass `credentials: 'include'` for cookie auth or `Authorization: Bearer <token>`:
```javascript
// Trigger full end-to-end situation analysis for an emergency
const analysisRes = await fetch('http://localhost:5000/api/orchestration/emergencies/EMG-0001/analyze', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await analysisRes.json();
```

### 3. Subscribing to Real-Time Push Events
Connect to Socket.IO and join the control room:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token },
  transports: ['websocket']
});

socket.on('connect', () => {
  socket.emit('room:join', { room: 'control-room' });
  socket.emit('room:join', { room: 'emergency:EMG-0001' });
});

socket.on('deviation.detected', (payload) => console.log('Deviation Alert:', payload));
socket.on('decision.created', (payload) => console.log('New Decision Action:', payload));
```

---

## 8. Production Considerations

| Area | Status | Production Recommendation |
|---|---|---|
| **Live Routing** | `mock` by default | Set `ROUTING_PROVIDER=google` or `mapbox` with valid API keys in `.env` |
| **Live Traffic** | `mock` by default | Set `TRAFFIC_PROVIDER=google` with Google Maps key for live corridor congestion |
| **Trajectory Archiving**| Ingests to MongoDB | Configure MongoDB TTL index or time-series collection for multi-month data lifecycle |
| **Secret Management** | `.env` file | Store `JWT_SECRET` and `GEMINI_API_KEY` in AWS Secrets Manager / Vault / GCP Secret Manager |
| **Process Management** | Node HTTP Server | Deploy behind Nginx reverse proxy with PM2 or Kubernetes cluster |