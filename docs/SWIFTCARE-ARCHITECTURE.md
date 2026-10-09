# SwiftCare GeoAgent — System Architecture & Data Flow Reference

This document provides the authoritative, complete technical architecture and data flow specifications for the **SwiftCare GeoAgent** Emergency Response Platform.

---

## 1. High-Level System Architecture

SwiftCare GeoAgent is built as a hybrid edge-and-cloud emergency operations platform comprising a Next.js 16 frontend, an Express 4 REST & WebSocket backend, a MongoDB persistent database, a deterministic decision engine, and GeoAgent free-tier LLM provider abstraction (OpenRouter / OpenCode) for operational epistemic reasoning.

```mermaid
graph TB
    subgraph ClientLayer["Frontend Presentation Layer (Next.js 16 / React 19)"]
        Landing["Landing Page (/)"]
        AuthUI["Auth & RBAC (/login, /signup, /registration)"]
        ControlRoom["Control Room Dashboard (/control-room)"]
        ControlRoomOverview["Multi-Mission Overview (/control-room/overview)"]
        DiffSim["What-If Scenario Simulator (/diff)"]
        EmergencyLab["Emergency Lab (/emergency-lab)"]
        DriverHUD["Driver Navigation HUD (/driver/dashboard)"]
        ParamedicUI["Paramedic Triage (/paramedic)"]
        AdminConsole["System Admin & User Governance (/admin)"]
    end

    subgraph TransportLayer["Realtime & Ingestion Layer"]
        SocketServer["Socket.IO Server (Port 5001)"]
        HttpServer["Express HTTP REST Server (Port 5001)"]
        NextApiRouter["Next.js App Router API Routes (/api/*)"]
    end

    subgraph DomainServices["Backend Domain & Orchestration Services"]
        VehicleService["Vehicle Fleet Service"]
        EmergencyService["Emergency Dispatch Service"]
        TrajectoryService["Trajectory Ingestion Service"]
        DeviationService["Cross-Track Deviation Engine"]
        AnalysisService["Situation & Incident Correlator"]
        PredictionService["ETA & Delay Prediction Service"]
        RoutingService["Multi-Provider Routing Engine (Google / OSRM / Canonical)"]
        ClearanceService["V2X Corridor Clearance Service"]
        AdminService["Audit & Telemetry Performance Service"]
    end

    subgraph IntelligenceLayer["Dual-Engine Decision Architecture"]
        subgraph DeterministicEngine["Deterministic Safety Rules Engine (Authoritative)"]
            DecisionRules["decision.rules.js (scoreAlternativeRoutes, pickBestAlternative)"]
            StateFSM["Decision State Machine (PENDING -> APPROVED / REJECTED -> EXECUTED)"]
        end

        subgraph GenerativeAgent["GeoAgent Reasoning Layer (Advisory)"]
            GeoAgentClient["GeoAgent Provider (OpenRouter / OpenCode Free Tier)"]
            AgentTools["9 Declarative Tools (geoAgent.tools.js)"]
            EpistemicPrompt["3-Tier Epistemic Prompting (Observed, Inferred, Unknown)"]
        end
    end

    subgraph DataStore["Persistence & Storage Layer"]
        MongoDb[("MongoDB Database (Mongoose ODM)")]
        InMemCache["In-Memory Route & Provider Cache (60s TTL)"]
    end

    ClientLayer --> NextApiRouter
    ClientLayer --> HttpServer
    ClientLayer <--> SocketServer

    NextApiRouter --> DomainServices
    HttpServer --> DomainServices
    SocketServer <--> DomainServices

    DomainServices --> IntelligenceLayer
    IntelligenceLayer --> DomainServices
    DomainServices --> DataStore
    DeterministicEngine --> DataStore
```

---

## 2. Emergency Response Lifecycle

The standard operational lifecycle follows a strict state transition model from initial emergency call to patient delivery:

