# GeoAgentic Emergency Response System — AI Memory

## 1. Project Purpose & Scope
The **GeoAgentic Emergency Response System** (SwiftCare GeoAgent) is an intelligent decision-support and dispatch platform designed to monitor emergency vehicle GPS trajectories, detect route deviations, identify causes such as traffic congestion or road hazards, calculate delays, recommend alternative routes, run advisory Gemini AI reasoning, and evaluate authoritative operational decisions in real time.

**Development Responsibility**:
- Scope: `BACKEND + DATABASE`
- Frontend: SwiftCare prototype (Next.js, TypeScript, Tailwind CSS) is decoupled from backend core development.

---

## 2. Technology Stack

### Backend Core
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js + Node HTTP Server
- **Real-Time Layer**: Socket.IO (room-isolated push streaming, handshake JWT authentication)
- **Database**: MongoDB (v6.0+)
- **ODM**: Mongoose (v8.4+)
- **Security**: `bcryptjs` (salt rounds: 12), `jsonwebtoken`, `helmet`, `cors`, `cookie-parser`
- **Geospatial Processing**: `@turf/turf` (v7.4+, WGS84, GeoJSON Point & LineString)
- **AI Decision Support**: `@google/genai` (v2.19+, Google Gemini 2.5 Flash SDK)
- **Utilities**: `dotenv`, `crypto`

---

## 3. System Architecture

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

## 4. Current File Structure

```text
/
├── server/
│   ├── config/
│   │   └── db.js                             # MongoDB connection & error handler
│   ├── modules/
│   │   ├── auth/                             # User auth, JWT, cookies, RBAC
│   │   ├── vehicles/                         # Vehicle fleet registry & CRUD
│   │   ├── emergencies/                      # Emergency calls & vehicle dispatch
│   │   ├── incidents/                        # Road hazards & spatial correlation
│   │   ├── trajectories/                     # GPS ingestion & trajectory history
│   │   ├── routes/                           # Routing engine & provider abstraction
│   │   ├── deviation/                        # Route deviation detection & jitter filtering
│   │   ├── traffic/                          # Traffic abstraction & mock provider
│   │   ├── analysis/                         # Situation analysis orchestrator & ETA engine
│   │   ├── geoagents/                        # Production GeoAgent AI (Gemini function-calling)
│   │   ├── decisions/                        # Authoritative Decision Engine & state machine
│   │   ├── orchestration/                    # End-to-end workflow service
│   │   └── realtime/                         # Socket.IO server & event broadcaster
│   ├── shared/
│   │   ├── middleware/                       # errorHandler (status-preserving), roleMiddleware
│   │   └── services/                         # geospatial.service.js (Turf.js)
│   ├── server.js                             # Express entry point & graceful shutdown
│   ├── test-part7.js                         # Part 7 test suite (Deviation, Traffic, ETA)
│   ├── test-part8.js                         # Part 8 test suite (GeoAgent AI)
│   ├── test-part9.js                         # Part 9 test suite (Real-time Socket.IO)
│   ├── test-part10.js                        # Part 10 test suite (Decision Engine)
│   ├── test-part11.js                        # Part 11 test suite (Full Integration & Orchestration)
│   ├── test-part12.js                        # Part 12 test suite (Hardening, Security & Boundaries)
│   └── .env.example
├── docs/
│   ├── openapi.yaml                          # Complete OpenAPI 3.0 REST Specification
│   ├── socket-events.md                      # Socket.IO Real-Time Events Reference
│   ├── database.md                           # Database Schemas, Indexes & Relationships
│   └── environment.md                        # Environment Variables Reference
├── AI_MEMORY.md
├── README.md
├── CHANGELOG.md
└── WALKTHROUGH.md
```

---

## 5. API Inventory

