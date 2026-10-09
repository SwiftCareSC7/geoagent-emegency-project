# SwiftCare GeoAgent — Comprehensive API Reference & Realtime Specification

This document provides the authoritative reference for all REST API endpoints, Next.js route handlers, and Socket.IO event contracts implemented in SwiftCare GeoAgent.

---

## 1. Authentication & Security

All authenticated endpoints require an active session via an **HTTP-only cookie (`auth_token`)** or an **`Authorization: Bearer <jwt>`** header.

### Roles & Access Matrix

- **`CONTROL_ROOM`**: Dispatcher console, emergency creation, reroute decisions, situation analysis.
- **`DRIVER`**: Vehicle dashboard, turn-by-turn navigation HUD, leg progression.
- **`PARAMEDIC`**: Patient triage, vital signs entry, hospital handoff status.
- **`ADMIN`**: Global system health, user role management, fleet configuration, raw collection inspection.

---

## 2. Authentication Endpoints (`/api/auth`)

### POST `/api/auth/register`

Creates a new user account with an operational role. Accounts default to `PENDING` quarantine status for supervisory verification.

- **Access**: Public (Rate limited: max 30 requests per 15 min)
- **Request Body**:

```json
{
  "name": "Jane Doe",
  "email": "jane@swiftcare.local",
  "password": "Password123!",
  "role": "CONTROL_ROOM", // "CONTROL_ROOM", "DRIVER", "PARAMEDIC" (ADMIN cannot be self-registered)
  "requestedRole": "CONTROL_ROOM",
  "requestedWorkspaces": ["CONTROL_ROOM"],
  "assignedVehicleId": "AMB-01" // required for DRIVER
}
```

- **Response `201 Created`**:

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Jane Doe",
    "email": "jane@swiftcare.local",
    "role": "CONTROL_ROOM",
    "status": "PENDING",
    "requestedRole": "CONTROL_ROOM",
    "requestedWorkspaces": ["CONTROL_ROOM"],
    "permittedWorkspaces": [],
    "assignedVehicleId": null
  }
}
```

### POST `/api/auth/login`

Authenticates credentials and sets an HTTP-only JWT cookie.

- **Access**: Public
- **Request Body**:

```json
{
  "email": "dispatcher@swiftcare.local",
  "password": "Password123!"
}
```

- **Response `200 OK`**:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Head Dispatcher",
    "email": "dispatcher@swiftcare.local",
    "role": "CONTROL_ROOM",
    "status": "APPROVED",
    "permittedWorkspaces": ["CONTROL_ROOM", "ADMIN"],
    "assignedVehicleId": null
  }
}
```

### GET `/api/auth/me`

Retrieves the profile of the currently authenticated user.

- **Access**: Authenticated (`Bearer` or Cookie)
- **Response `200 OK`**:

```json
{
  "success": true,
  "user": {
    "id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Head Dispatcher",
    "email": "dispatcher@swiftcare.local",
    "role": "CONTROL_ROOM",
    "status": "APPROVED",
    "permittedWorkspaces": ["CONTROL_ROOM", "ADMIN"],
    "assignedVehicleId": null
  }
}
```

### POST `/api/auth/logout`

Clears the session cookie and invalidates client credentials.

- **Access**: Authenticated
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 3. Vehicle Fleet Endpoints (`/api/vehicles`)

### GET `/api/vehicles`

List all registered emergency vehicles with optional status filtering.

- **Access**: Authenticated
- **Query Parameters**:
  - `status`: Filter by `AVAILABLE`, `DISPATCHED`, `EN_ROUTE`, `AT_SCENE`, `RETURNING`, `MAINTENANCE`
  - `type`: `AMBULANCE`, `FIRE_ENGINE`, `POLICE`
- **Response `200 OK`**:

```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "vehicleId": "AMB-01",
      "registrationNumber": "KA-01-EA-1001",
      "type": "AMBULANCE",
      "status": "EN_ROUTE",
      "driverName": "Ramesh Kumar",
      "driverContact": "+91 98450 11001",
      "hospitalName": "Manipal Hospital HAL",
      "hospitalCode": "BLR-MAN-01",
      "capacity": 2
    }
  ]
}
```

### GET `/api/vehicles/:vehicleId`

Fetch complete state, assigned emergency, and latest telemetry for a single unit.

### POST `/api/vehicles`

Register a new vehicle into the fleet (Admin only).

---

## 4. Emergency Management Endpoints (`/api/emergencies`)

### GET `/api/emergencies`

List emergencies with optional status filter (`PENDING`, `DISPATCHED`, `EN_ROUTE`, `ON_SCENE`, `TRANSPORTING`, `RESOLVED`, `CANCELLED`).

