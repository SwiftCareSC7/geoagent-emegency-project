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

## 5. How to Test & Verify

1. **Run Full Backend Test Suite**:
   ```bash
   cd server
   node test-part7.js
   node test-part8.js
   node test-part9.js
   ```

2. **Start Backend Server with Socket.IO**:
   ```bash
   npm run dev
   ```
