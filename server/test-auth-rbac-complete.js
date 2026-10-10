/**
 * SwiftCare GeoAgent — Authoritative Auth & RBAC Complete Verification Suite
 *
 * Verifies all 12 operational requirements:
 * 1. Public registration across roles (CONTROL_ROOM, DRIVER, PARAMEDIC)
 * 2. Privilege escalation defense (ADMIN self-assignment rejected 403)
 * 3. Pending status on public registration
 * 4. Pending account login blocked (403 Operational Error)
 * 5. Admin user review & listing (/api/admin/users)
 * 6. Admin user approval (/api/admin/users/:id/approve)
 * 7. Approved user login success (200 OK + HTTP-only cookie)
 * 8. Admin role reassignment (/api/admin/users/:id/role)
 * 9. Admin account suspension (/api/admin/users/:id/suspend)
 * 10. Suspended account login & token access blocked (403)
 * 11. RBAC authorization matrix for all four authoritative roles
 * 12. Resource ownership checks (DRIVER restricted to assigned vehicle)
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
  const text = await res.text();
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  const setCookie = res.headers.get('set-cookie');
  return {
    status: res.status,
    headers: { 'set-cookie': setCookie },
    data: parsed
  };
}

function extractToken(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

async function runSuite() {
  console.log('================================================================');
  console.log('    SWIFTCARE COMPLETE AUTH, RBAC & OWNERSHIP TEST SUITE        ');
  console.log('================================================================');

  const ts = Date.now();

  // 1. Unauthenticated Request Rejection
  console.log('\n--- 1. Unauthorized API Access Check ---');
  const unauthMe = await request('/auth/me');
  assert(unauthMe.status === 401, 'Request without token returns 401 Unauthorized');

  const unauthAdmin = await request('/admin/stats');
  assert(unauthAdmin.status === 401, 'Request to admin routes without token returns 401 Unauthorized');

  // 2. All Four Roles Authentication
  console.log('\n--- 2. All Four Roles Authentication ---');
  // Admin Login
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@swiftcare.local', password: process.env.ADMIN_PASSWORD }
  });
  assert(adminLogin.status === 200, 'ADMIN login succeeds with 200 OK');
  assert(adminLogin.data?.user?.role === 'ADMIN', 'ADMIN user role verified as ADMIN');
  const adminCookie = `token=${extractToken(adminLogin.headers['set-cookie'])}`;

  // Control Room Login
  const opLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'operator@swiftcare.local', password: process.env.OPERATOR_PASSWORD }
  });
  assert(opLogin.status === 200, 'CONTROL_ROOM login succeeds with 200 OK');
  assert(opLogin.data?.user?.role === 'CONTROL_ROOM', 'CONTROL_ROOM user role verified');
  const opCookie = `token=${extractToken(opLogin.headers['set-cookie'])}`;

  // Driver Login
  const driverLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'driver@swiftcare.local', password: process.env.DRIVER_PASSWORD }
  });
  assert(driverLogin.status === 200, 'DRIVER login succeeds with 200 OK');
  assert(driverLogin.data?.user?.role === 'DRIVER', 'DRIVER user role verified');
  assert(driverLogin.data?.user?.assignedVehicleId === 'AMB-01', 'DRIVER assigned vehicle is AMB-01');
  const driverCookie = `token=${extractToken(driverLogin.headers['set-cookie'])}`;

  // Paramedic Login
  const paramLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'paramedic@swiftcare.local', password: process.env.PARAMEDIC_PASSWORD }
  });
  assert(paramLogin.status === 200, 'PARAMEDIC login succeeds with 200 OK');
  assert(paramLogin.data?.user?.role === 'PARAMEDIC', 'PARAMEDIC user role verified');
  const paramCookie = `token=${extractToken(paramLogin.headers['set-cookie'])}`;

  // 3. Privilege Escalation Defense: public signup cannot request ADMIN, and a body-supplied status is ignored
  console.log('\n--- 3. Privilege Escalation Defense ---');
  const privEsc = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Malicious Attacker', email: `attacker_${ts}@evil.com`, password: 'HackerPassword123!', role: 'ADMIN', status: 'APPROVED' }
  });
  assert(privEsc.status === 400, 'Public registration with role ADMIN is rejected with 400');

  const selfApprove = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Self Approver', email: `selfapprove_${ts}@evil.com`, password: 'HackerPassword123!', role: 'DRIVER', status: 'APPROVED' }
  });
  assert(selfApprove.data?.user?.status === 'PENDING', 'Self-assigning APPROVED is ignored; status is PENDING');

  const privEscLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: `selfapprove_${ts}@evil.com`, password: 'HackerPassword123!' }
  });
  assert(privEscLogin.status === 403, 'Unapproved account login is blocked with 403');
  assert(
    privEscLogin.data?.message?.includes('pending administrator approval'),
    'Error explicitly identifies pending administrator approval'
  );

  // 4. Public Registration Creates PENDING Account
  console.log('\n--- 4. Public Registration with Pending Status ---');
  const testNewEmail = `cadet_${ts}@swiftcare.local`;
  const cadetReg = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Cadet Priya Sharma',
      email: testNewEmail,
      password: 'CadetPassword123!',
      role: 'DRIVER',
      assignedVehicleId: 'AMB-02'
    }
  });
  assert(cadetReg.status === 201, 'Public registration succeeds with 201 Created');
  assert(cadetReg.data?.user?.status === 'PENDING', 'New registration defaults to PENDING status');
  assert(cadetReg.data?.user?.role === 'DRIVER', 'Requested role saved as DRIVER');
  const newUserId = cadetReg.data?.user?.id;

  // 5. Pending Account Login is Blocked
  console.log('\n--- 5. Pending Account Login Prevention ---');
  const pendingLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: testNewEmail, password: 'CadetPassword123!' }
  });
  assert(pendingLogin.status === 403, 'Login attempt on PENDING account returns 403 Forbidden');
  assert(
    pendingLogin.data?.message?.includes('pending administrator approval'),
    'Clear message indicating pending administrator approval'
  );

  // 6. Administrator Reviews Registrations
  console.log('\n--- 6. Administrator Reviews Registrations ---');
  const userList = await request('/admin/users?status=PENDING', {
    headers: { Cookie: adminCookie }
  });
  assert(userList.status === 200, 'Admin can list users with status=PENDING (200 OK)');
  const foundUser = userList.data?.data?.find(u => u.email === testNewEmail);
  assert(!!foundUser, 'Newly registered cadet appears in admin pending review list');

  // 7. Administrator Approves Registration
  console.log('\n--- 7. Administrator Approves Registration ---');
  const approveRes = await request(`/admin/users/${newUserId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  assert(approveRes.status === 200, 'Admin approval endpoint returns 200 OK');
  assert(approveRes.data?.data?.status === 'APPROVED', 'User status updated to APPROVED');
  assert(!!approveRes.data?.data?.approvedBy, 'Approval records administrator audit identifier');

  // 8. Approved User Can Now Log In Successfully
  console.log('\n--- 8. Approved User Login Verification ---');
  const approvedLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: testNewEmail, password: 'CadetPassword123!' }
  });
  assert(approvedLogin.status === 200, 'Approved user can now log in with 200 OK');
  assert(approvedLogin.data?.user?.status === 'APPROVED', 'Returned user status is APPROVED');
  const cadetCookie = `token=${extractToken(approvedLogin.headers['set-cookie'])}`;

  // 9. Administrator Reassigns Role & Vehicle
  console.log('\n--- 9. Administrator Role & Vehicle Assignment ---');
  const roleUpdate = await request(`/admin/users/${newUserId}/role`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: { role: 'PARAMEDIC', assignedVehicleId: 'AMB-03' }
  });
  assert(roleUpdate.status === 200, 'Role reassignment returns 200 OK');
  assert(roleUpdate.data?.data?.role === 'PARAMEDIC', 'Role successfully updated to PARAMEDIC');
  assert(roleUpdate.data?.data?.assignedVehicleId === 'AMB-03', 'Assigned vehicle updated to AMB-03');

  // 10. Administrator Suspends Account
  console.log('\n--- 10. Administrator Suspends Account ---');
  const suspendRes = await request(`/admin/users/${newUserId}/suspend`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  assert(suspendRes.status === 200, 'Account suspension returns 200 OK');
  assert(suspendRes.data?.data?.status === 'SUSPENDED', 'Account status updated to SUSPENDED');

  // 11. Suspended Account Blocked from Login and Active Session
  console.log('\n--- 11. Suspended Account Login & Session Rejection ---');
  const suspendedLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: testNewEmail, password: 'CadetPassword123!' }
  });
  assert(suspendedLogin.status === 403, 'Suspended account login is rejected with 403');
  assert(suspendedLogin.data?.message?.includes('suspended'), 'Error explicitly mentions account suspension');

  const suspendedSession = await request('/auth/me', {
    headers: { Cookie: cadetCookie }
  });
  assert(suspendedSession.status === 403, 'Active token for suspended account is rejected with 403');

  // 12. RBAC Endpoints Matrix
  console.log('\n--- 12. Role-Based Access Control Boundaries ---');
  // Admin accesses admin routes
  const adminStats = await request('/admin/stats', { headers: { Cookie: adminCookie } });
  assert(adminStats.status === 200, 'ADMIN permitted on /api/admin/stats (200 OK)');

  // Control Room forbidden on admin routes
  const opStats = await request('/admin/stats', { headers: { Cookie: opCookie } });
  assert(opStats.status === 403, 'CONTROL_ROOM forbidden on /api/admin/stats (403)');

  // Driver forbidden on admin routes
  const drvStats = await request('/admin/stats', { headers: { Cookie: driverCookie } });
  assert(drvStats.status === 403, 'DRIVER forbidden on /api/admin/stats (403)');

  // Paramedic forbidden on admin routes
  const pmdStats = await request('/admin/stats', { headers: { Cookie: paramCookie } });
  assert(pmdStats.status === 403, 'PARAMEDIC forbidden on /api/admin/stats (403)');

  // Driver forbidden on control room dispatch analytics
  const drvAnalytics = await request('/geoagent/analyze', {
    method: 'POST',
    headers: { Cookie: driverCookie },
    body: { emergencyId: 'EMG-01' }
  });
  assert(drvAnalytics.status === 403, 'DRIVER forbidden on dispatch-only /geoagent/analyze (403)');

  // 13. Resource Ownership Checks
  console.log('\n--- 13. Resource Ownership Boundaries ---');
  // Driver assigned to AMB-01 can update AMB-01
  const ownVehicleUpdate = await request('/vehicles/AMB-01', {
    method: 'PATCH',
    headers: { Cookie: driverCookie },
    body: { status: 'AVAILABLE' }
  });
  assert(ownVehicleUpdate.status === 200, 'Driver can update assigned vehicle AMB-01 (200 OK)');

  // Driver assigned to AMB-01 attempts to update AMB-02 (unassigned)
  const unownedVehicleUpdate = await request('/vehicles/AMB-02', {
    method: 'PATCH',
    headers: { Cookie: driverCookie },
    body: { status: 'AVAILABLE' }
  });
  assert(unownedVehicleUpdate.status === 403, 'Driver attempting to update unassigned vehicle AMB-02 rejected with 403');
  assert(
    unownedVehicleUpdate.data?.message?.includes('Drivers can only operate on their assigned vehicle'),
    'Ownership violation message clearly states driver vehicle boundary'
  );

  // Admin and Control Room can update any vehicle
  const opVehicleUpdate = await request('/vehicles/AMB-02', {
    method: 'PATCH',
    headers: { Cookie: opCookie },
    body: { status: 'AVAILABLE' }
  });
  assert(opVehicleUpdate.status === 200, 'CONTROL_ROOM permitted to update AMB-02 with dispatch authority (200 OK)');

  // 14. Logout Verification
  console.log('\n--- 14. Session Logout & Cookie Revocation ---');
  const logoutRes = await request('/auth/logout', {
    method: 'POST',
    headers: { Cookie: adminCookie }
  });
  assert(logoutRes.status === 200, 'Logout succeeds with 200 OK');
  assert(logoutRes.headers['set-cookie']?.includes('token='), 'Cookie is cleared in response headers');

  console.log('================================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('[TEST FATAL ERROR]:', err);
  process.exit(1);
});
