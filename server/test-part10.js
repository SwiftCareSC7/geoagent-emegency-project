import mongoose from 'mongoose';
import http from 'http';
import bcrypt from 'bcryptjs';
import { io as ioClient } from 'socket.io-client';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

import { evaluateDecisionRules } from './modules/decisions/decision.rules.js';
import decisionService from './modules/decisions/decision.service.js';
import { DECISION_ACTIONS, DECISION_STATUS, DECISION_SEVERITY, DECISION_TRANSITIONS } from './modules/decisions/decision.constants.js';

import User from './modules/auth/user.model.js';
import { generateToken } from './modules/auth/jwt.utils.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';
import Route from './modules/routes/route.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Decision from './modules/decisions/decision.model.js';
import realtimeService from './modules/realtime/realtime.service.js';
import { REALTIME_EVENTS, REALTIME_ROOMS } from './modules/realtime/realtime.constants.js';

console.log('=== RUNNING PART 10 DECISION & DISPATCH ENGINE TESTS ===\n');

// ===== Setup =====
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_part10_decisions';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const TEST_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

// Lightweight HTTP + Socket.IO server for real-time tests
const expressModule = await import('express');
const app = expressModule.default();
const httpServer = http.createServer(app);
realtimeService.init(httpServer, { clientUrl: 'http://localhost:3000' });

await new Promise((resolve) => httpServer.listen(0, resolve));
const port = httpServer.address().port;
const serverUrl = `http://localhost:${port}`;

await mongoose.connect(TEST_URI);
console.log('Connected to MongoDB:', TEST_URI);

// ===== Wipe collections =====
await Promise.all([
  User.deleteMany({}),
  Vehicle.deleteMany({}),
  Emergency.deleteMany({}),
  Incident.deleteMany({}),
  Route.deleteMany({}),
  Trajectory.deleteMany({}),
  Decision.deleteMany({})
]);

// ===== Helpers =====
const makePoint = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] });

