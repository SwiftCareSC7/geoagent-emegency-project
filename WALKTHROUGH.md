# GeoAgentic Emergency Response System - Developer Walkthrough

This document is a technical guide for developers explaining the full architecture, implementation, and inner workings of the GeoAgentic Emergency Response System backend and frontend.

---

## 1. System Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js App Router, TypeScript)               │
│  ├── Landing Page, Login, Signup                         │
│  ├── Driver Dashboard (ETA, Map, Timeline, GeoAgent)     │
│  └── API Adapter (lib/api.ts → mock data or backend)     │
├─────────────────────────────────────────────────────────┤
│  Backend (Express.js, Node.js, HTTP Server)              │
│  ├── Real-Time Push Layer (Socket.IO, Handshake Auth)   │
│  ├── Modular Architecture (Auth, Vehicles, Emergencies, │
│  │   Incidents, Trajectories, Routes, Deviation,        │
│  │   Traffic, Analysis, GeoAgents, Realtime)            │
│  ├── Deterministic Intelligence Engine (Part 7)         │
│  ├── GeoAgent AI Decision Engine (Part 8 - Gemini LLM)  │
│  └── REST API with JWT Auth + Role-Based Access Control │
├─────────────────────────────────────────────────────────┤
│  Database (MongoDB)                                      │
│  ├── 6 Collections: User, Vehicle, Emergency, Incident,  │
│  │   Trajectory, Route                                   │
│  └── 2dsphere & Compound Indexes                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Part 9 Deep Dive: Real-Time Backend Communication (Socket.IO)

### 2.1 Why Real-Time Communication is Needed
In emergency vehicle routing and monitoring, state updates (GPS telemetry, unexpected road blocks, route deviations, and AI recommendations) occur rapidly. Repeated polling of REST endpoints wastes bandwidth, introduces latency spikes, and overburdens the database. 

With **Socket.IO**:
- Live GPS telemetry from ambulances is broadcast instantaneously to operator dashboards.
- Deviation alerts and traffic changes trigger automatic push notifications without polling.
- GeoAgent AI recommendations are delivered to both the dispatch room and the specific driver channel concurrently.

---

### 2.2 REST vs Socket.IO Responsibilities

| Responsibility | REST API | Socket.IO |
|---|---|---|
| **CRUD & Persistence** | Authoritative source for creating, reading, updating, and deleting entities | Ephemeral delivery channel; does not persist state |
| **Authentication** | Handled per HTTP request via JWT cookies | Handled once during connection handshake |
| **Client Commands** | Complex state modifications, queries, filters | Minimal commands: joining/leaving authorized rooms |
| **Data Flow** | Request / Response (Pull) | Event-driven Broadcast (Push) |
| **Reconnection Recovery**| Stateless; fetches latest state upon reconnect | Resubscribes to rooms; state refreshed via REST |

---

### 2.3 Socket.IO Initialization & Handshake Authentication

Socket.IO is attached directly to the Node.js `http.createServer(app)` instance in `server/server.js`.

```text
       Client Connect Request
                 │
                 ▼
       Handshake Middleware
                 │
        Extract JWT Token
    (Cookie / Header / Auth Token)
                 │
                 ▼
          Verify JWT Secret
                 │
                 ▼
       Load User & Verify Role
      (CONTROL_ROOM or ADMIN)
                 │
        ┌────────┴────────┐
        ▼                 ▼
   [Valid Role]     [Invalid / Expired]
        │                 │
   Attach socket.user   Reject Connection (401/403)
        │
   Auto-join control-room
```

---

### 2.4 Room Architecture & Server-Side Authorization

To prevent cross-talk and avoid broadcasting every event to every connected client, Socket.IO channels are isolated into three room tiers:

1. **`control-room`**:
   - *Target*: All authenticated control room operators and administrators.
   - *Events*: Fleet updates, new emergencies, incidents, global deviation alerts, traffic updates.
2. **`emergency:${emergencyId}`**:
   - *Target*: Operators and dispatchers monitoring a specific emergency case.
   - *Events*: Emergency status changes, route updates, specific GeoAgent advice.
3. **`vehicle:${vehicleId}`**:
   - *Target*: The specific vehicle/driver terminal and assigned operators.
   - *Events*: Vehicle telemetry, GPS trajectory ingestion, assigned route, direct deviation warnings.

