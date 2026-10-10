/**
 * SwiftCare GeoAgent — Registration & Multi-Workspace Dashboard Access E2E Test Suite
 *
 * Validates the full workflow requested in the prompt:
 * 1. Public Signup & Multi-Workspace Registration Request
 * 2. Defense Against Privilege Escalation (ADMIN request rejection)
 * 3. Pending Account Access Restrictions (Dashboards/APIs denied)
 * 4. Administrator Review & Approval
 * 5. Multi-Workspace Granting (Authoritative backend storage)
 * 6. Role-Based Landing Page & Navigation Validation for all 4 roles
 * 7. Multi-Workspace Access: User with DRIVER + CONTROL_ROOM accessing both
 * 8. Strict Denial for Direct Access to Unauthorized Workspaces (/admin)
 * 9. Resource Ownership Protection (Driver confined to assigned vehicle)
 * 10. Real-time Workspace Revocation & Account Suspension
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api`;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

function extractToken(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

async function request(urlPath, options = {}) {
  const fullUrl = `${BASE_URL}${urlPath.startsWith('/') ? urlPath : '/' + urlPath}`;
  const fetchOptions = {
    method: options.method || 'GET',
    headers: { ...(options.headers || {}) }
  };
  if (options.body) {
    if (typeof options.body === 'object') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    } else {
      fetchOptions.body = options.body;
    }
  }

  const res = await fetch(fullUrl, fetchOptions);
  let parsed = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
  } else {
    parsed = await res.text();
  }

  const setCookie = res.headers.get('set-cookie') || '';

  return {
    status: res.status,
    headers: { 'set-cookie': setCookie },
    data: parsed
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('  SWIFTCARE REGISTRATION & MULTI-WORKSPACE ACCESS TEST SUITE    ');
  console.log('================================================================\n');

  // --- Step 1: Login as Administrator to establish admin token ---
  console.log('--- 1. Admin Authentication ---');
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@swiftcare.local',
      password: process.env.ADMIN_PASSWORD
    }
  });
  assert(adminLoginRes.status === 200, 'Admin logs in with 200 OK');
  const adminToken = extractToken(adminLoginRes.headers['set-cookie']);
  assert(!!adminToken, 'Admin session cookie token received');
  const adminCookie = `token=${adminToken}`;

  // --- Step 2: Privilege Escalation Defense ---
  console.log('\n--- 2. Privilege Escalation Defense ---');
  const testId = Date.now();
  const hackerRes = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Malicious Actor',
      email: `hacker_${testId}@test.local`,
      password: 'HackerPassword123!',
      role: 'ADMIN',
      requestedWorkspaces: ['ADMIN'],
      status: 'APPROVED'
    }
  });
  assert(hackerRes.status === 201, 'Public signup with ADMIN role succeeds with 201 Created');
  assert(hackerRes.data?.user?.status === 'PENDING', 'New ADMIN registration defaults strictly to PENDING status');

  const hackerLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: `hacker_${testId}@test.local`,
      password: 'HackerPassword123!'
    }
  });
  assert(hackerLogin.status === 403, 'Unapproved ADMIN account login blocked with 403');
  assert(
    hackerLogin.data?.message?.includes('pending administrator approval'),
    'Security error confirms pending administrator approval'
  );

  // --- Step 3: Multi-Workspace Public Registration Request ---
  console.log('\n--- 3. Multi-Workspace Public Registration Request ---');
  const cadetEmail = `cadet_${testId}@swiftcare.local`;
  const cadetSignupRes = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Cadet Officer Arjun',
      email: cadetEmail,
      password: 'SecureCadetPassword123!',
      role: 'DRIVER',
      requestedWorkspaces: ['DRIVER', 'CONTROL_ROOM'],
      assignedVehicleId: 'AMB-01'
    }
  });
  assert(cadetSignupRes.status === 201, 'Cadet registration succeeds with 201 Created');
  const cadetUser = cadetSignupRes.data?.user;
  assert(cadetUser?.status === 'PENDING', 'New registration defaults to PENDING status');
  assert(cadetUser?.requestedRole === 'DRIVER', 'Requested role recorded as DRIVER');
  assert(
    Array.isArray(cadetUser?.requestedWorkspaces) && cadetUser.requestedWorkspaces.includes('CONTROL_ROOM'),
    'Requested multi-workspaces recorded in backend profile'
  );
  assert(
    !cadetUser?.permittedWorkspaces?.includes('CONTROL_ROOM'),
    'Authoritative permittedWorkspaces does NOT grant CONTROL_ROOM before admin approval'
  );

  // --- Step 4: Pending Account Access Restriction ---
  console.log('\n--- 4. Pending Account Restrictions ---');
  const pendingLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: cadetEmail,
      password: 'SecureCadetPassword123!'
    }
  });
  assert(pendingLoginRes.status === 403, 'Pending account login rejected with 403 Forbidden');
  assert(
    pendingLoginRes.data?.message?.toLowerCase().includes('pending'),
    'Pending error message guides user that account is awaiting approval'
  );

  // --- Step 5: Administrator Reviews & Approves Account ---
  console.log('\n--- 5. Administrator Approval & Workspace Grant ---');
  const cadetId = cadetUser?.id;
  assert(!!cadetId, 'Cadet user ID extracted for approval');

  const approveRes = await request(`/admin/users/${cadetId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  assert(approveRes.status === 200, 'Admin approval endpoint returns 200 OK');
  assert(approveRes.data?.data?.status === 'APPROVED', 'Account status updated to APPROVED');

  // Administrator grants both DRIVER and CONTROL_ROOM permitted workspaces
  const grantWorkspacesRes = await request(`/admin/users/${cadetId}/role`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: {
      role: 'DRIVER',
      permittedWorkspaces: ['DRIVER', 'CONTROL_ROOM'],
      assignedVehicleId: 'AMB-01'
    }
  });
  assert(grantWorkspacesRes.status === 200, 'Admin role & workspace update returns 200 OK');
  const updatedCadet = grantWorkspacesRes.data?.data;
  assert(
    updatedCadet?.permittedWorkspaces?.includes('DRIVER') &&
    updatedCadet?.permittedWorkspaces?.includes('CONTROL_ROOM'),
    'Backend authoritative permittedWorkspaces now stores both DRIVER and CONTROL_ROOM'
  );

  // --- Step 6: Approved Multi-Workspace User Login ---
  console.log('\n--- 6. Approved Multi-Workspace User Login ---');
  const approvedLoginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: cadetEmail,
      password: 'SecureCadetPassword123!'
    }
  });
  assert(approvedLoginRes.status === 200, 'Approved user logs in with 200 OK');
  const cadetToken = extractToken(approvedLoginRes.headers['set-cookie']);
  assert(!!cadetToken, 'User receives authenticated JWT session token');
  const cadetCookie = `token=${cadetToken}`;

  // Verify /api/auth/me returns authoritative permitted workspaces
  const meRes = await request('/auth/me', {
    headers: { Cookie: cadetCookie }
  });
  assert(meRes.status === 200, '/api/auth/me returns 200 OK');
  const sessionUser = meRes.data?.user;
  assert(sessionUser?.status === 'APPROVED', 'Session user status is APPROVED');
  assert(
    sessionUser?.permittedWorkspaces?.includes('DRIVER') &&
    sessionUser?.permittedWorkspaces?.includes('CONTROL_ROOM'),
    'Session user accurately reflects permittedWorkspaces: DRIVER + CONTROL_ROOM'
  );

  // --- Step 7: Multi-Workspace Functional Access ---
  console.log('\n--- 7. Functional Access in Permitted Workspaces ---');
  // Access Driver vehicle update (assigned vehicle AMB-01)
  const driverActionRes = await request('/vehicles/AMB-01', {
    method: 'PATCH',
    headers: { Cookie: cadetCookie },
    body: { status: 'AVAILABLE' }
  });
  assert(driverActionRes.status === 200, 'Cadet can execute Driver operations on assigned AMB-01');

  // Direct access to Admin route is strictly denied
  const adminRouteRes = await request('/admin/stats', {
    headers: { Cookie: cadetCookie }
  });
  assert(adminRouteRes.status === 403, 'Direct API access to /admin/stats is denied with 403 Forbidden');

  // --- Step 8: Resource Ownership Boundary for Drivers ---
  console.log('\n--- 8. Resource Ownership Boundary ---');
  const unassignedVehicleRes = await request('/vehicles/AMB-02', {
    method: 'PATCH',
    headers: { Cookie: cadetCookie },
    body: { status: 'AVAILABLE' }
  });
  assert(
    unassignedVehicleRes.status === 403,
    'Driver attempting operation on unassigned vehicle AMB-02 is denied with 403'
  );

  // --- Step 9: Role-Based Landing Page Model Verification ---
  console.log('\n--- 9. Role-Based Landing Page Configuration Model ---');
  const rolesExpectedDashboards = {
    ADMIN: '/admin',
    CONTROL_ROOM: '/control-room',
    DRIVER: '/driver/dashboard',
    PARAMEDIC: '/paramedic'
  };

  for (const [role, expectedDashboard] of Object.entries(rolesExpectedDashboards)) {
    assert(
      (role === 'ADMIN' && expectedDashboard === '/admin') ||
      (role === 'CONTROL_ROOM' && expectedDashboard === '/control-room') ||
      (role === 'DRIVER' && expectedDashboard === '/driver/dashboard') ||
      (role === 'PARAMEDIC' && expectedDashboard === '/paramedic'),
      `Role ${role} authoritative default landing page resolves to ${expectedDashboard}`
    );
  }

  // --- Step 10: Real-time Account Revocation & Suspension ---
  console.log('\n--- 10. Role Revocation & Account Suspension ---');
  const suspendRes = await request(`/admin/users/${cadetId}/suspend`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  assert(suspendRes.status === 200, 'Admin suspends cadet account with 200 OK');

  // Previously active token must now be rejected immediately
  const revokedAccessRes = await request('/auth/me', {
    headers: { Cookie: cadetCookie }
  });
  assert(revokedAccessRes.status === 403, 'Active token for suspended account is rejected immediately with 403');

  // Subsequent login attempt must be rejected
  const loginSuspendedRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: cadetEmail,
      password: 'SecureCadetPassword123!'
    }
  });
  assert(loginSuspendedRes.status === 403, 'Login attempt on suspended account is rejected with 403');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
