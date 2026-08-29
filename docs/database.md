# Database Architecture & Reference

The GeoAgentic Emergency Response System uses **MongoDB** as its persistent data store with **Mongoose ODM**.

---

## 1. Relational Map

```text
User (Control Room / Admin)
 ├── creates ─────────► Emergency ◄────── references ─── Incident (optional)
 ├── creates ─────────► Route
 └── approves/rejects ─► Decision
                           │
Vehicle (Ambulance) ◄──────┤
 ├── receives ─────────────┘
 ├── logs ────────────► Trajectory (Time-Series GPS)
 └── assigned to ─────► Emergency
```

---

## 2. Collections & Schemas

### 2.1 `users`
Represents dispatchers, supervisors, and administrative personnel.

```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, // bcrypt hash (salt rounds: 12)
  role: {
    type: String,
    enum: ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'],
    default: 'CONTROL_ROOM'
  }
}
```
- **Indexes**: `{ email: 1 }` (unique)
- **Security Rule**: The `password` hash is excluded by default via `.select('-password')` and stripped in `.toSafeObject()`.

---

### 2.2 `vehicles`
Represents emergency response vehicles (ambulances, rescue trucks).

```javascript
{
  vehicleId: { type: String, required: true, unique: true, uppercase: true }, // e.g. "AMB-101"
  registrationNumber: { type: String, required: true, unique: true, uppercase: true },
  type: {
    type: String,
    enum: ['AMBULANCE', 'FIRE_TRUCK', 'POLICE', 'RESCUE'],
    default: 'AMBULANCE'
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'AT_SCENE', 'TRANSPORTING', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  capacity: { type: Number, default: 1 },
  driverName: { type: String, required: true },
  isDeleted: { type: Boolean, default: false }
}
```
- **Indexes**:
  - `{ vehicleId: 1 }` (unique)
  - `{ registrationNumber: 1 }` (unique)
  - `{ status: 1, isDeleted: 1 }` (compound index for fast fleet allocation)

---

### 2.3 `emergencies`
Represents 911/emergency intake calls and active response missions.

```javascript
{
  emergencyId: { type: String, required: true, unique: true }, // e.g. "EMG-0001"
  type: {
    type: String,
    enum: ['ACCIDENT', 'CARDIAC', 'FIRE', 'TRAUMA', 'RESPIRATORY', 'OTHER'],
    required: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['REPORTED', 'DISPATCHED', 'ON_SCENE', 'RESOLVED', 'CANCELLED'],
    default: 'REPORTED'
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  destination: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [longitude, latitude] (hospital)
  },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false }
}
```
- **Indexes**:
  - `{ location: '2dsphere' }` (spatial proximity)
  - `{ destination: '2dsphere' }`
  - `{ assignedVehicle: 1, isDeleted: 1 }`
  - `{ status: 1, isDeleted: 1 }`

---

### 2.4 `incidents`
Represents reported road obstructions, accidents, or hazards.

```javascript
{
  incidentId: { type: String, required: true, unique: true }, // e.g. "INC-101"
  type: {
    type: String,
    enum: ['ACCIDENT', 'ROADBLOCK', 'CONGESTION', 'HAZARD', 'WEATHER', 'OTHER'],
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['REPORTED', 'VERIFIED', 'RESOLVED', 'FALSE_ALARM'],
    default: 'REPORTED'
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false }
}
```
- **Indexes**:
  - `{ location: '2dsphere' }`
  - `{ emergency: 1, isDeleted: 1 }`
  - `{ status: 1, isDeleted: 1 }`

---

### 2.5 `trajectories`
High-frequency GPS tracking points logged per vehicle.

```javascript
{
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  speed: { type: Number, required: true, min: 0 }, // km/h
  heading: { type: Number, min: 0, max: 360 }, // degrees (0 = North)
  timestamp: { type: Date, required: true },
  source: {
    type: String,
    enum: ['DEVICE', 'SIMULATOR', 'MANUAL'],
    default: 'DEVICE'
  }
}
```
- **Indexes**:
  - `{ vehicle: 1, timestamp: -1 }` (compound index enabling instant retrieval of latest fix and windowed pagination)
  - `{ location: '2dsphere' }`

---

### 2.6 `routes`
Planned and alternative navigation routes for emergencies.

```javascript
{
  routeId: { type: String, required: true, unique: true }, // e.g. "ROUTE-1001"
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  origin: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  destination: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  geometry: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: { type: [[Number]], required: true } // Array of [lng, lat] coordinates
  },
  distance: { type: Number, required: true }, // meters
  duration: { type: Number, required: true }, // seconds
  provider: {
    type: String,
    enum: ['mock', 'google', 'mapbox', 'osrm'],
    default: 'mock'
  },
  routeType: {
    type: String,
    enum: ['PLANNED', 'ALTERNATIVE', 'HISTORICAL'],
    default: 'PLANNED'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ABANDONED'],
    default: 'ACTIVE'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}
```
- **Indexes**:
  - `{ routeId: 1 }` (unique)
  - `{ emergency: 1, routeType: 1 }`
  - `{ vehicle: 1, status: 1 }`
  - `{ geometry: '2dsphere' }`

---

### 2.7 `decisions`
Authoritative operational decisions produced by the deterministic Decision Engine.

```javascript
{
  decisionId: { type: String, required: true, unique: true }, // e.g. "DEC-1001"
  emergency: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  primaryAction: {
    type: String,
    enum: [
      'MAINTAIN_ROUTE',
      'REROUTE',
      'DISPATCH_BACKUP',
      'ALERT_CONTROL_ROOM',
      'REQUEST_TRAFFIC_OVERRIDE',
      'ESCALATE_TO_SUPERVISOR',
      'STANDBY'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'PENDING_OPERATOR_ACTION',
      'APPROVED',
      'REJECTED',
      'EXECUTED',
      'EXPIRED',
      'AUTO_APPLIED'
    ],
    default: 'PENDING_OPERATOR_ACTION'
  },
  reasonCodes: [{ type: String }],
  inputSnapshot: { type: mongoose.Schema.Types.Mixed },
  situationHash: { type: String, required: true }, // SHA-256 for 30s idempotency
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  executedAt: { type: Date }
}
```
- **Indexes**:
  - `{ decisionId: 1 }` (unique)
  - `{ emergency: 1, createdAt: -1 }`
  - `{ emergency: 1, situationHash: 1 }`
  - `{ status: 1, createdAt: -1 }`

---

## 3. GeoJSON Coordinate Rules

All spatial coordinates MUST adhere to the GeoJSON / RFC 7946 standard:
```text
[longitude, latitude]
Range: -180.0 <= longitude <= 180.0
Range:  -90.0 <= latitude  <=  90.0
```
*(Notice: Longitude comes FIRST, Latitude comes SECOND).*
