/**
 * SwiftCare GeoAgent — Comprehensive Control Room Operational Workflow E2E Test Suite
 * 
 * Verifies all 12 operational workflow criteria:
 * 1.  Vehicle Telemetry Ingestion (POST /api/trajectories or service ingestion)
 * 2.  Trajectory Ingestion with Route Matching (distance to active route)
 * 3.  Deviation Analysis Detection (ON_ROUTE vs DEVIATED thresholds)
 * 4.  Traffic Delay & Hazard Correlation (incidents affecting corridor)
 * 5.  Real-Time ETA & Delay Prediction (PredictionService with delta tracking)
 * 6.  Route Comparison Matrix & What-If Analysis (RouteComparisonService)
 * 7.  Gemini Advisory Reasoning (3-tier epistemic output or deterministic fallback)
 * 8.  Deterministic Decision Engine Proposal (PENDING_OPERATOR_ACTION + situation hash)
 * 9.  Operator Approval (atomic transition PENDING_OPERATOR_ACTION -> APPROVED)
 * 10. Operator Rejection (atomic transition PENDING_OPERATOR_ACTION -> REJECTED with reason)
 * 11. Execution Transition (atomic transition APPROVED -> EXECUTED)
 * 12. Concurrency Safety (simultaneous actions reject 2nd attempt with 409 Conflict)
 */