| Module | Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Public | None | Create operator account |
| **Auth** | `POST` | `/api/auth/login` | Public | None | Authenticate & issue HTTP-only JWT cookie |
| **Auth** | `POST` | `/api/auth/logout` | Private | Any | Invalidate session cookie |
| **Auth** | `GET` | `/api/auth/me` | Private | Any | Return authenticated user profile |
| **Vehicles** | `GET` | `/api/vehicles` | Private | `CONTROL_ROOM`, `ADMIN` | List all active vehicles |
| **Vehicles** | `GET` | `/api/vehicles/:vehicleId` | Private | `CONTROL_ROOM`, `ADMIN` | Get vehicle by business ID |
| **Vehicles** | `POST` | `/api/vehicles` | Private | `ADMIN` | Register new ambulance |
| **Vehicles** | `PATCH` | `/api/vehicles/:vehicleId` | Private | `CONTROL_ROOM`, `ADMIN` | Update vehicle status or driver |
| **Vehicles** | `DELETE` | `/api/vehicles/:vehicleId` | Private | `ADMIN` | Soft delete vehicle (`isDeleted: true`) |
| **Emergencies** | `GET` | `/api/emergencies` | Private | `CONTROL_ROOM`, `ADMIN` | List active emergency calls |
| **Emergencies** | `GET` | `/api/emergencies/:emergencyId` | Private | `CONTROL_ROOM`, `ADMIN` | Get emergency call details |
| **Emergencies** | `POST` | `/api/emergencies` | Private | `CONTROL_ROOM`, `ADMIN` | Create emergency call record |
| **Emergencies** | `PATCH` | `/api/emergencies/:emergencyId` | Private | `CONTROL_ROOM`, `ADMIN` | Update emergency status/destination |
| **Emergencies** | `PATCH` | `/api/emergencies/:emergencyId/assign` | Private | `CONTROL_ROOM`, `ADMIN` | Dispatch & assign vehicle |
| **Emergencies** | `DELETE` | `/api/emergencies/:emergencyId` | Private | `ADMIN` | Soft delete emergency |
| **Emergencies** | `GET` | `/api/emergencies/:emergencyId/routes` | Private | `CONTROL_ROOM`, `ADMIN` | List routes for emergency |
| **Emergencies** | `GET` | `/api/emergencies/:emergencyId/decisions`| Private | `CONTROL_ROOM`, `ADMIN` | List decisions for emergency |
| **Incidents** | `GET` | `/api/incidents` | Private | `CONTROL_ROOM`, `ADMIN` | List active road hazards |
| **Incidents** | `GET` | `/api/incidents/:incidentId` | Private | `CONTROL_ROOM`, `ADMIN` | Get incident details |
| **Incidents** | `POST` | `/api/incidents` | Private | `CONTROL_ROOM`, `ADMIN` | Report new incident |
| **Incidents** | `PATCH` | `/api/incidents/:incidentId` | Private | `CONTROL_ROOM`, `ADMIN` | Update incident status/severity |
| **Incidents** | `DELETE` | `/api/incidents/:incidentId` | Private | `ADMIN` | Soft delete incident |
| **Trajectories**| `POST` | `/api/trajectories` | Private | `CONTROL_ROOM`, `ADMIN` | Ingest vehicle GPS coordinate telemetry |
| **Trajectories**| `GET` | `/api/trajectories/:vehicleId` | Private | `CONTROL_ROOM`, `ADMIN` | Paginated trajectory history (max 100) |
| **Trajectories**| `GET` | `/api/trajectories/:vehicleId/latest` | Private | `CONTROL_ROOM`, `ADMIN` | Latest single GPS telemetry fix |
| **Trajectories**| `GET` | `/api/trajectories/:vehicleId/recent` | Private | `CONTROL_ROOM`, `ADMIN` | Recent N points (default 20, max 100) |
| **Routes** | `POST` | `/api/routes` | Private | `CONTROL_ROOM`, `ADMIN` | Generate & persist planned route LineString |
| **Routes** | `GET` | `/api/routes` | Private | `CONTROL_ROOM`, `ADMIN` | List routes with optional filters |
| **Routes** | `GET` | `/api/routes/:routeId` | Private | `CONTROL_ROOM`, `ADMIN` | Get route details |
| **Routes** | `GET` | `/api/routes/:routeId/analysis` | Private | `CONTROL_ROOM`, `ADMIN` | Analyze vehicle progress on route |
| **Deviation** | `GET` | `/api/deviation/vehicle/:vehicleId` | Private | `CONTROL_ROOM`, `ADMIN` | Compute live route deviation metrics |
| **Traffic** | `GET` | `/api/traffic/location` | Private | `CONTROL_ROOM`, `ADMIN` | Query traffic conditions at coordinates |
| **Analysis** | `GET` | `/api/analysis/vehicle/:vehicleId` | Private | `CONTROL_ROOM`, `ADMIN` | Multi-factor situation & ETA snapshot |
| **GeoAgent** | `POST` | `/api/geoagent/analyze` | Private | `CONTROL_ROOM`, `ADMIN` | Run advisory GeoAgent AI reasoning |
| **GeoAgent** | `POST` | `/api/geoagent/analyze/vehicle/:vehicleId`| Private | `CONTROL_ROOM`, `ADMIN` | Run advisory GeoAgent AI on vehicle |
| **Decisions** | `POST` | `/api/decisions/analyze` | Private | `CONTROL_ROOM`, `ADMIN` | Evaluate authoritative decision rules |
| **Decisions** | `GET` | `/api/decisions/:decisionId` | Private | `CONTROL_ROOM`, `ADMIN` | Get decision record by ID |
| **Decisions** | `PATCH` | `/api/decisions/:decisionId/approve` | Private | `CONTROL_ROOM`, `ADMIN` | Operator approves pending action |
| **Decisions** | `PATCH` | `/api/decisions/:decisionId/reject` | Private | `CONTROL_ROOM`, `ADMIN` | Operator rejects action with reason |
| **Decisions** | `PATCH` | `/api/decisions/:decisionId/execute` | Private | `CONTROL_ROOM`, `ADMIN` | Execute approved action |
| **Orchestration**| `POST` | `/api/orchestration/emergencies/:emergencyId/analyze` | Private | `CONTROL_ROOM`, `ADMIN` | Run unified end-to-end operational pipeline |