const seededVehicleId = (seed) => `AMB-${String(seed).padStart(3, '0')}`;
const routeId = (seed) => `ROUTE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const emergencyId = (n) => `EMG-${String(n).padStart(4, '0')}`;

async function createAdminUser(name = 'Test Admin', email = 'admin@test.local', role = 'ADMIN') {
  const hashed = await bcrypt.hash('password123', 4);
  const u = await User.create({ name, email, password: hashed, role });
  return u;
}

async function createVehicle(vehicleId, opts = {}) {
  return Vehicle.create({
    vehicleId,
    registrationNumber: vehicleId.toUpperCase().replace('-', ''),
    type: 'AMBULANCE',
    status: opts.status || 'AVAILABLE',
    driverName: opts.driverName || 'Test Driver',
    driverContact: '0000000000',
    hospitalName: opts.hospitalName || 'Base Station',
    capacity: 2
  });
}

async function createEmergencyWithAssignment(emNum, vehicleId, opts = {}) {
  const eid = emergencyId(emNum);
  const emergency = await Emergency.create({
    emergencyId: eid,
    type: opts.type || 'MEDICAL',
    priority: opts.priority || 'HIGH',
    status: opts.status || 'DISPATCHED',
    location: opts.location || makePoint(77.5946, 12.9716),
    destination: opts.destination || makePoint(77.6400, 12.9800),
    callerName: 'Caller',
    createdBy: opts.userId,
    assignedVehicle: opts.assignedVehicleId,
    isDeleted: false
  });
  return emergency;
}

async function createRoute(vehicleDoc, emergencyDoc, opts = {}) {
  const rid = routeId(Math.floor(Math.random() * 100000));
  const route = await Route.create({
    routeId: rid,
    emergency: emergencyDoc._id,
    vehicle: vehicleDoc._id,
    origin: emergencyDoc.location,
    destination: emergencyDoc.destination || makePoint(77.6400, 12.9800),
    geometry: {
      type: 'LineString',
      coordinates: [
        emergencyDoc.location.coordinates,
        [77.6100, 12.9750],
        (emergencyDoc.destination || makePoint(77.6400, 12.9800)).coordinates
      ]
    },
    distance: 5000,
    duration: 600,
    provider: 'MOCK',
    routeType: 'PLANNED',
    status: opts.status || 'ACTIVE',
    createdBy: opts.userId
  });
  return route;
}

async function createTrajectory(vehicleDoc, lng, lat, speed = 30, heading = 90) {
  return Trajectory.create({
    vehicle: vehicleDoc._id,
    location: makePoint(lng, lat),
    speed,
    heading,
    timestamp: new Date(),
    source: 'SIMULATOR'
  });
}

async function createIncident(opts = {}) {
  const count = await Incident.countDocuments();
  return Incident.create({
    incidentId: `INC-${String(count + 1).padStart(4, '0')}`,
    type: opts.type || 'ACCIDENT',
    severity: opts.severity || 'MEDIUM',
    status: 'ACTIVE',
    location: opts.location || makePoint(77.6010, 12.9735),
    description: opts.description || 'Test incident',
    reportedBy: opts.userId,
    isDeleted: false
  });
}

let pass = 0;
let fail = 0;

function ok(name) {
  console.log(`  ✔ ${name}`);
  pass++;
}

function bad(name, err) {
  console.error(`  ✘ ${name}: ${err.message}`);
  fail++;
}

// =====================================================
// 1. RULES ENGINE: Continue scenario (on route, low delay)
// =====================================================
console.log('\n1. Rules: Continue (on-route, low delay, no severe incident)');
try {
  const result = evaluateDecisionRules({
    emergency: { id: 'EMG-0001', priority: 'LOW', status: 'IN_PROGRESS' },
    vehicle: { id: 'AMB-001', status: 'EN_ROUTE' },
    route: { id: 'R1', status: 'ACTIVE' },
    deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 10 },
    traffic: { level: 'LIGHT' },
    eta: { currentMinutes: 10, originalMinutes: 10, delayMinutes: 0 },
    correlatedIncidents: [],
    alternativeRoutes: [],
    availableBackupVehicles: [],
    geoAgentRecommendation: { action: 'CONTINUE', confidence: 0.9 }
  });

  if (!result.actions.includes('CONTINUE')) throw new Error(`Expected CONTINUE in actions, got ${result.actions.join(',')}`);
  if (result.primaryAction !== 'CONTINUE') throw new Error(`Primary should be CONTINUE, got ${result.primaryAction}`);
  if (result.severity !== 'NORMAL') throw new Error(`Severity should be NORMAL, got ${result.severity}`);
  if (!result.reasonCodes.includes('OPERATIONAL_BASELINE')) throw new Error('Missing OPERATIONAL_BASELINE reason code');
  ok('Continue scenario produces CONTINUE/NORMAL');
} catch (e) { bad('Continue scenario', e); }

// =====================================================
// 2. RULES ENGINE: Reroute scenario (deviation + heavy traffic)
// =====================================================
console.log('\n2. Rules: Reroute (deviation, heavy traffic, viable alternative)');
try {
  const result = evaluateDecisionRules({
    emergency: { id: 'EMG-0002', priority: 'HIGH', status: 'IN_PROGRESS' },
    vehicle: { id: 'AMB-002', status: 'EN_ROUTE' },
    route: { id: 'R2', status: 'ACTIVE' },
    deviation: { status: 'DEVIATED', distanceFromRouteMeters: 180 },
    traffic: { level: 'HEAVY' },
    eta: { currentMinutes: 16, originalMinutes: 10, delayMinutes: 6 },
    correlatedIncidents: [],
    alternativeRoutes: [
      { name: 'Bypass', etaMinutes: 7, traffic: 'MODERATE', incidentExposure: 'LOW' }
    ],
    availableBackupVehicles: [],
    geoAgentRecommendation: { action: 'REROUTE', confidence: 0.8 }
  });

  if (!result.actions.includes('REROUTE')) throw new Error(`Expected REROUTE, got ${result.actions.join(',')}`);
  if (result.primaryAction !== 'REROUTE') throw new Error(`Primary should be REROUTE, got ${result.primaryAction}`);
  if (!result.reasonCodes.includes('ROUTE_DEVIATION')) throw new Error('Missing ROUTE_DEVIATION reason code');
  if (!result.reasonCodes.includes('HEAVY_TRAFFIC')) throw new Error('Missing HEAVY_TRAFFIC reason code');
  if (!result.reasonCodes.includes('ALTERNATIVE_ROUTE_AVAILABLE')) throw new Error('Missing ALTERNATIVE_ROUTE_AVAILABLE reason code');
  ok('Reroute scenario produces REROUTE with correct reason codes');
} catch (e) { bad('Reroute scenario', e); }

// =====================================================
// 3. RULES ENGINE: Backup (critical, ETA exceeds threshold, backup faster)
// =====================================================
console.log('\n3. Rules: Backup (critical, ETA > threshold, backup faster)');
try {
  const result = evaluateDecisionRules({
    emergency: { id: 'EMG-0003', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    vehicle: { id: 'AMB-003', status: 'EN_ROUTE' },
    route: { id: 'R3', status: 'ACTIVE' },
    deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 10 },
    traffic: { level: 'MODERATE' },
    eta: { currentMinutes: 18, originalMinutes: 10, delayMinutes: 8 },
    correlatedIncidents: [],
    alternativeRoutes: [],
    availableBackupVehicles: [
      { vehicleId: 'AMB-099', estimatedArrivalMinutes: 3 }
    ],
    geoAgentRecommendation: { action: 'CONSIDER_BACKUP', confidence: 0.7 }
  });

  if (!result.actions.includes('CONSIDER_BACKUP')) throw new Error(`Expected CONSIDER_BACKUP, got ${result.actions.join(',')}`);
  if (result.primaryAction !== 'CONSIDER_BACKUP') throw new Error(`Primary should be CONSIDER_BACKUP, got ${result.primaryAction}`);
  if (!result.backup.recommended) throw new Error('Backup should be recommended');
  if (result.backup.candidateVehicleId !== 'AMB-099') throw new Error(`Wrong candidate: ${result.backup.candidateVehicleId}`);
  if (!result.reasonCodes.includes('BACKUP_FASTER')) throw new Error('Missing BACKUP_FASTER reason code');
  ok('Backup scenario produces CONSIDER_BACKUP with candidate');
} catch (e) { bad('Backup scenario', e); }

// =====================================================
// 4. RULES ENGINE: Insufficient data
// =====================================================
console.log('\n4. Rules: Insufficient data (no vehicle)');
try {
  const result = evaluateDecisionRules({
    emergency: { id: 'EMG-0004', priority: 'HIGH', status: 'IN_PROGRESS' },
    vehicle: null,
    route: null,
    deviation: null,
    traffic: null,
    eta: null,
    correlatedIncidents: [],
    alternativeRoutes: [],
    availableBackupVehicles: [],
    geoAgentRecommendation: null
  });

  if (!result.actions.includes('ALERT_CONTROL_ROOM')) throw new Error('Expected ALERT_CONTROL_ROOM for insufficient data');
  if (result.severity !== 'CRITICAL') throw new Error('Insufficient data should be CRITICAL');
  if (!result.reasonCodes.includes('INSUFFICIENT_DATA')) throw new Error('Missing INSUFFICIENT_DATA');
  ok('Insufficient data scenario produces ALERT_CONTROL_ROOM/CRITICAL');
} catch (e) { bad('Insufficient data scenario', e); }

// =====================================================
// 5. RULES ENGINE: AI conflict detection
// =====================================================
console.log('\n5. Rules: AI recommendation conflict (geoAgent=REROUTE, rules=CONTINUE)');
try {
  const result = evaluateDecisionRules({
    emergency: { id: 'EMG-0005', priority: 'LOW', status: 'IN_PROGRESS' },
    vehicle: { id: 'AMB-005', status: 'EN_ROUTE' },
    route: { id: 'R5', status: 'ACTIVE' },
    deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 10 },
    traffic: { level: 'FREE' },
    eta: { currentMinutes: 10, originalMinutes: 10, delayMinutes: 0 },
    correlatedIncidents: [],
    alternativeRoutes: [],
    availableBackupVehicles: [],
    geoAgentRecommendation: { action: 'REROUTE', confidence: 0.9 }
  });

  if (!result.reasonCodes.includes('AI_RECOMMENDATION_CONFLICT')) {
    throw new Error('Expected AI_RECOMMENDATION_CONFLICT reason code');
  }
  ok('AI recommendation conflict is recorded');
} catch (e) { bad('AI conflict scenario', e); }

// =====================================================
// 6. STATE MACHINE: invalid transitions
// =====================================================
console.log('\n6. State machine: invalid transitions are rejected');
try {
  // REJECTED -> APPROVED should not be allowed
  if (DECISION_TRANSITIONS['REJECTED'].includes('APPROVED')) throw new Error('REJECTED should not transition to APPROVED');
  if (DECISION_TRANSITIONS['EXECUTED'].includes('PENDING_OPERATOR_ACTION')) throw new Error('EXECUTED should not go back');
  if (!DECISION_TRANSITIONS['PENDING_OPERATOR_ACTION'].includes('APPROVED')) throw new Error('PENDING should allow APPROVED');
  if (!DECISION_TRANSITIONS['APPROVED'].includes('EXECUTED')) throw new Error('APPROVED should allow EXECUTED');
  ok('State machine transition map is correctly defined');
} catch (e) { bad('State machine', e); }

// =====================================================
// 7. END-TO-END: Analyze, approve, execute
// =====================================================
console.log('\n7. End-to-end: analyze -> approve -> execute');
try {
  const admin = await createAdminUser('Operator Seven', 'op7@test.local', 'CONTROL_ROOM');
  const vehicleDoc = await createVehicle(seededVehicleId(7), { status: 'EN_ROUTE' });
  const emergencyDoc = await createEmergencyWithAssignment(7, seededVehicleId(7), {
    userId: admin._id,
    assignedVehicleId: vehicleDoc._id,
    priority: 'CRITICAL',
    destination: makePoint(77.7000, 13.0500)
  });
  const route = await createRoute(vehicleDoc, emergencyDoc, { userId: admin._id });

  // Trajectories: vehicle is far from route to trigger deviation
  await createTrajectory(vehicleDoc, 77.7000, 13.1000, 30, 90);
  await createTrajectory(vehicleDoc, 77.6950, 13.0900, 30, 90);
  await createTrajectory(vehicleDoc, 77.6900, 13.0800, 30, 90);

  // Backup vehicle
  await createVehicle(seededVehicleId(99), { status: 'AVAILABLE' });

  const decision = await decisionService.analyzeEmergency(emergencyDoc.emergencyId);

  if (!decision.decisionId || !decision.decisionId.startsWith('DEC-')) throw new Error('Decision should have DEC- id');
  if (decision.status !== DECISION_STATUS.PENDING_OPERATOR_ACTION) throw new Error('Decision should start in PENDING_OPERATOR_ACTION');
  if (!decision.situationHash || decision.situationHash.length === 0) throw new Error('Situation hash should be set');
  if (!decision.actions || decision.actions.length === 0) throw new Error('Decision should have at least one action');

  // Approve
  const approved = await decisionService.approveDecision(decision.decisionId, admin._id);
  if (approved.status !== DECISION_STATUS.APPROVED) throw new Error('Should be APPROVED');
  if (!approved.approvedAt || !approved.approvedBy) throw new Error('Approval audit fields should be set');

  // Execute
  const executed = await decisionService.executeDecision(decision.decisionId, admin._id);
  if (executed.status !== DECISION_STATUS.EXECUTED) throw new Error('Should be EXECUTED');
  if (!executed.executedAt || !executed.executionSummary) throw new Error('Execution audit fields should be set');

  ok('analyze → approve → execute flow succeeds');
} catch (e) { bad('End-to-end flow', e); }

// =====================================================
// 8. END-TO-END: rejection path
// =====================================================
console.log('\n8. End-to-end: rejection path');
try {
  const admin = await createAdminUser('Operator Eight', 'op8@test.local', 'CONTROL_ROOM');
  const vehicleDoc = await createVehicle(seededVehicleId(8), { status: 'EN_ROUTE' });
  const emergencyDoc = await createEmergencyWithAssignment(8, seededVehicleId(8), {
    userId: admin._id,
    assignedVehicleId: vehicleDoc._id
  });
  await createRoute(vehicleDoc, emergencyDoc, { userId: admin._id });
  await createTrajectory(vehicleDoc, 77.5946, 12.9716, 30, 90);

  const decision = await decisionService.analyzeEmergency(emergencyDoc.emergencyId);
  const rejected = await decisionService.rejectDecision(decision.decisionId, admin._id, 'Operator override');
  if (rejected.status !== DECISION_STATUS.REJECTED) throw new Error('Should be REJECTED');
  if (rejected.rejectionReason !== 'Operator override') throw new Error('Reason not recorded');
  ok('Rejection flow succeeds with reason');
} catch (e) { bad('Rejection flow', e); }

// =====================================================
// 9. INVALID STATE TRANSITION
// =====================================================
console.log('\n9. Invalid state transition rejected (REJECTED → APPROVED)');
try {
  const admin = await createAdminUser('Operator Nine', 'op9@test.local', 'CONTROL_ROOM');
  const vehicleDoc = await createVehicle(seededVehicleId(9), { status: 'EN_ROUTE' });
  const emergencyDoc = await createEmergencyWithAssignment(9, seededVehicleId(9), {
    userId: admin._id,
    assignedVehicleId: vehicleDoc._id
  });
  await createRoute(vehicleDoc, emergencyDoc, { userId: admin._id });
  await createTrajectory(vehicleDoc, 77.5946, 12.9716, 30, 90);

  const decision = await decisionService.analyzeEmergency(emergencyDoc.emergencyId);
  await decisionService.rejectDecision(decision.decisionId, admin._id, 'no');

  let threw = false;
  try {
    await decisionService.approveDecision(decision.decisionId, admin._id);
  } catch (e) {
    if (e.status === 409) threw = true;
  }
  if (!threw) throw new Error('Approving a REJECTED decision should fail with 409');
  ok('REJECTED → APPROVED transition is rejected');
} catch (e) { bad('Invalid state transition', e); }

// =====================================================
// 10. IDEMPOTENCY: same situation hash returns existing decision
// =====================================================
console.log('\n10. Idempotency: identical situation returns existing decision');
try {
  const admin = await createAdminUser('Operator Ten', 'op10@test.local', 'CONTROL_ROOM');
  const vehicleDoc = await createVehicle(seededVehicleId(10), { status: 'EN_ROUTE' });
  const emergencyDoc = await createEmergencyWithAssignment(10, seededVehicleId(10), {
    userId: admin._id,
    assignedVehicleId: vehicleDoc._id
  });
  await createRoute(vehicleDoc, emergencyDoc, { userId: admin._id });
  await createTrajectory(vehicleDoc, 77.5946, 12.9716, 30, 90);

  const first = await decisionService.analyzeEmergency(emergencyDoc.emergencyId);
  const second = await decisionService.analyzeEmergency(emergencyDoc.emergencyId);

  if (first.decisionId !== second.decisionId) {
    throw new Error(`Idempotency broken: ${first.decisionId} != ${second.decisionId}`);
  }
  ok('Repeated analysis of unchanged situation returns same decision');
} catch (e) { bad('Idempotency', e); }

// =====================================================
// 11. AUTHORIZATION: unauthenticated access rejected
// =====================================================
console.log('\n11. Authorization: missing token returns 401');
try {
  const res = await fetch(`${serverUrl}/api/decisions/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emergencyId: 'EMG-0001' })
  });
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  ok('Unauthenticated POST /api/decisions/analyze returns 401');
} catch (e) { bad('Authorization 401', e); }

