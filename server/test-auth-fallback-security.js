/**
 * SwiftCare GeoAgent — Authentication Fallback & Credential Security Verification Suite
 *
 * Verifies:
 * 1. No hardcoded fallback passwords or preset demo credentials in server-store.ts
 * 2. No plaintext password arrays in memory or types
 * 3. No insecure fallback JWT secret strings
 * 4. Missing JWT_SECRET causes safe fail-closed behavior
 * 5. Next.js login route fails closed (HTTP 503) without authenticating local fallback accounts
 * 6. Next.js register route fails closed (HTTP 503) without creating local fallback accounts
 * 7. Live backend readiness probe (/api/health/ready) reports database connection status
 * 8. Live backend rejects invalid credentials and pending accounts
 * 9. Live backend authentication never leaks passwords, password hashes, or signing secrets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

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

async function run() {
  console.log('================================================================');
  console.log('   SWIFTCARE AUTHENTICATION FALLBACK & SECURITY TEST SUITE      ');
  console.log('================================================================\n');

  // ── 1. Static Security Inspection of lib/auth/server-store.ts ──
  console.log('--- 1. server-store.ts Static Credential & Secret Audit ---');
  const serverStorePath = path.join(rootDir, 'lib', 'auth', 'server-store.ts');
  const serverStoreContent = fs.readFileSync(serverStorePath, 'utf8');

  assert(
    !serverStoreContent.includes('AdminPassword123!') &&
    !serverStoreContent.includes('Operator123!') &&
    !serverStoreContent.includes('DriverPassword123!') &&
    !serverStoreContent.includes('Paramedic123!'),
    'server-store.ts contains no hardcoded fallback demo passwords'
  );

  assert(
    !serverStoreContent.includes('swiftcare_geoagent_secure_token_secret_key_2026'),
    'server-store.ts contains no hardcoded fallback JWT secret'
  );

  assert(
    !serverStoreContent.includes('passwords?: string[]') &&
    !serverStoreContent.includes('passwords: ['),
    'server-store.ts has no plaintext passwords array in memory or types'
  );

  assert(
    serverStoreContent.includes('getJwtSecret()') &&
    serverStoreContent.includes('JWT_SECRET environment variable is not configured'),
    'server-store.ts fails closed when JWT_SECRET is missing'
  );

  // ── 2. Inspection of Next.js Auth Routes for Fail-Closed Behavior ──
  console.log('\n--- 2. Next.js Auth Routes Fail-Closed Verification ---');
  const loginRoutePath = path.join(rootDir, 'app', 'api', 'auth', 'login', 'route.ts');
  const loginRouteContent = fs.readFileSync(loginRoutePath, 'utf8');

  assert(
    !loginRouteContent.includes('findUserByEmail') &&
    !loginRouteContent.includes('verifyUserPassword'),
    'app/api/auth/login/route.ts does not fall back to in-memory store on backend failure'
  );

  assert(
    loginRouteContent.includes('status: 503'),
    'app/api/auth/login/route.ts returns 503 when authoritative backend is unreachable'
  );

  const regRoutePath = path.join(rootDir, 'app', 'api', 'auth', 'register', 'route.ts');
  const regRouteContent = fs.readFileSync(regRoutePath, 'utf8');

  assert(
    !regRouteContent.includes('usersStore.set') &&
    regRouteContent.includes('status: 503'),
    'app/api/auth/register/route.ts fails closed with 503 without creating local store accounts'
  );

  const meRoutePath = path.join(rootDir, 'app', 'api', 'auth', 'me', 'route.ts');
  const meRouteContent = fs.readFileSync(meRoutePath, 'utf8');

  assert(
    !meRouteContent.includes('findUserById') &&
    meRouteContent.includes('status: 503'),
    'app/api/auth/me/route.ts proxies to authoritative backend with 503 fail-closed'
  );

  // ── 3. Live Backend Health & Readiness Probes ──
  console.log('\n--- 3. Backend Health & Readiness Probes ---');
  try {
    const liveRes = await fetch(`${BASE_URL}/health/live`);
    const liveData = await liveRes.json();
    assert(liveRes.status === 200 && liveData.status === 'ok', 'Liveness probe (/api/health/live) returns 200 ok');

    const readyRes = await fetch(`${BASE_URL}/health/ready`);
    const readyData = await readyRes.json();
    assert(
      readyRes.status === 200 && readyData.status === 'ready' && readyData.database === 'connected',
      'Readiness probe (/api/health/ready) returns 200 ready with database: connected'
    );
  } catch (err) {
    console.error('  ✗ FAIL: Health/Readiness endpoints unreachable on port', PORT, err.message);
    failed++;
  }

  // ── 4. Authoritative Authentication Behavior ──
  console.log('\n--- 4. Authoritative Backend Authentication Verification ---');
  try {
    // Bad credentials
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@swiftcare.local', password: 'WrongPassword999!' })
    });
    assert(badLoginRes.status === 401, 'Invalid credentials return 401 Unauthorized');

    // Missing body fields
    const emptyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(emptyLoginRes.status === 400, 'Missing email/password returns 400 Bad Request');

    // Valid admin login
    const validLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swiftcare.local',
        password: process.env.ADMIN_PASSWORD || 'AdminPassword123!'
      })
    });
    const validLoginData = await validLoginRes.json();
    assert(validLoginRes.status === 200, 'Authoritative Admin login succeeds with 200 OK');
    assert(
      !('password' in (validLoginData.user || {})) &&
      !('passwordHash' in (validLoginData.user || {})) &&
      !('passwords' in (validLoginData.user || {})),
      'User payload contains no password, passwordHash, or passwords field'
    );

    // Registration of new pending account
    const testEmail = `sec_audit_${Date.now()}@swiftcare.local`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Security Audit User',
        email: testEmail,
        password: 'SecurePassword123!',
        role: 'PARAMEDIC',
        requestedWorkspaces: ['PARAMEDIC']
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registration returns 201 Created');
    assert(regData.user?.status === 'PENDING', 'New registration status is quarantined as PENDING');

    // Pending account blocked from login
    const pendingLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'SecurePassword123!' })
    });
    assert(pendingLoginRes.status === 403, 'Pending account login is blocked with 403 Forbidden');
  } catch (err) {
    console.error('  ✗ FAIL: Live backend test failed:', err.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[FATAL TEST ERROR]:', err);
  process.exit(1);
});