**Room Join Authorization**:
When a client emits `join.emergency` or `join.vehicle`, the backend handler validates that the emergency or vehicle exists in MongoDB before admitting the socket to the room.

---

### 2.5 Standardized Event Envelope

All events emitted by `realtimeService` are structured in a uniform envelope:
```json
{
  "version": 1,
  "event": "vehicle.location.updated",
  "timestamp": "2026-08-29T18:40:00.000Z",
  "data": {
    "vehicleId": "AMB-001",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "speedKmh": 45,
    "heading": 90,
    "recordedAt": "2026-08-29T18:40:00.000Z"
  }
}
```

---

### 2.6 Domain Event Triggers

1. **GPS Ingestion Flow**:
   `POST /api/trajectories` -> `trajectoryService.createTrajectory()` -> MongoDB save -> `realtimeService.emitTrajectoryCreated()` & `realtimeService.emitVehicleLocationUpdated()`.
2. **Emergency Updates**:
   `createEmergency()`, `updateEmergency()`, `assignVehicle()` -> MongoDB save -> `realtimeService.emitEmergencyCreated()`, `emitEmergencyUpdated()`, `emitVehicleStatusUpdated()`.
3. **Incidents**:
   `createIncident()`, `updateIncident()` -> MongoDB save -> `realtimeService.emitIncidentCreated()`, `emitIncidentUpdated()`.
4. **Routes**:
   `createRoute()` -> MongoDB save -> `realtimeService.emitRouteUpdated()`.
5. **GeoAgent AI Analysis**:
   `analyzeEmergency()` -> Gemini recommendation validated -> `realtimeService.emitGeoAgentAnalysis()`.

---

## 3. Part 8 Deep Dive: GeoAgent AI Backend Integration

### 3.1 What Part 8 Accomplishes
Part 8 transforms the initial standalone script prototype into a **production-structured backend AI decision-support service**. The GeoAgent:
1. Gathers trusted, deterministic situation data from `AnalysisService` (covering Vehicle, Emergency, Trajectory, Route, Deviation, Traffic, Incidents, and ETA).
2. Provides this rich spatial context to Google Gemini (`gemini-2.5-flash`) via `@google/genai`.
3. Empowers Gemini with **controlled, read-only AI tools** (`getVehicleSituation`, `getAlternativeRoutes`, `getNearbyAvailableVehicles`, `getNearbyIncidents`).
4. Enforces a **three-tier epistemic discipline** (`OBSERVED` facts vs `INFERRED` causes vs `UNKNOWN` gaps).
5. Defends against **prompt injection attacks** by sanitizing untrusted user/caller descriptions.
6. Validates, sanitizes, and normalizes the AI's JSON output before returning it to the operator.
7. Operates a **deterministic fallback engine** when AI credentials are absent or external provider calls fail.

---

## 4. File-by-File Explanation (Part 9 Additions)

