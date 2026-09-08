/**
 * 10-Tier Operational Intelligence Pipeline Integration Test Suite
 *
 * Validates the full sequential workflow:
 * Vehicle GPS → Node.js Telemetry → Python Routing / V2X Engine →
 * Corridor + Green-Wave Analysis → Google Traffic-Aware Routes →
 * Prediction Engine → Route Comparison → Gemini Reasoning →
 * Decision Engine → Control Room
 */

import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Database & Models
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Route from './modules/routes/route.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Incident from './modules/incidents/incident.model.js';
import Decision from './modules/decisions/decision.model.js';

// Services
import { createTrajectory } from './modules/trajectories/trajectory.service.js';
import pythonRoutingBridge, { fallbackV2XEngine, DEFAULT_V2X_SIGNALS } from './modules/routes/pythonRoutingBridge.service.js';
import corridorGreenWaveService from './modules/routes/corridorGreenWave.service.js';
import predictionService from './modules/analysis/prediction.service.js';
import routeComparisonService from './modules/routes/routeComparison.service.js';
import { geoAgentToolDeclarations, executeGeoAgentTool } from './modules/geoagents/geoAgent.tools.js';
import { evaluateDecisionRules } from './modules/decisions/decision.rules.js';
import decisionService from './modules/decisions/decision.service.js';
import orchestrationService from './modules/orchestration/orchestration.service.js';
import { DECISION_ACTIONS, DECISION_SEVERITY, REASON_CODES } from './modules/decisions/decision.constants.js';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

let testsPassed = 0;
let testsFailed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

