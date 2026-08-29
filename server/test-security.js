import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { io as ClientIO } from 'socket.io-client';

import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Route from './modules/routes/route.model.js';
import Decision from './modules/decisions/decision.model.js';

import authRoutes from './modules/auth/auth.routes.js';
import vehicleRoutes from './modules/vehicles/vehicle.routes.js';
import emergencyRoutes from './modules/emergencies/emergency.routes.js';
import incidentRoutes from './modules/incidents/incident.routes.js';
import trajectoryRoutes from './modules/trajectories/trajectory.routes.js';
import routeRoutes from './modules/routes/route.routes.js';
import deviationRoutes from './modules/deviation/deviation.routes.js';
import trafficRoutes from './modules/traffic/traffic.routes.js';
import analysisRoutes from './modules/analysis/analysis.routes.js';
import geoagentRoutes from './modules/geoagents/geoagent.routes.js';
import decisionRoutes from './modules/decisions/decision.routes.js';
import orchestrationRoutes from './modules/orchestration/orchestration.routes.js';
import realtimeService from './modules/realtime/realtime.service.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import { generateToken } from './modules/auth/jwt.utils.js';

console.log('================================================================');
console.log('     RUNNING COMPREHENSIVE BACKEND SECURITY VERIFICATION SUITE   ');
console.log('================================================================\n');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'security_test_secret_key_1234567890';
process.env.NODE_ENV = 'test';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-security-test';
await mongoose.connect(MONGO_URI);
console.log(`[DB] Connected to MongoDB test database: ${MONGO_URI}`);

// Clean collections
await User.deleteMany({});
await Vehicle.deleteMany({});
await Emergency.deleteMany({});
await Incident.deleteMany({});
await Trajectory.deleteMany({});
await Route.deleteMany({});
await Decision.deleteMany({});

// Setup Express App
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/trajectories', trajectoryRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/deviation', deviationRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/geoagent', geoagentRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/orchestration', orchestrationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
realtimeService.init(httpServer);

const PORT = 54333;
await new Promise((resolve) => httpServer.listen(PORT, resolve));
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedCount++;
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & PASSWORD HASH INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 1. Authentication & Password Security ---');

// 1.1 Password Hashing and No Password Leakage
const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Secured Operator',
    email: 'sec_operator@geoagent.test',
    password: 'SuperSecretPassword123!'
  })
});
const regData = await regRes.json();
assert(regRes.status === 201, 'Registration returns 201 Created');
assert(!regData.user.password, 'Registration response never contains password or password hash');

const dbUser = await User.findOne({ email: 'sec_operator@geoagent.test' });
assert(dbUser && dbUser.password !== 'SuperSecretPassword123!', 'Password is cryptographically hashed in database (bcrypt)');
assert(dbUser.password.startsWith('$2'), 'Bcrypt algorithm hash confirmed ($2a / $2b)');

// 1.2 Unauthenticated Access Rejection
const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
assert(unauthRes.status === 401, 'Unauthenticated request to protected route returns 401 Unauthorized');

// 1.3 Forged/Malformed Token Rejection
const forgedRes = await fetch(`${BASE_URL}/api/auth/me`, {
  headers: { Authorization: 'Bearer forged.token.signature' }
});
assert(forgedRes.status === 401, 'Forged JWT token rejected with 401 Unauthorized');

// Create test tokens
const operatorToken = generateToken(dbUser._id, 'CONTROL_ROOM');

const adminUser = new User({
  name: 'System Admin',
  email: 'admin@geoagent.test',
  password: 'AdminPassword123!',
  role: 'ADMIN'
});
await adminUser.save();
const adminToken = generateToken(adminUser._id, 'ADMIN');

// -------------------------------------------------------------
// 2. ROLE-BASED ACCESS CONTROL & PRIVILEGE ESCALATION
// -------------------------------------------------------------
console.log('\n--- 2. Role-Based Access Control & Privilege Escalation ---');

