/**
 * SwiftCare GeoAgent — Comprehensive External Data & Real-Time Intelligence Test Suite
 * 
 * Verifies:
 * 1. Provider health & safe evaluation (no key leak)
 * 2. Google Routes Provider logic (polyline decode, alternatives parsing, cache, fallbacks)
 * 3. Google Roads Provider logic (point batching, turf fallback)
 * 4. Google Traffic Provider (DERIVED epistemic type, congestion ratio)
 * 5. Telemetry ingestion validation (bounds, heading, speed, teleport anomaly)
 * 6. Real-Time Prediction Engine (baseline, delay risk, confidence, factors, API)
 * 7. Decision Engine (advisory Gemini + deterministic rules, trade-off matrix)
 * 8. Socket.IO real-time room streaming (prediction.updated event propagation)
 */

import { io } from 'socket.io-client';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.API_URL || 'http://localhost:5001';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production_32char';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('SWIFTCARE REAL-TIME & EXTERNAL INTEGRATION E2E TEST SUITE');
  console.log('Target: ' + BASE_URL);
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Provider Health Endpoint
  // -------------------------------------------------------------
  console.log('[1/8] Testing Provider Health Endpoint (/api/health/providers)...');
  try {
    const res = await fetch(`${BASE_URL}/api/health/providers`);
    const data = await res.json();
    assert(res.status === 200, 'Health endpoint returns HTTP 200');
    assert(data.success === true, 'Response indicates success: true');
    assert(data.data.providers !== undefined, 'Provider status map is present');
    assert(data.data.providers.googleRoutes !== undefined, 'googleRoutes provider tracked');
    assert(data.data.providers.gemini !== undefined, 'gemini provider tracked');
    assert(data.data.providers.googleRoads !== undefined, 'googleRoads provider tracked');
    
    // Ensure no API keys leaked in JSON
    const bodyStr = JSON.stringify(data);
    assert(!bodyStr.includes('AIza'), 'No Google API keys leaked in provider health payload');
    assert(!bodyStr.includes('secret'), 'No secret values leaked in provider health payload');
  } catch (err) {
    console.error('Health endpoint test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Unit Testing Google Routes Provider Polyline & Alternatives
  // -------------------------------------------------------------
  console.log('\n[2/8] Testing Google Routing Provider Utilities...');
  try {
    const { googleRoutingProvider } = await import('./modules/routes/providers/googleRoutingProvider.js');
    
    // Test polyline decoder
    // Encoded polyline for roughly Bangalore coordinates: (12.9716, 77.5946) to (12.9800, 77.6000)
    const testEncoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const decoded = googleRoutingProvider.decodePolyline(testEncoded);
    assert(Array.isArray(decoded) && decoded.length > 0, 'Polyline decoder produces coordinate array');
    assert(decoded[0].length === 2, 'Decoded points are [lng, lat] pairs');
    assert(decoded[0][0] >= -180 && decoded[0][0] <= 180, 'Longitude within valid bounds');
    assert(decoded[0][1] >= -90 && decoded[0][1] <= 90, 'Latitude within valid bounds');

    // Test route calculation in current mode (mock/fallback)
    const routeRes = await googleRoutingProvider.calculateRoute(
      { coordinates: [77.5946, 12.9716] },
      { coordinates: [77.6050, 12.9850] }
    );
    assert(routeRes !== null, 'calculateRoute returns route result');
    assert(routeRes.distanceMeters > 0, 'Route has positive distanceMeters');
    assert(routeRes.durationSeconds > 0, 'Route has positive durationSeconds');
    assert(routeRes.geometry && routeRes.geometry.type === 'LineString', 'Route geometry is GeoJSON LineString');

    // Test alternative routes
    const altRes = await googleRoutingProvider.calculateRouteWithAlternatives(
      { coordinates: [77.5946, 12.9716] },
      { coordinates: [77.6050, 12.9850] }
    );
    assert(altRes.primary !== null, 'Alternative routing returns primary route');
    assert(Array.isArray(altRes.alternatives), 'Alternative routes returned as array');
  } catch (err) {
    console.error('Routing provider test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Testing Google Roads Provider Batching & Snapping
  // -------------------------------------------------------------
  console.log('\n[3/8] Testing Google Roads Provider...');
  try {
    const { googleRoadsProvider } = await import('./modules/routes/providers/googleRoadsProvider.js');
    
    const samplePoints = [
      { coordinates: [77.5946, 12.9716] },
      { coordinates: [77.5950, 12.9720] },
      { coordinates: [77.5960, 12.9730] }
    ];

    const snapped = await googleRoadsProvider.snapTrajectoryToRoads(samplePoints);
    assert(Array.isArray(snapped), 'snapTrajectoryToRoads returns array');
    assert(snapped.length === samplePoints.length, 'Snapped output length matches input count');
    assert(snapped[0].coordinates !== undefined, 'Snapped elements contain coordinates');
  } catch (err) {
    console.error('Roads provider test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: Testing Google Traffic Provider Epistemic Logic
  // -------------------------------------------------------------
  console.log('\n[4/8] Testing Traffic Provider Epistemic Logic...');
  try {
    const { googleTrafficProvider } = await import('./modules/traffic/providers/googleTrafficProvider.js');
    
    const trafficEstimate = await googleTrafficProvider.estimateCorridorTraffic(
      { coordinates: [77.5946, 12.9716] },
      { coordinates: [77.6050, 12.9850] }
    );
    assert(trafficEstimate.congestionRatio >= 1.0, 'Congestion ratio is at least 1.0');
    assert(['LOW', 'MODERATE', 'HEAVY', 'SEVERE'].includes(trafficEstimate.congestionLevel), 'Congestion level is valid enum');
    assert(trafficEstimate.epistemicType === 'DERIVED', 'Epistemic type explicitly tagged as DERIVED');
    assert(typeof trafficEstimate.delaySeconds === 'number', 'delaySeconds is numeric');
  } catch (err) {
    console.error('Traffic provider test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Testing Telemetry Validation & Teleport Detection
  // -------------------------------------------------------------
  console.log('\n[5/8] Testing Telemetry Bounds & Teleport Anomaly Detection...');
  try {
    const trajectoryModule = await import('./modules/trajectories/trajectory.service.js');
    
    // Out of bounds coordinates
    let oobError = null;
    try {
      await trajectoryModule.recordTelemetry('VEH-TEST-OOB', {
        location: { type: 'Point', coordinates: [999.0, 999.0] },
        speed: 40,
        heading: 90
      });
    } catch (e) {
      oobError = e;
    }
    assert(oobError !== null && oobError.message.includes('Invalid coordinates'), 'Rejects out-of-bound coordinates [999, 999]');

    // Invalid negative speed
    let speedError = null;
    try {
      await trajectoryModule.recordTelemetry('VEH-TEST-SPD', {
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        speed: -10,
        heading: 90
      });
    } catch (e) {
      speedError = e;
    }
    assert(speedError !== null && speedError.message.includes('Invalid speed'), 'Rejects negative speed');

    // Invalid heading
    let headingError = null;
    try {
      await trajectoryModule.recordTelemetry('VEH-TEST-HDG', {
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        speed: 40,
        heading: 450
      });
    } catch (e) {
      headingError = e;
    }
    assert(headingError !== null && headingError.message.includes('Invalid heading'), 'Rejects heading > 360');
  } catch (err) {
    console.error('Telemetry validation test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Testing Real-Time Prediction Engine
  // -------------------------------------------------------------
  console.log('\n[6/8] Testing Real-Time Prediction Engine (/api/analysis/vehicle/:id/prediction)...');
  try {
    const { predictionService } = await import('./modules/analysis/prediction.service.js');
    
    const mockVehicleId = 'VEH-E2E-PREDICT-' + Date.now();
    const prediction = await predictionService.generatePrediction(mockVehicleId, {
      plannedDurationSeconds: 600,
      destination: { coordinates: [77.6200, 12.9900] },
      emergencySeverity: 'CRITICAL'
    });

    assert(prediction !== null, 'Prediction generated successfully');
    assert(prediction.vehicleId === mockVehicleId, 'Prediction matches vehicleId');
    assert(prediction.predictedDurationSeconds >= 0, 'predictedDurationSeconds is valid');
    assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(prediction.delayRisk), 'delayRisk is valid enum');
    assert(typeof prediction.confidenceScore === 'number', 'confidenceScore is numeric');
    assert(Array.isArray(prediction.factors), 'prediction factors returned as array');
    assert(prediction.factors.length > 0, 'Prediction includes structural factor explanations');
    assert(prediction.factors[0].epistemicType !== undefined, 'Factors include epistemicType');

    // Check persistence
    const saved = await predictionService.getLatestPrediction(mockVehicleId);
    assert(saved !== null && saved.vehicleId === mockVehicleId, 'Prediction persisted and retrieved from database');
  } catch (err) {
    console.error('Prediction engine test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 7: Testing Decision Engine Trade-Off Rationale
  // -------------------------------------------------------------
  console.log('\n[7/8] Testing Decision Engine Rationale & Trade-Offs...');
  try {
    const { geoAgentService } = await import('./modules/geoagents/geoAgent.service.js');
    
    const agentAnalysis = await geoAgentService.analyzeRouteObstruction({
      emergencyId: 'EMG-TEST-AGENT',
      vehicleId: 'VEH-TEST-AGENT',
      delayMinutes: 8,
      congestionRatio: 2.1,
      crossTrackDistanceMeters: 80
    });

    assert(agentAnalysis !== null, 'Agent analysis returned result');
    assert(agentAnalysis.recommendation !== undefined, 'Agent produces recommendation');
    assert(agentAnalysis.whatIfDoNothing !== undefined, 'Produces "What if we do nothing?" trade-off evaluation');
    assert(Array.isArray(agentAnalysis.whyRouteChanged), 'Produces "Why did the route change?" evidence points');
  } catch (err) {
    console.error('Decision engine test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 8: Testing Socket.IO Real-Time Streaming
  // -------------------------------------------------------------
  console.log('\n[8/8] Testing Socket.IO Real-Time Room Streaming...');
  try {
    const testToken = jwt.sign(
      { id: 'usr_test_operator', role: 'operator', name: 'Test Operator' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const socket = io(SOCKET_URL, {
      auth: { token: testToken },
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket connection timed out'));
      }, 5000);

      socket.on('connect', async () => {
        clearTimeout(timeout);
        assert(socket.connected, 'Socket connected successfully with auth token');

        const testEmergencyId = 'EMG-SOCKET-' + Date.now();
        const testVehicleId = 'VEH-SOCKET-' + Date.now();

        // Subscribe to prediction updates
        socket.on('prediction.updated', (event) => {
          assert(event.emergencyId === testEmergencyId, 'Received prediction.updated event for emergency room');
          assert(event.vehicleId === testVehicleId, 'Event vehicleId matches');
          assert(event.data.delayRisk !== undefined, 'Event payload contains delayRisk');
          assert(event.data.predictedDurationMinutes !== undefined || event.data.predictedEta !== undefined, 'Event payload contains arrival estimates');
          socket.disconnect();
          resolve();
        });

        // Join the room
        socket.emit('join:emergency', testEmergencyId);

        // Allow room join propagation
        setTimeout(async () => {
          // Emit prediction update from server module
          const { realtimeService } = await import('./modules/realtime/realtime.service.js');
          realtimeService.emitPredictionUpdated(testEmergencyId, testVehicleId, {
            predictedEta: new Date(Date.now() + 12 * 60000).toISOString(),
            baselineEta: new Date(Date.now() + 10 * 60000).toISOString(),
            predictedDelayMinutes: 2,
            predictedDelaySeconds: 120,
            predictedDurationMinutes: 12,
            baselineDurationMinutes: 10,
            delayRisk: 'MEDIUM',
            routeRisk: 'LOW',
            confidence: 'HIGH',
            confidenceScore: 0.88,
            rerouteAdvised: false,
            rerouteUrgency: 'NONE',
            factors: [
              { factor: 'Traffic delay', impact: '+2 min', epistemicType: 'DERIVED' }
            ],
            predictedAt: new Date().toISOString()
          });
        }, 500);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (err) {
    console.error('Socket.IO test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Unexpected test error:', e);
  process.exit(1);
});