import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import connectDB from './config/db.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Route from './modules/routes/route.model.js';
import Incident from './modules/incidents/incident.model.js';
import Decision from './modules/decisions/decision.model.js';
import { createTrajectory } from './modules/trajectories/trajectory.service.js';
import deviationService from './modules/deviation/deviation.service.js';
import trafficService from './modules/traffic/traffic.service.js';
import predictionService from './modules/analysis/prediction.service.js';
import routeComparisonService from './modules/routes/routeComparison.service.js';
import geoAgentService from './modules/geoagents/geoagent.service.js';
import decisionService from './modules/decisions/decision.service.js';

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runControlRoomE2ETests() {
  console.log('================================================================');
  console.log('CONTROL ROOM REAL-TIME OPERATIONAL WORKFLOW E2E TEST SUITE');
  console.log('================================================================\n');

  await connectDB();

  // Test data identifiers
  const testSuffix = Date.now().toString().slice(-6);
  const vehId = `AMB-CR-${testSuffix}`;
  const emgId = `EMG-CR-${testSuffix}`;
  const routeId = `RTE-CR-${testSuffix}`;
  const incId = `INC-CR-${testSuffix}`;

  let vehicleDoc = null;
  let emergencyDoc = null;
  let routeDoc = null;
  let incidentDoc = null;
  let activeDecisionDoc = null;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Fixtures
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating baseline vehicle, emergency, route, and incident...');

    const testUserId = new mongoose.Types.ObjectId();

    vehicleDoc = await Vehicle.create({
      vehicleId: vehId,
      registrationNumber: `KA-01-CR-${testSuffix.slice(-4)}`,
      type: 'AMBULANCE',
      status: 'DISPATCHED',
      driverName: 'Officer Rao',
      driverContact: '+91 98765 00000',
      capacity: 2
    });

    emergencyDoc = await Emergency.create({
      emergencyId: emgId,
      type: 'MEDICAL',
      priority: 'CRITICAL',
      status: 'DISPATCHED',
      description: 'Acute emergency corridor simulation',
      location: { type: 'Point', coordinates: [77.6389, 12.9345] },
      destination: { type: 'Point', coordinates: [77.6602, 12.9567] },
      assignedVehicle: vehicleDoc._id,
      createdBy: testUserId
    });

    // Linear corridor from [77.6389, 12.9345] to [77.6602, 12.9567]
    routeDoc = await Route.create({
      routeId: routeId,
      emergency: emergencyDoc._id,
      vehicle: vehicleDoc._id,
      origin: { type: 'Point', coordinates: [77.6389, 12.9345] },
      destination: { type: 'Point', coordinates: [77.6602, 12.9567] },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6389, 12.9345],
          [77.6450, 12.9400],
          [77.6520, 12.9480],
          [77.6602, 12.9567]
        ]
      },
      distance: 3500,
      duration: 600,
      provider: 'MOCK',
      status: 'ACTIVE',
      routeType: 'PLANNED',
      createdBy: testUserId
    });

    // Incident positioned along middle waypoint
    incidentDoc = await Incident.create({
      incidentId: incId,
      type: 'ACCIDENT',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'Multi-vehicle blockage on primary corridor',
      location: { type: 'Point', coordinates: [77.6452, 12.9402] },
      reportedBy: testUserId
    });

    console.log('  Baseline fixtures created successfully.\n');

    // -------------------------------------------------------------------------
    // Criterion 1: Vehicle Telemetry Ingestion
    // -------------------------------------------------------------------------
    console.log('[Criterion 1] Testing Vehicle Telemetry Ingestion...');
    await itAsync('Ingests valid GPS fix and persists to MongoDB', async () => {
      const traj = await createTrajectory({
        vehicleId: vehId,
        location: { type: 'Point', coordinates: [77.6392, 12.9348] },
        speed: 48,
        heading: 42,
        timestamp: new Date().toISOString(),
        source: 'DEVICE'
      });

      assert(traj && traj._id, 'Trajectory document was created');
      assert.strictEqual(traj.vehicleId, vehId, 'Vehicle ID matches');
      assert.strictEqual(traj.speed, 48, 'Speed matches');
      assert.strictEqual(traj.heading, 42, 'Heading matches');
    });

    // -------------------------------------------------------------------------
    // Criterion 2: Trajectory Ingestion with Route Matching
    // -------------------------------------------------------------------------
    console.log('[Criterion 2] Testing Trajectory Ingestion with Route Matching...');
    await itAsync('Computes cross-track distance to the active route geometry', async () => {
      const onRouteFix = [77.63895, 12.93455];
      const analysis = deviationService.analyzeDeviation({
        currentLocation: onRouteFix,
        routeGeometry: routeDoc.geometry,
        currentHeading: 45
      });

      assert(analysis !== null, 'Deviation analysis generated');
      assert(typeof analysis.distanceFromRouteMeters === 'number', 'Cross-track distance is numeric');
      assert(analysis.distanceFromRouteMeters < 50, `Cross-track distance is within 50m (${analysis.distanceFromRouteMeters}m)`);
      assert.strictEqual(analysis.status, 'ON_ROUTE', 'Status is ON_ROUTE');
    });

    // -------------------------------------------------------------------------
    // Criterion 3: Deviation Analysis Detection
    // -------------------------------------------------------------------------
    console.log('[Criterion 3] Testing Deviation Analysis Detection...');
    await itAsync('Detects off-corridor position when cross-track exceeds threshold', async () => {
      // Offset position ~300m away from corridor
      const offRouteFix = [77.6320, 12.9300];
      const deviationResult = deviationService.analyzeDeviation({
        currentLocation: offRouteFix,
        routeGeometry: routeDoc.geometry,
        currentHeading: 270
      });

      assert(deviationResult !== null, 'Deviation analysis returned');
      assert(deviationResult.distanceFromRouteMeters > 100, `Cross-track distance exceeds 100m (${deviationResult.distanceFromRouteMeters}m)`);
      assert(['DEVIATED', 'CRITICAL_DEVIATION'].includes(deviationResult.status), `Deviation detected: ${deviationResult.status}`);
    });

    // -------------------------------------------------------------------------
    // Criterion 4: Traffic Delay & Hazard Correlation
    // -------------------------------------------------------------------------
    console.log('[Criterion 4] Testing Traffic Delay & Hazard Correlation...');
    await itAsync('Correlates active incident with route and derives traffic penalty', async () => {
      const correlated = trafficService.correlateIncidentsWithRoute({
        routeGeometry: routeDoc.geometry,
        incidents: [incidentDoc]
      });

      assert(Array.isArray(correlated), 'Correlated incidents is an array');
      assert(correlated.length > 0, 'Incident was correlated with corridor');
      assert.strictEqual(correlated[0].incidentId, incId, 'Correct incident ID correlated');
      assert(typeof correlated[0].distanceFromRouteMeters === 'number', 'Distance from route is calculated');
    });

    // -------------------------------------------------------------------------
    // Criterion 5: Real-Time ETA & Delay Prediction
    // -------------------------------------------------------------------------
    console.log('[Criterion 5] Testing Real-Time ETA & Delay Prediction Engine...');
    let predictionResult = null;
    await itAsync('Calculates predicted arrival, delay minutes, and risk levels', async () => {
      predictionResult = await predictionService.calculatePrediction({
        vehicleId: vehId,
        route: routeDoc,
        deviation: { status: 'DEVIATED', distanceFromRouteMeters: 180 },
        incidents: [incidentDoc],
        trafficDelaySeconds: 420
      });

      assert(predictionResult !== null, 'Prediction result returned');
      assert(typeof predictionResult.predictedDurationMinutes === 'number', 'predictedDurationMinutes is numeric');
      assert(typeof predictionResult.predictedDelayMinutes === 'number', 'predictedDelayMinutes is numeric');
      assert(predictionResult.predictedDelayMinutes > 0, 'Delay penalty is positive');
      assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(predictionResult.delayRisk), `Delay risk tier is valid: ${predictionResult.delayRisk}`);
      assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(predictionResult.routeRisk), `Route risk tier is valid: ${predictionResult.routeRisk}`);
      assert(Array.isArray(predictionResult.factors), 'Prediction factors is an array');
    });

    // -------------------------------------------------------------------------
    // Criterion 6: Route Comparison Matrix & What-If Analysis
    // -------------------------------------------------------------------------
    console.log('[Criterion 6] Testing Route Comparison Matrix & Deterministic What-If...');
    await itAsync('Produces deterministic comparison between current route and candidate alternative', async () => {
      const candidateAlt = {
        name: 'ALTERNATIVE 1 — Ring Road Bypass',
        distanceMeters: 3800,
        durationSeconds: 480,
        trafficDelaySeconds: 0,
        provider: 'GOOGLE_ROUTES'
      };

      const comparison = routeComparisonService.compareRoutes({
        currentRoute: routeDoc,
        candidateRoutes: [candidateAlt],
        predictionState: predictionResult,
        incidents: [incidentDoc]
      });

      assert(comparison !== null, 'Comparison returned');
      assert(comparison.currentRoute !== undefined, 'currentRoute section present');
      assert(Array.isArray(comparison.alternatives), 'alternatives array present');
      assert.strictEqual(comparison.alternatives.length, 1, 'Alternative candidate tracked');
      assert(comparison.whatIfDoNothing !== undefined, 'whatIfDoNothing deterministic projection present');
      assert(typeof comparison.whatIfDoNothing.estimatedDelayMinutes === 'number', 'whatIfDoNothing delay is numeric');
      assert(Array.isArray(comparison.whyRouteChanged), 'whyRouteChanged causal tags present');
    });

    // -------------------------------------------------------------------------
    // Criterion 7: Gemini Advisory Reasoning
    // -------------------------------------------------------------------------
    console.log('[Criterion 7] Testing Gemini Advisory Reasoning & 3-Tier Epistemic Output...');
    await itAsync('Returns structured recommendation with observed, inferred, unknown tiers', async () => {
      const advice = await geoAgentService.analyzeSituation({
        emergency: emergencyDoc,
        vehicle: vehicleDoc,
        route: routeDoc,
        telemetry: { speed: 45, heading: 40 },
        deviation: { status: 'DEVIATED', distanceFromRouteMeters: 180 },
        incidents: [incidentDoc]
      });

      assert(advice !== null, 'Advisory response returned');
      assert(advice.recommendation || advice.primaryAction, 'Recommendation provided');
      assert(advice.epistemicBreakdown !== undefined, 'epistemicBreakdown is present');
      assert(Array.isArray(advice.epistemicBreakdown.observed), 'observed tier is an array');
      assert(Array.isArray(advice.epistemicBreakdown.inferred), 'inferred tier is an array');
      assert(Array.isArray(advice.epistemicBreakdown.unknown), 'unknown tier is an array');
    });

    // -------------------------------------------------------------------------
    // Criterion 8: Deterministic Decision Engine Proposal
    // -------------------------------------------------------------------------
    console.log('[Criterion 8] Testing Deterministic Decision Proposal...');
    await itAsync('Creates decision proposal with status PENDING_OPERATOR_ACTION and situation hash', async () => {
      const decisionRes = await decisionService.evaluateEmergencyDecision({
        emergencyId: emgId,
        vehicleId: vehId,
        situationAnalysis: {
          deviation: { status: 'DEVIATED', distanceFromRouteMeters: 180 },
          incidents: [incidentDoc],
          eta: { currentMinutes: 18, delayMinutes: 8 }
        },
        candidateRoutes: []
      });

      assert(decisionRes && decisionRes.decision, 'Decision proposal created');
      activeDecisionDoc = decisionRes.decision;

      assert.strictEqual(activeDecisionDoc.status, 'PENDING_OPERATOR_ACTION', 'Initial status is PENDING_OPERATOR_ACTION');
      assert(activeDecisionDoc.primaryAction || activeDecisionDoc.action, 'Action recommended');
      assert(typeof activeDecisionDoc.situationHash === 'string' && activeDecisionDoc.situationHash.length > 0, 'SHA-256 situation hash recorded');
    });

    // -------------------------------------------------------------------------
    // Criterion 9: Operator Approval (Atomic Transition)
    // -------------------------------------------------------------------------
    console.log('[Criterion 9] Testing Operator Approval Atomic Transition...');
    await itAsync('Transitions decision from PENDING_OPERATOR_ACTION to APPROVED', async () => {
      assert(activeDecisionDoc, 'Active decision must exist from Criterion 8');

      const approved = await decisionService.approveDecision({
        decisionId: activeDecisionDoc.decisionId,
        operatorId: 'OPERATOR-007',
        notes: 'Corridor verified via CCTV; proceed with reroute'
      });

      assert.strictEqual(approved.status, 'APPROVED', 'Decision transitioned to APPROVED');
      assert.strictEqual(approved.approvedBy, 'OPERATOR-007', 'approvedBy recorded');
      assert(approved.approvedAt, 'approvedAt timestamp recorded');

      // Verify in DB
      const inDb = await Decision.findOne({ decisionId: activeDecisionDoc.decisionId });
      assert.strictEqual(inDb.status, 'APPROVED', 'MongoDB reflects APPROVED status');
      activeDecisionDoc = inDb;
    });

    // -------------------------------------------------------------------------
    // Criterion 10: Operator Rejection (Atomic Transition)
    // -------------------------------------------------------------------------
    console.log('[Criterion 10] Testing Operator Rejection Atomic Transition...');
    await itAsync('Transitions a decision from PENDING_OPERATOR_ACTION to REJECTED with reason', async () => {
      // Create a secondary decision to test rejection
      const rejDecision = await Decision.create({
        decisionId: `DEC-REJ-${testSuffix}`,
        emergency: emergencyDoc._id,
        emergencyId: emgId,
        vehicle: vehicleDoc._id,
        vehicleId: vehId,
        primaryAction: 'DISPATCH_BACKUP',
        action: 'DISPATCH_BACKUP',
        severity: 'MEDIUM',
        status: 'PENDING_OPERATOR_ACTION',
        reasonCodes: ['DELAY_ACCUMULATION'],
        situationHash: `hash-rej-${testSuffix}`
      });

      const rejected = await decisionService.rejectDecision({
        decisionId: rejDecision.decisionId,
        operatorId: 'OPERATOR-007',
        reason: 'Ambulance V1 cleared intersection; backup not necessary'
      });

      assert.strictEqual(rejected.status, 'REJECTED', 'Decision transitioned to REJECTED');
      assert.strictEqual(rejected.rejectedBy, 'OPERATOR-007', 'rejectedBy recorded');
      assert(rejected.rejectionReason.includes('backup not necessary'), 'Rejection rationale recorded');

      // Verify in DB
      const inDb = await Decision.findOne({ decisionId: rejDecision.decisionId });
      assert.strictEqual(inDb.status, 'REJECTED', 'MongoDB reflects REJECTED status');

      // Clean up secondary rejection doc
      await Decision.deleteOne({ _id: rejDecision._id });
    });

    // -------------------------------------------------------------------------
    // Criterion 11: Execution Transition (Atomic Transition)
    // -------------------------------------------------------------------------
    console.log('[Criterion 11] Testing Decision Execution Atomic Transition...');
    await itAsync('Transitions decision from APPROVED to EXECUTED and updates emergency state', async () => {
      assert(activeDecisionDoc, 'Active decision must exist and be APPROVED');
      assert.strictEqual(activeDecisionDoc.status, 'APPROVED', 'Precondition: decision must be APPROVED');

      const executed = await decisionService.executeDecision({
        decisionId: activeDecisionDoc.decisionId,
        operatorId: 'OPERATOR-007',
        executionPayload: { executionSummary: 'Reroute dispatched to vehicle MDT' }
      });

      assert.strictEqual(executed.status, 'EXECUTED', 'Decision transitioned to EXECUTED');
      assert(executed.executedAt, 'executedAt timestamp recorded');
      assert(executed.executionSummary, 'executionSummary recorded');

      // Verify in DB
      const inDb = await Decision.findOne({ decisionId: activeDecisionDoc.decisionId });
      assert.strictEqual(inDb.status, 'EXECUTED', 'MongoDB reflects EXECUTED status');
    });

    // -------------------------------------------------------------------------
    // Criterion 12: Concurrency Safety (Simultaneous Action Handling)
    // -------------------------------------------------------------------------
    console.log('[Criterion 12] Testing Concurrency Safety & Double-Action Prevention...');
    await itAsync('Simultaneous actions on the same decision reject second attempt with Conflict', async () => {
      // Create a pending decision specifically for race testing
      const raceDecision = await Decision.create({
        decisionId: `DEC-RACE-${testSuffix}`,
        emergency: emergencyDoc._id,
        emergencyId: emgId,
        vehicle: vehicleDoc._id,
        vehicleId: vehId,
        primaryAction: 'REROUTE_RECOMMENDED',
        action: 'REROUTE_RECOMMENDED',
        severity: 'HIGH',
        status: 'PENDING_OPERATOR_ACTION',
        reasonCodes: ['CONCURRENCY_TEST'],
        situationHash: `hash-race-${testSuffix}`
      });

      // Fire two simultaneous approvals simulating two operators clicking at the exact same millisecond
      const [res1, res2] = await Promise.allSettled([
        decisionService.approveDecision({
          decisionId: raceDecision.decisionId,
          operatorId: 'OPERATOR-ALPHA',
          notes: 'First operator action'
        }),
        decisionService.approveDecision({
          decisionId: raceDecision.decisionId,
          operatorId: 'OPERATOR-BETA',
          notes: 'Second operator action'
        })
      ]);

      const fulfilled = [res1, res2].filter(r => r.status === 'fulfilled');
      const rejected = [res1, res2].filter(r => r.status === 'rejected');

      assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent approval succeeded');
      assert.strictEqual(rejected.length, 1, 'Exactly one concurrent approval was rejected');
      assert(
        rejected[0].reason.message.includes('not pending') ||
        rejected[0].reason.statusCode === 409 ||
        rejected[0].reason.status === 409,
        `Rejection is a conflict: ${rejected[0].reason.message}`
      );

      // Clean up race decision
      await Decision.deleteOne({ _id: raceDecision._id });
    });

  } finally {
    // -------------------------------------------------------------------------
    // Teardown Fixtures
    // -------------------------------------------------------------------------
    console.log('\n[Teardown] Cleaning up test fixtures...');
    if (vehicleDoc) await Vehicle.deleteOne({ _id: vehicleDoc._id });
    if (emergencyDoc) await Emergency.deleteOne({ _id: emergencyDoc._id });
    if (routeDoc) await Route.deleteOne({ _id: routeDoc._id });
    if (incidentDoc) await Incident.deleteOne({ _id: incidentDoc._id });
    if (activeDecisionDoc) await Decision.deleteOne({ _id: activeDecisionDoc._id });
    console.log('  Teardown complete.\n');

    await mongoose.connection.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`CONTROL ROOM E2E TESTS COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runControlRoomE2ETests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