// 2.1 Non-admin trying to register a vehicle (POST /api/vehicles is ADMIN only)
const nonAdminVehRes = await fetch(`${BASE_URL}/api/vehicles`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    vehicleId: 'AMB-SEC-01',
    registrationNumber: 'KA-01-SEC-0001',
    type: 'AMBULANCE',
    driverName: 'Test Driver',
    capacity: 2
  })
});
assert(nonAdminVehRes.status === 403, 'Non-admin role (CONTROL_ROOM) is forbidden (403) from creating vehicles');


// 2.2 Operator trying to delete a vehicle (DELETE /api/vehicles/:id is ADMIN only)
const operatorDeleteVehRes = await fetch(`${BASE_URL}/api/vehicles/AMB-SEC-01`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${operatorToken}` }
});
assert(operatorDeleteVehRes.status === 403, 'Control Room operator is forbidden (403) from deleting vehicles');

// 2.3 Admin can create vehicle
const adminVehRes = await fetch(`${BASE_URL}/api/vehicles`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    vehicleId: 'AMB-SEC-01',
    registrationNumber: 'KA-01-SEC-0001',
    type: 'AMBULANCE',
    driverName: 'Secured Driver',
    capacity: 2
  })
});
assert(adminVehRes.status === 201, 'Admin can successfully register a vehicle (201)');

// -------------------------------------------------------------
// 3. OPERATIONAL TAMPERING & MASS ASSIGNMENT DEFENSE
// -------------------------------------------------------------
console.log('\n--- 3. Mass Assignment & Operational Tampering Defense ---');

// Create an emergency call
const emgRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    type: 'ACCIDENT',
    priority: 'HIGH',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    destination: { type: 'Point', coordinates: [77.6200, 12.9350] }
  })
});
const emgData = await emgRes.json();
const emergencyId = emgData.data.emergencyId;

// 3.1 Client attempts to tamper with protected fields (isDeleted, createdBy, _id) during update
const tamperRes = await fetch(`${BASE_URL}/api/emergencies/${emergencyId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    description: 'Updated legitimate description',
    isDeleted: true, // Should be ignored
    createdBy: '000000000000000000000000' // Should be ignored
  })
});
const tamperData = await tamperRes.json();
const checkEmg = await Emergency.findOne({ emergencyId });
assert(checkEmg.isDeleted === false, 'Mass assignment attempt to set isDeleted: true is safely ignored');
assert(checkEmg.createdBy.toString() === dbUser._id.toString(), 'Mass assignment attempt to overwrite createdBy is safely ignored');

// 3.2 Client attempts to supply fake operational metrics in Orchestration
const fakeMetricRes = await fetch(`${BASE_URL}/api/orchestration/emergencies/${emergencyId}/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    eta: 1, // Fake metric
    traffic: 'CLEAR',
    decision: 'DO_NOTHING'
  })
});
assert(fakeMetricRes.status === 400, 'Client-supplied fake operational metrics in body are strictly rejected with 400');

// 3.3 Client attempts to supply fake actions in Decision analyze
const fakeDecisionRes = await fetch(`${BASE_URL}/api/decisions/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    emergencyId,
    primaryAction: 'FORGED_ACTION',
    severity: 'LOW'
  })
});
assert(fakeDecisionRes.status === 400, 'Client-supplied fake decision action parameters are rejected with 400');

// -------------------------------------------------------------
// 4. GEOSPATIAL & COORDINATE BOUNDARY VALIDATION
// -------------------------------------------------------------
console.log('\n--- 4. Geospatial & Coordinate Boundary Validation ---');

// 4.1 Longitude > 180
const badLngRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    type: 'MEDICAL',
    priority: 'CRITICAL',
    location: { type: 'Point', coordinates: [185.0, 12.9716] }
  })
});
assert(badLngRes.status === 400, 'Invalid longitude (> 180) rejected with 400 Bad Request');

// 4.2 Latitude < -90
const badLatRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    type: 'MEDICAL',
    priority: 'CRITICAL',
    location: { type: 'Point', coordinates: [77.5946, -95.0] }
  })
});
assert(badLatRes.status === 400, 'Invalid latitude (< -90) rejected with 400 Bad Request');