async function runPipelineTests() {
  console.log('================================================================');
  console.log('10-TIER OPERATIONAL INTELLIGENCE PIPELINE TEST SUITE');
  console.log('================================================================\n');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('MongoDB connected for pipeline testing.\n');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // Fixtures
  const testSuffix = Date.now();
  const testVehicleId = `AMB-V2X-${testSuffix}`;
  const testEmergencyId = `EMG-V2X-${testSuffix}`;
  const testRouteId = `ROUTE-V2X-${testSuffix}`;

  let vehicleDoc = null;
  let emergencyDoc = null;
  let routeDoc = null;

  try {
    // Setup Test Data
    vehicleDoc = await Vehicle.create({
      vehicleId: testVehicleId,
      registrationNumber: `KA-01-V2X-${testSuffix.toString().slice(-4)}`,
      type: 'ADVANCED_LIFE_SUPPORT',
      status: 'EN_ROUTE',
      currentLocation: { type: 'Point', coordinates: [77.6030, 12.9730] }, // Near Mayo Hall
      speed: 45,
      heading: 85
    });

    emergencyDoc = await Emergency.create({
      emergencyId: testEmergencyId,
      type: 'CARDIAC_ARREST',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }, // MG Road
      destination: {
        name: 'Manipal Hospital HAL',
        coordinates: [77.6483, 12.9582]
      },
      assignedVehicle: vehicleDoc._id
    });

    routeDoc = await Route.create({
      routeId: testRouteId,
      vehicle: vehicleDoc._id,
      emergency: emergencyDoc._id,
      origin: { name: 'MG Road', coordinates: [77.5946, 12.9716] },
      destination: { name: 'Manipal Hospital', coordinates: [77.6483, 12.9582] },
      distance: 5400,
      duration: 600,
      status: 'ACTIVE',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.5946, 12.9716],
          [77.6030, 12.9730],
          [77.6110, 12.9735],
          [77.6180, 12.9725],
          [77.6300, 12.9660],
          [77.6400, 12.9610],
          [77.6483, 12.9582]
        ]
      }
    });

    console.log('--- Tier 1 & 2: Vehicle GPS & Node.js Telemetry Ingestion ---');
    await itAsync('Ingests live GPS coordinate and creates Trajectory point', async () => {
      const traj = await createTrajectory({
        vehicleId: testVehicleId,
        latitude: 12.9730,
        longitude: 77.6030,
        speed: 42.5,
        heading: 85,
        source: 'GPS_DEVICE'
      });
      assert(traj, 'Trajectory should be created');
      assert.strictEqual(traj.location.coordinates[0], 77.603);
      assert.strictEqual(traj.location.coordinates[1], 12.973);
      assert.strictEqual(traj.speed, 42.5);
    });

    console.log('\n--- Tier 3: Python Routing / V2X Engine Bridge ---');
    it('Executes V2X spatial bridge via Python or pure JS fallback seamlessly', () => {
      const bridgeResult = pythonRoutingBridge.executeV2XBridge({
        vehicleLocation: { lat: 12.9730, lng: 77.6030 },
        speedKmh: 42.0,
        heading: 85.0
      });
      assert(bridgeResult, 'Bridge result must be returned');
      assert(bridgeResult.v2xSignals.length >= 4, 'Must evaluate all corridor V2X signals');
      assert(typeof bridgeResult.deviation.distanceFromPlannedRouteMeters === 'number');
      assert(Array.isArray(bridgeResult.alternativeRoutes));
      assert(bridgeResult.alternativeRoutes.length >= 2, 'Alternative bypass routes must be present');
    });

    it('JS fallback engine provides identical V2X schema', () => {
      const fallbackResult = fallbackV2XEngine({
        vehicleLocation: { lat: 12.9730, lng: 77.6030 }
      });
      assert.strictEqual(fallbackResult.engineUsed, 'javascript-fallback');
      assert.strictEqual(fallbackResult.v2xSignals.length, 4);
      assert(fallbackResult.corridorSummary.totalSignals === 4);
    });

    console.log('\n--- Tier 4: Corridor + Green-Wave Analysis ---');
    await itAsync('Computes dynamic signal preemption and civilian yield alerts for vehicle', async () => {
      const corridor = await corridorGreenWaveService.analyzeCorridorForVehicle(testVehicleId);
      assert(corridor, 'Corridor analysis must return');
      assert.strictEqual(corridor.vehicleId, testVehicleId);
      assert(corridor.v2xSignals.some((s) => s.status === 'GREEN_WAVE_ACTIVE'), 'Nearest signal should have active green wave');
      assert(corridor.corridorSummary.civilianAlertedCount > 0, 'Civilian vehicles should be alerted');
      assert(corridor.corridorSummary.timeSavedMinutes > 0, 'Green wave should produce positive time savings');
      assert(corridor.preemptionActive, 'Preemption must be marked active');
    });

    console.log('\n--- Tier 5 & 6: Google Traffic-Aware Routes & Prediction with Green Wave ---');
    it('Prediction Engine factors V2X Green-Wave preemption into ETA and delay', () => {
      const basePrediction = predictionService.calculatePrediction({
        route: { distance: 5400, duration: 600 },
        progress: { remainingDistanceMeters: 4000 },
        traffic: { level: 'HEAVY', speedKmh: 20, trafficDelaySeconds: 240 }
      });

      const gwPrediction = predictionService.calculatePrediction({
        route: { distance: 5400, duration: 600 },
        progress: { remainingDistanceMeters: 4000 },
        traffic: { level: 'HEAVY', speedKmh: 20, trafficDelaySeconds: 240 },
        v2x: {
          corridorSummary: { preemptedCount: 3, timeSavedMinutes: 2.4 }
        }
      });

      assert(
        gwPrediction.predictedDurationSeconds < basePrediction.predictedDurationSeconds,
        'Green wave preemption must reduce predicted duration'
      );
      assert(
        gwPrediction.factors.some((f) => f.impact === 'PREEMPTION_ADVANTAGE'),
        'Must record green wave preemption factor with explicit observed tag'
      );
    });

    console.log('\n--- Tier 7: Route Comparison Matrix & Corridor What-If ---');
    it('Route comparison incorporates V2X corridor clearance into What-If analysis', () => {
      const comparison = routeComparisonService.compareRoutes({
        currentRoute: { distanceMeters: 5400, durationSeconds: 600 },
        candidateRoutes: [
          { routeId: 'ROUTE_ALT_B', distanceMeters: 6200, durationSeconds: 540, description: 'Indiranagar Bypass' }
        ],
        v2xCorridor: {
          corridorSummary: {
            corridorHealth: 'GREEN_WAVE_ACTIVE',
            preemptedCount: 4,
            timeSavedMinutes: 3.2
          }
        }
      });

      assert(comparison.whatIfDoNothing, 'Must provide what-if analysis');
      assert(
        comparison.whatIfDoNothing.reasons.some((r) => r.includes('V2X Green Wave preemption active')),
        'What-if reasons must mention V2X green-wave preemption status'
      );
    });

    console.log('\n--- Tier 8: Gemini Advisory Reasoning & Grounding Tools ---');
    it('Exposes getCorridorGreenWaveStatus in Gemini tool declarations', () => {
      const tool = geoAgentToolDeclarations.find((t) => t.name === 'getCorridorGreenWaveStatus');
      assert(tool, 'getCorridorGreenWaveStatus must be registered');
      assert.strictEqual(tool.name, 'getCorridorGreenWaveStatus');
      assert(tool.description.includes('V2X traffic signal preemption'));
    });

    await itAsync('Executes getCorridorGreenWaveStatus tool via executeGeoAgentTool', async () => {
      const toolOutput = await executeGeoAgentTool('getCorridorGreenWaveStatus', {
        vehicleId: testVehicleId
      });
      assert(toolOutput, 'Tool output must exist');
      assert.strictEqual(toolOutput.vehicleId, testVehicleId);
      assert(toolOutput.totalSignals >= 4);
      assert(typeof toolOutput.civilianAlertedCount === 'number');
    });

    console.log('\n--- Tier 9: Deterministic Decision Engine ---');
    it('Triggers CORRIDOR_BLOCKED reason code when physical blockage is detected', () => {
      const blockedContext = {
        emergency: { id: testEmergencyId, priority: 'CRITICAL', status: 'IN_PROGRESS' },
        vehicle: { id: testVehicleId, status: 'EN_ROUTE' },
        route: { id: testRouteId, status: 'ACTIVE' },
        deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 10 },
        traffic: { level: 'HEAVY' },
        eta: { currentMinutes: 14, originalMinutes: 10, delayMinutes: 4 },
        alternativeRoutes: [
          { routeId: 'ROUTE_ALT_B', etaMinutes: 11, traffic: 'LIGHT', incidentExposure: 'NONE' }
        ],
        availableBackupVehicles: [],
        v2xCorridor: {
          corridorSummary: { corridorHealth: 'CORRIDOR_BLOCKED', preemptedCount: 0 }
        }
      };

      const decision = evaluateDecisionRules(blockedContext);
      assert(decision.reasonCodes.includes(REASON_CODES.CORRIDOR_BLOCKED));
      assert(decision.actions.includes(DECISION_ACTIONS.REROUTE));
      assert.strictEqual(decision.severity, DECISION_SEVERITY.CRITICAL);
    });

    it('Adds GREEN_WAVE_PREEMPTION_ACTIVE reason code when signals are green', () => {
      const gwContext = {
        emergency: { id: testEmergencyId, priority: 'HIGH', status: 'IN_PROGRESS' },
        vehicle: { id: testVehicleId, status: 'EN_ROUTE' },
        route: { id: testRouteId, status: 'ACTIVE' },
        deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 10 },
        traffic: { level: 'MODERATE' },
        eta: { currentMinutes: 9, originalMinutes: 10, delayMinutes: 0 },
        alternativeRoutes: [],
        availableBackupVehicles: [],
        v2xCorridor: {
          corridorSummary: { corridorHealth: 'GREEN_WAVE_ACTIVE', preemptedCount: 3 }
        }
      };

      const decision = evaluateDecisionRules(gwContext);
      assert(decision.reasonCodes.includes(REASON_CODES.GREEN_WAVE_PREEMPTION_ACTIVE));
    });

    console.log('\n--- Tier 10: Control Room Real-Time Orchestration ---');
    await itAsync('Executes full 10-tier emergency workflow and builds V2X epistemic breakdown', async () => {
      const result = await orchestrationService.executeEmergencyWorkflow(testEmergencyId);
      assert.strictEqual(result.workflowStatus, 'COMPLETED');
      assert(result.v2xCorridor, 'Result must include v2xCorridor');
      assert(result.v2xCorridor.v2xSignals.length >= 4);
      assert(
        result.epistemicBreakdown.observed.some((o) => o.includes('V2X Green Wave') || o.includes('V2X Corridor')),
        'Epistemic breakdown must ground observed V2X facts'
      );
    });

  } finally {
    // Teardown
    console.log('\nCleaning up test fixtures...');
    if (vehicleDoc) await Vehicle.deleteOne({ _id: vehicleDoc._id });
    if (emergencyDoc) await Emergency.deleteOne({ _id: emergencyDoc._id });
    if (routeDoc) await Route.deleteOne({ _id: routeDoc._id });
    await Trajectory.deleteMany({ vehicle: vehicleDoc?._id });
    await Decision.deleteMany({ emergency: emergencyDoc?._id });
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }

  console.log('\n================================================================');
  console.log(`PIPELINE TESTS COMPLETE: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPipelineTests();
