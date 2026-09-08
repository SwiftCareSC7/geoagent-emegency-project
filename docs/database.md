# Database Architecture & Reference

The GeoAgentic Emergency Response System uses **MongoDB** as its persistent data store with **Mongoose ODM**.

---

## 1. Relational Map

```text
User (Control Room / Admin)
 ├── creates ─────────► Emergency ◄────── references ─── Incident (optional)
 ├── creates ─────────► Route
 ├── reports ─────────► Incident
 └── approves/rejects ─► Decision
                           │
Vehicle (Ambulance/Engine) ◄┤
 ├── assigned to ─────────► Emergency
 ├── logs ────────────────► Trajectory (Time-Series GPS)
 └── targets ─────────────► Route
                           ▲
                           │
Route ─────────────────────┼─────────► Prediction (Quantitative ETA/Delay)
                           │
Decision ──────────────────┴─────────► references Emergency, Vehicle, Route
```

---

## 2. Collections & Schemas (Source of Truth)

All schemas below are verified directly against backend source code in `server/modules/`.

### 2.1 `users`
**Model**: `server/modules/auth/user.model.js`  
Represents dispatchers, supervisors, and administrative personnel.

```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash (salt rounds: 12)
  role: {
    type: String,
    enum: ['CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'],
    default: 'CONTROL_ROOM'
  },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ email: 1 }` (unique)
  - `{ role: 1, createdAt: -1 }` (administrative listing & role filtering)
- **Security Rule**: The `password` hash is excluded by default via `.select('-password')` and stripped in `.toSafeObject()`.

---

### 2.2 `vehicles`
**Model**: `server/modules/vehicles/vehicle.model.js`  
Represents emergency response vehicles (ambulances, fire engines, police units).

```javascript
{
  vehicleId: { type: String, required: true, unique: true, immutable: true, trim: true },
  registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: {
    type: String,
    enum: ['AMBULANCE', 'FIRE_ENGINE', 'POLICE'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'AVAILABLE',
      'DISPATCHED',
      'EN_ROUTE',
      'AT_SCENE',
      'RETURNING',
      'OFFLINE',
      'MAINTENANCE'
    ],
    default: 'AVAILABLE'
  },
  driverName: { type: String, required: true, trim: true },
  driverContact: { type: String, trim: true },
  hospitalName: { type: String, trim: true },
  hospitalCode: { type: String, trim: true },
  capacity: { type: Number, required: true, min: 1 },
  isDeleted: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ vehicleId: 1 }` (unique)
  - `{ registrationNumber: 1 }` (unique)
  - `{ status: 1, isDeleted: 1 }` (fleet dispatch queries)
  - `{ createdAt: -1 }` (administrative pagination & chronological sort)

---

### 2.3 `emergencies`
**Model**: `server/modules/emergencies/emergency.model.js`  
Represents emergency response missions.

```javascript
{
  emergencyId: { type: String, required: true, unique: true, immutable: true, trim: true },
  type: {
    type: String,
    enum: ['MEDICAL', 'ACCIDENT', 'FIRE', 'POLICE', 'OTHER'],
    required: true
  },
  priority: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH'
  },
  status: {
    type: String,
    enum: ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'AT_SCENE', 'RESOLVED', 'CANCELLED'],
    default: 'PENDING'
  },
  callerName: { type: String, trim: true },
  callerContact: { type: String, trim: true },
  description: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  destination: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ location: '2dsphere' }` (spatial proximity)
  - `{ destination: '2dsphere' }`
  - `{ assignedVehicle: 1, isDeleted: 1 }`
  - `{ status: 1, isDeleted: 1 }`
  - `{ createdAt: -1 }` (administrative sort)

---

### 2.4 `incidents`
**Model**: `server/modules/incidents/incident.model.js`  
Represents reported road obstructions, accidents, or hazards.

