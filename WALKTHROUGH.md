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
│  ├── End-to-End Orchestration Layer (Part 11)           │
│  ├── Authoritative Decision & Dispatch Engine (Part 10) │
│  ├── Real-Time Push Layer (Part 9 - Socket.IO)          │
│  ├── GeoAgent AI Decision Engine (Part 8 - Gemini LLM)  │
│  ├── Deterministic Intelligence Engine (Part 7)         │
│  ├── Modular Domain Services (Auth, Vehicles,           │
│  │   Emergencies, Incidents, Trajectories, Routes)      │
│  └── REST API with JWT Auth + Role-Based Access Control │
├─────────────────────────────────────────────────────────┤
│  Database (MongoDB)                                      │
│  ├── 7 Collections: User, Vehicle, Emergency, Incident,  │
│  │   Trajectory, Route, Decision                         │
│  └── 2dsphere & Compound Indexes                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Part 11 Deep Dive: Full Backend Integration & End-to-End Workflow

### 2.1 Why an Orchestration Layer is Needed
Prior to Part 11, the backend contained specialized domain services (trajectories, routes, deviation, traffic, incidents, ETA, GeoAgent AI, and Decision Engine) operating independently or with pairwise integration. Operators in the control room needed a single unified endpoint that triggers the full decision-support pipeline without requiring multiple chained REST calls.

The **Orchestration Service** (`server/modules/orchestration/`):
- Acts as a **thin coordinator** over existing domain services.
- Enforces **cross-module data consistency** before processing (e.g. verifying that the analyzed route and trajectory belong to the assigned emergency vehicle).
- Handles **partial degradation gracefully** (e.g. if GPS is active but traffic or AI is unreachable, it produces a valid deterministic evaluation without crashing).
- Formats outputs with a strict **three-tier epistemic breakdown** (`OBSERVED`, `INFERRED`, `UNKNOWN`).
- Dispatches **real-time push notifications** (`emergency.analysis.started`, `emergency.analysis.completed`, `decision.created`) to authorized control room channels.

---

### 2.2 End-to-End Workflow Architecture

```text
POST /api/orchestration/emergencies/:emergencyId/analyze
                      │
                      ▼
            Auth & Role Validation
           (CONTROL_ROOM or ADMIN)
                      │
                      ▼
         Load & Validate Emergency
                      │
         Load & Validate Assigned Vehicle
                      │
         Load & Validate Active Route
         (Consistency: route.vehicle == vehicle._id)
                      │
         Load Latest GPS Trajectory
         (Consistency: trajectory.vehicle == vehicle._id)
                      │
         Run Deterministic Spatial Analysis
      (Deviation, Progress, Traffic, Incidents, ETA)
                      │
                      ▼
        Run GeoAgent AI (Advisory Reasoning)
                      │
                      ▼
        Run Decision Engine (Authoritative Rules)
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

---

### 2.3 Epistemic Discipline (`OBSERVED` vs `INFERRED` vs `UNKNOWN`)

To maintain transparency for emergency operators, the response strictly separates factual telemetry from algorithmic inferences and data gaps:

```json
{
  "epistemicBreakdown": {
    "observed": [
      "Vehicle is 194m from planned route (DEVIATED)",
      "GPS stability is STABLE with HIGH confidence",
      "Corridor traffic congestion level is LIGHT (speed: 38.5 km/h)",
      "Route progress is 42.5% (2980m remaining)",
      "Current ETA is 6 min (delay: +0 min, estimated speed: 38.5 km/h)",
      "1 active incident(s) correlated near route corridor (closest: ACCIDENT at 180m from route)"
    ],
    "inferred": [
      "Likely primary cause for delay/deviation: ACCIDENT_INDUCED_CONGESTION",
      "GeoAgent recommendation rationale: Reroute via express bypass to avoid high severity accident",
      "Decision Engine primary operational action: ALERT_CONTROL_ROOM (WARNING severity)",
      "Decision rule triggers: DEVIATION_WITHOUT_TRAFFIC"
    ],
    "unknown": [
      "Driver's verbal confirmation of road blockage or diversion intent",
      "Real-time hospital emergency department receiving capacity"
    ]
  }
}
```

---

### 2.4 Partial Failure & Graceful Degradation

The orchestration workflow avoids catastrophic failures when optional data sources or external dependencies fail:
1. **Unassigned Emergency**: Returns `workflowStatus: "PARTIAL"` with `reason: "NO_ASSIGNED_VEHICLE"` alongside the emergency details.
2. **Missing Planned Route**: Returns `workflowStatus: "PARTIAL"` with `reason: "NO_ACTIVE_ROUTE"`.
3. **No GPS Trajectory**: Returns `workflowStatus: "PARTIAL"` with `reason: "NO_TRAJECTORY_DATA"`.
4. **AI / Gemini Unreachable**: GeoAgent falls back to deterministic analysis with `fallback: true` and `status: "AI_ANALYSIS_UNAVAILABLE"`. The Decision Engine still generates an authoritative decision based on deterministic rules.
5. **Real-time Socket Failure**: Failures in Socket.IO broadcasting are logged non-blockingly and never abort an otherwise successful database operation.

---

### 2.5 Security & Operational Input Tampering Defense

The orchestration endpoint accepts only the `:emergencyId` route parameter. If a client attempts to supply operational facts (such as fake ETA, traffic, deviation status, or decision actions in `req.body`), the request validator (`validateOrchestrationRequest`) immediately rejects the request with **HTTP 400 Bad Request**.

---

### 2.6 Standardized System Units

All measurements across domain services and the orchestration layer adhere to consistent SI/standardized units:
- **Distance**: `meters`
- **Speed**: `km/h`
- **Duration**: `seconds` (internal storage)
- **ETA**: `minutes` (API presentation)
- **Bearing**: `degrees`

---

## 3. Part 12 Deep Dive: Backend Hardening, Performance & Query Safety

### 3.1 Status Code Preservation in Error Handling
In Express middleware, operational errors created with `err.status = 400 | 401 | 403 | 404 | 409` must have their explicit status codes preserved. [`server/shared/middleware/errorHandler.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/shared/middleware/errorHandler.js) checks `err.status || err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500)` before responding with JSON, ensuring clients receive accurate HTTP status codes rather than generic 500 errors.

### 3.2 Dual Authentication Transport
Authentication supports both browser-based HTTP-only cookies (`token=...`) and standard HTTP headers (`Authorization: Bearer <token>`). This enables both the Next.js web application and external mobile/simulator clients to authenticate seamlessly.

### 3.3 Database Index Optimizations
Compound indexes were added across operational models to support common filter patterns without full collection scans:
- `Emergency`: `{ assignedVehicle: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`
- `Incident`: `{ emergency: 1, isDeleted: 1 }`, `{ status: 1, isDeleted: 1 }`
- `Vehicle`: `{ status: 1, isDeleted: 1 }`

### 3.4 Parameter Boundary & NaN Protection
All paginated queries (e.g. `GET /api/trajectories/:vehicleId`) sanitize inputs against `NaN`, negative numbers, and unbounded values (hard maximum limit of 100 items per page).

---

## 4. How to Test & Verify

1. **Run Full Backend Test Suite**:
   ```bash
   cd server
   node test-part7.js
   node test-part8.js
   node test-part9.js
   node test-part10.js
   node test-part11.js
   node test-part12.js
   ```

2. **Trigger Full End-to-End Orchestration**:
   ```bash
   curl -X POST http://localhost:5000/api/orchestration/emergencies/EMG-0001/analyze \
     -H "Content-Type: application/json" \
     -b cookies.txt
   ```
