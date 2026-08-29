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

console.log('=== RUNNING PART 12 FINAL BACKEND HARDENING & FULL SPECTRUM TESTS ===\n');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'part12_final_hardening_secret_key_for_testing';
process.env.NODE_ENV = 'test';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';
await mongoose.connect(MONGO_URI);
console.log(`Connected to MongoDB: ${MONGO_URI}`);

// Clean all collections before test run
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

const TEST_PORT = 54329;
await new Promise((resolve) => httpServer.listen(TEST_PORT, resolve));
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// --- 1. AUTHENTICATION & TOKEN HARDENING ---
console.log('1. Testing Authentication & Token Hardening...');

// 1a. User Registration (Password Hashing & Strip)
const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Hardened Operator',
    email: 'hardened@geoagent.test',
    password: 'SecurePassword123!'
  })
});
const regData = await regRes.json();
if (regRes.status !== 201 || !regData.user || regData.user.password) {
  throw new Error('Registration failed or leaked password');
}
console.log('✔ Registration successful and password hash is never returned');

// 1b. User Login & Cookie Set
const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'hardened@geoagent.test',
    password: 'SecurePassword123!'
  })
});
const setCookieHeader = loginRes.headers.get('set-cookie');
if (loginRes.status !== 200 || !setCookieHeader || !setCookieHeader.includes('token=')) {
  throw new Error('Login failed or did not return HTTP-only cookie');
}
console.log('✔ Login successfully sets HTTP-only cookie');

const tokenCookie = setCookieHeader.split(';')[0];
const tokenVal = tokenCookie.replace('token=', '');

// 1c. Access Protected Endpoint via Cookie
const meCookieRes = await fetch(`${BASE_URL}/api/auth/me`, {
  headers: { Cookie: tokenCookie }
});
const meCookieData = await meCookieRes.json();
if (meCookieRes.status !== 200 || meCookieData.user.email !== 'hardened@geoagent.test') {
  throw new Error('Cookie authentication failed on protected endpoint');
}
console.log('✔ Cookie authentication verified on GET /api/auth/me');

// 1d. Access Protected Endpoint via Authorization Bearer Header
const meBearerRes = await fetch(`${BASE_URL}/api/auth/me`, {
  headers: { Authorization: `Bearer ${tokenVal}` }
});
const meBearerData = await meBearerRes.json();
if (meBearerRes.status !== 200 || meBearerData.user.email !== 'hardened@geoagent.test') {
  throw new Error('Bearer header authentication failed on protected endpoint');
}
console.log('✔ Authorization: Bearer header verified on GET /api/auth/me');

// 1e. Invalid Token -> 401
const badTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
  headers: { Authorization: 'Bearer invalid_garbage_token' }
});
if (badTokenRes.status !== 401) {
  throw new Error('Invalid token did not return 401 Unauthorized');
}
console.log('✔ Invalid token correctly rejected with 401');

// --- 2. ERROR HANDLER STATUS CODE PRESERVATION ---
console.log('\n2. Testing Error Handler Status Code Preservation...');

// 2a. 404 on Unknown Route
const notFoundRes = await fetch(`${BASE_URL}/api/non_existent_route`);
if (notFoundRes.status !== 404) {
  throw new Error('Non-existent route did not return 404');
}
console.log('✔ Error handler preserves 404 for missing routes');

// Create Admin User & Token
const adminUser = new User({
  name: 'Admin User',
  email: 'admin@geoagent.test',
  password: 'AdminPassword123!',
  role: 'ADMIN'
});
await adminUser.save();
const adminToken = generateToken(adminUser._id, 'ADMIN');

// 2b. 400 on Missing Body Fields
const badVehicleRes = await fetch(`${BASE_URL}/api/vehicles`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({})
});
if (badVehicleRes.status !== 400) {
  throw new Error('Invalid payload did not return 400 Bad Request');
}
console.log('✔ Error handler preserves 400 for validation errors');


// 2c. 409 on Duplicate Resource
const dupUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Duplicate Operator',
    email: 'hardened@geoagent.test',
    password: 'SecurePassword123!'
  })
});
if (dupUserRes.status !== 409) {
  throw new Error('Duplicate user did not return 409 Conflict');
}
console.log('✔ Error handler preserves 409 for conflict errors');

// --- 3. QUERY BOUNDARIES & NAN SAFETY ---
console.log('\n3. Testing Query Boundaries & NaN / Negative Safety...');

const testVehicle = new Vehicle({
  vehicleId: 'AMB-FINAL-01',
  registrationNumber: 'KA-01-XX-9999',
  type: 'AMBULANCE',
  status: 'AVAILABLE',

  driverName: 'Master Driver',
  capacity: 2
});
await testVehicle.save();

// Ingest multiple trajectory points
for (let i = 0; i < 5; i++) {
  const t = new Trajectory({
    vehicle: testVehicle._id,
    location: { type: 'Point', coordinates: [77.5946 + i * 0.001, 12.9716 + i * 0.001] },
    speed: 30 + i,
    heading: 90,
    timestamp: new Date(Date.now() - (5 - i) * 10000),
    source: 'DEVICE'
  });
  await t.save();
}

// 3a. History with NaN & Negative Query Parameters
const nanQueryRes = await fetch(
  `${BASE_URL}/api/trajectories/${testVehicle.vehicleId}?limit=not_a_number&page=-10`,
  { headers: { Authorization: `Bearer ${adminToken}` } }
);
const nanQueryData = await nanQueryRes.json();
if (nanQueryRes.status !== 200 || !nanQueryData.pagination || nanQueryData.pagination.page !== 1) {
  throw new Error('Query with NaN/negative parameters failed or corrupted pagination');
}
console.log('✔ NaN and negative pagination parameters safely normalized to defaults (page=1, limit=50)');

