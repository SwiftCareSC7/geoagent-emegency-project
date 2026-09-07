/**
 * SwiftCare GeoAgent — Emergency Detail & Analysis E2E Test Suite
 *
 * Verifies that all endpoints required by the Emergency Detail view:
 *   - Emergency retrieval by friendly ID
 *   - Route retrieval by emergency friendly ID (resolving CastError bug)
 *   - Single route retrieval with populated references
 *   - Trajectory pagination and latest fix
 *   - Situation analysis (deviation, traffic, eta, delay, correlated incidents)
 *   - Orchestration workflow with 3-tier epistemic breakdown
 *   - Empty trajectory handling (404)
 *   - Missing emergency handling (404)
 *   - Partial workflow handling for unassigned emergency
 *
 * Usage:
 *   node server/test-emergency-detail-e2e.js
 */

import http from 'http';

const BACKEND_PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${BACKEND_PORT}/api`;

let sessionCookie = '';
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedAssertions++;
  }
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (sessionCookie) {
      reqHeaders['Cookie'] = sessionCookie;
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
          sessionCookie = cookieStr.split(';')[0];
        }
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== SwiftCare GeoAgent — Emergency Detail E2E Test Suite ===\n');

  // Test 1: Authenticate
  console.log('1. Authentication');
  const loginRes = await request('POST', '/auth/login', {
    email: 'operator@swiftcare.local',
    password: 'Operator123!',
  });
  assert(loginRes.status === 200, 'Login returns 200 OK');
  assert(loginRes.body.success === true, 'Login response has success: true');
  assert(sessionCookie.length > 0, 'Received session cookie');

  // Test 2: Emergency Retrieval
  console.log('\n2. Emergency Retrieval (/api/emergencies/:id)');
  const emgRes = await request('GET', '/emergencies/EMG-2026-001');
  assert(emgRes.status === 200, 'GET /emergencies/EMG-2026-001 returns 200 OK');
  assert(emgRes.body.success === true, 'Emergency response has success: true');
  const emg = emgRes.body.data;
  assert(emg.emergencyId === 'EMG-2026-001', 'Emergency ID matches EMG-2026-001');
  assert(emg.priority === 'CRITICAL', 'Priority is CRITICAL');
  assert(emg.status === 'DISPATCHED', 'Status is DISPATCHED');
  assert(emg.assignedVehicle !== null, 'Assigned vehicle is present');
  const assignedVehId = typeof emg.assignedVehicle === 'object' ? emg.assignedVehicle.vehicleId : emg.assignedVehicle;
  assert(assignedVehId === 'AMB-102', 'Assigned vehicle is AMB-102');

  // Test 3: Route Retrieval via Emergency Sub-resource (Friendly ID resolution)
  console.log('\n3. Route Sub-resource (/api/emergencies/:emergencyId/routes)');
  const emgRoutesRes = await request('GET', '/emergencies/EMG-2026-001/routes');
  assert(emgRoutesRes.status === 200, 'GET /emergencies/EMG-2026-001/routes returns 200 OK (no CastError!)');
  assert(emgRoutesRes.body.success === true, 'Routes response has success: true');
  assert(Array.isArray(emgRoutesRes.body.data), 'Routes data is an array');
  assert(emgRoutesRes.body.data.length > 0, 'Found at least 1 route for EMG-2026-001');
  const primaryRoute = emgRoutesRes.body.data[0];
  assert(primaryRoute.routeId === 'ROUTE-2026-001', 'Route ID is ROUTE-2026-001');
  assert(primaryRoute.provider === 'MOCK', 'Provider is correctly labeled MOCK');
  assert(primaryRoute.distance > 0, `Distance is positive: ${primaryRoute.distance}m`);
  assert(primaryRoute.duration > 0, `Duration is positive: ${primaryRoute.duration}s`);
  assert(primaryRoute.geometry?.type === 'LineString', 'Geometry is a valid LineString');

  // Test 4: Single Route by ID
  console.log('\n4. Single Route by ID (/api/routes/:routeId)');
  const singleRouteRes = await request('GET', `/routes/${primaryRoute.routeId}`);
  assert(singleRouteRes.status === 200, 'GET /routes/:routeId returns 200 OK');
  assert(singleRouteRes.body.data.routeId === primaryRoute.routeId, 'Single route ID matches');
  assert(singleRouteRes.body.data.emergency?.emergencyId === 'EMG-2026-001', 'Populated emergency has emergencyId');

  // Test 5: Trajectory Telemetry (Paginated & Latest)
  console.log('\n5. Trajectory Telemetry (/api/trajectories/:vehicleId)');
  const trajHistoryRes = await request('GET', '/trajectories/AMB-102?page=1&limit=5');
  assert(trajHistoryRes.status === 200, 'GET /trajectories/AMB-102 returns 200 OK');
  assert(trajHistoryRes.body.success === true, 'Trajectory history has success: true');
  assert(Array.isArray(trajHistoryRes.body.data), 'Trajectory data is an array');
  assert(trajHistoryRes.body.data.length === 5, 'Pagination limit is respected (5 items)');
  assert(trajHistoryRes.body.pagination.total >= 15, `Total count is >= 15 (got ${trajHistoryRes.body.pagination.total})`);

  const trajLatestRes = await request('GET', '/trajectories/AMB-102/latest');
  assert(trajLatestRes.status === 200, 'GET /trajectories/AMB-102/latest returns 200 OK');
  assert(trajLatestRes.body.success === true, 'Latest fix has success: true');
  const latestFix = trajLatestRes.body.data;
  assert(Array.isArray(latestFix.location?.coordinates), 'Latest location coordinates are [lng, lat]');
  assert(typeof latestFix.speed === 'number', `Latest speed is numeric: ${latestFix.speed} km/h`);
  assert(typeof latestFix.heading === 'number', `Latest heading is numeric: ${latestFix.heading}°`);
  assert(Boolean(latestFix.timestamp), 'Latest fix has valid timestamp');

  // Test 6: Situation & Deviation Analysis
  console.log('\n6. Situation Analysis (/api/analysis/vehicle/:vehicleId)');
  const sitRes = await request('GET', '/analysis/vehicle/AMB-102');
  assert(sitRes.status === 200, 'GET /analysis/vehicle/AMB-102 returns 200 OK');
  assert(sitRes.body.success === true, 'Situation analysis has success: true');
  const sit = sitRes.body.data;
  assert(sit.vehicleId === 'AMB-102', 'Vehicle ID matches in situation analysis');
  assert(Boolean(sit.deviation), 'Deviation object is present');
  assert(['ON_ROUTE', 'WARNING', 'DEVIATED', 'CRITICAL_DEVIATION'].includes(sit.deviation.status), `Deviation status is valid: ${sit.deviation.status}`);
  assert(typeof sit.deviation.distanceFromRouteMeters === 'number', `Cross-track distance: ${sit.deviation.distanceFromRouteMeters.toFixed(1)}m`);
  assert(['STABLE', 'UNSTABLE', 'INSUFFICIENT_DATA'].includes(sit.deviation.gpsStability), `GPS stability: ${sit.deviation.gpsStability}`);
  assert(Boolean(sit.traffic), 'Traffic object is present');
  assert(typeof sit.traffic.level === 'string', `Traffic level: ${sit.traffic.level}`);
  assert(Boolean(sit.eta), 'ETA object is present');
  assert(typeof sit.eta.originalMinutes === 'number', `Original planned ETA: ${sit.eta.originalMinutes} mins`);
  assert(Boolean(sit.delay), 'Delay object is present');
  assert(Array.isArray(sit.incidents), 'Correlated incidents is an array');
  assert(Array.isArray(sit.evidence), 'Evidence list is an array');

  // Test 7: Orchestration Mission Analysis
  console.log('\n7. Orchestration Analysis (/api/orchestration/emergencies/:id/analyze)');
  const orchRes = await request('POST', '/orchestration/emergencies/EMG-2026-001/analyze');
  assert(orchRes.status === 200, 'POST /orchestration/.../analyze returns 200 OK');
  assert(orchRes.body.success === true, 'Orchestration response has success: true');
  const orch = orchRes.body.data;
  assert(orch.workflowStatus === 'COMPLETED', `Workflow status is COMPLETED (got ${orch.workflowStatus})`);
  assert(Boolean(orch.epistemicBreakdown), 'Epistemic breakdown is present');
  assert(Array.isArray(orch.epistemicBreakdown.observed), 'Epistemic observed is an array');
  assert(Array.isArray(orch.epistemicBreakdown.inferred), 'Epistemic inferred is an array');
  assert(Array.isArray(orch.epistemicBreakdown.unknown), 'Epistemic unknown is an array');
  assert(orch.epistemicBreakdown.observed.length > 0, `Observed contains ${orch.epistemicBreakdown.observed.length} items`);
  assert(orch.executionTimeMs >= 0, `Execution time reported: ${orch.executionTimeMs}ms`);

  // Test 8: Empty Trajectory Handling (404)
  console.log('\n8. Empty Trajectory Handling');
  const emptyTrajRes = await request('GET', '/trajectories/AMB-103/latest');
  assert(emptyTrajRes.status === 404, 'GET latest fix for vehicle with no GPS data returns 404');
  assert(emptyTrajRes.body.success === false, 'Empty trajectory response has success: false');

  // Test 9: Missing Emergency Handling (404)
  console.log('\n9. Missing Emergency Handling');
  const missingEmgRes = await request('GET', '/emergencies/EMG-NON-EXISTENT');
  assert(missingEmgRes.status === 404, 'GET non-existent emergency returns 404');

  // Test 10: Partial Workflow Handling (Unassigned Emergency)
  console.log('\n10. Partial Workflow Handling (Unassigned Emergency EMG-2026-003)');
  const partialOrchRes = await request('POST', '/orchestration/emergencies/EMG-2026-003/analyze');
  assert(partialOrchRes.status === 200, 'POST unassigned emergency analyze returns 200 OK (graceful partial)');
  assert(partialOrchRes.body.data.workflowStatus === 'PARTIAL', 'Workflow status is PARTIAL');
  assert(partialOrchRes.body.data.reason === 'NO_ASSIGNED_VEHICLE', 'Reason is NO_ASSIGNED_VEHICLE');
  assert(partialOrchRes.body.data.epistemicBreakdown.unknown.length > 0, 'Unknown list contains unassigned indicators');

  // Summary
  console.log('\n=============================================================');
  console.log(`Results: ${passedAssertions} passed, ${failedAssertions} failed`);
  console.log('=============================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