---

## 6. Database Models & Indexes

- **`User`**: `{ email: 1 }` (unique)
- **`Vehicle`**: `{ vehicleId: 1 }` (unique), `{ registrationNumber: 1 }` (unique), `{ status: 1, isDeleted: 1 }`
- **`Emergency`**: `{ emergencyId: 1 }` (unique), `{ location: '2dsphere' }`, `{ destination: '2dsphere' }`, `{ assignedVehicle: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`
- **`Incident`**: `{ incidentId: 1 }` (unique), `{ location: '2dsphere' }`, `{ emergency: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`
- **`Trajectory`**: `{ vehicle: 1, timestamp: -1 }`, `{ location: '2dsphere' }`
- **`Route`**: `{ routeId: 1 }` (unique), `{ emergency: 1, routeType: 1 }`, `{ vehicle: 1, status: 1 }`, `{ geometry: '2dsphere' }`
- **`Decision`**: `{ decisionId: 1 }` (unique), `{ emergency: 1, createdAt: -1 }`, `{ emergency: 1, situationHash: 1 }`, `{ status: 1, createdAt: -1 }`

---

## 7. System Standard Units

- **Distance**: `meters`
- **Speed**: `km/h`
- **Duration**: `seconds` (internal storage)
- **ETA**: `minutes` (presentation)
- **Bearing**: `degrees` (`0..360`, 0 = North)

---

## 8. Security Controls & Invariants

1. **Authentication**: Passwords encrypted with `bcrypt` (12 rounds) and never returned in API payloads. JWT tokens validated from HTTP-only cookies or `Authorization: Bearer <token>` headers.
2. **Authorization**: Strict role enforcement (`ADMIN`, `CONTROL_ROOM`) on all operational endpoints. Server derives caller identities from JWT claims.
3. **Mass Assignment Prevention**: Updates use explicit allowlists. Protected fields (`role`, `status`, `decision`, `_id`, `isDeleted`) cannot be overwritten via request bodies.
4. **Operational Tampering Defense**: Requests attempting to submit fabricated operational facts (`eta`, `traffic`, `deviation`, `decision`, `actions`) are rejected with `400 Bad Request`.
5. **AI Safety**: GeoAgent is advisory only. It uses controlled read-only tools and cannot directly modify the database or execute state transitions. Authoritative actions require Decision Engine rule evaluation.
6. **Socket.IO Security**: Connection handshake requires valid JWT. Unauthorized sockets are rejected before room subscription.
7. **Credential Protection**: Zero secrets are hardcoded in source code or tracked in git.

---

## 9. Current Development Status

- **Status**: `CORE IMPLEMENTATION COMPLETE`
- **Automated Tests**: 6 test suites, 49 passing assertions (100% pass rate).
- **Next Backend Task**: Bug fixes / maintenance / production integration as required.
- **Optional Future Work**:
  - Live Google Routes / Mapbox Directions & Traffic API keys in production deployment.
  - Trajectory TTL index for multi-month production archiving.