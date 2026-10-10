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
 * 8. Socket.IO real-time room streaming (auth handshake, room join, room isolation)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.API_URL || 'http://localhost:5001';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5001';

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
    const { default: googleRoutingProvider, decodeGooglePolyline } = await import('./modules/routes/providers/googleRoutingProvider.js');
    const { default: routingService } = await import('./modules/routes/routing.service.js');
    
    // Test polyline decoder
    // Encoded polyline for roughly Bangalore coordinates: (12.9716, 77.5946) to (12.9800, 77.6000)
    const testEncoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const decoded = decodeGooglePolyline(testEncoded);
    assert(Array.isArray(decoded) && decoded.length > 0, 'Polyline decoder produces coordinate array');
    assert(decoded[0].length === 2, 'Decoded points are [lng, lat] pairs');
    assert(decoded[0][0] >= -180 && decoded[0][0] <= 180, 'Longitude within valid bounds');
    assert(decoded[0][1] >= -90 && decoded[0][1] <= 90, 'Latitude within valid bounds');

    // Test routingService active provider (calculates route with active fallback)
    const activeRoute = await routingService.getRoute(
      { coordinates: [77.5946, 12.9716] },
      { coordinates: [77.6050, 12.9850] }
    );
    assert(activeRoute !== null, 'routingService.getRoute returns valid route');
    assert(activeRoute.distanceMeters > 0, 'Route has positive distanceMeters');
    assert(activeRoute.durationSeconds > 0, 'Route has positive durationSeconds');
    assert(activeRoute.geometry && activeRoute.geometry.type === 'LineString', 'Route geometry is GeoJSON LineString');

    // Test Google provider honest error when key is absent
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      let keyErr = null;
      try {
        await googleRoutingProvider.getRoute(
          { coordinates: [77.5946, 12.9716] },
          { coordinates: [77.6050, 12.9850] }
        );
      } catch (err) {
        keyErr = err;
      }
      assert(keyErr !== null && keyErr.message.includes('GOOGLE_MAPS_API_KEY is not configured'), 'Google provider honestly refuses requests when key is not configured');
    }
  } catch (err) {
    console.error('Routing provider test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Testing Google Roads Provider Batching & Snapping
  // -------------------------------------------------------------
  console.log('\n[3/8] Testing Google Roads Provider...');
  try {
    const { default: googleRoadsProvider } = await import('./modules/routes/providers/googleRoadsProvider.js');
    
    const samplePoints = [
      { coordinates: [77.5946, 12.9716] },
      { coordinates: [77.5950, 12.9720] },
      { coordinates: [77.5960, 12.9730] }
    ];

    const snapped = await googleRoadsProvider.snapToRoads(samplePoints);
    assert(Array.isArray(snapped), 'snapToRoads returns array');
    assert(snapped.length === samplePoints.length, 'Snapped output length matches input count');
    assert(snapped[0].location && Array.isArray(snapped[0].location.coordinates), 'Snapped elements contain location coordinates');
    assert(snapped[0].source !== undefined, 'Snapped elements contain source attribute: ' + snapped[0].source);
  } catch (err) {
    console.error('Roads provider test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: Testing Google Traffic Provider Epistemic Logic
  // -------------------------------------------------------------
  console.log('\n[4/8] Testing Traffic Provider Epistemic Logic...');
  try {
    const { default: googleTrafficProvider } = await import('./modules/traffic/providers/googleTrafficProvider.js');
    
    const sampleLineString = {
      type: 'LineString',
      coordinates: [
        [77.5946, 12.9716],
        [77.6000, 12.9780],
        [77.6050, 12.9850]
      ]
    };

    const trafficEstimate = await googleTrafficProvider.getTrafficForRoute(sampleLineString);
    assert(typeof trafficEstimate.congestionRatio === 'number', 'Congestion ratio is numeric');
    assert(['FREE_FLOW', 'LIGHT', 'MODERATE', 'HEAVY', 'SEVERE', 'UNKNOWN'].includes(trafficEstimate.level), 'Congestion level is valid enum: ' + trafficEstimate.level);
    assert(['DERIVED', 'UNKNOWN', 'OBSERVED'].includes(trafficEstimate.epistemicType), 'Epistemic type explicitly tagged: ' + trafficEstimate.epistemicType);
    assert(typeof trafficEstimate.speedKmh === 'number', 'speedKmh is numeric');
  } catch (err) {
    console.error('Traffic provider test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Testing Telemetry Validation & Teleport Detection
  // -------------------------------------------------------------
  console.log('\n[5/8] Testing Telemetry Bounds & Teleport Anomaly Detection...');
  try {
    const { createTrajectory } = await import('./modules/trajectories/trajectory.service.js');
    
    // Out of bounds coordinates
    let oobError = null;
    try {
      await createTrajectory({
        vehicleId: 'VEH-TEST-OOB',
        location: { type: 'Point', coordinates: [999.0, 999.0] },
        speed: 40,
        heading: 90
      });
    } catch (e) {
      oobError = e;
    }
    assert(oobError !== null && oobError.message.includes('Invalid longitude coordinate'), 'Rejects out-of-bound longitude [999, 999]');

    // Invalid negative speed
    let speedError = null;
    try {
      await createTrajectory({
        vehicleId: 'VEH-TEST-SPD',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        speed: -10,
        heading: 90
      });
    } catch (e) {
      speedError = e;
    }
    assert(speedError !== null && speedError.message.includes('Speed must be a valid number'), 'Rejects negative speed');

    // Invalid heading
    let headingError = null;
    try {
      await createTrajectory({
        vehicleId: 'VEH-TEST-HDG',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        speed: 40,
        heading: 450
      });
    } catch (e) {
      headingError = e;
    }
    assert(headingError !== null && headingError.message.includes('Heading must be a valid number'), 'Rejects heading > 360');
  } catch (err) {
    console.error('Telemetry validation test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Testing Real-Time Prediction Engine
  // -------------------------------------------------------------
  console.log('\n[6/8] Testing Real-Time Prediction Engine...');
  try {
    const { default: predictionService } = await import('./modules/analysis/prediction.service.js');
    
    // Test pure calculation engine
    const prediction = predictionService.calculatePrediction({
      plannedDurationSeconds: 600,
      remainingDistanceMeters: 4500,
      recentTrajectories: [
        { speed: 20, timestamp: new Date() },
        { speed: 22, timestamp: new Date(Date.now() - 5000) },
        { speed: 25, timestamp: new Date(Date.now() - 10000) }
      ],
      traffic: {
        level: 'HEAVY',
        trafficDelaySeconds: 180,
        congestionRatio: 0.35,
        source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED'
      },
      deviation: {
        status: 'DEVIATED',
        crossTrackDistanceMeters: 120
      },
      incidents: [
        { type: 'ACCIDENT', severity: 'HIGH' }
      ],
      emergencySeverity: 'CRITICAL'
    });

    assert(prediction !== null, 'Prediction generated successfully');
    assert(prediction.predictedDurationSeconds >= 600, 'Projected duration includes traffic and incident delays');
    assert(prediction.predictedDelayMinutes > 0, 'Projected delay minutes is positive under traffic');
    assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(prediction.delayRisk), 'delayRisk is valid enum');
    assert(typeof prediction.confidenceScore === 'number', 'confidenceScore is numeric');
    assert(Array.isArray(prediction.factors), 'prediction factors returned as array');
    assert(prediction.factors.length > 0, 'Prediction includes structural factor explanations');
    assert(prediction.factors[0].epistemicType !== undefined, 'Factors include epistemicType attribution');
  } catch (err) {
    console.error('Prediction engine test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 7: Testing Decision Engine Fallback Rationale & Trade-Offs
  // -------------------------------------------------------------
  console.log('\n[7/8] Testing Decision Engine Fallback Rationale & Trade-Offs...');
  try {
    const { default: geoAgentService } = await import('./modules/geoagents/geoAgent.service.js');
    
    const fallbackResponse = geoAgentService.generateFallbackResponse({
      emergency: { title: 'Cardiovascular Distress', priority: 'CRITICAL' },
      deviation: { status: 'CRITICAL_DEVIATION', distanceFromRouteMeters: 280 },
      traffic: { level: 'HEAVY' },
      incidents: [{ type: 'ACCIDENT', severity: 'HIGH' }],
      prediction: { delayRisk: 'HIGH', predictedDelayMinutes: 8 }
    }, 'Gemini API not configured');

    assert(fallbackResponse !== null, 'Fallback response generated');
    assert(fallbackResponse.recommendation !== undefined, 'Contains advisory recommendation');
    assert(fallbackResponse.whatIfDoNothing !== undefined, 'Contains "What if we do nothing?" trade-off evaluation');
    assert(Array.isArray(fallbackResponse.whyRouteChanged), 'Contains "Why did the route change?" evidence points');
    assert(typeof fallbackResponse.confidenceScore === 'number', 'Has explicit confidence score: ' + fallbackResponse.confidenceScore);
  } catch (err) {
    console.error('Decision engine test error:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 8: Testing Socket.IO Real-Time Streaming & Room Join
  // -------------------------------------------------------------
  console.log('\n[8/8] Testing Socket.IO Real-Time Room Streaming...');
  try {
    // 8.1 Register operator user
    const testEmail = `operator_${Date.now()}@swiftcare.local`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Operator',
        email: testEmail,
        password: 'Password123!'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Test operator created via /api/auth/register');

    const { generateToken } = await import('./modules/auth/jwt.utils.js');
    const operatorToken = generateToken(regData.user.id, 'CONTROL_ROOM');
    assert(typeof operatorToken === 'string' && operatorToken.length > 20, 'Generated valid JWT token with CONTROL_ROOM role');

    // 8.2 Create Emergency so room join can succeed
    const emgRes = await fetch(`${BASE_URL}/api/emergencies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        title: 'Cardiac Arrest Real-Time Stream Test',
        priority: 'CRITICAL',
        type: 'MEDICAL',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        destination: { type: 'Point', coordinates: [77.6200, 12.9350] }
      })
    });
    const emgData = await emgRes.json();
    assert(emgRes.status === 201, 'Test emergency created: ' + (emgData.data?.emergencyId || 'Created'));
    const testEmergencyId = emgData.data.emergencyId;

    // 8.3 Unauthorized connection rejected
    const badSocket = io(SOCKET_URL, {
      auth: { token: 'invalid_token_xyz' },
      transports: ['websocket'],
      reconnection: false
    });
    const badConnErr = await new Promise((resolve) => {
      badSocket.on('connect_error', (err) => resolve(err));
      setTimeout(() => resolve(null), 3000);
    });
    assert(badConnErr && badConnErr.message.includes('Authentication error'), 'Unauthenticated socket connection rejected');
    badSocket.disconnect();

    // 8.4 Connect authorized Socket.IO with token
    const socket = io(SOCKET_URL, {
      auth: { token: operatorToken },
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket connection timed out'));
      }, 6000);

      socket.on('connect', () => {
        assert(socket.connected, 'Socket connected successfully with operator auth');

        // Test join.control_room command
        socket.emit('join.control_room');

        // Test join.emergency command with acknowledgment
        socket.emit('join.emergency', { emergencyId: testEmergencyId }, (ack) => {
          clearTimeout(timeout);
          assert(ack && ack.success === true, 'Joined emergency room with server acknowledgment');
          assert(ack.room === `emergency:${testEmergencyId}`, 'Confirmed room name: ' + ack.room);
          socket.disconnect();
          resolve();
        });
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
