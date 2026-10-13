# SwiftCare GeoAgent — Architecture Specification

This document provides a concise architectural overview of the **SwiftCare GeoAgent Emergency Response System**, detailing component boundaries, communication protocols, dual-engine intelligence separation, and data flow pipelines.

For deep-dive specifications, refer to:
- [docs/SWIFTCARE-ARCHITECTURE.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/SWIFTCARE-ARCHITECTURE.md) — Comprehensive 400-line architecture reference
- [docs/WEB-REQUEST-ARCHITECTURE.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/WEB-REQUEST-ARCHITECTURE.md) — Web request and caching topology
- [docs/database.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/database.md) — Data schemas, compound indexing, and lifecycle policies

---

## 1. High-Level Architecture Overview

SwiftCare GeoAgent is built around a decoupled multi-tier architecture designed for low-latency emergency telemetry ingestion and deterministic operational safety:

```mermaid
flowchart TB
    subgraph Client["Presentation Layer (Next.js 16 / React 19)"]
        CR["Control Room Dashboard (/control-room)"]
        DH["Driver HUD (/driver/dashboard)"]
        PT["Paramedic Triage (/paramedic)"]
        AC["Admin Observability (/admin)"]
        SIM["What-If Scenario Simulator (/diff)"]
    end

    subgraph Edge["Ingestion & Real-Time Gateway"]
        Proxy["Next.js Route Handlers (/api/*)"]
        Express["Express 4 REST Server (:5001)"]
        Socket["Socket.IO Server (:5001)"]
    end

    subgraph Core["Backend Domain Services"]
        FleetSvc["Vehicle Fleet Service"]
        EmgSvc["Emergency Dispatch Service"]
        TrajSvc["Telemetry & Map-Matching"]
        DevSvc["Turf.js Cross-Track Deviation"]
        PredSvc["ETA & Delay Prediction (EMA)"]
        V2XSvc["V2X Clearance & Green-Wave"]
    end

    subgraph Intelligence["Dual-Engine Decision Architecture"]
        subgraph Deterministic["Deterministic Safety Rules Engine (Authoritative)"]
            Rules["decision.rules.js\n- Candidate Scoring\n- Multi-Leg Validation\n- State Transitions"]
            FSM["Decision State Machine\nPENDING ➔ APPROVED ➔ EXECUTED"]
        end
        subgraph Advisory["GeoAgent LLM Layer (Advisory Only)"]
            Provider["geoagent.provider.js\n(OpenRouter / OpenCode Free Tier)"]
            Loop["Bounded Tool-Calling Loop\n(Max 6 rounds, 8 total calls, 12 tools)"]
            Epistemic["3-Tier Epistemic Prompting\nObserved | Inferred | Unknown"]
        end
    end

    subgraph Routing["Routing & Corridor Processing"]
        OSRM["OSRM Engine (Default OpenStreetMap)"]
        Google["Google Routes (Traffic-Aware)"]
        PyV2X["Python V2X Engine (:8000 / Bridge)"]
    end

    subgraph Storage["Persistence & Caching"]
        Mongo[("MongoDB 7.0+\n(2dsphere, compound indexes, TTL)")]
        InMem["In-Memory Corridor Cache (60s TTL)"]
    end

    Client <-->|WebSocket Events| Socket
    Client -->|HTTP REST| Proxy
    Proxy -->|BFF Forwarding| Express
    Express --> Core
    Socket --> Core
    Core --> Routing
    Core --> Storage
    Core <--> Intelligence
    Advisory -.->|Advisory Recommendation| Deterministic
    Deterministic -->|Authoritative Action (Pending Approval)| Storage
```

---

## 2. Component Responsibilities

| Tier / Component | Tech Stack | Primary Responsibilities |
|---|---|---|
| **Frontend UI** | Next.js 16, React 19, Leaflet 1.9, Tailwind CSS v4 | Interactive GIS map, real-time vehicle tracks, turn-by-turn navigation HUD, decision candidate review, what-if diff simulator. |
| **Backend REST & WS** | Node.js (22/24), Express 4.19, Socket.IO 4.8 | HTTP REST endpoints, telemetry ingestion validation, room-based socket multiplexing (`global`, `emergency:{id}`, `vehicle:{id}`). |
| **Spatial Engines** | Turf.js 7.4, OSRM, Google Routes | Coordinate inversion safety, polyline decoding, cross-track deviation, bearing divergence calculation, road distance estimation. |
| **Python V2X Bridge** | Python 3.10+, GeoPandas, Shapely | Microscopic V2X green-wave signal preemption scoring, civilian yield corridor modeling. (Pure JS fallback provides identical schema if Python is offline). |
| **GeoAgent AI** | OpenAI-compatible HTTP fetch, OpenRouter / OpenCode | Free-model LLM tool-calling agent with price guards ($0.00 cap). Operates strictly in advisory mode; produces 3-tier epistemic breakdowns. |
| **Decision Engine** | Pure JavaScript rules (`decision.rules.js`) | Authoritative deterministic safety gate. Scores route candidates, enforces hysteretic confirmation windows, and requires human operator approval. |
| **Persistence** | MongoDB 7.0, Mongoose 8.4 | Geospatial 2dsphere indexes, trajectory time-ordered compound indexes, 90-day telemetry retention TTL, database safety guards. |

