# SwiftCare GeoAgent — Natural-Language Query Catalog & Capability Analysis

This document provides a rigorous, truth-grounded analysis of operational query capabilities in SwiftCare GeoAgent, evaluating what natural-language questions the system can answer today, what is partially supported, what is not supported, and the architectural requirements to bridge the remaining gaps.

---

## 1. Executive Query Reality Check

### Current Architectural Reality
- **What Exists**: 
  - A structured backend intelligence service ([`server/modules/geoagents/geoAgent.tools.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoAgent.tools.js)) exposing **12 declarative tools** for Google Gemini function calling.
  - An epistemic situation synthesizer ([`server/modules/geoagents/geoAgent.service.js`](file:///Users/priyanshu/Documents/geoagent-emegency-project/server/modules/geoagents/geoAgent.service.js)) that ingests vehicle state, cross-track deviation, nearby incidents, and ETA to generate natural-language briefings with **Observed**, **Inferred**, and **Unknown** classifications.
  - Deterministic REST endpoints that return counts, statuses, and locations of fleet units and emergencies.
- **What Does NOT Exist**:
  - A free-form conversational chat bar (similar to ChatGPT or Claude) in the UI where an operator types arbitrary natural-language sentences and receives ad-hoc text responses.
  - A natural-language-to-MongoDB query compiler or Text-to-SQL engine.
  - A vector database / RAG episodic memory store for semantic queries like *"Which route historically performed best for evening emergencies?"*

---

## 2. Query Capability Classification Matrix

| Query Category | Example Operator Query | System Status | Underlying Mechanism / Tool | Why or Why Not Supported |
| :--- | :--- | :--- | :--- | :--- |
| **Fleet Count** | *"How many ambulances are available?"* | **SUPPORTED** | `GET /api/vehicles?status=AVAILABLE` | Deterministic DB query returns exact count of idle fleet units. |
| **Fleet State** | *"How many ambulances are currently on emergency service?"* | **SUPPORTED** | `GET /api/vehicles?status=EN_ROUTE` | DB query filters by status `DISPATCHED`, `EN_ROUTE`, and `AT_SCENE`. |
| **Location Query** | *"Where is AMB-01?"* | **SUPPORTED** | `getVehicleState('AMB-01')` | Returns exact `[lng, lat]` coordinates and snapped street name from latest trajectory fix. |
| **Active Incidents** | *"What emergencies are active right now?"* | **SUPPORTED** | `GET /api/emergencies?status=ACTIVE` | Returns active emergency incidents with priority and locations. |
| **Proximity Search** | *"Which ambulance is closest to Emergency E-102?"* | **PARTIALLY SUPPORTED** | `getNearbyAvailableVehicles(lng, lat)` | Geospatial 2dsphere index calculates distance to idle vehicles, but requires passing coordinates rather than raw string `E-102`. |
| **Route Query** | *"What route is AMB-03 currently taking?"* | **SUPPORTED** | `getCurrentRoute('AMB-03')` | Returns planned corridor geometry, distance, and duration. |
| **Deviation Query** | *"Has AMB-03 deviated from its route?"* | **SUPPORTED** | `getVehicleSituation('AMB-03')` | Evaluates cross-track distance (< 50m = ON_ROUTE, > 100m = DEVIATED). |
| **Causal Analysis** | *"What caused the deviation?"* | **SUPPORTED** | `geoAgent.service.js` | Correlates deviation location with active road accidents and traffic levels to identify cause. |
| **Delay Prediction** | *"How much delay is expected on Emergency EMG-001?"* | **SUPPORTED** | `getPrediction('AMB-01')` | Returns quantitative delay minutes, baseline duration, and delay risk score. |
| **Actionable Reroute** | *"Why is Alternative Route 2 recommended?"* | **SUPPORTED** | `geoAgent.service.js` | Evaluates traffic congestion ratio, incident clearance, and projected time savings. |
| **Human-in-the-Loop** | *"Which active missions currently need operator approval?"* | **SUPPORTED** | `GET /api/decisions/active` | Queries MongoDB collection `decisions` where `status: 'PENDING'`. |
| **Historical Comparison** | *"Which route historically performed better for similar evening emergencies?"* | **NOT SUPPORTED** | None | No vector embedding or episodic similarity retrieval engine implemented. |
| **Telemetry Health** | *"Which ambulances have lost telemetry?"* | **PARTIALLY SUPPORTED** | Heartbeat check on `Trajectory.timestamp` | Detected if `Date.now() - timestamp > 30s`, but not exposed as a single natural-language query endpoint. |
| **Simulation Query** | *"What happened in the road accident what-if simulation?"* | **SUPPORTED** | `GET /api/diff/scenarios` (`/diff`) | Deterministic playback engine provides exact timeline and event breakdown. |

---

## 3. Query Understanding & Tool Mapping Architecture

To support end-to-end natural-language operator interaction, the system is designed around declarative function calling via Google Gemini:

```
[ Operator Natural Language Input ]
               │
               ▼
   [ Query Understanding / Intent Router ]
               │
   ┌───────────┴───────────────────────────┐
   ▼                                       ▼
[ Deterministic Fast-Path ]       [ LLM Tool Calling (Gemini) ]
(Regex / Exact Status Filters)     (Multi-step operational analysis)
   │                                       │
   │                                       ▼
   │                           [ 12 Declarative Tools ]
   │                           ├── getEmergencyState
   │                           ├── getVehicleState
   │                           ├── getRecentTrajectory
   │                           ├── getCurrentRoute
   │                           ├── getRouteAlternatives
   │                           ├── getTrafficAnalysis
   │                           ├── getPrediction
   │                           ├── getNearbyIncidents
   │                           ├── getDecisionHistory
   │                           ├── getVehicleSituation
   │                           ├── getNearbyAvailableVehicles
   │                           └── getCorridorGreenWaveStatus
   │                                       │
   └───────────────────┬───────────────────┘
                       ▼
           [ Backend Domain Services ]
           (MongoDB / Geospatial / Routing)
                       │
                       ▼
          [ Structured Operational Result ]
                       │
                       ▼
      [ Epistemic Natural Language Synthesis ]
     (3-Tier: Observed, Inferred, Unknown)
```

---

## 4. Query Safety & Data Boundary Guardrails

To prevent hallucinations, data leakage, and unauthorized modifications:
1. **Zero Arithmetic Hallucination**: Distances, bearings, speeds, and ETA minutes are computed exclusively by backend TypeScript/JavaScript algorithms. The LLM is instructed never to re-calculate or invent numbers.
2. **Grounding in Truth**: Situation context and tool call results are the sole authoritative sources of truth. If a vehicle has no recent GPS fixes, the system explicitly reports `GPS_TELEMETRY_ANOMALY`.
3. **Role-Based Data Filtering**: Sensitive patient notes or medical history are excluded from operational dispatch queries.
4. **Prompt Injection Defense**: Caller descriptions and incident notes are sanitized and treated as untrusted strings to prevent instruction override attacks.
5. **No Blind Action Execution**: Query endpoints are strictly read-only. No natural-language query can mutate the database, reassign a vehicle, or approve a reroute without explicit operator confirmation through the Decision Engine.

---

## 5. Bridging the Gap: Requirements for Full Conversational Search

To upgrade the current structured tool pipeline into a fully conversational operations assistant:
1. **Conversational Front-End Component**: Add an `OperationalQueryHUD` drawer into the Control Room topbar.
2. **Entity Resolution Pipeline**: Resolve natural-language references (e.g. *"the crash near Domlur"*, *"AMB-1"*) to MongoDB identifiers (`INC-001`, `AMB-01`) using lightweight fuzzy matching.
3. **Episodic Vector Memory**: Index completed emergency missions into a vector store (e.g. MongoDB Atlas Vector Search or Pinecone) with metadata tags for time-of-day, weather, corridor, and delay outcomes.
4. **Multi-Turn Context State**: Maintain a conversation session buffer (`sessionId`) so operators can ask follow-up questions (e.g. *"What about AMB-02?"* after asking about AMB-01).
