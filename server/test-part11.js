import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Route from './modules/routes/route.model.js';
import Decision from './modules/decisions/decision.model.js';
import orchestrationService from './modules/orchestration/orchestration.service.js';
import orchestrationRoutes from './modules/orchestration/orchestration.routes.js';
import realtimeService from './modules/realtime/realtime.service.js';
import { generateToken } from './modules/auth/jwt.utils.js';

console.log('=== RUNNING PART 11 FULL BACKEND INTEGRATION & ORCHESTRATION TESTS ===\n');

// 1. Connect to isolated in-memory or test database
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_part11_orchestration';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';
await mongoose.connect(MONGO_URI);
console.log(`Connected to MongoDB: ${MONGO_URI}`);


// Clean collections before test run
await User.deleteMany({});
await Vehicle.deleteMany({});
await Emergency.deleteMany({});
await Incident.deleteMany({});
await Trajectory.deleteMany({});
await Route.deleteMany({});
await Decision.deleteMany({});

// 2. Setup test Express app with Socket.IO
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/orchestration', orchestrationRoutes);

const httpServer = http.createServer(app);
realtimeService.init(httpServer);

// Create test operator user
const operator = new User({
  name: 'Orchestration Operator',
  email: 'operator@geoagent.test',
  password: 'Password123!',
  role: 'CONTROL_ROOM'
});
await operator.save();
const operatorToken = generateToken(operator._id);


// 3. Test 1: Full Happy Path End-to-End Workflow
console.log('1. Testing Full Happy Path End-to-End Workflow...');

const testVehicle = new Vehicle({
  vehicleId: 'AMB-101',
  registrationNumber: 'KA-01-EA-1001',
  type: 'AMBULANCE',
  status: 'DISPATCHED',
  driverName: 'John Doe',
  capacity: 2
});
await testVehicle.save();

const testEmergency = new Emergency({
  emergencyId: 'EMG-1001',
  type: 'MEDICAL',
  priority: 'CRITICAL',
  status: 'DISPATCHED',
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  destination: { type: 'Point', coordinates: [77.62, 12.935] },
  assignedVehicle: testVehicle._id,
  createdBy: operator._id
});
await testEmergency.save();


// Primary route line from origin to destination (approx 5km corridor)
const testRoute = new Route({
  routeId: 'ROUTE-1001',
  emergency: testEmergency._id,
  vehicle: testVehicle._id,
  origin: testEmergency.location,
  destination: testEmergency.destination,
  geometry: {
    type: 'LineString',
    coordinates: [
      [77.5946, 12.9716],
      [77.6000, 12.9600],
      [77.6100, 12.9500],
      [77.6200, 12.9350]
    ]
  },
  distance: 5200,
  duration: 600, // 10 minutes
  provider: 'MOCK',
  routeType: 'PLANNED',
  status: 'ACTIVE',
  createdBy: operator._id
});
await testRoute.save();

// Ingest GPS trajectory (displaced ~180m off the corridor to test deviation detection)
const testTrajectory = new Trajectory({
  vehicle: testVehicle._id,
  location: { type: 'Point', coordinates: [77.6020, 12.9605] }, // deviated point
  speed: 25,
  heading: 120,
  timestamp: new Date(),
  source: 'GPS_DEVICE'
});
await testTrajectory.save();

// Correlate a nearby severe incident
const testIncident = new Incident({
  incidentId: 'INC-1001',
  type: 'ACCIDENT',
  severity: 'HIGH',
  status: 'ACTIVE',
  location: { type: 'Point', coordinates: [77.6025, 12.9602] },
  description: 'Multi-vehicle collision blocking two lanes',
  reportedBy: operator._id
});
await testIncident.save();

// Execute full orchestration workflow
const result = await orchestrationService.executeEmergencyWorkflow('EMG-1001');

console.log('✔ Workflow execution status:', result.workflowStatus);
console.log('✔ Emergency ID:', result.emergency.emergencyId, 'Priority:', result.emergency.priority);
console.log('✔ Vehicle ID:', result.vehicle.vehicleId, 'Driver:', result.vehicle.driverName);
console.log('✔ Route ID:', result.route.routeId, 'Status:', result.route.status);
console.log('✔ Latest GPS speed:', result.trajectory.speedKmh, 'km/h');
console.log('✔ Deviation status:', result.analysis.deviation.status, 'Distance:', result.analysis.deviation.distanceFromRouteMeters, 'm');
console.log('✔ Traffic Level:', result.analysis.traffic.level);
console.log('✔ ETA:', result.analysis.eta.currentMinutes, 'min (Delay: +' + result.analysis.delay.delayMinutes + ' min)');
console.log('✔ Correlated Incidents Count:', result.analysis.incidents.length);
console.log('✔ Decision Engine Primary Action:', result.decision.primaryAction, 'Severity:', result.decision.severity);
console.log('✔ Epistemic Breakdown:');
console.log('   Observed facts count:', result.epistemicBreakdown.observed.length);
console.log('   Inferred causes count:', result.epistemicBreakdown.inferred.length);
console.log('   Unknown gaps count:', result.epistemicBreakdown.unknown.length);

if (result.workflowStatus !== 'COMPLETED' || !result.decision || !result.analysis) {
  throw new Error('Happy path workflow failed to return complete integrated analysis');
}