---

## 3. Dual-Engine Safety Separation

A fundamental architectural guarantee of SwiftCare is the strict separation between AI reasoning and operational execution:

```
+-------------------------------------------------------------------------+
|                           INCOMING TELEMETRY                            |
|             (GPS Fix, Speed, Bearing, Active Emergency ID)              |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       DETERMINISTIC EVALUATION                          |
|  - Cross-Track Distance: < 50m (ON_ROUTE) | 50-150m (DEVIATED) | > 150m |
|  - Delay Delta: Current vs Planned ETA via EMA speed model              |
|  - Corridor Blockage: Detected via road incident radius (500m)          |
+------------------------------------+------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
+-----------------------------+             +-----------------------------+
|    GEOAGENT ADVISORY (AI)   |             |   DECISION ENGINE (RULES)   |
| - LLM tool-calling loop     |             | - Pure deterministic rules  |
| - Queries 12 status tools   |             | - Hard safety gates         |
| - Free-tier models only     |             | - State: PENDING            |
| - Emits 3-tier briefing:    |             | - Emits action candidates:  |
|   • Observed Facts          |             |   • CONTINUE                |
|   • Inferred Deductions     |             |   • REROUTE                 |
|   • Unknown / Missing Data  |             |   • CONSIDER_BACKUP         |
|                             |             |   • ALERT_CONTROL_ROOM      |
| Output: Advisory Suggestion |             | Output: Authoritative FSM   |
+--------------+--------------+             +--------------+--------------+
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      HUMAN OPERATOR IN THE LOOP                         |
|             (Control Room Dispatcher UI: /control-room)                 |
|                                                                         |
|  1. Inspects cross-track deviation on Leaflet GIS map                   |
|  2. Reviews GeoAgent epistemic briefing and tool audit trail            |
|  3. Evaluates Decision Engine candidate and SHA-256 hash match          |
|  4. Explicit Action: [ APPROVE & EXECUTE ]  or  [ REJECT ]              |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  SOCKET.IO REAL-TIME NOTIFICATION                       |
|   `route:updated` ➔ Ambulance Driver Cockpit updates turn-by-turn HUD    |
+-------------------------------------------------------------------------+
```

### Safety Protections:
1. **Advisory-Only Scope**: The GeoAgent cannot execute database mutations, cannot dispatch vehicles, and cannot broadcast route changes.
2. **Loop & Budget Caps**: Max 6 rounds, 3 tool calls per round, 8 total tool calls, 8-second timeout per tool.
3. **Prompt Injection Defense**: Untrusted user inputs, patient names, and notes are sanitized and passed strictly as quoted string literals in data parameters, never interpreted as instructions.
4. **Content-Addressed Routing**: Reroute candidates are SHA-256 hashed when proposed; the hash must match identically at execution time.

---

## 4. Real-Time Socket Architecture

The Socket.IO gateway (`server/server.js`) utilizes room-based multiplexing:

### Room Conventions
- `global`: System-wide fleet updates and control room events
- `emergency:{emergencyId}`: Targeted room for responders and dispatchers assigned to an active emergency
- `vehicle:{vehicleId}`: Direct downlink to the ambulance driver HUD

### Core Lifecycle Events
| Event Name | Direction | Payload Description |
|---|---|---|
| `vehicle:location:update` | Driver ➔ Server ➔ Rooms | Real-time GPS fix `{ vehicleId, coordinates, speed, heading }` |
| `route:deviation:detected` | Server ➔ Control Room | Cross-track deviation alert `{ emergencyId, distance, status }` |
| `situation:analyzed` | Server ➔ Control Room | Epistemic analysis & delay prediction `{ situation, delay, confidence }` |
| `decision:proposed` | Server ➔ Control Room | Authoritative candidate generated `{ decisionId, action, reasonCodes }` |
| `decision:approved` | Control Room ➔ Server | Dispatcher approval `{ decisionId, approvedBy, executionHash }` |
| `route:updated` | Server ➔ Driver HUD | Active navigation corridor switch `{ emergencyId, newRouteGeoJSON }` |
| `v2x:clearance:update` | Server ➔ Driver HUD | Green-wave signal preemptions & civilian yield counts |

---

## 5. Architectural References
- Full REST route catalog: [docs/API.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/API.md)
- Development setup and execution: [docs/DEVELOPMENT.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/DEVELOPMENT.md)
- Threat modeling & audit details: [docs/SECURITY.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/SECURITY.md)
