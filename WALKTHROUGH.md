# GeoAgentic Emergency Response System - Developer Walkthrough

This document serves as a guide for developers to understand the backend architecture, features, and setup of the GeoAgentic Emergency Response System.

---

## 1. Architecture

The backend follows a **Feature-Based (Modular) Architecture**. This ensures that as the system grows (adding GPS, GeoAgents, routing), features do not become entangled.

```text
Request
  ↓
Middleware (Auth, Rate Limiting, CORS)
  ↓
Route (Role authorization & schema validation)
  ↓
Controller (Thin: parses req, calls service, formats res)
  ↓
Service (Fat: core business logic, DB transactions)
  ↓
Model (Mongoose schema)
  ↓
MongoDB
```

---

## 2. What Was Already Built (Parts 1–3)

- **Part 1 (Foundation)**: Express setup, global error handling, Helmet for security, CORS, MongoDB connection, environment configurations.
- **Part 2 (Authentication)**: `User` model, JWT token generation, HTTP-only cookie delivery, auth middleware, and Role-Based Access Control (`CONTROL_ROOM`, `ADMIN`).
- **Part 3 (Vehicles)**: `Vehicle` module for managing emergency vehicles. Setup of the modular architecture.

---

## 3. What Part 4 Added

Part 4 focused on **Emergency and Incident Management**:
- `Emergency` model to track medical, fire, accident cases.
- `Incident` model to track road closures, multi-vehicle crashes, weather blocks.
- **GeoJSON Data**: Both models store their locations as GeoJSON Points.
- **2dsphere Indexes**: MongoDB indexes for fast spatial queries.
- **Vehicle Assignment**: A secure assignment workflow.
- **Role Permissions**: Stricter role separation (`ADMIN` vs `CONTROL_ROOM`).

---

## 4. File-by-File Explanation

### Emergencies (`server/modules/emergencies/`)
- **`emergency.model.js`**: Defines the `Emergency` schema. Includes fields for type, priority, and `callerContact`. Adds the `2dsphere` index and implements a `toSafeObject()` method to strip internal Mongo IDs (`_id`, `__v`). Also defines an `isDeleted` flag for soft deletions.
- **`emergency.validation.js`**: Contains strict `isValidGeoJSONPoint()` to ensure we receive valid `[longitude, latitude]` arrays. Ensures only valid ENUMs are passed.
- **`emergency.controller.js`**: Thin handlers that parse HTTP requests and forward them to the service layer.
- **`emergency.service.js`**: The core logic. Auto-generates `EMG-0001` IDs. Validates the vehicle assignment state. Performs soft deletions.
- **`emergency.routes.js`**: Maps endpoints. Protects DELETE with `ADMIN`, requires `CONTROL_ROOM` for others.

### Incidents (`server/modules/incidents/`)
- **`incident.model.js`**: Defines the `Incident` schema for tracking obstacles, traffic, and hazards. Includes `isDeleted` flag.
- **`incident.validation.js`**: Reuses GeoJSON validation.
- **`incident.controller.js`** & **`incident.service.js`**: Similar structure to emergencies but tailored for incident fields. Auto-generates `INC-0001` IDs.
- **`incident.routes.js`**: Maps endpoints with appropriate role guards.

---

## 5. Data Flow

### Create Emergency
```text
POST /api/emergencies
        ↓
`authMiddleware.js` verifies JWT
        ↓
`roleMiddleware.js` verifies CONTROL_ROOM/ADMIN
        ↓
`emergency.validation.js` verifies payload & GeoJSON
        ↓
`emergency.controller.js` (createEmergency)
        ↓
`emergency.service.js` (Generates ID, attaches User)
        ↓
MongoDB saves the document
```

### Assign Vehicle
```text
PATCH /api/emergencies/:id/assign
        ↓
Controller forwards `emergencyId` & `vehicleId`
        ↓
Service starts a MongoDB Session/Transaction
        ↓
Find Emergency -> Find Vehicle
        ↓
Check if vehicle.status === 'AVAILABLE'
        ↓
Update Emergency to 'DISPATCHED'
Update Vehicle to 'DISPATCHED'
        ↓
Commit Transaction & Save to DB
```

---

## 6. Database Relationships

```text
User
 │
 ├── creates → Emergency
 │
 └── reports → Incident

Emergency
 │
 └── assignedVehicle → Vehicle

Incident
 │
 └── optionally references → Emergency
```

---

## 7. GeoJSON Explanation

Coordinates are stored strictly as `[longitude, latitude]`. This is the standard mandated by the GeoJSON spec and MongoDB. If stored as `[latitude, longitude]`, MongoDB's `2dsphere` indexes will calculate distances incorrectly or fail entirely.

**Why 2dsphere indexes?**
They allow MongoDB to perform operations on an earth-like sphere, enabling future queries like:
- "Find the nearest AVAILABLE ambulance to this Emergency"
- "Are there any Incidents on the current route?"

---

## 8. Security Walkthrough

- **Soft Deletions**: Deleting an Emergency or Incident sets `isDeleted: true` instead of destroying the document. This preserves historical data for the AI/GeoAgent context without losing operational history. Only `ADMIN` can trigger this.
- **Mass Assignment Prevention**: The update services (`updateEmergency`, `updateIncident`) use explicit allowlists. Clients cannot inject `status`, `emergencyId`, or `createdBy` unless explicitly permitted.
- **Input Validation**: Custom validation middleware blocks malformed GeoJSON and invalid Enums before they reach Mongoose.
- **Contact Privacy**: Caller contacts are not logged out or leaked.
- **Immutable IDs**: Custom IDs (`EMG-xxxx`) are generated server-side and immutable.

---

## 9. Testing Walkthrough

To test the APIs using `curl` or Postman:

1. **Login** to get your HTTP-only cookie.
2. **Create an Emergency**:
   ```json
   POST /api/emergencies
   {
     "type": "MEDICAL",
     "priority": "CRITICAL",
     "description": "Heart attack",
     "location": {
       "type": "Point",
       "coordinates": [77.5946, 12.9716]
     }
   }
   ```
3. **Assign a Vehicle**:
   ```json
   PATCH /api/emergencies/EMG-0001/assign
   {
     "vehicleId": "AMB-001"
   }
   ```
4. **Create an Incident**:
   ```json
   POST /api/incidents
   {
     "type": "ROAD_CLOSURE",
     "severity": "HIGH",
     "description": "Fallen tree",
     "location": {
       "type": "Point",
       "coordinates": [77.6100, 12.9800]
     }
   }
   ```

---

## 10. Future Connection

This module lays the groundwork for the core intelligence of the system. In future steps:
- **GPS**: The assigned Vehicle will emit live coordinates.
- **Routing**: Distance from the Vehicle to the Emergency's `location` will be calculated.
- **GeoAgent**: The AI will query the `Incident` collection using `$near` geospatial queries to warn the driver if an incident (`ROAD_CLOSURE`) lies on their path.