// =====================================================
// 12. AUTHORIZATION: insufficient role rejected
// =====================================================
console.log('\n12. Authorization: insufficient role returns 403');
try {
  // Register a non-operational user (we use CONTROL_ROOM-only restriction here)
  // The Decision module grants CONTROL_ROOM and ADMIN. We need to simulate a user without role.
  // Easiest: forge a token for a user whose role is something else.
  const weak = await User.create({
    name: 'Weak',
    email: 'weak@test.local',
    password: 'x',
    role: 'CONTROL_ROOM' // include role first to satisfy user creation; we'll downgrade role after
  });
  weak.role = 'SOME_OTHER_ROLE'; // simulate role downgrade
  await weak.save();
  const token = generateToken(weak._id, weak.role);

  const res = await fetch(`${serverUrl}/api/decisions/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
    body: JSON.stringify({ emergencyId: 'EMG-0001' })
  });
  if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  ok('Non-operational role returns 403');
} catch (e) { bad('Authorization 403', e); }

// =====================================================
// 13. INVALID CLIENT-SUPPLIED OPERATIONAL FIELDS
// =====================================================
console.log('\n13. Validation: client-supplied operational fields rejected');
try {
  const admin = await createAdminUser('Operator Thirteen', 'op13@test.local', 'CONTROL_ROOM');
  const token = generateToken(admin._id, admin.role);

  const res = await fetch(`${serverUrl}/api/decisions/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
    body: JSON.stringify({
      emergencyId: 'EMG-9999',
      severity: 'CRITICAL',        // ← client-supplied, must be rejected
      actions: ['REROUTE']
    })
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  ok('Client-supplied severity/actions rejected with 400');
} catch (e) { bad('Operational field validation', e); }

// =====================================================
// 14. REAL-TIME EVENT: decision.created broadcast
// =====================================================
console.log('\n14. Real-time: decision.created event broadcast');
try {
  const admin = await createAdminUser('Operator Fourteen', 'op14@test.local', 'CONTROL_ROOM');
  const token = generateToken(admin._id, admin.role);

  // Mock User.findById for socket auth
  const originalFindById = User.findById;
  User.findById = () => ({
    select: () => Promise.resolve({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    })
  });

  const socket = ioClient(serverUrl, {
    transports: ['websocket'],
    auth: { token },
    reconnection: false
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });

  const eventReceived = new Promise((resolve, reject) => {
    socket.on(REALTIME_EVENTS.DECISION_CREATED, (envelope) => {
      try {
        if (envelope.version !== 1) throw new Error('Wrong envelope version');
        if (!envelope.data.decisionId || !envelope.data.decisionId.startsWith('DEC-')) {
          throw new Error('Missing decisionId in envelope');
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    setTimeout(() => reject(new Error('Decision event not received within timeout')), 5000);
  });

  // Trigger an analyze via REST so the service emits the event
  const vehicleDoc = await createVehicle(seededVehicleId(14), { status: 'EN_ROUTE' });
  const emergencyDoc = await createEmergencyWithAssignment(14, seededVehicleId(14), {
    userId: admin._id,
    assignedVehicleId: vehicleDoc._id
  });
  await createRoute(vehicleDoc, emergencyDoc, { userId: admin._id });
  await createTrajectory(vehicleDoc, 77.5946, 12.9716, 30, 90);

  // Restore User.findById so REST middleware works
  User.findById = originalFindById;

  const res = await fetch(`${serverUrl}/api/decisions/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
    body: JSON.stringify({ emergencyId: emergencyDoc.emergencyId })
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);

  await eventReceived;

  // Cleanup
  socket.disconnect();
  ok('decision.created event received by subscriber');
} catch (e) { bad('Real-time decision.created event', e); }

// =====================================================
// 15. GET DECISIONS FOR EMERGENCY
// =====================================================
console.log('\n15. GET /api/emergencies/:emergencyId/decisions');
try {
  const admin = await createAdminUser('Operator Fifteen', 'op15@test.local', 'CONTROL_ROOM');
  const token = generateToken(admin._id, admin.role);

  const vehicleDoc = await createVehicle(seededVehicleId(15), { status: 'EN_ROUTE' });
  const emergencyDoc = await createEmergencyWithAssignment(15, seededVehicleId(15), {
    userId: admin._id,
    assignedVehicleId: vehicleDoc._id
  });
  await createRoute(vehicleDoc, emergencyDoc, { userId: admin._id });
  await createTrajectory(vehicleDoc, 77.5946, 12.9716, 30, 90);

  const generated = await decisionService.analyzeEmergency(emergencyDoc.emergencyId);

  const res = await fetch(`${serverUrl}/api/emergencies/${emergencyDoc.emergencyId}/decisions`, {
    headers: { Cookie: `token=${token}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error('Response not successful');
  if (!Array.isArray(body.data) || body.data.length === 0) throw new Error('Should have at least 1 decision');
  const found = body.data.find((d) => d.decisionId === generated.decisionId);
  if (!found) throw new Error('Generated decision not in list');
  ok('GET /api/emergencies/:emergencyId/decisions returns paginated decisions');
} catch (e) { bad('GET decisions for emergency', e); }

// =====================================================
// 16. CLEANUP
// =====================================================
console.log('\n16. Cleanup test database and HTTP server');
try {
  await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.disconnect();
  ok('Cleanup complete');
} catch (e) { bad('Cleanup', e); }

// ===== Summary =====
console.log(`\n=== PART 10 TEST RESULTS: ${pass} passed, ${fail} failed ===`);
if (fail > 0) {
  process.exit(1);
} else {
  console.log('=== ALL PART 10 DECISION & DISPATCH ENGINE TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}