```mermaid
sequenceDiagram
    autonumber
    actor Caller as 911 / Emergency Caller
    actor Dispatcher as Control Room Dispatcher
    participant API as Backend API & Routing
    participant DB as MongoDB Data Store
    participant Vehicle as Ambulance (AMB-01)
    participant GeoAgent as GeoAgent & Decision Engine
    actor Driver as Ambulance Driver
    actor Paramedic as Hospital / Paramedic

    Caller->>Dispatcher: 1. Reports Medical Emergency
    Dispatcher->>API: 2. Creates Emergency (CRITICAL priority)
    API->>DB: 3. Persists Emergency Record
    API->>API: 4. Computes Canonical / Real Road Corridor
    API->>Vehicle: 5. Dispatches Nearest Unit (AMB-01)
    Vehicle->>API: 6. Streams Live GPS Telemetry (1-5s intervals)
    API->>API: 7. Evaluates Cross-Track Distance (< 50m = ON_ROUTE)
    
    Note over Vehicle,API: Incident Encountered (Collision on Corridor)
    Vehicle->>API: 8. Vehicle Slows / Diverts (Distance > 100m)
    API->>API: 9. Deviation Engine Flags 'DEVIATED' / 'CRITICAL_DEVIATION'
    API->>GeoAgent: 10. Triggers Situation Assessment
    GeoAgent->>API: 11. Queries Alternatives & Incident Exposure
    GeoAgent->>Dispatcher: 12. Emits Epistemic Recommendation (REROUTE via Indiranagar)
    Dispatcher->>API: 13. Operator Action: APPROVE REROUTE
    API->>DB: 14. Updates Active Route Corridor
    API->>Vehicle: 15. Broadcasts New Active Corridor to Driver HUD
    Vehicle->>Driver: 16. Driver Navigates Detour to Scene
    Vehicle->>Paramedic: 17. Patient Loaded -> Leg 2 En Route to Hospital
    Vehicle->>Dispatcher: 18. Arrived at Receiving Emergency Bay
```

---

## 3. Realtime Telemetry & Deviation Ingestion Flow

The vehicle telemetry pipeline processes raw GPS fixes, cleans jitter via snapping, evaluates cross-track distance against the planned route line string, and broadcasts updates via Socket.IO:

```mermaid
flowchart TD
    A["Ambulance GPS Unit / Simulator"] -->|HTTP POST /api/trajectories or Socket.IO| B["Telemetry Ingestion Controller"]
    B --> C{"Coordinate Validation"}
    C -->|Invalid Lat/Lng| D["Reject 400 Bad Request"]
    C -->|Valid [lng, lat]| E["Check Google Roads Snap-to-Roads (if enabled)"]
    E --> F["Compute Haversine Step & Rolling Speed"]
    F --> G["Calculate Cross-Track Distance (distanceFromRouteMeters)"]
    G --> H{"Cross-Track Threshold"}
    
    H -->|< 50m| I["Status: ON_ROUTE"]
    H -->|50m - 100m| J["Status: WARNING"]
    H -->|100m - 200m| K["Status: DEVIATED"]
    H -->|> 200m| L["Status: CRITICAL_DEVIATION"]
    
    I --> M["Persist Trajectory Point to MongoDB"]
    J --> M
    K --> M
    L --> M
    
    M --> N["Broadcast via Socket.IO room: control-room"]
    M --> O["Broadcast via Socket.IO vehicle:{id}"]
    
    K --> P["Trigger Automatic Situation Analysis"]
    L --> P
```

---

## 4. Dual-Engine Decision Architecture: Deterministic Safety vs. Generative GeoAgent

SwiftCare enforces a strict architectural boundary between **Authoritative Deterministic Safety Rules** and **Advisory Generative Intelligence**:

