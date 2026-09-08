/**
 * SwiftCare GeoAgent — Comprehensive End-to-End Auth Verification Suite
 * Validates:
 * 1. Protected route without authentication (401)
 * 2. Signup validation failure on weak password (400)
 * 3. Successful user registration (201)
 * 4. Duplicate user registration conflict (409)
 * 5. Login with invalid password (401)
 * 6. Successful login with HTTP-only cookie setting (200 + Set-Cookie)
 * 7. Session retrieval with cookie via GET /api/auth/me (200)
 * 8. Session persistence simulating browser refresh (200)
 * 9. Logout endpoint clearing cookie via POST /api/auth/logout (200)
 * 10. Access after logout rejecting with 401
 */

import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_for_part10_verification';
}

const MONGO_TEST_URI = 'mongodb://127.0.0.1:27017/geoagent-auth-e2e-test';

async function runAuthVerification() {
  console.log('================================================================');
  console.log('       RUNNING REAL BACKEND AUTHENTICATION CONTRACT VERIFICATION  ');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_TEST_URI);
  console.log('[DB] Connected to MongoDB test database');

  // Clean test db
  await mongoose.connection.dropDatabase();
  console.log('[DB] Fresh test database initialized\n');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use('/api/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const BASE = 'http://localhost:5099/api/auth';

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // Scenario 1: Protected route without authentication
    console.log('--- 1. Protected Route without Auth ---');
    const unauthRes = await fetch(`${BASE}/me`);
    const unauthData = await unauthRes.json();
    const unauthErr = unauthData.message || unauthData.error;
    assert(unauthRes.status === 401, 'GET /api/auth/me without cookie returns 401');
    assert(unauthErr === 'Authentication required', 'Error message indicates Authentication required');

    // Scenario 2: Validation on registration (invalid password)
    console.log('\n--- 2. Signup Validation Failure ---');
    const invalidRegRes = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Operator',
        email: 'operator@swiftcare.local',
        password: 'weak' // missing uppercase, lowercase, digit, min 8
      })
    });
    const invalidRegData = await invalidRegRes.json();
    const invalidRegErr = invalidRegData.message || invalidRegData.error;
    assert(invalidRegRes.status === 400, 'Invalid password rejected with 400 Bad Request');
    assert(invalidRegErr && invalidRegErr.includes('Password must be at least 8 characters'), 'Validation message returned to client');

    // Scenario 3: Successful Signup
    console.log('\n--- 3. Successful Signup ---');
    const validRegRes = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Operator',
        email: 'operator@swiftcare.local',
        password: 'SecurePassword123!'
      })
    });
    const validRegData = await validRegRes.json();
    assert(validRegRes.status === 201, 'Valid registration returns 201 Created');
    assert(validRegData.success === true, 'Success flag is true');
    assert(validRegData.user.name === 'Test Operator', 'User name matches input');
    assert(validRegData.user.email === 'operator@swiftcare.local', 'User email matches input');
    assert(validRegData.user.role === 'CONTROL_ROOM', 'User role defaults to CONTROL_ROOM');
    assert(validRegData.user.password === undefined, 'Password hash is NOT exposed in response');

    // Scenario 4: Duplicate Account (Conflict)
    console.log('\n--- 4. Duplicate Account Registration ---');
    const dupRegRes = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Operator',
        email: 'operator@swiftcare.local', // Duplicate
        password: 'SecurePassword123!'
      })
    });
    const dupRegData = await dupRegRes.json();
    const dupRegErr = dupRegData.message || dupRegData.error;
    assert(dupRegRes.status === 409, 'Duplicate registration returns 409 Conflict');
    assert(dupRegErr === 'Email is already registered', 'Conflict message matches contract');

    // Scenario 5: Login with Invalid Credentials
    console.log('\n--- 5. Login with Invalid Password ---');
    const badLoginRes = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@swiftcare.local',
        password: 'WrongPassword999!'
      })
    });
    const badLoginData = await badLoginRes.json();
    const badLoginErr = badLoginData.message || badLoginData.error;
    assert(badLoginRes.status === 401, 'Invalid credentials return 401 Unauthorized');
    assert(badLoginErr === 'Invalid email or password', 'Generic error prevents enumeration');

    // Scenario 6: Successful Login & HTTP-Only Cookie Setting
    console.log('\n--- 6. Successful Login ---');
    const loginRes = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@swiftcare.local',
        password: 'SecurePassword123!'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Successful login returns 200 OK');
    assert(loginData.success === true, 'Response indicates success: true');
    assert(loginData.user.email === 'operator@swiftcare.local', 'User profile returned in response');
    assert(loginData.token === undefined, 'JWT token is NOT exposed in JSON body (cookie-only)');

    // Extract cookie from Set-Cookie header
    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert(setCookieHeader !== null && setCookieHeader.includes('token='), 'Set-Cookie header contains token cookie');
    assert(setCookieHeader.toLowerCase().includes('httponly'), 'Token cookie has HttpOnly flag');
    assert(setCookieHeader.toLowerCase().includes('samesite=strict') || setCookieHeader.toLowerCase().includes('samesite=lax'), 'Token cookie has SameSite flag');

    const cookieMatch = setCookieHeader.match(/token=([^;]+)/);
    const cookieValue = cookieMatch ? `token=${cookieMatch[1]}` : '';

    // Scenario 7: Session Retrieval with Cookie (GET /api/auth/me)
    console.log('\n--- 7. Session Retrieval with Cookie (GET /api/auth/me) ---');
    const meRes = await fetch(`${BASE}/me`, {
      headers: {
        Cookie: cookieValue
      }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Authenticated session retrieval returns 200 OK');
    assert(meData.success === true, 'Me endpoint indicates success: true');
    assert(meData.user.name === 'Test Operator', 'User identity confirmed from session');
    assert(meData.user.role === 'CONTROL_ROOM', 'User role confirmed from session');

    // Scenario 8: Session Persistence (Simulated Browser Refresh)
    console.log('\n--- 8. Session Persistence (Simulated Page Refresh) ---');
    const refreshRes = await fetch(`${BASE}/me`, {
      headers: {
        Cookie: cookieValue
      }
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, 'Subsequent request with persisted cookie succeeds (200 OK)');
    assert(refreshData.user.id === validRegData.user.id, 'User ID matches originally registered user');

    // Scenario 9: Logout Endpoint (POST /api/auth/logout)
    console.log('\n--- 9. Logout & Cookie Invalidation ---');
    const logoutRes = await fetch(`${BASE}/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieValue
      }
    });
    const logoutData = await logoutRes.json();
    assert(logoutRes.status === 200, 'Logout returns 200 OK');
    assert(logoutData.success === true, 'Logout response indicates success: true');

    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert(
      logoutCookie !== null && (logoutCookie.includes('token=;') || logoutCookie.includes('Expires=') || logoutCookie.includes('Max-Age=0')),
      'Logout response clears token cookie'
    );

    // Scenario 10: Access after logout
    console.log('\n--- 10. Access After Logout ---');
    const postLogoutRes = await fetch(`${BASE}/me`);
    assert(postLogoutRes.status === 401, 'Request without cookie after logout returns 401 Unauthorized');

    console.log('\n================================================================');
    console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================\n');

    if (failCount > 0) {
      throw new Error(`${failCount} assertions failed`);
    }

  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runAuthVerification().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
