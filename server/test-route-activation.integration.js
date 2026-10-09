import assert from 'node:assert/strict';
import test, { after, afterEach, before, beforeEach } from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import Decision from './modules/decisions/decision.model.js';
import decisionService from './modules/decisions/decision.service.js';
import decisionRoutes from './modules/decisions/decision.routes.js';
import {
  createRerouteCandidate,
  isRerouteCandidateUnchanged
} from './modules/decisions/rerouteCandidate.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Route from './modules/routes/route.model.js';
import routeRoutes from './modules/routes/route.routes.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const TEST_DATABASE = 'geoagent-route-activation-integration-test';
const TEST_MONGO_URI = process.env.MONGO_URI;
let fixture;

const newCandidate = () => createRerouteCandidate({
  geometry: {
    type: 'LineString',
    coordinates: [
      [77.6, 12.97],
      [77.6005, 12.9703],
      [77.6013, 12.9703],
      [77.602, 12.97]
    ]
  },
  distanceMeters: 320,
  durationSeconds: 120,
  preference: 'FASTEST',
  provider: 'MOCK',
  description: 'Reviewed integration-test bypass',
  steps: []
});

before(async () => {
  assert.ok(TEST_MONGO_URI, 'Set MONGO_URI explicitly to the isolated test database');
  const parsed = new URL(TEST_MONGO_URI);
  assert.ok(
    ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname),
    'Integration tests are restricted to a local MongoDB instance'
  );
  assert.equal(
    decodeURIComponent(parsed.pathname.replace(/^\/+/, '')),
    TEST_DATABASE,
    `MONGO_URI must target ${TEST_DATABASE}`
  );

  await mongoose.connect(TEST_MONGO_URI, {
    dbName: TEST_DATABASE,
    serverSelectionTimeoutMS: 3000
  });
  assert.equal(mongoose.connection.name, TEST_DATABASE, 'Connected to unexpected database');
});

after(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  fixture = { vehicles: [], emergencies: [], routes: [], decisions: [] };
  const actorId = new mongoose.Types.ObjectId();
  const suffix = new mongoose.Types.ObjectId().toString();
  const vehicle = await Vehicle.create({
    vehicleId: `AMB-RA-${suffix}`,
    registrationNumber: `RA-${suffix.slice(-8)}`,
    type: 'AMBULANCE',
    status: 'EN_ROUTE',
    driverName: 'Route Activation Test',
    capacity: 1
  });
  fixture.vehicles.push(vehicle);
  const emergency = await Emergency.create({
    emergencyId: `EMG-RA-${suffix}`,
    type: 'MEDICAL',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    location: { type: 'Point', coordinates: [77.6, 12.97] },
    destination: { type: 'Point', coordinates: [77.602, 12.97] },
    assignedVehicle: vehicle._id,
    createdBy: actorId
  });
  fixture.emergencies.push(emergency);
  const route = await Route.create({
    routeId: `ROUTE-RA-${suffix}`,
    emergency: emergency._id,
    vehicle: vehicle._id,
    origin: { type: 'Point', coordinates: [77.6, 12.97] },
    destination: { type: 'Point', coordinates: [77.602, 12.97] },
    geometry: {
      type: 'LineString',
      coordinates: [
        [77.6, 12.97],
        [77.6006, 12.9702],
        [77.6014, 12.9702],
        [77.602, 12.97]
      ]
    },
    distance: 300,
    duration: 150,
    provider: 'MOCK',
    routeType: 'PLANNED',
    status: 'ACTIVE',
    preference: 'FASTEST',
    steps: [{
      maneuver: 'CONTINUE',
      instruction: 'Keep the existing navigation step',
      distance: 300,
      duration: 150
    }],
    createdBy: actorId
  });
  fixture.routes.push(route);
  const rerouteCandidate = newCandidate();
  const decision = await Decision.create({
    decisionId: `DEC-RA-${suffix}`,
    emergency: emergency._id,
    vehicle: vehicle._id,
    route: route._id,
    rerouteCandidate,
    severity: 'CRITICAL',
    actions: ['REROUTE'],
    primaryAction: 'REROUTE',
    reasonCodes: ['ROUTE_DEVIATION'],
    situationHash: suffix,
    status: 'PENDING_OPERATOR_ACTION',
    inputSnapshot: {
      routeStatus: route.status,
      routeVersion: route.__v,
      routeUpdatedAt: route.updatedAt
    }
  });

  fixture.actorId = actorId; // operator identity is optional now that there is no login
  fixture.vehicle = vehicle;
  fixture.emergency = emergency;
  fixture.route = route;
  fixture.decision = decision;
  fixture.decisions.push(decision);
});