```mermaid
flowchart TD
    subgraph InputContext["Operational Situation Context"]
        Dev["Cross-Track Deviation Status & Distance"]
        Traf["Corridor Traffic Congestion Ratio"]
        Inc["Nearby Road Incidents (< 500m)"]
        ETA["Current ETA vs Baseline Delay"]
        Alts["Candidate Road Alternative Routes"]
        Backups["Available Fleet Units (< 10km)"]
    end

    InputContext --> RulesEngine["Deterministic Rules Engine (decision.rules.js)"]
    InputContext --> GeoAgentEngine["GeoAgent AI Engine (geoAgent.service.js)"]

    subgraph RulesEngineFlow["Authoritative Safety Policy"]
        RulesEngine --> Score["scoreAlternativeRoutes (Traffic + Incident + ETA weights)"]
        Score --> BestAlt["pickBestAlternative (Requires >= 2 min time saving)"]
        BestAlt --> CheckDelay{"Projected Delay >= 10 min?"}
        CheckDelay -->|Yes| CheckBackup{"Available Backup with >= 3 min advantage?"}
        CheckDelay -->|No| RecAction["Primary Action: REROUTE or CONTINUE"]
        CheckBackup -->|Yes| RecBackup["Primary Action: CONSIDER_BACKUP"]
        CheckBackup -->|No| RecAction
    end

    subgraph GeoAgentFlow["Advisory Reasoning (OpenRouter / OpenCode Free Tier)"]
        GeoAgentEngine --> Tools["Tool Calls: getVehicleState, getNearbyIncidents, etc."]
        Tools --> Epistemic["Synthesize 3-Tier Output: OBSERVED, INFERRED, UNKNOWN"]
        Epistemic --> GenAdvice["Advisory Recommendation & 2-sentence Executive Summary"]
    end

    RecAction --> Compare{"Conflict Detection: Rules vs Advisory"}
    RecBackup --> Compare
    GenAdvice --> Compare

    Compare -->|Aligned| DecisionCard["Emit Decision (Severity, Reason Codes, Confidence)"]
    Compare -->|Disagreement| ConflictTag["Attach AI_RECOMMENDATION_CONFLICT Audit Flag"]
    ConflictTag --> DecisionCard

    DecisionCard --> HumanOperator["Human-in-the-Loop Operator (Control Room)"]
    HumanOperator -->|APPROVE| Execute["Execute Action (Switch Active Route or Dispatch Backup)"]
    HumanOperator -->|REJECT| Dismiss["Maintain Current Operation with Audit Reason"]
```

---

## 5. Map & Multi-Provider Routing Architecture

The routing infrastructure abstracts multiple providers behind a unified interface:

```mermaid
flowchart LR
    Caller["Routing Client (routing.service.js)"] --> Router{"Configured Provider"}

    Router -->|ROUTING_PROVIDER=google| Google["Google Routes API (directions/v2:computeRoutes)"]
    Router -->|ROUTING_PROVIDER=osrm| OSRM["OpenStreetMap / OSRM Public Engine"]
    Router -->|Fallback / Offline| Canonical["Canonical Bengalore Road Corridors (demo-fixtures)"]

    Google --> Decoder["High-Precision Polyline Decoder"]
    OSRM --> Decoder
    Canonical --> Validator["Route Geometry Validator (validateRouteGeometry)"]

    Decoder --> Validator

    Validator -->|Check: Continuity, Zero Straight Lines, Real Roads| Valid{"Valid?"}
    Valid -->|Yes| Cache["In-Memory Cache (60s TTL by Coordinate Hash)"]
    Valid -->|No| FallbackToCanonical["Safely Fallback to Canonical Corridor"]
    FallbackToCanonical --> Cache

    Cache --> MapRenderer["Frontend Leaflet / Google Maps Viewport"]
```

---

## 6. Realtime Communication & Socket Room Topography