// 4.3 Malformed GeoJSON structure (String instead of Array)
const malformedGeoRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    type: 'MEDICAL',
    priority: 'CRITICAL',
    location: { type: 'Point', coordinates: '77.5946, 12.9716' }
  })
});
assert(malformedGeoRes.status === 400, 'Malformed coordinates (string) rejected with 400 Bad Request');

// -------------------------------------------------------------
// 5. QUERY BOUNDARIES & MONGODB OPERATOR INJECTION DEFENSE
// -------------------------------------------------------------
console.log('\n--- 5. Query Boundaries & Injection Defense ---');

// Ingest a valid trajectory point
await fetch(`${BASE_URL}/api/trajectories`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    vehicleId: 'AMB-SEC-01',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    speed: 35.0,
    heading: 90.0,
    timestamp: new Date()
  })
});

// 5.1 Negative speed in trajectory
const negSpeedRes = await fetch(`${BASE_URL}/api/trajectories`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${operatorToken}`
  },
  body: JSON.stringify({
    vehicleId: 'AMB-SEC-01',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    speed: -50.0,
    heading: 90.0
  })
});
assert(negSpeedRes.status === 400, 'Negative trajectory speed rejected with 400 Bad Request');

// 5.2 Excessive limit boundary capping (unbounded queries)
const bigLimitRes = await fetch(`${BASE_URL}/api/trajectories/AMB-SEC-01?limit=100000`, {
  headers: { Authorization: `Bearer ${operatorToken}` }
});
const bigLimitData = await bigLimitRes.json();
assert(bigLimitData.pagination.limit <= 100, 'Unbounded query limit capped at safe maximum (100)');

// 5.3 NaN query injection
const nanLimitRes = await fetch(`${BASE_URL}/api/trajectories/AMB-SEC-01?limit=invalid_nan&page=invalid_nan`, {
  headers: { Authorization: `Bearer ${operatorToken}` }
});
const nanLimitData = await nanLimitRes.json();
assert(nanLimitData.pagination.limit === 50 && nanLimitData.pagination.page === 1, 'NaN query parameters safely normalized to default values');

// -------------------------------------------------------------
// 6. REAL-TIME SOCKET.IO SECURITY & ROOM ISOLATION
// -------------------------------------------------------------
console.log('\n--- 6. Real-Time Socket.IO Security & Handshake ---');

// 6.1 Unauthorized connection rejected
const badSocket = ClientIO(BASE_URL, {
  auth: { token: 'invalid_token_signature' },
  transports: ['websocket'],
  reconnection: false
});
const badConnErr = await new Promise((resolve) => {
  badSocket.on('connect_error', (err) => resolve(err));
});
assert(badConnErr && badConnErr.message.includes('Authentication error'), 'Socket.IO unauthenticated connection rejected at handshake');
badSocket.disconnect();

// 6.2 Authorized operator connection
const goodSocket = ClientIO(BASE_URL, {
  auth: { token: operatorToken },
  transports: ['websocket']
});
const isConnected = await new Promise((resolve) => {
  goodSocket.on('connect', () => resolve(true));
  setTimeout(() => resolve(false), 3000);
});
assert(isConnected, 'Socket.IO authorized operator connection established');
goodSocket.disconnect();

// -------------------------------------------------------------
// 7. ERROR HANDLING & DATA LEAKAGE PREVENTION
// -------------------------------------------------------------
console.log('\n--- 7. Error Handling & Data Leakage Prevention ---');

// 7.1 Missing route status preservation
const notFoundRouteRes = await fetch(`${BASE_URL}/api/non_existent_endpoint`);
const notFoundData = await notFoundRouteRes.json();
assert(notFoundRouteRes.status === 404, 'Non-existent route returns 404 status code');
assert(!notFoundData.stack, 'Error response does not leak internal stack traces to client');

// -------------------------------------------------------------
// CLEANUP & SUMMARY
// -------------------------------------------------------------
await mongoose.disconnect();
await new Promise((resolve) => httpServer.close(resolve));

console.log('\n================================================================');
console.log(`  SECURITY TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