afterEach(async () => {
  if (!fixture) return;
  for (const decision of fixture.decisions) await Decision.deleteOne({ _id: decision._id });
  for (const route of fixture.routes) await Route.deleteOne({ _id: route._id });
  for (const emergency of fixture.emergencies) await Emergency.deleteOne({ _id: emergency._id });
  for (const vehicle of fixture.vehicles) await Vehicle.deleteOne({ _id: vehicle._id });
  fixture = null;
});

const approve = async () => decisionService.approveDecision(
  fixture.decision.decisionId,
  fixture.actorId,
  fixture.decision.rerouteCandidate.candidateId
);

test('persists approval, activates the approved candidate, preserves steps, and executes the decision', async () => {
  assert.equal(isRerouteCandidateUnchanged(fixture.decision.rerouteCandidate), true);
  assert.equal(fixture.decision.status, 'PENDING_OPERATOR_ACTION');

  await approve();
  const approved = await Decision.findById(fixture.decision._id);
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.approvedCandidateId, approved.rerouteCandidate.candidateId);
  assert.equal(isRerouteCandidateUnchanged(approved.rerouteCandidate), true);

  const execution = await decisionService.executeDecision(approved.decisionId, fixture.actorId);
  const [updatedRoute, updatedDecision] = await Promise.all([
    Route.findById(fixture.route._id),
    Decision.findById(fixture.decision._id)
  ]);

  assert.equal(execution.status, 'EXECUTED');
  assert.equal(updatedDecision.status, 'EXECUTED');
  assert.match(updatedDecision.executionSummary, /REROUTE:activated/);
  assert.deepEqual(
    updatedRoute.geometry.coordinates.map(coordinate => [...coordinate]),
    approved.rerouteCandidate.geometry.coordinates.map(coordinate => [...coordinate])
  );
  assert.equal(updatedRoute.distance, approved.rerouteCandidate.distanceMeters);
  assert.equal(updatedRoute.duration, approved.rerouteCandidate.durationSeconds);
  assert.equal(updatedRoute.routeType, 'RECOMMENDED');
  assert.equal(updatedRoute.__v, fixture.route.__v + 1);
  assert.equal(updatedRoute.steps[0].instruction, 'Keep the existing navigation step');
});

test('rejects execution before operator approval without changing persisted route state', async () => {
  const originalVersion = fixture.route.__v;
  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409
  );
  const unchangedRoute = await Route.findById(fixture.route._id);
  assert.equal(unchangedRoute.__v, originalVersion);
  assert.equal(unchangedRoute.routeType, 'PLANNED');
});

test('rejects a changed approved candidate without activating it', async () => {
  await approve();
  await Decision.updateOne(
    { _id: fixture.decision._id },
    { $set: { 'rerouteCandidate.description': 'Changed after approval' } }
  );

  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409 && error.message.includes('missing or changed')
  );
  assert.equal((await Route.findById(fixture.route._id)).routeType, 'PLANNED');
});

test('rejects a missing approved candidate without activating it', async () => {
  await approve();
  await Decision.updateOne({ _id: fixture.decision._id }, { $unset: { rerouteCandidate: 1 } });

  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409 && error.message.includes('missing or changed')
  );
  assert.equal((await Route.findById(fixture.route._id)).routeType, 'PLANNED');
});

test('rejects activation when the approved route version is stale', async () => {
  await approve();
  await Route.updateOne({ _id: fixture.route._id }, { $inc: { __v: 1 } });

  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409 && error.message.includes('stale')
  );
  assert.equal((await Route.findById(fixture.route._id)).routeType, 'PLANNED');
});

test('rejects activation when the emergency is assigned to another vehicle', async () => {
  await approve();
  await Emergency.updateOne(
    { _id: fixture.emergency._id },
    { $set: { assignedVehicle: new mongoose.Types.ObjectId() } }
  );

  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409 && error.message.includes('not assigned')
  );
  assert.equal((await Route.findById(fixture.route._id)).routeType, 'PLANNED');
});