// 3b. History with Unbounded Limit
const unboundedQueryRes = await fetch(
  `${BASE_URL}/api/trajectories/${testVehicle.vehicleId}?limit=999999`,
  { headers: { Authorization: `Bearer ${adminToken}` } }
);
const unboundedQueryData = await unboundedQueryRes.json();
if (unboundedQueryRes.status !== 200 || unboundedQueryData.pagination.limit > 100) {
  throw new Error('Unbounded limit was not capped at maxLimit (100)');
}
console.log('✔ Unbounded query limit safely capped at 100');

// --- 4. GEOJSON & COORDINATE BOUNDARIES ---
console.log('\n4. Testing GeoJSON & Coordinate Boundaries...');

// 4a. Invalid Longitude (> 180)
const badLngRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    type: 'MEDICAL',
    priority: 'HIGH',
    location: { type: 'Point', coordinates: [195.0, 12.9716] } // Lng > 180
  })
});
if (badLngRes.status !== 400) {
  throw new Error('Coordinate with longitude > 180 was not rejected with 400');
}
console.log('✔ Invalid longitude > 180 rejected with 400');

// 4b. Invalid Latitude (> 90)
const badLatRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    type: 'MEDICAL',
    priority: 'HIGH',
    location: { type: 'Point', coordinates: [77.5946, 95.0] } // Lat > 90
  })
});
if (badLatRes.status !== 400) {
  throw new Error('Coordinate with latitude > 90 was not rejected with 400');
}
console.log('✔ Invalid latitude > 90 rejected with 400');

// --- 5. REAL-TIME SOCKET.IO HANDSHAKE & ROOMS ---
console.log('\n5. Testing Socket.IO Handshake & Room Authorization...');

// 5a. Authorized Handshake
const clientSocket = ClientIO(BASE_URL, {
  auth: { token: adminToken },
  transports: ['websocket']
});

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Socket.IO connection timeout')), 3000);
  clientSocket.on('connect', () => {
    clearTimeout(timeout);
    resolve();
  });
  clientSocket.on('connect_error', (err) => {
    clearTimeout(timeout);
    reject(err);
  });
});
console.log('✔ Socket.IO authenticated handshake successful with JWT token');

// 5b. Unauthenticated Handshake Rejection
const unauthSocket = ClientIO(BASE_URL, {
  auth: { token: 'bad_token' },
  transports: ['websocket'],
  reconnection: false
});

const unauthError = await new Promise((resolve) => {
  unauthSocket.on('connect_error', (err) => {
    resolve(err);
  });
});
if (!unauthError || !unauthError.message.includes('Authentication error')) {
  throw new Error('Unauthenticated Socket.IO connection was not rejected');
}
console.log('✔ Unauthenticated Socket.IO connection correctly rejected');

clientSocket.disconnect();
unauthSocket.disconnect();

// --- 6. FULL END-TO-END INTEGRATION SCENARIO ---
console.log('\n6. Testing Full End-to-End Orchestration Workflow...');

// 6a. Create Emergency
const emgRes = await fetch(`${BASE_URL}/api/emergencies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    type: 'ACCIDENT',
    priority: 'CRITICAL',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    destination: { type: 'Point', coordinates: [77.6200, 12.9350] }
  })
});
const emgData = await emgRes.json();
const emergencyId = emgData.data.emergencyId;

// 6b. Assign Vehicle
await fetch(`${BASE_URL}/api/emergencies/${emergencyId}/assign`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({ vehicleId: testVehicle.vehicleId })
});

// 6c. Create Route
await fetch(`${BASE_URL}/api/routes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    emergencyId,
    vehicleId: testVehicle.vehicleId,
    origin: { type: 'Point', coordinates: [77.5946, 12.9716] },
    destination: { type: 'Point', coordinates: [77.6200, 12.9350] }
  })
});

// 6d. Trigger Full End-to-End Orchestration Analysis
const orchRes = await fetch(`${BASE_URL}/api/orchestration/emergencies/${emergencyId}/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  }
});
const orchData = await orchRes.json();

if (
  orchRes.status !== 200 ||
  orchData.data.workflowStatus !== 'COMPLETED' ||
  !orchData.data.epistemicBreakdown ||
  orchData.data.epistemicBreakdown.observed.length === 0
) {
  throw new Error('Full End-to-End Orchestration workflow failed');
}

console.log('✔ Full End-to-End Orchestration completed successfully:');
console.log('   Emergency:', orchData.data.emergency.emergencyId);
console.log('   Vehicle:', orchData.data.vehicle.vehicleId);
console.log('   Route Distance:', orchData.data.route.distanceMeters, 'm');
console.log('   Primary Decision Action:', orchData.data.decision.primaryAction);
console.log('   Observed Facts Count:', orchData.data.epistemicBreakdown.observed.length);
console.log('   Inferred Causes Count:', orchData.data.epistemicBreakdown.inferred.length);
console.log('   Unknown Gaps Count:', orchData.data.epistemicBreakdown.unknown.length);

// Cleanup
await mongoose.disconnect();
await new Promise((resolve) => httpServer.close(resolve));

console.log('\n=== ALL PART 12 FINAL BACKEND HARDENING & REGRESSION TESTS PASSED! ===');
