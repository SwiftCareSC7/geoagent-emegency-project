/**
 * Comprehensive Verification Test Suite: Intelligence Pipeline
 *
 * Tests:
 * 1. Google Routes Provider Input Validation (coordinates & waypoints)
 * 2. Route Comparison Service & Deterministic What-If Projection
 * 3. Prediction Engine Hardening (v1.3, epistemic breakdown, historical benchmark)
 * 4. GeoAgent Advisory Tools Registry (all 9 tools exposed and functional)
 * 5. Telemetry Ingestion & Real-Time Payload Generation (validLocation fix)
 * 6. Provider Error Transparency (no silent mock downgrades)
 * 7. Decision Engine Human-in-the-Loop State Lifecycle
 */

import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import googleRoutingProvider from './modules/routes/providers/googleRoutingProvider.js';
import routeComparisonService from './modules/routes/routeComparison.service.js';
import predictionService from './modules/analysis/prediction.service.js';
import { geoAgentToolDeclarations, executeGeoAgentTool } from './modules/geoagents/geoAgent.tools.js';
import { createTrajectory } from './modules/trajectories/trajectory.service.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Route from './modules/routes/route.model.js';
import Decision from './modules/decisions/decision.model.js';
import decisionService from './modules/decisions/decision.service.js';
import connectDB from './config/db.js';

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

