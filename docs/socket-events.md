# Real-Time Socket.IO Event Reference

The GeoAgentic Emergency Response System uses **Socket.IO** for live, bidirectional, room-isolated push telemetry and operational event streaming.

---

## 1. Connection & Authentication

### Handshake Authentication
All Socket.IO client connections must pass a valid JWT token during the initial connection handshake.

**Client Connection Options**:
```javascript
import { io } from 'socket.io-client';

// Option A: Passing Bearer Token in Auth Object
const socket = io('http://localhost:5000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  transports: ['websocket', 'polling']
});

// Option B: Browser Cookie Session (withCredentials)
const socket = io('http://localhost:5000', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
```

### Authorization Rules
- Handshake verifies the user's role.
- Sockets without a valid JWT or belonging to non-operational roles (outside `CONTROL_ROOM` or `ADMIN`) are rejected with `Authentication error`.

---

## 2. Room Architecture & Isolation

Clients join isolated channel rooms to prevent global message flooding:

| Room Name | Intended Subscribers | Description |
|---|---|---|
| `control-room` | Control Room Operators, Dispatch Supervisors | Receives global fleet updates, emergency alerts, new decisions |
| `emergency:${emergencyId}` | Assigned Dispatchers, Field Coordinators | Receives updates specifically for emergency call `:emergencyId` |
| `vehicle:${vehicleId}` | Ambulance Driver, Vehicle Telematics | Receives navigation updates, reroutes, and alerts for `:vehicleId` |

### Joining & Leaving Rooms (Client → Server)

#### `room:join`
- **Direction**: `CLIENT → SERVER`
- **Payload**:
  ```json
  {
    "room": "emergency:EMG-0001"
  }
  ```

#### `room:leave`
- **Direction**: `CLIENT → SERVER`
- **Payload**:
  ```json
  {
    "room": "emergency:EMG-0001"
  }
  ```

---

## 3. Server-Emitted Operational Events (Server → Client)

All server-emitted events are authoritative and emitted only after state changes persist in MongoDB.

### 3.1 Emergency & Dispatch Events

#### `emergency.created`
- **Room**: `control-room`
- **Trigger**: New emergency intake (`POST /api/emergencies`)
- **Payload**:
  ```json
  {
    "emergencyId": "EMG-0001",
    "type": "ACCIDENT",
    "priority": "CRITICAL",
    "location": { "type": "Point", "coordinates": [77.5946, 12.9716] },
    "createdAt": "2026-08-30T01:00:00.000Z"
  }
  ```

#### `emergency.updated`
- **Room**: `control-room`, `emergency:${emergencyId}`
- **Trigger**: Emergency update or vehicle assignment (`PATCH /api/emergencies/:id`)
- **Payload**:
  ```json
  {
    "emergencyId": "EMG-0001",
    "status": "DISPATCHED",
    "assignedVehicleId": "AMB-101",
    "updatedAt": "2026-08-30T01:05:00.000Z"
  }
  ```

---

### 3.2 Vehicle & Trajectory Events

#### `vehicle.status_updated`
- **Room**: `control-room`, `vehicle:${vehicleId}`
- **Trigger**: Vehicle status transition (`PATCH /api/vehicles/:id` or vehicle assignment)
- **Payload**:
  ```json
  {
    "vehicleId": "AMB-101",
    "status": "DISPATCHED",
    "assignedEmergencyId": "EMG-0001"
  }
  ```

#### `trajectory.ingested`
- **Room**: `control-room`, `vehicle:${vehicleId}`
- **Trigger**: New GPS fix uploaded (`POST /api/trajectories`)
- **Payload**:
  ```json
  {
    "vehicleId": "AMB-101",
    "location": { "type": "Point", "coordinates": [77.5980, 12.9730] },
    "speed": 42.0,
    "heading": 85.0,
    "timestamp": "2026-08-30T01:06:12.000Z"
  }
  ```

---

### 3.3 Deviation & Incident Events

#### `deviation.detected`
- **Room**: `control-room`, `emergency:${emergencyId}`, `vehicle:${vehicleId}`
- **Trigger**: Route deviation calculation crosses threshold (`GET /api/deviation/vehicle/:id`)
- **Payload**:
  ```json
  {
    "vehicleId": "AMB-101",
    "emergencyId": "EMG-0001",
    "status": "DEVIATED",
    "crossTrackDistanceMeters": 194.5,
    "bearingDifferenceDegrees": 45.2,
    "stability": "STABLE",
    "timestamp": "2026-08-30T01:06:15.000Z"
  }
  ```

#### `incident.created`
- **Room**: `control-room`
- **Trigger**: New road hazard or incident report (`POST /api/incidents`)
- **Payload**:
  ```json
  {
    "incidentId": "INC-501",
    "type": "ROADBLOCK",
    "severity": "HIGH",
    "location": { "type": "Point", "coordinates": [77.6010, 12.9745] }
  }
  ```

---

### 3.4 GeoAgent AI & Decision Engine Events

#### `geoagent.analyzed`
- **Room**: `control-room`, `emergency:${emergencyId}`
- **Trigger**: Gemini GeoAgent completes reasoning (`POST /api/geoagent/analyze`)
- **Payload**:
  ```json
  {
    "emergencyId": "EMG-0001",
    "vehicleId": "AMB-101",
    "recommendation": "REROUTE",
    "primaryCause": "ACCIDENT_INDUCED_CONGESTION",
    "confidence": "HIGH",
    "fallback": false
  }
  ```

#### `decision.created`
- **Room**: `control-room`, `emergency:${emergencyId}`
- **Trigger**: Authoritative Decision evaluated (`POST /api/decisions/analyze`)
- **Payload**:
  ```json
  {
    "decisionId": "DEC-9001",
    "emergencyId": "EMG-0001",
    "vehicleId": "AMB-101",
    "primaryAction": "REROUTE",
    "severity": "WARNING",
    "status": "PENDING_OPERATOR_ACTION",
    "reasonCodes": ["DEVIATION_WITHOUT_TRAFFIC"]
  }
  ```

#### `decision.status_updated`
- **Room**: `control-room`, `emergency:${emergencyId}`
- **Trigger**: Operator approves or rejects decision (`PATCH /api/decisions/:id/approve`)
- **Payload**:
  ```json
  {
    "decisionId": "DEC-9001",
    "status": "APPROVED",
    "approvedBy": "USR-101",
    "updatedAt": "2026-08-30T01:07:00.000Z"
  }
  ```

---

## 4. Reconnection & Cleanup

- **Heartbeats**: Socket.IO default ping interval is 25s with 20s timeout.
- **Cleanup**: When a socket disconnects, its room memberships are automatically released by the engine, preventing stale socket references.
