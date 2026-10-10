import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import Decision from './modules/decisions/decision.model.js';
import decisionService from './modules/decisions/decision.service.js';
import {
  createRerouteCandidate,
  isRerouteCandidateUnchanged
} from './modules/decisions/rerouteCandidate.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Route from './modules/routes/route.model.js';
import routeService from './modules/routes/route.service.js';
import Vehicle from './modules/vehicles/vehicle.model.js';

const originalMethods = [];
let route;
let decision;
let updateCount;
const originalRouteGeometry = {
  type: 'LineString',
  coordinates: [[0, 0], [0.001, 0.001], [0.002, 0]]
};
const candidateGeometry = {
  type: 'LineString',
  coordinates: [[0, 0], [0.001, 0.0005], [0.0015, 0.001], [0.002, 0]]
};
const unreviewedGeometry = {
  type: 'LineString',
  coordinates: [[0, 0], [0.0005, 0.001], [0.001, 0.001], [0.002, 0]]
};

const candidateFor = (geometry = candidateGeometry, steps) => createRerouteCandidate({
  geometry,
  distanceMeters: 320,
  durationSeconds: 120,
  preference: 'FASTEST',
  provider: 'OSRM',
  description: 'Reviewed bypass',
  ...(steps === undefined ? {} : { steps })
});

const replaceMethod = (target, name, replacement) => {
  originalMethods.push([target, name, target[name]]);
  target[name] = replacement;
};

beforeEach(() => {
  const updatedAt = new Date('2025-01-01T00:00:00.000Z');
  route = {
    _id: new mongoose.Types.ObjectId(),
    routeId: 'ROUTE-TEST-1',
    emergency: new mongoose.Types.ObjectId(),
    vehicle: new mongoose.Types.ObjectId(),
    origin: { type: 'Point', coordinates: [0, 0] },
    destination: { type: 'Point', coordinates: [0.002, 0] },
    geometry: originalRouteGeometry,
    distance: 320,
    duration: 120,
    routeType: 'PLANNED',
    status: 'ACTIVE',
    preference: 'FASTEST',
    steps: [{ instruction: 'Continue along current route', distance: 320, duration: 120 }],
    updatedAt,
    __v: 0
  };
  decision = {
    decisionId: 'DEC-TEST-ROUTE-1',
    emergency: route.emergency,
    vehicle: route.vehicle,
    route: route._id,
    primaryAction: 'REROUTE',
    actions: ['REROUTE'],
    status: 'APPROVED',
    rerouteCandidate: candidateFor(),
    approvedCandidateId: null,
    inputSnapshot: {
      routeStatus: 'ACTIVE',
      routeVersion: 0,
      routeUpdatedAt: updatedAt
    }
  };
  decision.approvedCandidateId = decision.rerouteCandidate.candidateId;
  updateCount = 0;

  replaceMethod(Route, 'findOne', async () => route);
  replaceMethod(Route, 'findById', async () => route);
  replaceMethod(Decision, 'findOne', async () => decision);
  replaceMethod(Emergency, 'findById', async () => ({
    emergencyId: 'EMG-TEST-1',
    assignedVehicle: route.vehicle
  }));
  replaceMethod(Vehicle, 'findById', async () => ({ vehicleId: 'AMB-TEST-1' }));
  replaceMethod(Route, 'findOneAndUpdate', async (filter, update) => {
    updateCount += 1;
    if (
      filter.__v !== route.__v ||
      filter.status !== route.status ||
      filter.updatedAt.getTime() !== route.updatedAt.getTime()
    ) {
      return null;
    }
    Object.assign(route, update.$set);
    route.__v += update.$inc.__v;
    route.updatedAt = new Date(route.updatedAt.getTime() + 1000);
    return route;
  });
  replaceMethod(Decision, 'findOneAndUpdate', async (filter, update) => {
    Object.assign(decision, update.$set);
    return decision;
  });
});

afterEach(() => {
  for (const [target, name, original] of originalMethods.splice(0)) {
    target[name] = original;
  }
});

test('activates exactly the reviewed candidate after operator approval', async () => {
  decision.status = 'PENDING_OPERATOR_ACTION';
  await assert.rejects(
    decisionService.approveDecision(
      decision.decisionId,
      new mongoose.Types.ObjectId(),
      'unreviewed-candidate'
    ),
    error => error.status === 409
  );
  assert.equal(decision.status, 'PENDING_OPERATOR_ACTION');

  await decisionService.approveDecision(
    decision.decisionId,
    new mongoose.Types.ObjectId(),
    decision.rerouteCandidate.candidateId
  );
  assert.equal(decision.approvedCandidateId, decision.rerouteCandidate.candidateId);
  assert.equal(decision.status, 'APPROVED');

  const activated = await routeService.acceptReroute(
    route.routeId,
    new mongoose.Types.ObjectId(),
    decision.decisionId
  );

  assert.equal(activated.status, 'ACTIVE');
  assert.equal(activated.routeType, 'RECOMMENDED');
  assert.deepEqual(activated.geometry, candidateGeometry);
  assert.equal(activated.distance, 320);
  assert.equal(activated.duration, 120);
  assert.equal(activated.provider, 'OSRM');
  assert.equal(activated.__v, 1);
  assert.equal(updateCount, 1);
});

test('candidate fingerprint survives decision-model casting', () => {
  const storedCandidate = new Decision({
    rerouteCandidate: decision.rerouteCandidate
  }).toObject().rerouteCandidate;

  assert.equal(isRerouteCandidateUnchanged(storedCandidate), true);
});

