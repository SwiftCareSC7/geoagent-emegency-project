/**
 * Open-access regression test: the app has no authentication.
 * Requires the backend running on PORT (default 5001) against an ISOLATED test database.
 *   node server/test-no-auth.js
 */
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';

const ORIGIN = `http://127.0.0.1:${process.env.PORT || 5001}`;
const API = `${ORIGIN}/api`;
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); console.log(`  ✓ ${msg}`); n++; };
const call = async (method, path, body) => {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

console.log('--- Removed authentication endpoints ---');
for (const [m, p] of [['POST', '/auth/login'], ['POST', '/auth/register'], ['GET', '/auth/me'], ['POST', '/auth/logout'], ['GET', '/admin/users']]) {
  ok((await call(m, p)).status === 404, `${m} /api${p} no longer exists (404)`);
}

console.log('--- Reads work without credentials ---');
for (const p of ['/health/ready', '/vehicles', '/emergencies', '/incidents', '/admin/stats', '/admin/vehicles']) {
  ok((await call('GET', p)).status === 200, `GET /api${p} → 200 without login`);
}

console.log('--- Writes work without credentials ---');
const stamp = Date.now().toString().slice(-6);
const v = await call('POST', '/vehicles', {
  vehicleId: `AMB-NOAUTH-${stamp}`, registrationNumber: `NA-${stamp}`, type: 'AMBULANCE', driverName: 'Open Access Test', capacity: 2
});
ok(v.status === 201, 'POST /api/vehicles creates a vehicle without login');
const upd = await call('PATCH', `/vehicles/AMB-NOAUTH-${stamp}`, { status: 'AVAILABLE' });
ok(upd.status === 200, 'PATCH /api/vehicles/:id works without a vehicle owner');

const e = await call('POST', '/emergencies', {
  type: 'MEDICAL', priority: 'HIGH',
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  destination: { type: 'Point', coordinates: [77.6, 12.97] }
});
ok(e.status === 201 && e.json.data?.emergencyId, 'POST /api/emergencies creates an emergency with no creator identity');
const got = await call('GET', `/emergencies/${e.json.data.emergencyId}`);
ok(got.status === 200 && !('password' in (got.json.data || {})), 'created emergency is readable');

const inc = await call('POST', '/incidents', {
  type: 'ACCIDENT', severity: 'HIGH', description: 'Open access test',
  location: { type: 'Point', coordinates: [77.5946, 12.9716] }
});
ok(inc.status === 201, 'POST /api/incidents creates an incident with no reporter identity');

console.log('--- Socket.IO without credentials ---');
const socket = ioClient(ORIGIN, { transports: ['websocket'], reconnection: false });
await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
ok(socket.connected, 'socket connects with no token or cookie');
const joined = await new Promise((resolve) => socket.emit('join.control_room', resolve));
ok(joined?.success === true, 'join.control_room succeeds without a role');
socket.disconnect();

console.log(`\nno-auth OK (${n} checks)`);
process.exit(0);
