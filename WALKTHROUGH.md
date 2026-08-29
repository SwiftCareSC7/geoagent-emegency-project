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
│  Backend (Express.js, Node.js)                           │
│  ├── Modular Architecture (Auth, Vehicles, Emergencies, │
│  │   Incidents, Trajectories, Routes, Deviation,        │
│  │   Traffic, Analysis, GeoAgents)                      │
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

## 2. Part 8 Deep Dive: GeoAgent AI Backend Integration

### 2.1 What Part 8 Accomplishes
Part 8 transforms the initial standalone script prototype into a **production-structured backend AI decision-support service**. The GeoAgent:
1. Gathers trusted, deterministic situation data from `AnalysisService` (covering Vehicle, Emergency, Trajectory, Route, Deviation, Traffic, Incidents, and ETA).
2. Provides this rich spatial context to Google Gemini (`gemini-2.5-flash`) via `@google/genai`.
3. Empowers Gemini with **controlled, read-only AI tools** (`getVehicleSituation`, `getAlternativeRoutes`, `getNearbyAvailableVehicles`, `getNearbyIncidents`).
4. Enforces a **three-tier epistemic discipline** (`OBSERVED` facts vs `INFERRED` causes vs `UNKNOWN` gaps).
5. Defends against **prompt injection attacks** by sanitizing untrusted user/caller descriptions.
6. Validates, sanitizes, and normalizes the AI's JSON output before returning it to the operator.
7. Operates a **deterministic fallback engine** when AI credentials are absent or external provider calls fail.

---

### 2.2 Existing GeoAgent PoC vs Part 8 Transformation

| Aspect | Proof of Concept (Before Part 8) | Production GeoAgent (Part 8) |
|---|---|---|
| **Execution** | Standalone script (`testAgent()` logging to terminal) | Integrated Express API (`POST /api/geoagent/analyze`) |
| **Authentication** | None | Protected by JWT cookies & `CONTROL_ROOM` / `ADMIN` roles |
| **Data Source** | Hardcoded mock route array in `geoAgent.tools.js` | Live backend services (`AnalysisService`, `RoutingService`, MongoDB) |
| **Tools** | Single `getNewRoute` mock function | 4 controlled tools with strict parameters and backend execution |
| **Prompt Injection** | No defense | Input sanitization, length caps, and untrusted-data tagging |
| **Output Handling** | Raw unvalidated LLM output string | Schema validation, number clamping, and HTML stripping |
| **Failure Handling** | Script crash on API error | Deterministic fallback response with status `AI_ANALYSIS_UNAVAILABLE` |

---

### 2.3 AI Request & Tool-Calling Flow

```text
POST /api/geoagent/analyze { emergencyId: "EMG-0001" }
                  │
                  ▼
          Auth & Role Check
                  │
                  ▼
         Load Emergency & Vehicle
                  │
                  ▼
     AnalysisService.getVehicleSituation()
                  │
                  ▼
      Build Situation Context JSON
                  │
                  ▼
           Gemini 2.5 Flash
                  │
     ┌────────────┴────────────┐
     ▼                         ▼
Tool Call Request          Final JSON Response
(e.g., getAlternativeRoutes)    │
     │                         ▼
Execute Backend Tool      Schema Validation & Sanitization
     │                         │
Return Result to Model         ▼
(up to 3 rounds)          Safe API Response
```

---

### 2.4 Controlled AI Tools

1. **`getVehicleSituation`**:
   - *Input*: `{ vehicleId: string }`
   - *Action*: Calls `analysisService.getVehicleSituation()` to fetch real-time route deviation, traffic level, ETA, and nearby incidents.
2. **`getAlternativeRoutes`**:
   - *Input*: `{ originLng, originLat, destLng, destLat }`
   - *Action*: Calls `routingService.getRoute()` to compute candidate alternative routes with distance, duration, and traffic congestion ratings.
3. **`getNearbyAvailableVehicles`**:
   - *Input*: `{ longitude, latitude, maxDistanceKm }`
   - *Action*: Queries `Vehicle` collection for `status: 'AVAILABLE'` and calculates distances and estimated arrival times.
4. **`getNearbyIncidents`**:
   - *Input*: `{ longitude, latitude, radiusMeters }`
   - *Action*: Queries active, non-deleted `Incident` records within the radius.

---

### 2.5 Structured Output Schema & Epistemic Discipline

The GeoAgent returns a validated JSON object conforming to `geoagent.schemas.js`:

```json
{
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
```

---

### 2.6 Security & Prompt Injection Defense

1. **Input Sanitization**: User descriptions, caller notes, and incident texts are stripped of HTML/script tags and truncated before inclusion in prompts.
2. **Untrusted Data Tagging**: Prompt explicitly demarcates `untrustedCallerDescription` and instructs the model that description text must never override instructions or dictate system actions.
3. **Read-Only Tools**: Gemini tools cannot modify database records, mutate routes, or dispatch vehicles. Action execution is strictly reserved for the future Decision Engine.
4. **Credential Isolation**: API keys (`GEMINI_API_KEY`, etc.) are never sent in prompts or exposed in API responses.

---

## 3. File-by-File Explanation (Part 8 Additions)

### GeoAgent Module (`server/modules/geoagents/`)
- [`geoagent.constants.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoagent.constants.js): Defines model config (`GEMINI_MODEL`), tool round limit (3), action enums (`CONTINUE`, `REROUTE`, `MONITOR`, `CONSIDER_BACKUP`), and cause enums.
- [`geoagent.schemas.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoagent.schemas.js): Schema validation, confidence clamping (0.0 to 1.0), and string sanitization.
- [`geoagent.tools.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoagent.tools.js): Declarative tool specifications for Gemini and backend execution handlers.
- [`prompts/geoagent.system.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/prompts/geoagent.system.js): Dedicated system prompt with prompt injection defenses and three-tier observation rules.
- [`geoAgent.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoAgent.service.js): Production service handling situation context gathering, Gemini tool-calling loops, JSON parsing, output validation, and deterministic fallback generation.
- [`geoagent.validation.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoagent.validation.js): Express middleware validating request bodies and route parameters.
- [`geoagent.controller.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoagent.controller.js): Handlers for `POST /api/geoagent/analyze` and `POST /api/geoagent/analyze/vehicle/:vehicleId`.
- [`geoagent.routes.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoagent.routes.js): Express router mounting protected endpoints with auth.
- [`server/test-part8.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/test-part8.js): Automated test suite for tool execution, sanitization, schema validation, and fallback mechanisms.

---

## 4. How to Test & Verify

1. **Run Unit & Integration Tests**:
   ```bash
   cd server
   node test-part8.js
   ```
2. **Start Backend Server**:
   ```bash
   npm run dev
   ```
3. **Trigger AI Analysis**:
   ```bash
   curl -X POST http://localhost:5000/api/geoagent/analyze \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"emergencyId": "EMG-0001"}'
   ```