test('rejects activation when the approved decision is linked to another vehicle', async () => {
  await approve();
  await Decision.updateOne(
    { _id: fixture.decision._id },
    { $set: { vehicle: new mongoose.Types.ObjectId() } }
  );

  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409 && error.message.includes('does not belong')
  );
  assert.equal((await Route.findById(fixture.route._id)).routeType, 'PLANNED');
});

test('rejects duplicate execution after the first activation', async () => {
  await approve();
  await decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId);
  const activatedRoute = await Route.findById(fixture.route._id);
  assert.equal(activatedRoute.__v, fixture.route.__v + 1);

  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409
  );
  const routeAfterDuplicate = await Route.findById(fixture.route._id);
  assert.equal(routeAfterDuplicate.__v, activatedRoute.__v);
});

test('recovers a decision-write failure by retrying the exact persisted activation once', async () => {
  await approve();
  const originalFindOneAndUpdate = Decision.findOneAndUpdate;
  let failDecisionWrite = true;
  Decision.findOneAndUpdate = async function (...args) {
    if (failDecisionWrite) {
      failDecisionWrite = false;
      throw new Error('simulated decision persistence failure');
    }
    return originalFindOneAndUpdate.apply(this, args);
  };

  try {
    await assert.rejects(
      decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
      /simulated decision persistence failure/
    );
    const [partiallyCommittedRoute, stillApprovedDecision] = await Promise.all([
      Route.findById(fixture.route._id),
      Decision.findById(fixture.decision._id)
    ]);
    assert.equal(partiallyCommittedRoute.rerouteDecisionId, fixture.decision.decisionId);
    assert.equal(
      partiallyCommittedRoute.rerouteCandidateId,
      stillApprovedDecision.approvedCandidateId
    );
    assert.equal(partiallyCommittedRoute.__v, fixture.route.__v + 1);
    assert.equal(stillApprovedDecision.status, 'APPROVED');

    const recovered = await decisionService.executeDecision(
      fixture.decision.decisionId,
      fixture.actorId
    );
    const recoveredRoute = await Route.findById(fixture.route._id);
    assert.equal(recovered.status, 'EXECUTED');
    assert.equal(recoveredRoute.__v, partiallyCommittedRoute.__v);
    assert.equal(recoveredRoute.rerouteCandidateId, stillApprovedDecision.approvedCandidateId);
  } finally {
    Decision.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('does not retry partial activation with changed approved candidate contents', async () => {
  await approve();
  const originalFindOneAndUpdate = Decision.findOneAndUpdate;
  Decision.findOneAndUpdate = async function () {
    throw new Error('simulated decision persistence failure');
  };
  try {
    await assert.rejects(
      decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
      /simulated decision persistence failure/
    );
  } finally {
    Decision.findOneAndUpdate = originalFindOneAndUpdate;
  }

  await Decision.updateOne(
    { _id: fixture.decision._id },
    { $set: { 'rerouteCandidate.description': 'Different candidate after approval' } }
  );
  await assert.rejects(
    decisionService.executeDecision(fixture.decision.decisionId, fixture.actorId),
    error => error.status === 409 && error.message.includes('missing or changed')
  );
  const [stillActivatedRoute, stillApprovedDecision] = await Promise.all([
    Route.findById(fixture.route._id),
    Decision.findById(fixture.decision._id)
  ]);
  assert.equal(stillActivatedRoute.__v, fixture.route.__v + 1);
  assert.equal(stillApprovedDecision.status, 'APPROVED');
});

test('HTTP approval and activation work without login', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/routes', routeRoutes);
  app.use('/api/decisions', decisionRoutes);
  app.use(errorHandler);
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const approvalUrl = `${baseUrl}/decisions/${fixture.decision.decisionId}/approve`;
  const operatorResponse = await fetch(approvalUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ candidateId: fixture.decision.rerouteCandidate.candidateId })
  });
  assert.equal(operatorResponse.status, 200);
  assert.equal((await Decision.findById(fixture.decision._id)).status, 'APPROVED');

  const activationResponse = await fetch(
    `${baseUrl}/routes/${fixture.route.routeId}/accept-reroute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisionId: fixture.decision.decisionId })
    }
  );
  assert.equal(activationResponse.status, 200);
  assert.equal((await Decision.findById(fixture.decision._id)).status, 'EXECUTED');
});