```javascript
{
  incidentId: { type: String, required: true, unique: true, immutable: true, trim: true },
  type: {
    type: String,
    enum: ['ACCIDENT', 'ROAD_CLOSURE', 'ROAD_WORK', 'TRAFFIC_JAM', 'FIRE', 'WEATHER', 'PUBLIC_EVENT', 'OTHER'],
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'],
    default: 'ACTIVE'
  },
  description: { type: String, trim: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', default: null },
  isDeleted: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ location: '2dsphere' }` (spatial proximity to routes)
  - `{ emergency: 1, isDeleted: 1 }`
  - `{ status: 1, isDeleted: 1 }`
  - `{ createdAt: -1 }` (administrative sort)

---

### 2.5 `trajectories`
**Model**: `server/modules/trajectories/trajectory.model.js`  
High-frequency GPS tracking points logged per vehicle.

```javascript
{
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  speed: { type: Number, required: true, min: 0, max: 250 }, // km/h
  heading: { type: Number, required: true, min: 0, max: 360 }, // degrees (0 = North)
  timestamp: { type: Date, required: true },
  source: {
    type: String,
    enum: ['SIMULATOR', 'DEVICE', 'API'],
    default: 'SIMULATOR'
  },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ vehicle: 1, timestamp: -1 }` (compound index for fast retrieval of latest fixes and windowed slices)
  - `{ location: '2dsphere' }`
- **Performance Note**: Trajectories represent high-frequency time-series data. The Admin API uses `estimatedDocumentCount()` for $O(1)$ fast volume estimation to prevent full collection table scans.

---

### 2.6 `routes`
**Model**: `server/modules/routes/route.model.js`  
Planned and alternative navigation paths for emergencies.

```javascript
{
  routeId: { type: String, required: true, unique: true, immutable: true, trim: true },
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  origin: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  },
  destination: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  },
  geometry: {
    type: { type: String, enum: ['LineString'], required: true },
    coordinates: { type: [[Number]], required: true } // Array of [lng, lat] coordinates
  },
  distance: { type: Number, required: true, min: 0 }, // meters
  duration: { type: Number, required: true, min: 0 }, // seconds
  provider: {
    type: String,
    enum: ['MOCK', 'GOOGLE', 'MAPBOX', 'OSRM'],
    required: true
  },
  routeType: {
    type: String,
    enum: ['PLANNED', 'ALTERNATIVE', 'CURRENT'],
    default: 'PLANNED'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ routeId: 1 }` (unique)
  - `{ emergency: 1, routeType: 1 }`
  - `{ vehicle: 1, status: 1 }`
  - `{ geometry: '2dsphere' }`
  - `{ origin: '2dsphere' }`
  - `{ destination: '2dsphere' }`
  - `{ createdAt: -1 }` (administrative sort)

---

### 2.7 `decisions`
**Model**: `server/modules/decisions/decision.model.js`  
Authoritative operational decisions produced by the deterministic Decision Engine, reconciled with Gemini advisory recommendations.

```javascript
{
  decisionId: { type: String, required: true, unique: true, immutable: true, trim: true },
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  severity: {
    type: String,
    enum: ['NORMAL', 'WARNING', 'CRITICAL'],
    required: true
  },
  actions: [{
    type: String,
    enum: ['CONTINUE', 'REROUTE', 'CONSIDER_BACKUP', 'ALERT_CONTROL_ROOM', 'NO_ACTION']
  }],
  primaryAction: {
    type: String,
    enum: ['CONTINUE', 'REROUTE', 'CONSIDER_BACKUP', 'ALERT_CONTROL_ROOM', 'NO_ACTION'],
    required: true
  },
  backup: {
    recommended: { type: Boolean, default: false },
    candidateVehicleId: { type: String, default: null },
    backupEtaMinutes: { type: Number, default: null },
    currentEtaMinutes: { type: Number, default: null }
  },
  reasonCodes: [{ type: String }],
  geoAgentRecommendation: {
    action: { type: String, default: null },
    confidence: { type: Number, default: null },
    fallback: { type: Boolean, default: false }
  },
  inputSnapshot: { type: mongoose.Schema.Types.Mixed },
  situationHash: { type: String, required: true }, // 30s idempotency hash
  status: {
    type: String,
    enum: ['PENDING_OPERATOR_ACTION', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED'],
    default: 'PENDING_OPERATOR_ACTION'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  executedAt: { type: Date, default: null },
  executionSummary: { type: String, default: null },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ emergency: 1, createdAt: -1 }`
  - `{ emergency: 1, situationHash: 1 }`
  - `{ status: 1, createdAt: -1 }`