test('ignores arbitrary execution payload geometry not included in the approved candidate', async () => {
  await decisionService.executeDecision(
    decision.decisionId,
    new mongoose.Types.ObjectId(),
    { geometry: unreviewedGeometry, distanceMeters: 1, durationSeconds: 1 }
  );

  assert.deepEqual(route.geometry, candidateGeometry);
  assert.notDeepEqual(route.geometry, unreviewedGeometry);
  assert.equal(updateCount, 1);
});

test('rejects a changed or missing approved candidate without changing the route', async (t) => {
  await t.test('candidate content was changed after approval', async () => {
    decision.rerouteCandidate.geometry = unreviewedGeometry;
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('missing or changed')
    );
    assert.equal(updateCount, 0);
  });

  await t.test('approved candidate was removed', async () => {
    decision.rerouteCandidate = null;
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('missing or changed')
    );
    assert.equal(updateCount, 0);
  });
});

test('rejects invalid stored candidate geometry without changing the route', async () => {
  decision.rerouteCandidate = candidateFor({
    type: 'LineString',
    coordinates: [[181, 0], [0.002, 0]]
  });
  decision.approvedCandidateId = decision.rerouteCandidate.candidateId;
  await assert.rejects(
    routeService.acceptReroute(route.routeId, null, decision.decisionId),
    error => error.status === 400 && error.message.includes('Invalid reroute geometry')
  );
  assert.equal(updateCount, 0);
  assert.equal(route.routeType, 'PLANNED');
});

test('preserves existing route steps when the approved candidate has no replacement steps', async () => {
  const existingSteps = structuredClone(route.steps);
  decision.rerouteCandidate = candidateFor(candidateGeometry, []);
  decision.approvedCandidateId = decision.rerouteCandidate.candidateId;

  await routeService.acceptReroute(route.routeId, null, decision.decisionId);

  assert.deepEqual(route.steps, existingSteps);
  assert.equal(updateCount, 1);
});

test('rejects unapproved decisions and mismatched emergency or vehicle ownership', async (t) => {
  await t.test('decision is not operator-approved', async () => {
    decision.status = 'PENDING_OPERATOR_ACTION';
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('not an approved REROUTE')
    );
    assert.equal(updateCount, 0);
  });

  await t.test('decision vehicle does not match route vehicle', async () => {
    decision.vehicle = new mongoose.Types.ObjectId();
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('does not belong')
    );
    assert.equal(updateCount, 0);
  });

  await t.test('decision emergency does not match route emergency', async () => {
    decision.emergency = new mongoose.Types.ObjectId();
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('does not belong')
    );
    assert.equal(updateCount, 0);
  });

  await t.test('emergency is assigned to a different vehicle', async () => {
    replaceMethod(Emergency, 'findById', async () => ({
      emergencyId: 'EMG-TEST-1',
      assignedVehicle: new mongoose.Types.ObjectId()
    }));
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('not assigned')
    );
    assert.equal(updateCount, 0);
  });
});

test('rejects stale routes and duplicate execution', async (t) => {
  await t.test('route is no longer active', async () => {
    route.status = 'COMPLETED';
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('stale')
    );
    assert.equal(updateCount, 0);
  });

  await t.test('route version changed after analysis', async () => {
    route.__v += 1;
    await assert.rejects(
      routeService.acceptReroute(route.routeId, null, decision.decisionId),
      error => error.status === 409 && error.message.includes('stale')
    );
    assert.equal(updateCount, 0);
  });

  await t.test('decision execution cannot be repeated', async () => {
    await decisionService.executeDecision(decision.decisionId, new mongoose.Types.ObjectId());
    await assert.rejects(
      decisionService.executeDecision(decision.decisionId, new mongoose.Types.ObjectId()),
      error => error.status === 409
    );
    assert.equal(updateCount, 1);
  });
});

test('recovers decision persistence failure without activating twice or accepting changed candidate data', async (t) => {
  await t.test('retries the same approved candidate after route persistence succeeded', async () => {
    let failDecisionWrite = true;
    replaceMethod(Decision, 'findOneAndUpdate', async (_filter, update) => {
      if (failDecisionWrite) {
        failDecisionWrite = false;
        throw new Error('simulated decision persistence failure');
      }
      Object.assign(decision, update.$set);
      return decision;
    });

    await assert.rejects(
      decisionService.executeDecision(decision.decisionId, new mongoose.Types.ObjectId()),
      /simulated decision persistence failure/
    );
    assert.equal(route.rerouteDecisionId, decision.decisionId);
    assert.equal(route.rerouteCandidateId, decision.approvedCandidateId);
    assert.equal(route.__v, 1);
    assert.equal(decision.status, 'APPROVED');

    const retried = await decisionService.executeDecision(
      decision.decisionId,
      new mongoose.Types.ObjectId()
    );
    assert.equal(retried.status, 'EXECUTED');
    assert.equal(route.__v, 1);
    assert.equal(updateCount, 1);
  });

  await t.test('refuses a changed candidate on retry after route persistence', async () => {
    let failDecisionWrite = true;
    replaceMethod(Decision, 'findOneAndUpdate', async (_filter, update) => {
      if (failDecisionWrite) {
        failDecisionWrite = false;
        throw new Error('simulated decision persistence failure');
      }
      Object.assign(decision, update.$set);
      return decision;
    });
    await assert.rejects(
      decisionService.executeDecision(decision.decisionId, new mongoose.Types.ObjectId()),
      /simulated decision persistence failure/
    );

    decision.rerouteCandidate.geometry = unreviewedGeometry;
    await assert.rejects(
      decisionService.executeDecision(decision.decisionId, new mongoose.Types.ObjectId()),
      error => error.status === 409 && error.message.includes('missing or changed')
    );
    assert.equal(route.rerouteCandidateId, decision.approvedCandidateId);
    assert.equal(route.__v, 1);
    assert.equal(updateCount, 1);
  });
});