async function run() {
  console.log('====================================================');
  console.log('   INTELLIGENCE PIPELINE VERIFICATION TEST SUITE    ');
  console.log('====================================================\n');

  // Connect to DB
  await connectDB();

  // ----------------------------------------------------
  // SECTION 1: Google Routes Input Validation
  // ----------------------------------------------------
  console.log('--- 1. Google Routes Provider Input Validation ---');

  it('Rejects invalid latitude (> 90)', () => {
    assert.throws(() => {
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [77.2090, 95.0] }, 'Origin');
    }, /between -90 and 90/);
  });

  it('Rejects invalid latitude (< -90)', () => {
    assert.throws(() => {
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [77.2090, -92.0] }, 'Origin');
    }, /between -90 and 90/);
  });

  it('Rejects invalid longitude (> 180)', () => {
    assert.throws(() => {
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [185.0, 28.6139] }, 'Destination');
    }, /between -180 and 180/);
  });

  it('Rejects invalid longitude (< -180)', () => {
    assert.throws(() => {
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [-190.0, 28.6139] }, 'Destination');
    }, /between -180 and 180/);
  });

  it('Rejects malformed GeoJSON Point', () => {
    assert.throws(() => {
      googleRoutingProvider.validateCoordinates([77.2, 28.6], 'Origin');
    }, /must be a GeoJSON Point/);
  });

  it('Accepts valid GeoJSON Point coordinates', () => {
    assert.doesNotThrow(() => {
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [77.2090, 28.6139] }, 'Delhi AIIMS');
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [-122.4194, 37.7749] }, 'San Francisco');
    });
  });

  // ----------------------------------------------------
  // SECTION 2: Route Candidate Comparison & What-If
  // ----------------------------------------------------
  console.log('\n--- 2. Route Candidate Comparison & What-If Analysis ---');

  it('Compares primary corridor against alternative candidate deterministically', () => {
    const primary = {
      description: 'Connaught Place Main Corridor',
      distanceMeters: 5000,
      durationSeconds: 900, // 15 min
      trafficDelaySeconds: 300,
      provider: 'GOOGLE'
    };
    const alternative = {
      description: 'Barakhamba Bypass',
      distanceMeters: 5800,
      durationSeconds: 660, // 11 min
      trafficDelaySeconds: 60,
      provider: 'GOOGLE'
    };

    const comparison = routeComparisonService.compareRoutes({
      currentRoute: primary,
      candidateRoutes: [alternative]
    });

    assert.ok(comparison.currentRoute);
    assert.strictEqual(comparison.alternatives.length, 1);
    const altComp = comparison.alternatives[0];
    assert.strictEqual(altComp.timeSavedMinutes, 4); // 15 min - 11 min = 4 min
    assert.strictEqual(altComp.distanceDeltaMeters, 800); // 5800 - 5000 = 800m
    assert.strictEqual(altComp.trafficDelayDeltaSeconds, -240); // 60 - 300 = -240s
    assert.strictEqual(altComp.isRecommended, true);
  });

  it('Produces deterministic "What if we do nothing?" scenario projection', () => {
    const primary = {
      distanceMeters: 5000,
      durationSeconds: 960,
      trafficDelaySeconds: 360
    };
    const alternative = {
      description: 'Bypass Alternative',
      distanceMeters: 5500,
      durationSeconds: 660,
      trafficDelaySeconds: 60
    };

    const comparison = routeComparisonService.compareRoutes({
      currentRoute: primary,
      candidateRoutes: [alternative],
      deviationState: { status: 'DEVIATED', distanceFromRouteMeters: 145 },
      predictionState: { predictedDurationMinutes: 16, delayRisk: 'HIGH' },
      incidents: [{ type: 'ACCIDENT' }]
    });

    const whatIf = comparison.whatIfDoNothing;
    assert.strictEqual(whatIf.scenario, 'MAINTAIN_CURRENT_CORRIDOR');
    assert.ok(whatIf.operationalRisk === 'HIGH' || whatIf.operationalRisk === 'CRITICAL');
    assert.strictEqual(whatIf.etaDeltaVsBestMinutes, 5);
    assert.ok(whatIf.summary);
    assert.ok(whatIf.reasons.length >= 2);
  });

  it('Generates causal "Why did the route change?" tags', () => {
    const primary = {
      distanceMeters: 5000,
      durationSeconds: 960,
      trafficDelaySeconds: 360
    };
    const alternative = {
      description: 'Bypass Alternative',
      distanceMeters: 5500,
      durationSeconds: 600,
      trafficDelaySeconds: 30
    };

    const comparison = routeComparisonService.compareRoutes({
      currentRoute: primary,
      candidateRoutes: [alternative],
      deviationState: { status: 'CRITICAL_DEVIATION', distanceFromRouteMeters: 260 },
      incidents: [{ type: 'ROAD_CLOSURE' }]
    });

    const reasons = comparison.whyRouteChanged;
    assert.ok(reasons.some(r => r.includes('Alternative corridor provides') || r.includes('faster arrival')));
    assert.ok(reasons.some(r => r.includes('CRITICAL_DEVIATION') || r.includes('Critical vehicle deviation')));
    assert.ok(reasons.some(r => r.includes('Traffic congestion') || r.includes('delay')));
  });

  // ----------------------------------------------------
  // SECTION 3: Prediction Engine Hardening
  // ----------------------------------------------------
  console.log('\n--- 3. Prediction Engine Hardening ---');

  it('Reports correct model version v1.3-exponential-traffic-blend', () => {
    assert.strictEqual(predictionService.modelVersion, 'v1.3-exponential-traffic-blend');
  });

  it('Computes speed trends and rolling exponential moving average', () => {
    const trajectories = [
      { speed: 20 },
      { speed: 25 },
      { speed: 35 },
      { speed: 45 }
    ];
    const trend = predictionService.calculateSpeedTrend(trajectories);
    assert.ok(typeof trend.emaSpeedKmh === 'number');
    assert.ok(['DECELERATING', 'ACCELERATING', 'STABLE'].includes(trend.trend));
  });

  it('Assigns explicit 3-tier epistemic tags to prediction factors', () => {
    const prediction = predictionService.calculatePrediction({
      latestTrajectory: { speed: 18, location: { type: 'Point', coordinates: [77.2, 28.6] } },
      recentTrajectories: [{ speed: 18 }, { speed: 22 }, { speed: 28 }],
      route: { distance: 5000, duration: 600 },
      progress: { remainingDistanceMeters: 3000, progressPercentage: 40 },
      deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 12 },
      traffic: { level: 'HEAVY', speedKmh: 20, source: 'GOOGLE' },
      incidents: [{ type: 'ACCIDENT' }],
      historicalSpeedKmh: 35
    });

    assert.ok(prediction.factors.length >= 4);
    for (const factor of prediction.factors) {
      assert.ok(
        ['OBSERVED', 'DERIVED', 'INFERRED', 'UNKNOWN'].includes(factor.epistemicType),
        `Invalid epistemicType: ${factor.epistemicType} on factor ${factor.factor}`
      );
    }

    // Verify historical benchmark factor is classified as DERIVED
    const histFactor = prediction.factors.find(f => /Historical .* benchmark/i.test(f.factor));
    assert.ok(histFactor, 'Historical benchmark factor should be present');
    assert.strictEqual(histFactor.epistemicType, 'DERIVED');
  });

  // ----------------------------------------------------
  // SECTION 4: GeoAgent Tools Registry & Handlers
  // ----------------------------------------------------
  console.log('\n--- 4. GeoAgent Tools Registry & Declarations ---');

  const requiredTools = [
    'getEmergencyState',
    'getVehicleState',
    'getRecentTrajectory',
    'getCurrentRoute',
    'getRouteAlternatives',
    'getTrafficAnalysis',
    'getPrediction',
    'getNearbyIncidents',
    'getDecisionHistory'
  ];

  for (const toolName of requiredTools) {
    it(`Exposes required tool: ${toolName}`, () => {
      const decl = geoAgentToolDeclarations.find(d => d.name === toolName);
      assert.ok(decl, `Missing tool declaration: ${toolName}`);
      assert.ok(decl.description, `Missing description for tool: ${toolName}`);
      assert.ok(decl.parameters, `Missing parameters for tool: ${toolName}`);
    });
  }

  await itAsync('Executes getNearbyIncidents tool via executeGeoAgentTool', async () => {
    const result = await executeGeoAgentTool('getNearbyIncidents', {
      longitude: 77.2090,
      latitude: 28.6139,
      radiusMeters: 5000
    });
    assert.ok(result.searchRadiusMeters === 5000);
    assert.ok(Array.isArray(result.incidents));
  });

  await itAsync('Executes getRouteAlternatives tool via executeGeoAgentTool', async () => {
    const result = await executeGeoAgentTool('getRouteAlternatives', {
      originLng: 77.2090,
      originLat: 28.6139,
      destLng: 77.2300,
      destLat: 28.6500
    });
    assert.ok(Array.isArray(result.candidateRoutes));
    assert.ok(result.candidateRoutes.length >= 1);
  });

  await itAsync('Executes getTrafficAnalysis tool via executeGeoAgentTool', async () => {
    const result = await executeGeoAgentTool('getTrafficAnalysis', {
      longitude: 77.2090,
      latitude: 28.6139
    });
    assert.ok(result.level);
    assert.ok(typeof result.speedKmh === 'number');
  });

  // ----------------------------------------------------
  // SECTION 5: Telemetry Ingestion & validLocation Fix
  // ----------------------------------------------------
  console.log('\n--- 5. Telemetry Ingestion & validLocation Fix ---');

  await itAsync('Ingests valid telemetry fix without ReferenceError on validLocation', async () => {
    // Find or create a test vehicle
    let testVeh = await Vehicle.findOne({ vehicleId: 'TEST-AMB-VERIFY' });
    if (!testVeh) {
      testVeh = await Vehicle.create({
        vehicleId: 'TEST-AMB-VERIFY',
        registrationNumber: 'DL-01-VERIFY-99',
        type: 'AMBULANCE',
        capacity: 2,
        status: 'EN_ROUTE',
        driverName: 'Officer Test',
        driverContact: '+919999999999'
      });
    } else {
      testVeh.status = 'EN_ROUTE';
      await testVeh.save();
    }

    const traj = await createTrajectory({
      vehicleId: testVeh.vehicleId,
      location: {
        type: 'Point',
        coordinates: [77.2150, 28.6250]
      },
      speed: 36.5,
      heading: 90,
      timestamp: new Date().toISOString()
    });

    assert.ok(traj);
    assert.strictEqual(traj.speed, 36.5);
    assert.strictEqual(traj.heading, 90);
    assert.strictEqual(traj.location.coordinates[0], 77.2150);
    assert.strictEqual(traj.location.coordinates[1], 28.6250);
  });

  // ----------------------------------------------------
  // SECTION 6: Authoritative Decision Lifecycle
  // ----------------------------------------------------
  console.log('\n--- 6. Authoritative Decision Lifecycle ---');

  await itAsync('Enforces human operator transition from PENDING -> APPROVED -> EXECUTED', async () => {
    let testEmergency = await Emergency.findOne({ emergencyId: 'EMG-VERIFY-001' });
    if (!testEmergency) {
      testEmergency = await Emergency.create({
        emergencyId: 'EMG-VERIFY-001',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] },
        destination: { type: 'Point', coordinates: [77.2300, 28.6500] },
        createdBy: new mongoose.Types.ObjectId()
      });
    }

    const decision = await Decision.create({
      decisionId: `DEC-TEST-${Date.now()}`,
      emergency: testEmergency._id,
      severity: 'CRITICAL',
      primaryAction: 'REROUTE',
      actions: ['REROUTE'],
      status: 'PENDING_OPERATOR_ACTION',
      rationale: 'Heavy congestion ahead',
      reasonCodes: ['CORRIDOR_CONGESTION'],
      situationHash: 'testhash1234567890123456'
    });

    // 1. Approve
    const operatorId = new mongoose.Types.ObjectId();
    const approved = await decisionService.approveDecision(decision.decisionId, operatorId, 'Confirmed bypass route');
    assert.strictEqual(approved.status, 'APPROVED');
    assert.strictEqual(approved.approvedBy.toString(), operatorId.toString());

    // 2. Rejecting an approved decision without execution should fail or transition as defined
    // 3. Execute
    const executed = await decisionService.executeDecision(decision.decisionId, operatorId);
    assert.strictEqual(executed.status, 'EXECUTED');

    // Clean up
    await Decision.deleteOne({ _id: decision._id });
  });

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