- **Response `200 OK`**: Array of emergency objects.

### POST `/api/emergencies`

Create a new emergency record.

- **Access**: `CONTROL_ROOM`, `ADMIN`
- **Request Body**:

```json
{
  "emergencyId": "EMG-0001",
  "callerName": "Sunil Shetty",
  "callerContact": "+91 98451 99001",
  "location": {
    "type": "Point",
    "coordinates": [77.649028, 12.957836],
    "address": "Manipal Hospital HAL Emergency Bay, Bengaluru"
  },
  "priority": "CRITICAL",
  "type": "MEDICAL",
  "description": "Acute cardiac arrest reported at outpatient lobby."
}
```

### PATCH `/api/emergencies/:id/assign`

Assign an available ambulance unit to an active emergency incident.

---

## 5. Telemetry & Trajectory Endpoints (`/api/trajectories`)

### POST `/api/trajectories`

Ingest raw vehicle GPS telemetry fixes, compute cross-track distance, and evaluate deviation.

- **Request Body**:

```json
{
  "vehicleId": "AMB-01",
  "emergencyId": "EMG-0001",
  "latitude": 12.9692,
  "longitude": 77.6125,
  "speed": 46.5,
  "heading": 105.2,
  "timestamp": "2026-09-28T01:10:00.000Z"
}
```

- **Response `201 Created`**:

```json
{
  "success": true,
  "data": {
    "vehicleId": "AMB-01",
    "distanceFromRouteMeters": 18.4,
    "status": "ON_ROUTE",
    "deviationSeverity": "NORMAL",
    "snappedToRoad": true
  }
}
```

### GET `/api/trajectories/vehicle/:vehicleId`

Fetch chronological trajectory breadcrumb points for a vehicle (supports `?limit=50`).

---

## 6. Multi-Provider Routing Endpoints (`/api/routes`)

### POST `/api/routes`

Calculate and persist authoritative route corridors between origin and destination.

- **Request Body**:

```json
{
  "emergencyId": "EMG-0001",
  "vehicleId": "AMB-01",
  "origin": { "type": "Point", "coordinates": [77.594697, 12.971848] },
  "destination": { "type": "Point", "coordinates": [77.649028, 12.957836] }
}
```

- **Response `201 Created`**:

```json
{
  "success": true,
  "data": {
    "routeId": "RT-EMG-0001-01",
    "provider": "google",
    "status": "PLANNED",
    "distanceMeters": 6420,
    "durationSeconds": 880,
    "geometry": {
      "type": "LineString",
      "coordinates": [[77.594697, 12.971848], [77.5971, 12.9712], "..."]
    }
  }
}
```

### GET `/api/routes/alternatives`

Fetch real road candidate alternative routes avoiding active corridor blockages.

---

## 7. GeoAgent & Intelligence Endpoints (`/api/geoagent`)

### POST `/api/geoagent/analyze`

Triggers GeoAgent free-model LLM operational reasoning (OpenRouter / OpenCode) with 3-tier epistemic output and deterministic fallback.

- **Request Body**:

```json
{
  "vehicleId": "AMB-01",
  "emergencyId": "EMG-0001"
}
```

- **Response `200 OK`**:

```json
{
  "success": true,
  "data": {
    "status": "ANALYZED",
    "vehicleId": "AMB-01",
    "emergencyId": "EMG-0001",
    "assessment": {
      "routeStatus": "CRITICAL_DEVIATION",
      "likelyCause": "ACCIDENT_INDUCED_CONGESTION",
      "confidence": 0.88
    },
    "eta": {
      "currentMinutes": 24,
      "originalMinutes": 14,
      "delayMinutes": 10
    },
    "recommendation": {
      "action": "REROUTE",
      "routeId": "RT-ALT-INDIRANAGAR",
      "summary": "Divert via Indiranagar 100ft Rd bypass to avoid Domlur blockage."
    },
    "backup": {
      "recommended": false,
      "reason": "Detour recovers 9.5 minutes; secondary unit dispatch not required."
    },
    "observations": {
      "observed": [
        "Vehicle is 182m off planned corridor",
        "Multi-car accident confirmed at Old Airport Rd / Domlur flyover"
      ],
      "inferred": [
        "Primary corridor impassable with projected delay +14.2 min"
      ],
      "unknown": [
        "Exact tow truck clearance window (est 45-60 min)"
      ]
    },
    "reasoning": "A major accident blocks the Old Airport corridor. Recommended detour saves 9.5 minutes and reaches patient within acceptable window."
  }
}
```

---

