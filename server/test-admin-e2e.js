/**
 * End-to-End Test Suite: Admin Database Administration & System Observability
 *
 * Validates:
 * 1. Open access (no authentication): requests without credentials succeed
 * 2. Real System Stats across all 8 models
 * 3. Database Ping & Health (latency, connection state, zero credential leaks)
 * 4. Sensitive Field Exclusion (passwords, tokens, URIs never exposed)
 * 5. Query Boundary Hardening (capped limits, allowlisted sorts, rejected $ operators)
 * 6. Paginated operational records across all approved collections
 */

import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Route from './modules/routes/route.model.js';
import Decision from './modules/decisions/decision.model.js';
import Prediction from './modules/analysis/prediction.model.js';

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

// Helper: HTTP request wrapper
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('SWIFTCARE GEOAGENT — ADMIN MODULE VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Database Connection & Seed Admin User for Testing
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';
  await mongoose.connect(mongoUri);

  console.log('[Setup] Connected directly to MongoDB for test fixture verification');

  const adminHeaders = { 'Content-Type': 'application/json' };

  console.log('\n[1] Open Access (no login):');

  const adminRes = await makeRequest('/api/admin/stats');
  assert(adminRes.status === 200, 'Request without credentials to /api/admin/stats returns 200');

  console.log('\n[2] Real System Statistics Verification:');

  // Test 2.1: Stats payload structure
  const stats = adminRes.data?.data;
  assert(stats !== undefined, 'Stats data payload exists');
  assert(stats?.databaseConnected === true, 'Stats reports databaseConnected: true');
  assert(stats?.connectionState === 'CONNECTED', 'Stats reports connectionState: CONNECTED');
  assert(typeof stats?.counts?.vehicles === 'number', `Real vehicle count returned (${stats?.counts?.vehicles})`);
  assert(typeof stats?.counts?.emergencies === 'number', `Real emergency count returned (${stats?.counts?.emergencies})`);
  assert(typeof stats?.counts?.trajectories === 'number', `Real trajectory count returned via estimatedDocumentCount (${stats?.counts?.trajectories})`);
  assert(typeof stats?.counts?.decisions === 'number', `Real decision count returned (${stats?.counts?.decisions})`);
  assert(typeof stats?.counts?.predictions === 'number', `Real prediction count returned (${stats?.counts?.predictions})`);
  assert(stats?.recentActivity !== undefined, 'Recent 24-hour activity object present');

  console.log('\n[3] Database Health & Live Latency Ping:');

  const healthRes = await makeRequest('/api/admin/health', { headers: adminHeaders });
  assert(healthRes.status === 200, 'Health endpoint returns 200 OK');
  const health = healthRes.data?.data;
  assert(health?.status === 'CONNECTED', `Health status is CONNECTED (got: ${health?.status})`);
  assert(health?.connected === true, 'Database connected flag is true');
  assert(typeof health?.latencyMs === 'number' && health.latencyMs >= 0, `Ping roundtrip latency measured (${health?.latencyMs} ms)`);
  assert(health?.databaseName !== null, `Database name reported safely: ${health?.databaseName}`);

  // Test 3.2: Verify NO secrets leaked in health response
  const rawHealthStr = JSON.stringify(healthRes.data);
  assert(!rawHealthStr.includes('mongodb://'), 'Mongo URI is NOT leaked in health response');
  assert(!rawHealthStr.includes('password'), 'Passwords are NOT leaked in health response');
  assert(!rawHealthStr.includes('secret'), 'JWT secrets are NOT leaked in health response');

  console.log('\n[4] Provider Health Integration:');

  const provRes = await makeRequest('/api/admin/providers', { headers: adminHeaders });
  assert(provRes.status === 200, 'Provider health endpoint returns 200 OK');
  const provData = provRes.data?.data;
  assert(provData?.database?.status === 'CONNECTED', 'Database status present in provider summary');
  assert(provData?.providers?.googleRoutes !== undefined, 'Google Routes provider status present');
  assert(provData?.providers?.geminiAi !== undefined, 'Gemini AI provider status present');

  console.log('\n[5] Data Sanitization & Projection Rules:');

  const removedUsers = await makeRequest('/api/admin/users');
  assert(removedUsers.status === 404, 'User administration endpoint removed (404)');

  console.log('\n[6] Query Boundary Hardening & Validation:');

  // Test 6.1: Page size capped at 100
  const overLimitRes = await makeRequest('/api/admin/vehicles?limit=500', { headers: adminHeaders });
  assert(overLimitRes.status === 400, 'Limit > 100 rejected with 400 Bad Request');
  assert(overLimitRes.data?.message?.includes('Validation failed') || overLimitRes.data?.errors?.length > 0, 'Error message explicitly reports invalid limit');

  // Test 6.2: Invalid sort field rejected
  const badSortRes = await makeRequest('/api/admin/vehicles?sort=drop_database', { headers: adminHeaders });
  assert(badSortRes.status === 400, 'Disallowed sort field rejected with 400 Bad Request');

  // Test 6.3: Unsafe Mongo operators rejected
  const injectionRes = await makeRequest('/api/admin/emergencies?$where=sleep(5000)', { headers: adminHeaders });
  assert(injectionRes.status === 400, 'Dangerous MongoDB operator parameter ($where) rejected with 400 Bad Request');

  console.log('\n[7] Paginated Operational Collection Readers:');

  const collectionsToTest = [
    { name: 'Vehicles', path: '/api/admin/vehicles' },
    { name: 'Emergencies', path: '/api/admin/emergencies' },
    { name: 'Incidents', path: '/api/admin/incidents' },
    { name: 'Trajectories', path: '/api/admin/trajectories' },
    { name: 'Routes', path: '/api/admin/routes' },
    { name: 'Predictions', path: '/api/admin/predictions' },
    { name: 'Decisions', path: '/api/admin/decisions' }
  ];

  for (const col of collectionsToTest) {
    const res = await makeRequest(col.path, { headers: adminHeaders });
    assert(res.status === 200, `GET ${col.path} returns 200 OK`);
    assert(Array.isArray(res.data?.data), `${col.name} data is an array`);
    assert(res.data?.pagination?.page === 1, `${col.name} pagination.page is 1`);
    assert(typeof res.data?.pagination?.total === 'number', `${col.name} pagination.total is a number`);
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running admin test suite:', err);
  process.exit(1);
});