```mermaid
graph TD
    Client["Connected Browser Client"] --> Auth{"Handshake Auth (JWT Cookie/Bearer)"}
    Auth -->|Valid| Connect["Connection Established"]
    Auth -->|Invalid| Reject["Connection Rejected"]

    Connect --> JoinRoom{"Join Room Command"}
    JoinRoom -->|room:join 'control-room'| CRRoom["Room: control-room (Dispatches, Alerts, Global Telemetry)"]
    JoinRoom -->|room:join 'vehicle:{id}'| VRoom["Room: vehicle:{id} (Dedicated Driver Telemetry)"]
    JoinRoom -->|room:join 'emergency:{id}'| ERoom["Room: emergency:{id} (Mission Detail & Triage)"]
    JoinRoom -->|room:join 'clearance'| ClrRoom["Room: clearance (V2X Green-Wave Corridor Signals)"]

    BackendEmitters["Backend Event Emitters"] --> Emit{"Event Emission"}
    Emit -->|telemetry:update| CRRoom
    Emit -->|telemetry:update| VRoom
    Emit -->|emergency:update| ERoom
    Emit -->|decision:pending| CRRoom
    Emit -->|clearance:update| ClrRoom
```

---

## 7. Authentication, RBAC & Resource Ownership Architecture

```mermaid
flowchart TD
    UserReg["User Registration (/registration)"] --> AutoQuarantine["Quarantine State: status='PENDING'"]
    AutoQuarantine --> AdminReview{"Administrator Verification (/admin)"}
    
    AdminReview -->|Approve| StatusApproved["status='APPROVED' + permittedWorkspaces Configured"]
    AdminReview -->|Suspend| StatusSuspended["status='SUSPENDED' (Token Revoked)"]

    StatusApproved --> LoginAuth["JWT Token Issuance (Cookie + Bearer)"]
    LoginAuth --> ProtectedRoute{"ProtectedRoute Gatekeeper"}

    ProtectedRoute -->|Role & Workspace Match| WorkspaceAccess["Render Authorized Workspace"]
    ProtectedRoute -->|Quarantined / Pending| PendingScreen["Quarantine Boundary: 'Awaiting Admin Approval'"]
    ProtectedRoute -->|Unauthorized Role| RoleRedirect["Redirect to Authorized Workspace"]

    WorkspaceAccess --> ApiCall["Operational API Request (/api/vehicles/*)"]
    ApiCall --> Ownership{"ownershipMiddleware.js (requireVehicleOwnership)"}
    Ownership -->|ADMIN / CONTROL_ROOM| AllowAll["Global Fleet Clearance"]
    Ownership -->|DRIVER| MatchVehicle{"req.user.assignedVehicleId === targetVehicleId"}
    MatchVehicle -->|Yes| AllowDriver["Allow Operation"]
    MatchVehicle -->|No| RejectDriver["403 Forbidden: Bound to Assigned Vehicle"]
```

---

## 8. GeoAgent Tool-Calling & Deterministic Fallback Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Client as Control Room / Trigger
    participant GeoService as GeoAgent Service (geoAgent.service.js)
    participant Provider as LLM Provider Client (geoagent.provider.js)
    participant Tools as Declarative Tools (geoAgent.tools.js)
    participant DB as MongoDB Data Layer
    participant Fallback as Deterministic Fallback Engine

    Client->>GeoService: POST /api/geoagent/analyze (vehicleId, emergencyId)
    GeoService->>DB: Fetch Telemetry, Active Corridor, Deviation Status
    GeoService->>Provider: Initial Chat Completion Prompt + 9 Tool Signatures

    alt Provider Available & Responding
        Provider-->>GeoService: Model Request: Tool Call (e.g. getNearbyIncidents, getAlternativeRoutes)
        loop Tool Execution Loop (Max Iterations)
            GeoService->>Tools: Execute Named Tool with Arguments
            Tools->>DB: Query Incidents / Routes / Telemetry
            DB-->>Tools: Structured Spatial Data
            Tools-->>GeoService: JSON Tool Execution Result
            GeoService->>Provider: Send Tool Output
            Provider-->>GeoService: Next Tool Call or Final Epistemic Synthesis
        end
        GeoService->>GeoService: Parse & Validate 3-Tier Output (Observed, Inferred, Unknown)
        GeoService-->>Client: 200 OK (Epistemic Situation Assessment)
    else Provider Timeout, Error, Quota Exhausted, or Missing Keys
        Provider-->>GeoService: Network Error / 429 Quota Exceeded / Fallback Trigger
        GeoService->>Fallback: Invoke generateFallbackResponse(context)
        Fallback->>Fallback: Run Deterministic Deviation & Heuristic Detour Scoring
        Fallback-->>GeoService: Synthesized Rule-Based Epistemic Analysis
        GeoService-->>Client: 200 OK (Fallback Epistemic Situation Assessment)
    end