## 8. Decision Engine Endpoints (`/api/decisions`)

### GET `/api/decisions/active`

Retrieve currently pending decisions awaiting operator approval.

### POST `/api/decisions/:id/approve`

Operator authorizes the recommended detour or backup dispatch.

- **Access**: `CONTROL_ROOM`, `ADMIN`
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Decision approved and executed",
  "decision": {
    "id": "DEC-001",
    "status": "APPROVED",
    "actionTaken": "REROUTE",
    "executedAt": "2026-09-28T01:15:00.000Z"
  }
}
```

### POST `/api/decisions/:id/reject`

Operator overrides or rejects the recommendation with an audit reason.

---

## 9. Simulation & What-If Endpoints (`/api/diff/scenarios`)

### GET `/api/diff/scenarios`

Returns the deterministic what-if scenario metadata, 13 progressive milestones, and corridor coordinates.

### POST `/api/diff/scenarios`

Calculates a simulation snapshot for any arbitrary simulation timestamp `T` (0 to 430 seconds):

- **Request Body**: `{ "timestampSeconds": 155 }`
- **Response `200 OK`**: Snapshot containing vehicle position, speed, route layers, accident state, and GeoAgent analysis.

---

## 10. Admin Observability & User Governance Endpoints (`/api/admin`)

Strictly gated behind both JWT authentication (`protect`) and `ADMIN` role (`requireRole('ADMIN')`).

### GET `/api/admin/stats`

Returns system counts, database connectivity metrics, and telemetry volumes across all collections.

### GET `/api/admin/health`

Evaluates database latency ping, server uptime, memory usage, and component health.

### GET `/api/admin/providers`

Evaluates upstream provider health status (`AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, `NOT_CONFIGURED`) without exposing API keys.

### GET `/api/admin/users`

Lists registered users with optional role, status, and search filters.

- **Access**: `ADMIN`
- **Query Params**: `?role=DRIVER&status=PENDING&page=1&limit=20`
- **Response `200 OK`**:

```json
{
  "success": true,
  "count": 1,
  "users": [
    {
      "id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Arun Kumar",
      "email": "driver@swiftcare.local",
      "role": "DRIVER",
      "status": "PENDING",
      "requestedRole": "DRIVER",
      "assignedVehicleId": "AMB-01",
      "permittedWorkspaces": ["DRIVER"]
    }
  ]
}
```

### PATCH `/api/admin/users/:id/approve`

Approves a quarantined user account, activating full login access.

- **Access**: `ADMIN`
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "User approved successfully",
  "user": {
    "id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "status": "APPROVED",
    "approvedBy": "65f8a1b2c3d4e5f6a7b8c999",
    "approvedAt": "2026-09-28T10:00:00.000Z"
  }
}
```

### PATCH `/api/admin/users/:id/suspend`

Suspends a user account immediately, blocking subsequent requests and revoking token validity.

- **Access**: `ADMIN`
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "User suspended successfully",
  "user": {
    "id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "status": "SUSPENDED"
  }
}
```

### PATCH `/api/admin/users/:id/role`

Updates a user's assigned role and permitted workspace boundaries.

- **Access**: `ADMIN`
- **Request Body**:

```json
{
  "role": "CONTROL_ROOM",
  "permittedWorkspaces": ["CONTROL_ROOM", "ADMIN"]
}
```

---

## 11. Realtime Socket.IO Event Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `room:join` | Client -> Server | `{ "room": "control-room" }` | Subscribe to dispatch and fleet stream |
| `room:leave` | Client -> Server | `{ "room": "control-room" }` | Unsubscribe from room |
| `telemetry:update` | Server -> Client | Trajectory & deviation fix | Live GPS position, speed, and cross-track offset |
| `emergency:update` | Server -> Client | Emergency entity | Priority, status, or hospital change |
| `decision:pending` | Server -> Client | Pending decision object | Alerts operator that human action is required |
| `decision:resolved` | Server -> Client | Resolved decision object | Broadcasts approved or rejected state |
| `clearance:update` | Server -> Client | Corridor clearance state | V2X signal preemption status along route |

---

## 12. Resource Ownership Middleware (`requireVehicleOwnership`)

Enforces strict resource-level security in `server/shared/middleware/ownershipMiddleware.js`:

- **`ADMIN` & `CONTROL_ROOM`**: Granted organization-wide dispatch and fleet authority.
- **`DRIVER`**: Restriced strictly to operations matching `req.user.assignedVehicleId`. Attempting to modify or report telemetry for other vehicles returns `403 Forbidden`.
- **`PARAMEDIC`**: Restricted to assigned clinical emergency and vehicle operations.