### Real-Time Module (`server/modules/realtime/`)
- [`realtime.constants.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/realtime/realtime.constants.js): Centralized event names, client commands, and room naming functions.
- [`realtime.events.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/realtime/realtime.events.js): Versioned event envelope creator and payload formatters.
- [`realtime.handlers.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/realtime/realtime.handlers.js): Handshake JWT auth middleware, cookie parser, room join/leave validators, and disconnect cleanup.
- [`realtime.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/realtime/realtime.service.js): Centralized Socket.IO singleton managing server lifecycle and room emission methods.
- [`server/test-part9.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/test-part9.js): Automated test harness connecting real Socket.IO clients to test auth, invalid tokens, room broadcasts, and disconnects.

---

## 6. Part 10 Deep Dive: Decision & Dispatch Engine

### 6.1 Why the Decision Engine Exists

GeoAgent (Part 8) is a powerful LLM-based recommender, but emergency operations
require a **deterministic, auditable, human-in-the-loop** layer that
authoritatively reconciles advisory AI output with operator authority and
safety rules. The Decision Engine is that layer.

Without a deterministic engine, three failure modes become possible:

1. **Confabulated state** — an LLM could invent route metrics or traffic
   conditions that were never observed.
2. **Conflicting recommendations** — two different runs of the LLM could give
   different advice for the same situation, with no audit trail of why.
3. **Unbounded AI authority** — operators have no way to override an
   autonomous system that has already mutated operational records.

The Decision Engine solves all three by being:

- **Authoritative**: It is the only system that may produce an operational
  decision (CONTINUE / REROUTE / CONSIDER_BACKUP / ALERT_CONTROL_ROOM / NO_ACTION).
- **Deterministic**: Pure functions in `decision.rules.js` produce the same
  output for the same input. There is no sampling, no temperature, no drift.
- **Advisory-aware**: The GeoAgent recommendation is loaded server-side,
  compared against the engine's output, and any disagreement is recorded as
  the `AI_RECOMMENDATION_CONFLICT` reason code for auditability.
- **Human-in-the-loop**: Decisions always begin in
  `PENDING_OPERATOR_ACTION`. No autonomous dispatch, no autonomous route
  mutation, no autonomous vehicle control.

### 6.2 Architecture

```text
Observed Data
      │
      ▼
Deterministic Situation Analysis (Part 7)
      │
      ▼
GeoAgent Advisory Recommendation (Part 8)
      │
      ▼
Decision Engine Rules (decision.rules.js)
      │
      ▼
Operational Decision (severity, actions, primaryAction, reasonCodes, backup)
      │
      ▼
Decision Persisted (PENDING_OPERATOR_ACTION)
      │
      ▼
Real-Time Event: decision.created
      │
      ▼
Human Operator (CONTROL_ROOM / ADMIN)
      │
      ├─ Approve ──> APPROVED ──> Execute ──> EXECUTED
      ├─ Reject  ──> REJECTED
      └─ Cancel  ──> CANCELLED
```

### 6.3 AI Recommendation vs Backend Authority

| | GeoAgent | Decision Engine |
|---|---|---|
| Role | Advisory | Authoritative |
| May mutate state? | No (read-only tools) | No (decisions pending by default) |
| Confidence used as? | Tie-breaker / informational | Never as a probability; never overrides deterministic rules |
| Output | Recommendation (action + summary) | Operational decision (actions + severity + status) |

When the two disagree, the response includes both `geoAgentRecommendation`
and the engine's `actions` / `reasonCodes`. The `AI_RECOMMENDATION_CONFLICT`
reason code is attached.

### 6.4 Decision Rules

The deterministic rules are pure functions in `decision.rules.js`. They cover:

- **Continue**: on route AND low delay AND no severe incident → `CONTINUE / NORMAL`.
- **Reroute**: deviation OR heavy traffic OR critical incident AND a viable
  alternative (≥2 min faster) → `REROUTE`. If reroute needed but no viable
  alternative → `ALERT_CONTROL_ROOM` (do not invent one).
- **Backup**: high / critical priority AND ETA exceeds threshold AND backup
  ETA at least `BACKUP_TIME_ADVANTAGE_MINUTES` faster → `CONSIDER_BACKUP`.
- **Alert**: insufficient data OR vehicle status abnormal OR no active
  route → `ALERT_CONTROL_ROOM / CRITICAL`.
- **AI Conflict Detection**: if GeoAgent action differs from the
  deterministic recommendation, the `AI_RECOMMENDATION_CONFLICT` reason
  code is added.

### 6.5 Priority Handling

`primaryAction` is chosen by deterministic priority order:
`ALERT_CONTROL_ROOM > REROUTE > CONSIDER_BACKUP > CONTINUE > NO_ACTION`.

Emergency priority influences the rules:

- `CRITICAL` → aggressively evaluates reroute and backup.
- `HIGH` → considers backup if ETA exceeds threshold.
- `MEDIUM` → monitor.
- `LOW` → tolerates moderate delay.

These are operational prioritization rules, not medical advice.

### 6.6 Reroute Decision

Reroute is triggered when:
- Deviation status is `DEVIATED` or `CRITICAL_DEVIATION`, OR
- Traffic level is `HEAVY` or `SEVERE`, OR
- A critical incident is blocking the route.

A reroute is only emitted if a viable alternative route exists
(≥2 minutes faster than current ETA, heuristic score lower than current).

### 6.7 Backup Evaluation

Backup candidates are queried from `Vehicle.find({ status: 'AVAILABLE' })`
filtered by `BACKUP_SEARCH_RADIUS_KM` and ranked by a deterministic ETA
estimate. The decision records the recommended candidate but does **not**
auto-dispatch — the operator must approve.

### 6.8 Human Approval

```text
PENDING_OPERATOR_ACTION ──> APPROVED ──> EXECUTED
            │
            ├──> REJECTED
            └──> CANCELLED
```

Only `ADMIN` or `CONTROL_ROOM` may approve or reject. Invalid transitions
return HTTP 409.

### 6.9 Persistence

Each decision persists:

- `decisionId` (e.g. `DEC-0001`).
- Compact `inputSnapshot` (no full MongoDB document duplication).
- `situationHash` (SHA-256 of material inputs) for idempotency.
- Audit fields: `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`,
  `rejectionReason`, `executedAt`, `executionSummary`.
- Indexes: `{ emergency: 1, createdAt: -1 }`,
  `{ emergency: 1, situationHash: 1 }`, `{ status: 1, createdAt: -1 }`.

No credentials, API keys, or private LLM chain-of-thought are stored.

### 6.10 Real-Time Events

New events are emitted to `control-room`, `emergency:${id}`,
`vehicle:${id}` rooms:

- `decision.created` — after persistence of a new decision.
- `decision.approved` — after an operator approval.
- `decision.rejected` — after an operator rejection.
- `decision.executed` — after execution via the action service.

### 6.11 Transaction Handling

- `approve` / `reject` / `execute` are single-document updates with audit
  fields. No cross-document transaction is required.
- The Decision model uses Mongoose validators on `status`, `severity`,
  `actions`, `primaryAction` to prevent invalid state from being written.
- The action executor is a controlled `switch` over the decision's
  action list; unknown actions produce a `no_effect` audit entry rather
  than throwing.

### 6.12 Security

- All decision endpoints require authentication (`protect`) and the
  `CONTROL_ROOM` or `ADMIN` role (`requireRole`).
- The request body for `POST /api/decisions/analyze` may contain **only**
  `emergencyId`. Any operational field is rejected with HTTP 400.
- Decision state transitions are explicitly enforced server-side.
- No autonomous dispatch.
- The decision document does not include credentials, API keys, or
  private LLM chain-of-thought.

### 6.13 Failure Handling

The engine fails safely:

- Missing emergency → HTTP 404.
- Missing vehicle / route / trajectory / ETA / traffic / incident →
  `INSUFFICIENT_DATA` reason code → `ALERT_CONTROL_ROOM / CRITICAL`.
- Routing provider failure → `alternativeRoutes = []`, engine still
  produces a valid decision (potentially escalating to `ALERT_CONTROL_ROOM`).
- Database failure → standard 500 response from the error handler.
- Real-time emission failure → logged, not thrown.

### 6.14 File-by-File Explanation (Part 10 Additions)

- `server/modules/decisions/decision.constants.js`: Enums, severity,
  status state machine, reason codes, configurable thresholds.
- `server/modules/decisions/decision.rules.js`: Pure deterministic rule
  engine. No database, no I/O, no side effects.
- `server/modules/decisions/decision.model.js`: Mongoose Decision model
  with `inputSnapshot`, `situationHash`, audit fields, and indexes.
- `server/modules/decisions/decision.service.js`: Orchestrator that
  loads situation server-side, reconciles GeoAgent advisory, persists
  the decision, enforces state-machine transitions, and runs the
  controlled action executor.
- `server/modules/decisions/decision.controller.js`: REST controllers
  for analyze, get, approve, reject, execute, and list-by-emergency.
- `server/modules/decisions/decision.routes.js`: Express routes
  registered at `/api/decisions`, protected by `protect` +
  `requireRole('CONTROL_ROOM', 'ADMIN')`.
- `server/modules/decisions/decision.validation.js`: Strict request
  validation. Rejects any client-supplied operational field with 400.
- `server/test-part10.js`: Comprehensive test suite covering 16
  scenarios (continue, reroute, backup, insufficient data, AI conflict,
  state machine, end-to-end analyze→approve→execute, rejection, invalid
  transitions, idempotency, 401, 403, 400, real-time event broadcast,
  list-by-emergency).

---

## 5. How to Test & Verify

1. **Run Full Backend Test Suite**:
   ```bash
   cd server
   node test-part7.js
   node test-part8.js
   node test-part9.js
   node test-part10.js
   ```

2. **Start Backend Server with Socket.IO**:
   ```bash
   npm run dev
   ```