---

### 2.8 `predictions`
**Model**: `server/modules/analysis/prediction.model.js`  
Quantitative ETA and delay prediction snapshots produced by the prediction engine for post-incident review and operational transparency.

```javascript
{
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  predictedEta: { type: Date, required: true },
  baselineEta: { type: Date, required: true },
  predictedDurationSeconds: { type: Number, required: true },
  baselineDurationSeconds: { type: Number, required: true },
  predictedDelaySeconds: { type: Number, required: true, default: 0 },
  predictedDelayMinutes: { type: Number, required: true, default: 0 },
  delayRisk: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  routeRisk: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  confidence: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
    required: true
  },
  confidenceScore: { type: Number, min: 0, max: 1 },
  rerouteAdvised: { type: Boolean, default: false },
  rerouteUrgency: {
    type: String,
    enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE'],
    default: 'NONE'
  },
  factors: [{
    factor: { type: String, required: true },
    impact: { type: String, required: true },
    epistemicType: {
      type: String,
      enum: ['OBSERVED', 'DERIVED', 'INFERRED', 'UNKNOWN'],
      required: true
    }
  }],
  inputsSummary: { type: mongoose.Schema.Types.Mixed },
  modelVersion: { type: String, default: 'v1.2-exponential-traffic-blend' },
  trafficSource: { type: String, default: 'UNKNOWN' },
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ vehicle: 1, createdAt: -1 }`
  - `{ emergency: 1, createdAt: -1 }`
  - `{ delayRisk: 1 }`

---

## 3. Data Exposure & Security Boundaries

1. **Passwords and Hashes**: Never exposed over any API (omitted by `.select('-password')` and projection).
2. **Database Credentials**: Connection strings, passwords, and server credentials are never exposed in health or admin endpoints.
3. **No Raw Query Execution**: The frontend cannot submit MongoDB queries, `$where`, or raw operators. All queries are strictly pre-parameterized and validated on the backend.
4. **Bounded Pagination**: All admin collection queries are bounded with `limit <= 100` (default 20).
5. **Role Exclusivity**: All `/api/admin/*` endpoints require `protect` and `requireRole('ADMIN')`. Other roles (`CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`) receive `403 Forbidden`.

---

## 4. Developer Database Inspection (Local Development)

The application admin console is an operational observability layer, **not** a raw database browser.
During local development, developers who need direct database access can use **MongoDB Compass**:

1. Open **MongoDB Compass**.
2. Connect to the local MongoDB instance using the URI configured in `server/.env` (default: `mongodb://127.0.0.1:27017`).
3. Select the configured database (e.g. `geoagent-emergency-test`).
4. Inspect collections, indexes, and documents directly.

*(Do not place production database credentials into documentation or code).*

---

## 5. Data Retention & Scaling Considerations

- **Trajectories Growth**: High-frequency vehicle GPS fixes generate high volume over time. In production, consider a rolling TTL index on `trajectories.timestamp` (e.g., 30–90 days retention) or moving expired trajectories to a cold archive.
- **Predictions**: Prediction snapshots are captured for explainability and should be pruned after emergency resolution or retained for 30 days.
- **Operational Records**: Emergencies, Vehicles, Incidents, and Decisions are mission-critical audit trails and must never be deleted automatically by TTL. Soft-deletion (`isDeleted: true`) is enforced.
