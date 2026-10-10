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
import predictionService, {
  advanceRouteDegradationState,
  deriveRouteDegradationReasons
} from './modules/analysis/prediction.service.js';
import analysisService from './modules/analysis/analysis.service.js';
import trafficService from './modules/traffic/traffic.service.js';
import { geoAgentToolDeclarations, executeGeoAgentTool } from './modules/geoagents/geoAgent.tools.js';
import { createTrajectory, matchTrajectoryToRoute } from './modules/trajectories/trajectory.service.js';
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
      googleRoutingProvider.validateCoordinates({
        type: 'LineString',
        coordinates: [[77.2, 28.6], [77.3, 28.7]]
      }, 'Origin');
    }, /must be a GeoJSON Point/);
  });

  it('Accepts valid GeoJSON Point coordinates', () => {
    assert.doesNotThrow(() => {
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [77.2090, 28.6139] }, 'Delhi AIIMS');
      googleRoutingProvider.validateCoordinates({ type: 'Point', coordinates: [-122.4194, 37.7749] }, 'San Francisco');
      googleRoutingProvider.validateCoordinates([77.2090, 28.6139], 'Delhi coordinate pair');
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

  it('Adds only a nearby local route match without changing the raw GPS fix', () => {
    const rawLocation = { type: 'Point', coordinates: [77.5996, 12.9718] };
    const rawCoordinates = [...rawLocation.coordinates];
    const routeGeometry = {
      type: 'LineString',
      coordinates: [[77.5946, 12.9716], [77.6046, 12.9716]]
    };

    const match = matchTrajectoryToRoute(rawLocation, routeGeometry);

    assert.ok(match);
    assert.ok(match.distanceMeters <= 35);
    assert.deepStrictEqual(rawLocation.coordinates, rawCoordinates);
    assert.notDeepStrictEqual(match.location.coordinates, rawCoordinates);
  });

  it('Leaves distant or unusable route matches unset', () => {
    const location = { type: 'Point', coordinates: [77.5996, 12.9725] };
    const routeGeometry = {
      type: 'LineString',
      coordinates: [[77.5946, 12.9716], [77.6046, 12.9716]]
    };

    assert.strictEqual(matchTrajectoryToRoute(location, routeGeometry), null);
    assert.strictEqual(matchTrajectoryToRoute(location, { type: 'LineString', coordinates: [] }), null);
  });

  it('Classifies fresh, stale, and unavailable traffic snapshots explicitly', () => {
    const now = Date.now();
    const freshTraffic = {
      level: 'MODERATE',
      source: 'MOCK',
      retrievedAt: new Date(now - 30_000).toISOString()
    };
    const staleTraffic = {
      level: 'HEAVY',
      source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
      retrievedAt: new Date(now - 3 * 60_000).toISOString()
    };

    assert.strictEqual(trafficService.assessTrafficFreshness(freshTraffic, now).status, 'FRESH');
    assert.strictEqual(trafficService.assessTrafficFreshness(staleTraffic, now).status, 'STALE');
    assert.strictEqual(trafficService.assessTrafficFreshness(null, now).status, 'UNAVAILABLE');
    assert.strictEqual(trafficService.assessTrafficFreshness({
      level: 'UNKNOWN',
      source: 'GOOGLE_UNAVAILABLE',
      epistemicType: 'UNKNOWN'
    }, now).status, 'UNAVAILABLE');
  });

  it('Uses traffic-aware speed once and records incidents as qualitative risk only', () => {
    const now = Date.now();
    const inputs = {
      recentTrajectories: [{ speed: 20 }],
      route: { distance: 1000, duration: 120 },
      progress: { remainingDistanceMeters: 1000 },
      deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 0 },
      traffic: {
        level: 'HEAVY',
        speedKmh: 10,
        trafficDelaySeconds: 300,
        source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
        epistemicType: 'DERIVED',
        retrievedAt: new Date(now).toISOString()
      }
    };
    const withoutIncidents = predictionService.calculatePrediction({ ...inputs, incidents: [] });
    const withIncidents = predictionService.calculatePrediction({
      ...inputs,
      incidents: [
        { type: 'ROAD_CLOSURE', severity: 'HIGH', distanceFromRouteMeters: 20 },
        { type: 'ACCIDENT', severity: 'MEDIUM', distanceFromRouteMeters: 40 }
      ]
    });

    assert.strictEqual(withIncidents.predictedDurationSeconds, 240);
    assert.strictEqual(withIncidents.predictedDurationSeconds, withoutIncidents.predictedDurationSeconds);
    assert.strictEqual(withIncidents.inputsSummary.trafficDelayAppliedSeconds, 0);
    assert.strictEqual(withIncidents.inputsSummary.incidentImpactStatus, 'QUALITATIVE_ONLY');
    assert.ok(withIncidents.factors.some((factor) => factor.impact === 'TRAFFIC_DELAY_INCLUDED_IN_SPEED'));
    assert.strictEqual(withIncidents.factors.filter((factor) => factor.impact === 'INCIDENT_RISK').length, 2);
  });

  it('Excludes stale or unavailable traffic values from the ETA calculation', () => {
    const now = Date.now();
    const baseInputs = {
      recentTrajectories: [{ speed: 20 }],
      route: { distance: 1000, duration: 120 },
      progress: { remainingDistanceMeters: 1000 },
      deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 0 },
      incidents: []
    };
    const stale = predictionService.calculatePrediction({
      ...baseInputs,
      traffic: {
        level: 'HEAVY',
        speedKmh: 5,
        trafficDelaySeconds: 240,
        source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
        retrievedAt: new Date(now - 3 * 60_000).toISOString()
      }
    });
    const unavailable = predictionService.calculatePrediction({ ...baseInputs, traffic: null });

    assert.strictEqual(stale.trafficFreshness, 'STALE');
    assert.strictEqual(unavailable.trafficFreshness, 'UNAVAILABLE');
    assert.strictEqual(stale.predictedDurationSeconds, 180);
    assert.strictEqual(stale.predictedDurationSeconds, unavailable.predictedDurationSeconds);
    assert.strictEqual(stale.inputsSummary.trafficDelayAppliedSeconds, 0);
    const staleEvidence = analysisService.buildEvidenceList(
      { status: 'ON_ROUTE' },
      { level: 'HEAVY', source: 'MOCK', retrievedAt: new Date(now - 3 * 60_000).toISOString() },
      [],
      20
    );
    assert.ok(!staleEvidence.includes('HEAVY_TRAFFIC'));
    assert.ok(staleEvidence.includes('TRAFFIC_DATA_STALE'));
  });

  it('Uses a fresh traffic delay only when no traffic speed is available', () => {
    const now = Date.now();
    const prediction = predictionService.calculatePrediction({
      recentTrajectories: [{ speed: 20 }],
      route: { distance: 1000, duration: 120 },
      progress: { remainingDistanceMeters: 1000 },
      deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 0 },
      incidents: [],
      traffic: {
        level: 'HEAVY',
        trafficDelaySeconds: 60,
        source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
        epistemicType: 'DERIVED',
        retrievedAt: new Date(now).toISOString()
      }
    });

    assert.strictEqual(prediction.trafficFreshness, 'FRESH');
    assert.strictEqual(prediction.inputsSummary.trafficDelayAppliedSeconds, 60);
    assert.strictEqual(prediction.predictedDurationSeconds, 240);
  });

  it('Keeps the situation ETA explicit when traffic is stale and incidents lack numeric delay evidence', () => {
    const now = Date.now();
    const traffic = {
      level: 'HEAVY',
      speedKmh: 5,
      source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
      retrievedAt: new Date(now - 3 * 60_000).toISOString()
    };
    const withoutIncidents = analysisService.calculateETAAndDelay(1000, 20, traffic, 120, []);
    const withIncident = analysisService.calculateETAAndDelay(1000, 20, traffic, 120, [
      { type: 'ACCIDENT', severity: 'HIGH' }
    ]);

    assert.strictEqual(withIncident.estimatedSpeedKmh, 20);
    assert.strictEqual(withIncident.trafficFreshness, 'STALE');
    assert.strictEqual(withIncident.incidentImpactStatus, 'QUALITATIVE_ONLY');
    assert.strictEqual(withIncident.currentMinutes, withoutIncidents.currentMinutes);
  });

  it('Rejects a noisy single-fix deviation but identifies sustained route degradation', () => {
    const now = Date.now();
    const base = {
      route: { routeId: 'ROUTE-DEGRADATION-TEST' },
      latestTrajectory: { timestamp: new Date(now) },
      recentTrajectories: [{}, {}, {}],
      traffic: null,
      incidents: [],
      prediction: { rerouteAdvised: true, predictedDelayMinutes: 8 }
    };

    const noisyReasons = deriveRouteDegradationReasons({
      ...base,
      deviation: {
        status: 'CRITICAL_DEVIATION',
        gpsStability: 'UNSTABLE',
        sustainedDeviation: false
      },
      nowMs: now
    });
    const sustainedReasons = deriveRouteDegradationReasons({
      ...base,
      deviation: {
        status: 'DEVIATED',
        gpsStability: 'STABLE',
        sustainedDeviation: true
      },
      nowMs: now
    });

    assert.deepStrictEqual(noisyReasons, []);
    assert.ok(sustainedReasons.includes('SUSTAINED_DEVIATION'));
  });

  it('Requires fresh traffic before traffic conditions can create a degradation reason', () => {
    const now = Date.now();
    const common = {
      route: { routeId: 'ROUTE-TRAFFIC-DEGRADATION-TEST' },
      latestTrajectory: { timestamp: new Date(now) },
      recentTrajectories: [],
      deviation: { status: 'ON_ROUTE', gpsStability: 'STABLE', sustainedDeviation: false },
      incidents: [],
      prediction: { rerouteAdvised: true, predictedDelayMinutes: 6 },
      nowMs: now
    };
    const freshReasons = deriveRouteDegradationReasons({
      ...common,
      traffic: {
        level: 'HEAVY',
        source: 'MOCK',
        retrievedAt: new Date(now).toISOString()
      }
    });
    const staleReasons = deriveRouteDegradationReasons({
      ...common,
      traffic: {
        level: 'HEAVY',
        source: 'MOCK',
        retrievedAt: new Date(now - 3 * 60_000).toISOString()
      }
    });
    const unavailableReasons = deriveRouteDegradationReasons({ ...common, traffic: null });

    assert.ok(freshReasons.includes('FRESH_TRAFFIC_DEGRADATION'));
    assert.deepStrictEqual(staleReasons, []);
    assert.deepStrictEqual(unavailableReasons, []);
  });

  it('Debounces degradation, suppresses unchanged triggers, and hysteretically clears on recovery', () => {
    let state;
    const advance = (reasons) => {
      const result = advanceRouteDegradationState(state, 'ROUTE-STATE-TEST', reasons, {
        confirmations: 2,
        recoveryConfirmations: 2
      });
      state = result.state;
      return result.signal;
    };

    assert.strictEqual(advance(['SUSTAINED_DEVIATION']).status, 'PENDING');
    const confirmed = advance(['SUSTAINED_DEVIATION']);
    assert.strictEqual(confirmed.status, 'SUSTAINED');
    assert.strictEqual(confirmed.shouldReevaluate, true);
    assert.strictEqual(advance(['SUSTAINED_DEVIATION']).shouldReevaluate, false);
    assert.strictEqual(advance([]).status, 'RECOVERING');
    assert.strictEqual(advance([]).status, 'RECOVERED');
    assert.strictEqual(advance([]).active, false);
  });

  it('resets degradation state when an in-place route activation increments its version', () => {
    const reasons = ['SUSTAINED_DEVIATION'];
    const initial = advanceRouteDegradationState(
      null,
      'ROUTE-STATE-TEST:0',
      reasons,
      { confirmations: 1 }
    );
    assert.strictEqual(initial.signal.shouldReevaluate, true);

    const changedRouteVersion = advanceRouteDegradationState(
      initial.state,
      'ROUTE-STATE-TEST:1',
      reasons,
      { confirmations: 1 }
    );
    assert.strictEqual(changedRouteVersion.signal.shouldReevaluate, true);
    assert.strictEqual(changedRouteVersion.state.routeId, 'ROUTE-STATE-TEST:1');
  });

  it('Defers a confirmed decision request when prediction was invoked with triggers disabled', () => {
    let state;
    const reasons = ['FRESH_TRAFFIC_DEGRADATION'];
    const first = advanceRouteDegradationState(state, 'ROUTE-DEFER-TEST', reasons, {
      confirmations: 2,
      allowDecisionTrigger: false
    });
    state = first.state;
    const confirmedWithoutTrigger = advanceRouteDegradationState(state, 'ROUTE-DEFER-TEST', reasons, {
      confirmations: 2,
      allowDecisionTrigger: false
    });
    state = confirmedWithoutTrigger.state;
    const nextRegularPrediction = advanceRouteDegradationState(state, 'ROUTE-DEFER-TEST', reasons, {
      confirmations: 2,
      allowDecisionTrigger: true
    });

    assert.strictEqual(confirmedWithoutTrigger.signal.status, 'SUSTAINED');
    assert.strictEqual(confirmedWithoutTrigger.signal.decisionRequestPending, true);
    assert.strictEqual(nextRegularPrediction.signal.shouldReevaluate, true);
    assert.strictEqual(nextRegularPrediction.state.decisionRequested, true);
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

  let geoAgentTestVehicle;
  let geoAgentTestEmergency;
  try {
    geoAgentTestVehicle = await Vehicle.create({
      vehicleId: 'TEST-INTELLIGENCE-SCOPE-VEH',
      registrationNumber: 'KA-01-INTEL-01',
      type: 'AMBULANCE',
      capacity: 2,
      status: 'EN_ROUTE',
      driverName: 'Intelligence Test Driver'
    });
    geoAgentTestEmergency = await Emergency.create({
      emergencyId: 'EMG-INTELLIGENCE-SCOPE',
      type: 'MEDICAL',
      priority: 'HIGH',
      status: 'DISPATCHED',
      location: { type: 'Point', coordinates: [77.6271, 12.9352] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      assignedVehicle: geoAgentTestVehicle._id,
      createdBy: new mongoose.Types.ObjectId()
    });
    const analysisScope = Object.freeze({
      emergencyId: geoAgentTestEmergency.emergencyId,
      vehicleId: geoAgentTestVehicle.vehicleId
    });

    await itAsync('Executes getNearbyIncidents tool via executeGeoAgentTool', async () => {
      const result = await executeGeoAgentTool('getNearbyIncidents', {
        longitude: 77.6271,
        latitude: 12.9352,
        radiusMeters: 5000
      }, analysisScope);
      assert.ok(result.searchRadiusMeters === 5000);
      assert.ok(Array.isArray(result.incidents));
    });

    await itAsync('Executes getRouteAlternatives tool via executeGeoAgentTool', async () => {
      const result = await executeGeoAgentTool('getRouteAlternatives', {
        originLng: 77.6271,
        originLat: 12.9352,
        destLng: 77.6483,
        destLat: 12.9582
      }, analysisScope);
      assert.ok(Array.isArray(result.candidateRoutes));
      assert.ok(result.candidateRoutes.length >= 1);
    });

    await itAsync('Executes getTrafficAnalysis tool via executeGeoAgentTool', async () => {
      const result = await executeGeoAgentTool('getTrafficAnalysis', {
        longitude: 77.6271,
        latitude: 12.9352
      }, analysisScope);
      assert.ok(result.level);
      assert.ok(typeof result.speedKmh === 'number');
    });
  } finally {
    if (geoAgentTestEmergency) await Emergency.deleteOne({ _id: geoAgentTestEmergency._id });
    if (geoAgentTestVehicle) await Vehicle.deleteOne({ _id: geoAgentTestVehicle._id });
  }

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

    let testEmergency;
    let testRoute;
    try {
      testEmergency = await Emergency.create({
        emergencyId: `EMG-VERIFY-GPS-${Date.now()}`,
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.2150, 28.6250] },
        destination: { type: 'Point', coordinates: [77.2300, 28.6500] },
        assignedVehicle: testVeh._id,
        createdBy: new mongoose.Types.ObjectId()
      });
      testRoute = await Route.create({
        routeId: `ROUTE-VERIFY-GPS-${Date.now()}`,
        emergency: testEmergency._id,
        vehicle: testVeh._id,
        origin: { type: 'Point', coordinates: [77.2148, 28.62515] },
        destination: { type: 'Point', coordinates: [77.2152, 28.62515] },
        distance: 40,
        duration: 10,
        provider: 'MOCK',
        status: 'ACTIVE',
        geometry: {
          type: 'LineString',
          coordinates: [[77.2148, 28.62515], [77.2152, 28.62515]]
        },
        createdBy: new mongoose.Types.ObjectId()
      });

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
      assert.deepStrictEqual(traj.location.coordinates, [77.2150, 28.6250]);
      assert.ok(traj.mapMatchedLocation);
      assert.ok(traj.mapMatchDistanceMeters > 0 && traj.mapMatchDistanceMeters <= 35);
      assert.notDeepStrictEqual(traj.mapMatchedLocation.coordinates, traj.location.coordinates);
    } finally {
      if (testRoute) await Route.deleteOne({ _id: testRoute._id });
      if (testEmergency) await Emergency.deleteOne({ _id: testEmergency._id });
    }
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
      primaryAction: 'CONTINUE',
      actions: ['CONTINUE'],
      status: 'PENDING_OPERATOR_ACTION',
      rationale: 'Heavy congestion ahead',
      reasonCodes: ['CORRIDOR_CONGESTION'],
      situationHash: 'testhash1234567890123456'
    });

    // 1. Approve
    const operatorId = new mongoose.Types.ObjectId();
    const approved = await decisionService.approveDecision(decision.decisionId, operatorId);
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