```

---

## 9. Deployment Architecture & CI/CD Pipeline

```mermaid
graph TB
    subgraph DeveloperSource["Source Control & CI (GitHub Actions)"]
        GitPush["git push origin main"]
        CIWorkflow[".github/workflows/ci.yml"]
        GitleaksScan["Gitleaks Secret Audit"]
        Typecheck["TypeScript Static Typecheck (tsc --noEmit)"]
        NextBuild["Next.js Turbopack Production Build"]
        TestMongo["MongoDB Test Container (mongodb:7.0)"]
        BackendTests["Backend Auth, RBAC, DB Safety & TTL Test Suites"]
    end

    subgraph HostingInfrastructure["Cloud Production Deployment Targets"]
        subgraph VercelEdge["Frontend Hosting (Vercel)"]
            NextEdgeApp["Next.js 16 Web Application"]
            AppRouterRoutes["App Router API Handlers"]
        end

        subgraph GoogleCloud["Backend Hosting (Google Cloud Run / Render)"]
            CloudRunService["Express 4 + Socket.IO Container (server/Dockerfile)"]
            Port5001["Listening on Port 5001"]
        end

        subgraph ManagedData["Database & External APIs"]
            AtlasCluster[("MongoDB Atlas v7.0+ Replica Set")]
            SecretStore["Secret Storage (Environment Variables / GSM)"]
            GoogleMapsAPI["Google Routes & Roads APIs (Optional)"]
            OpenRouterAI["OpenRouter / OpenCode Free Tier (Optional)"]
        end
    end

    GitPush --> CIWorkflow
    CIWorkflow --> GitleaksScan
    GitleaksScan --> Typecheck
    Typecheck --> NextBuild
    Typecheck --> TestMongo
    TestMongo --> BackendTests

    NextEdgeApp -->|REST API Calls & Proxy| CloudRunService
    NextEdgeApp <-->|Real-Time WebSocket Transport| CloudRunService
    CloudRunService <--> AtlasCluster
    CloudRunService -.-> GoogleMapsAPI
    CloudRunService -.-> OpenRouterAI
    SecretStore -.-> CloudRunService
    SecretStore -.-> NextEdgeApp
```

---

## 10. Finite State Machines (Emergency & Decision Lifecycles)

### Emergency Incident State Transitions

```mermaid
stateDiagram-v2
    [*] --> REPORTED: Call Intake (POST /api/emergencies)
    REPORTED --> DISPATCHED: Ambulance Assigned (PATCH /api/emergencies/:id/assign)
    DISPATCHED --> EN_ROUTE_TO_SCENE: Unit Departs Station
    EN_ROUTE_TO_SCENE --> ON_SCENE: Ambulance Arrives at Patient Location
    ON_SCENE --> TRANSPORTING: Patient Loaded (Leg 2 En Route to Hospital)
    TRANSPORTING --> ARRIVED_HOSPITAL: Reached Receiving Emergency Room
    ARRIVED_HOSPITAL --> RESOLVED: Clinical Handoff Complete
    RESOLVED --> [*]
```

### Deterministic Decision Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Disruption Detected & Detour Scored
    PENDING --> APPROVED: Operator Action: Approve Reroute
    PENDING --> REJECTED: Operator Action: Reject / Override
    PENDING --> TIMED_OUT: Incident Cleared Before Action
    APPROVED --> EXECUTED: New Corridor Broadcasted & Active in DB
    REJECTED --> DISMISSED: Audit Log Saved with Justification
    EXECUTED --> [*]
    DISMISSED --> [*]
    TIMED_OUT --> [*]
```
