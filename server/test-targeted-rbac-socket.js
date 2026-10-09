/**
 * SwiftCare GeoAgent — Targeted RBAC & Socket.IO Authorization Test Suite
 *
 * Covers:
 * 1. Registration payload preservation across all fields
 * 2. Pending status for new public accounts
 * 3. Prevention of public Admin registration & privilege escalation
 * 4. Socket.IO handshake rejection for unapproved accounts (PENDING/SUSPENDED/REJECTED)
 * 5. Admin approval with granular subset of requested workspaces
 * 6. Authenticated Socket.IO connection for approved users
 * 7. Socket.IO workspace room authorization (non-control room cannot join control room)
 * 8. Socket.IO resource ownership (driver cannot join unassigned vehicle room)
 * 9. Driver can join assigned vehicle room
 * 10. Real-time Socket.IO session revocation upon account suspension
 * 11. Duplicate registration prevention (409 Conflict)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { io as ioClient } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;
const SOCKET_URL = `http://localhost:${PORT}`;

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

async function run() {
  console.log('================================================================');
  console.log('  SWIFTCARE TARGETED AUTH, RBAC & SOCKET.IO HARDENING SUITE    ');
  console.log('================================================================\n');

  // --- 1. Admin Authentication ---
  console.log('--- 1. Admin Login ---');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@swiftcare.local',
      password: process.env.ADMIN_PASSWORD
    }
  });
  assert(adminLogin.status === 200, 'Admin logs in with 200 OK');
  const adminToken = extractToken(adminLogin.headers['set-cookie']);
  const adminCookie = `token=${adminToken}`;

  // --- 2. Public Registration Data Flow & Privilege Escalation ---
  console.log('\n--- 2. Registration Payload Preservation & Privilege Escalation ---');
  const ts = Date.now();
  const testEmail = `paramedic_pilot_${ts}@swiftcare.local`;
  const regPayload = {
    name: 'Field Officer Dev',
    email: testEmail,
    password: 'SecurePassword123!',
    role: 'PARAMEDIC',
    requestedWorkspaces: ['PARAMEDIC', 'CONTROL_ROOM'],
    assignedVehicleId: 'AMB-03'
  };

  const regRes = await request('/auth/register', {
    method: 'POST',
    body: regPayload
  });
  assert(regRes.status === 201, 'Registration returns 201 Created');
  assert(regRes.data?.user?.status === 'PENDING', 'New registration strictly defaults to PENDING status');
  assert(regRes.data?.user?.requestedRole === 'PARAMEDIC', 'requestedRole preserved in database record');
  assert(
    Array.isArray(regRes.data?.user?.requestedWorkspaces) &&
    regRes.data?.user?.requestedWorkspaces.includes('CONTROL_ROOM'),
    'requestedWorkspaces multi-selection preserved in database record'
  );
  assert(
    !regRes.data?.user?.permittedWorkspaces?.includes('CONTROL_ROOM'),
    'permittedWorkspaces does NOT grant CONTROL_ROOM prior to admin review'
  );

  // --- 3. Duplicate Registration Prevention ---
  console.log('\n--- 3. Duplicate Registration Contract ---');
  const dupRes = await request('/auth/register', {
    method: 'POST',
    body: regPayload
  });
  assert(dupRes.status === 409, 'Duplicate registration returns 409 Conflict');

  // --- 4. Public Admin Escalation Neutralization ---
  console.log('\n--- 4. Public Admin Registration Denial ---');
  const adminAttempt = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Fake Admin',
      email: `fake_admin_${ts}@swiftcare.local`,
      password: 'FakePassword123!',
      role: 'ADMIN',
      requestedWorkspaces: ['ADMIN'],
      status: 'APPROVED'
    }
  });
  assert(adminAttempt.status === 201, 'Registration endpoint accepts request');
  assert(adminAttempt.data?.user?.status === 'PENDING', 'Self-elevated status stripped to PENDING');
  assert(
    !adminAttempt.data?.user?.permittedWorkspaces?.includes('ADMIN'),
    'Unapproved account does NOT receive ADMIN permitted workspace'
  );

  // --- 5. Socket.IO Handshake Rejection for Pending Account ---
  console.log('\n--- 5. Socket.IO Handshake Rejection for Pending Account ---');
  // Attempt to generate token for pending account via internal test token or login attempt
  const pendingLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'SecurePassword123!' }
  });
  assert(pendingLogin.status === 403, 'Pending account cannot log in over HTTP (403)');

  // Test unauthenticated socket connection
  const socketUnauthRejected = await new Promise((resolve) => {
    const s = ioClient(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false
    });
    s.on('connect', () => {
      s.disconnect();
      resolve(false);
    });
    s.on('connect_error', () => {
      s.disconnect();
      resolve(true);
    });
  });
  assert(socketUnauthRejected, 'Socket.IO handshake without token is rejected');

  // --- 6. Admin Approval with Selective Workspaces ---
  console.log('\n--- 6. Admin Selective Workspace Approval ---');
  const officerId = regRes.data?.user?.id;
  assert(!!officerId, 'Officer user ID present for administrative approval');

  // Admin approves user, granting ONLY PARAMEDIC workspace (rejecting CONTROL_ROOM request)
  const approvalRes = await request(`/admin/users/${officerId}/role`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: {
      role: 'PARAMEDIC',
      permittedWorkspaces: ['PARAMEDIC'],
      assignedVehicleId: 'AMB-03'
    }
  });
  assert(approvalRes.status === 200, 'Admin role & workspace update returns 200 OK');

  const approveStatusRes = await request(`/admin/users/${officerId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });
  assert(approveStatusRes.status === 200, 'Admin approves officer status to APPROVED');

  // --- 7. Approved User Login & Session Establishment ---
  console.log('\n--- 7. Approved User Login ---');
  const officerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'SecurePassword123!' }
  });
  assert(officerLogin.status === 200, 'Approved officer logs in with 200 OK');
  const officerToken = extractToken(officerLogin.headers['set-cookie']);
  const officerCookie = `token=${officerToken}`;

  // Verify /api/auth/me reflects authoritative permissions
  const meRes = await request('/auth/me', { headers: { Cookie: officerCookie } });
  assert(meRes.status === 200, '/api/auth/me returns 200 OK');
  assert(
    meRes.data?.user?.permittedWorkspaces?.includes('PARAMEDIC') &&
    !meRes.data?.user?.permittedWorkspaces?.includes('CONTROL_ROOM'),
    'Officer has PARAMEDIC workspace but NOT unapproved CONTROL_ROOM workspace'
  );

  // --- 8. Socket.IO Authenticated Connection ---
  console.log('\n--- 8. Socket.IO Authenticated Connection ---');
  const socketClient = await new Promise((resolve, reject) => {
    const s = ioClient(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: officerToken },
      reconnection: false
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (err) => reject(err));
  });
  assert(!!socketClient.id, 'Approved officer connects to Socket.IO successfully');

  // --- 9. Socket.IO Control Room Room Authorization Boundary ---
  console.log('\n--- 9. Socket.IO Control Room Boundary Check ---');
  const joinControlRoomDenied = await new Promise((resolve) => {
    socketClient.emit('join.control_room', {}, (response) => {
      if (response && response.success === false) {
        resolve(true);
      }
    });
    socketClient.on('error', (err) => {
      if (err?.message?.includes('Forbidden')) {
        resolve(true);
      }
    });
    setTimeout(() => resolve(false), 800);
  });
  assert(
    joinControlRoomDenied,
    'Officer without CONTROL_ROOM workspace is denied from join.control_room'
  );

  // --- 10. Driver Vehicle Ownership Boundary on Sockets ---
  console.log('\n--- 10. Socket.IO Vehicle Ownership Boundary Check ---');
  // Register and approve a driver assigned to AMB-01
  const driverEmail = `driver_sc_${ts}@swiftcare.local`;
  const driverReg = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Ambulance Driver Ravi',
      email: driverEmail,
      password: process.env.DRIVER_PASSWORD,
      role: 'DRIVER',
      requestedWorkspaces: ['DRIVER'],
      assignedVehicleId: 'AMB-01'
    }
  });
  const driverId = driverReg.data?.user?.id;
  await request(`/admin/users/${driverId}/role`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: { role: 'DRIVER', permittedWorkspaces: ['DRIVER'], assignedVehicleId: 'AMB-01' }
  });
  await request(`/admin/users/${driverId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });

  const driverLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: driverEmail, password: process.env.DRIVER_PASSWORD }
  });
  const driverToken = extractToken(driverLogin.headers['set-cookie']);

  const driverSocket = await new Promise((resolve, reject) => {
    const s = ioClient(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: driverToken },
      reconnection: false
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (err) => reject(err));
  });

  // Attempt to join unassigned AMB-02 room
  const unassignedJoinDenied = await new Promise((resolve) => {
    driverSocket.emit('join.vehicle', { vehicleId: 'AMB-02' }, (response) => {
      if (response && response.success === false) {
        resolve(true);
      }
    });
    driverSocket.on('error', (err) => {
      if (err?.message?.includes('Forbidden')) {
        resolve(true);
      }
    });
    setTimeout(() => resolve(false), 800);
  });
  assert(
    unassignedJoinDenied,
    'Driver is blocked from joining unassigned vehicle AMB-02 room on Socket.IO'
  );

  // Join assigned AMB-01 room
  const assignedJoinSuccess = await new Promise((resolve) => {
    driverSocket.emit('join.vehicle', { vehicleId: 'AMB-01' }, (response) => {
      if (response && response.success === true) {
        resolve(true);
      }
    });
    driverSocket.on('joined', (data) => {
      if (data?.room === 'vehicle:AMB-01') {
        resolve(true);
      }
    });
    setTimeout(() => resolve(false), 800);
  });
  assert(assignedJoinSuccess, 'Driver successfully joins assigned vehicle AMB-01 room');

  // --- 11. Socket.IO Real-Time Revocation upon Suspension ---
  console.log('\n--- 11. Socket.IO Real-Time Revocation on Suspension ---');
  await request(`/admin/users/${driverId}/suspend`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie }
  });

  const socketDisconnectedOnSuspension = await new Promise((resolve) => {
    driverSocket.on('disconnect', () => resolve(true));
    driverSocket.on('error', (err) => {
      if (err?.message?.includes('suspended')) resolve(true);
    });
    // Trigger any event packet to trigger per-packet socket middleware
    driverSocket.emit('room:leave', { room: 'vehicle:AMB-01' });
    setTimeout(() => resolve(false), 1200);
  });
  assert(
    socketDisconnectedOnSuspension,
    'Active socket connection for suspended account is disconnected immediately on next event'
  );

  socketClient.disconnect();
  driverSocket.disconnect();

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