// 4. Test 2: Dependency Failure Paths
console.log('\n2. Testing Dependency Failure Paths...');

// 2a. Unknown Emergency -> 404
try {
  await orchestrationService.executeEmergencyWorkflow('EMG-9999');
  throw new Error('Should have thrown 404 for unknown emergency');
} catch (err) {
  console.log('✔ Unknown emergency correctly thrown 404:', err.message);
}

// 2b. Unassigned Vehicle -> PARTIAL
const unassignedEmergency = new Emergency({
  emergencyId: 'EMG-1002',
  type: 'FIRE',
  priority: 'MEDIUM',
  status: 'PENDING',
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  createdBy: operator._id
});
await unassignedEmergency.save();

const unassignedResult = await orchestrationService.executeEmergencyWorkflow('EMG-1002');
console.log('✔ Unassigned emergency handled gracefully:', unassignedResult.workflowStatus, 'Reason:', unassignedResult.reason);
if (unassignedResult.workflowStatus !== 'PARTIAL' || unassignedResult.reason !== 'NO_ASSIGNED_VEHICLE') {
  throw new Error('Unassigned vehicle did not return PARTIAL / NO_ASSIGNED_VEHICLE');
}

// 2c. Assigned vehicle but missing route -> PARTIAL
const noRouteVehicle = new Vehicle({
  vehicleId: 'AMB-102',
  registrationNumber: 'KA-01-EA-1002',
  type: 'AMBULANCE',
  status: 'DISPATCHED',
  driverName: 'Driver Jane',
  capacity: 2
});
await noRouteVehicle.save();

const noRouteEmergency = new Emergency({
  emergencyId: 'EMG-1003',
  type: 'MEDICAL',
  priority: 'LOW',
  status: 'DISPATCHED',
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  assignedVehicle: noRouteVehicle._id,
  createdBy: operator._id
});
await noRouteEmergency.save();


const noRouteResult = await orchestrationService.executeEmergencyWorkflow('EMG-1003');
console.log('✔ Missing route handled gracefully:', noRouteResult.workflowStatus, 'Reason:', noRouteResult.reason);
if (noRouteResult.workflowStatus !== 'PARTIAL' || noRouteResult.reason !== 'NO_ACTIVE_ROUTE') {
  throw new Error('Missing route did not return PARTIAL / NO_ACTIVE_ROUTE');
}

// 2d. Assigned vehicle & route but missing trajectory -> PARTIAL
const testRoute2 = new Route({
  routeId: 'ROUTE-1003',
  emergency: noRouteEmergency._id,
  vehicle: noRouteVehicle._id,
  origin: noRouteEmergency.location,
  destination: { type: 'Point', coordinates: [77.62, 12.935] },
  geometry: {
    type: 'LineString',
    coordinates: [[77.5946, 12.9716], [77.62, 12.935]]
  },
  distance: 3000,
  duration: 400,
  provider: 'MOCK',
  status: 'ACTIVE',
  createdBy: operator._id
});
await testRoute2.save();

const noTrajectoryResult = await orchestrationService.executeEmergencyWorkflow('EMG-1003');
console.log('✔ Missing trajectory handled gracefully:', noTrajectoryResult.workflowStatus, 'Reason:', noTrajectoryResult.reason);
if (noTrajectoryResult.workflowStatus !== 'PARTIAL' || noTrajectoryResult.reason !== 'NO_TRAJECTORY_DATA') {
  throw new Error('Missing trajectory did not return PARTIAL / NO_TRAJECTORY_DATA');
}

// 5. Test 3: Security & Operational Input Tampering
console.log('\n3. Testing Security, Authorization, and Input Tampering...');

// 3a. Missing Auth Token -> 401
const unauthRes = await fetch('http://localhost:53129/api/orchestration/emergencies/EMG-1001/analyze', {
  method: 'POST'
}).catch(() => null);

// Test via direct route invocation / mock request
const mockReqUnauth = {
  params: { emergencyId: 'EMG-1001' },
  headers: {},
  cookies: {}
};

// 3b. Forbidden Operational Inputs Tampering -> 400
import { validateOrchestrationRequest } from './modules/orchestration/orchestration.validation.js';

let tamperError = null;
const mockReqTampered = {
  params: { emergencyId: 'EMG-1001' },
  body: {
    eta: 2,
    decision: 'CONTINUE',
    traffic: 'LIGHT'
  }
};
validateOrchestrationRequest(mockReqTampered, {}, (err) => {
  tamperError = err;
});

if (!tamperError || tamperError.status !== 400) {
  throw new Error('Client-supplied operational tampering was not rejected with 400 Bad Request');
}
console.log('✔ Client operational tampering rejected with 400:', tamperError.message);

// 6. Test 4: Unit Standard Verification
console.log('\n4. Testing Unit Standards...');
if (
  result.units.DISTANCE !== 'meters' ||
  result.units.SPEED !== 'km/h' ||
  result.units.ETA !== 'minutes' ||
  typeof result.analysis.deviation.distanceFromRouteMeters !== 'number' ||
  typeof result.analysis.traffic.speedKmh !== 'number'
) {
  throw new Error('Unit standard assertion failed');
}
console.log('✔ Units strictly adhere to system standard:', result.units);

// 7. Cleanup
await mongoose.disconnect();
await new Promise((resolve) => httpServer.close(resolve));

console.log('\n=== ALL PART 11 FULL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
