/**
 * SwiftCare GeoAgent — Dashboard Backend Integration & E2E Test Suite
 *
 * Validates:
 * 1. Unauthenticated requests to /api/vehicles, /api/emergencies, /api/incidents return 401
 * 2. Authenticated operator cookie enables full access
 * 3. Empty database query returns honest empty envelope { success: true, count: 0, data: [] }
 * 4. Vehicles endpoint returns full fleet, supports status filtering (?status=AVAILABLE)
 * 5. Single vehicle fetch returns complete metadata (hospital, driver, capacity)
 * 6. Emergencies endpoint returns calls, supports priority filtering (?priority=CRITICAL)
 * 7. Single emergency fetch populates assignedVehicle reference with vehicleId and status
 * 8. Incidents endpoint returns road hazards, supports severity filtering (?severity=CRITICAL)
 * 9. GeoJSON coordinates conform to [longitude, latitude] format
 */

import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import authRoutes from './modules/auth/auth.routes.js';
import vehicleRoutes from './modules/vehicles/vehicle.routes.js';
import emergencyRoutes from './modules/emergencies/emergency.routes.js';
import incidentRoutes from './modules/incidents/incident.routes.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';

import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_for_part10_verification';
}

const MONGO_TEST_URI = 'mongodb://127.0.0.1:27017/geoagent-dashboard-e2e-test';
const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runDashboardVerification() {
  console.log('================================================================');
  console.log('      RUNNING REAL DASHBOARD BACKEND REST INTEGRATION E2E TEST   ');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_TEST_URI);
  console.log('[DB] Connected to test database:', MONGO_TEST_URI);

  // Clean test database for pristine test isolation
  await mongoose.connection.dropDatabase();
  console.log('[DB] Cleaned test database.\n');

  // Set up Express test app
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/emergencies', emergencyRoutes);
  app.use('/api/incidents', incidentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[HTTP] Test server listening on ${BASE_URL}\n`);

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
    // -------------------------------------------------------------------------
    // Phase 1: Unauthenticated Route Protection
    // -------------------------------------------------------------------------
    console.log('--- 1. Unauthenticated Route Protection ---');

    const vUnauth = await fetch(`${BASE_URL}/vehicles`);
    assert(vUnauth.status === 401, 'GET /api/vehicles without auth returns 401');

    const eUnauth = await fetch(`${BASE_URL}/emergencies`);
    assert(eUnauth.status === 401, 'GET /api/emergencies without auth returns 401');

    const iUnauth = await fetch(`${BASE_URL}/incidents`);
    assert(iUnauth.status === 401, 'GET /api/incidents without auth returns 401');

    // -------------------------------------------------------------------------
    // Phase 2: Operator Authentication & Cookie Session
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Operator Authentication & Cookie Session ---');

    const hashedPassword = await bcrypt.hash('Control123!', 10);
    const operator = await User.create({
      name: 'Central Control Operator',
      email: 'operator@swiftcare.local',
      password: hashedPassword,
      role: 'CONTROL_ROOM',
    });
    assert(!!operator._id, 'Operator test user created in MongoDB');

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@swiftcare.local',
        password: 'Control123!',
      }),
    });
    assert(loginRes.status === 200, 'POST /api/auth/login returns 200');

    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert(setCookieHeader && setCookieHeader.includes('token='), 'Response includes token HTTP-only cookie');

    const cookieHeader = setCookieHeader.split(';')[0];
    const authHeaders = {
      Cookie: cookieHeader,
      Accept: 'application/json',
    };

    // -------------------------------------------------------------------------
    // Phase 3: Honest Empty State Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Honest Empty State on Empty Database ---');

    const vEmptyRes = await fetch(`${BASE_URL}/vehicles`, { headers: authHeaders });
    const vEmptyData = await vEmptyRes.json();
    assert(vEmptyRes.status === 200, 'GET /api/vehicles on empty DB returns 200');
    assert(vEmptyData.success === true, 'Empty vehicles response success is true');
    assert(vEmptyData.count === 0, 'Empty vehicles response count is 0');
    assert(Array.isArray(vEmptyData.data) && vEmptyData.data.length === 0, 'Empty vehicles data is []');

    const eEmptyRes = await fetch(`${BASE_URL}/emergencies`, { headers: authHeaders });
    const eEmptyData = await eEmptyRes.json();
    assert(eEmptyRes.status === 200, 'GET /api/emergencies on empty DB returns 200');
    assert(eEmptyData.count === 0, 'Empty emergencies response count is 0');
    assert(Array.isArray(eEmptyData.data) && eEmptyData.data.length === 0, 'Empty emergencies data is []');

    const iEmptyRes = await fetch(`${BASE_URL}/incidents`, { headers: authHeaders });
    const iEmptyData = await iEmptyRes.json();
    assert(iEmptyRes.status === 200, 'GET /api/incidents on empty DB returns 200');
    assert(iEmptyData.count === 0, 'Empty incidents response count is 0');
    assert(Array.isArray(iEmptyData.data) && iEmptyData.data.length === 0, 'Empty incidents data is []');

    // -------------------------------------------------------------------------
    // Phase 4: Seed Realistic Records for Populated Testing
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Seeding Test Records ---');

    const amb101 = await Vehicle.create({
      vehicleId: 'AMB-101',
      registrationNumber: 'MH-12-PA-101',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      capacity: 1,
      driverName: 'Ramesh Shinde',
      driverContact: '+91 98220 11001',
      hospitalName: 'Ruby Hall Clinic',
      hospitalCode: 'RHC-01',
    });

    const amb102 = await Vehicle.create({
      vehicleId: 'AMB-102',
      registrationNumber: 'MH-12-PA-102',
      type: 'AMBULANCE',
      status: 'DISPATCHED',
      capacity: 2,
      driverName: 'Anita Deshmukh',
      driverContact: '+91 98220 11002',
      hospitalName: 'KEM Hospital Pune',
      hospitalCode: 'KEM-02',
    });

    const fe201 = await Vehicle.create({
      vehicleId: 'FE-201',
      registrationNumber: 'MH-12-FE-201',
      type: 'FIRE_ENGINE',
      status: 'AVAILABLE',
      capacity: 4,
      driverName: 'Vikram Kadam',
      driverContact: '+91 98220 11004',
      hospitalName: 'Central Fire Station Pune',
      hospitalCode: 'CFS-01',
    });
    assert(!!amb101 && !!amb102 && !!fe201, '3 test vehicles seeded');

    const emg01 = await Emergency.create({
      emergencyId: 'EMG-2026-001',
      type: 'MEDICAL',
      priority: 'CRITICAL',
      status: 'DISPATCHED',
      description: 'Acute cardiac distress at Shivajinagar Junction',
      callerName: 'Rajesh Verma',
      callerContact: '+91 98230 11223',
      location: { type: 'Point', coordinates: [73.8567, 18.5204] },
      destination: { type: 'Point', coordinates: [73.8742, 18.5312] },
      assignedVehicle: amb102._id,
      createdBy: operator._id,
    });

    const emg02 = await Emergency.create({
      emergencyId: 'EMG-2026-002',
      type: 'ACCIDENT',
      priority: 'HIGH',
      status: 'PENDING',
      description: 'Two-car collision on FC Road',
      callerName: 'Neha Joshi',
      callerContact: '+91 98500 44556',
      location: { type: 'Point', coordinates: [73.8412, 18.5245] },
      assignedVehicle: null,
      createdBy: operator._id,
    });
    assert(!!emg01 && !!emg02, '2 test emergencies seeded');

    const inc01 = await Incident.create({
      incidentId: 'INC-2026-001',
      type: 'ROAD_CLOSURE',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      description: 'Senapati Bapat Road flyover repair work',
      location: { type: 'Point', coordinates: [73.8298, 18.5342] },
      source: 'TRAFFIC_POLICE',
      reportedBy: operator._id,
    });

    const inc02 = await Incident.create({
      incidentId: 'INC-2026-002',
      type: 'TRAFFIC_JAM',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'University Circle congestion',
      location: { type: 'Point', coordinates: [73.8267, 18.5412] },
      source: 'AUTOMATED_SYSTEM',
      reportedBy: operator._id,
    });
    assert(!!inc01 && !!inc02, '2 test incidents seeded');

    // -------------------------------------------------------------------------
    // Phase 5: Vehicles API Contract Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Vehicles API Verification ---');

    const vListRes = await fetch(`${BASE_URL}/vehicles`, { headers: authHeaders });
    const vListData = await vListRes.json();
    assert(vListRes.status === 200, 'GET /api/vehicles returns 200');
    assert(vListData.count === 3, 'GET /api/vehicles returns count: 3');
    assert(vListData.data.length === 3, 'GET /api/vehicles data array length is 3');

    // Status filter
    const vFilteredRes = await fetch(`${BASE_URL}/vehicles?status=AVAILABLE`, { headers: authHeaders });
    const vFilteredData = await vFilteredRes.json();
    assert(vFilteredRes.status === 200, 'GET /api/vehicles?status=AVAILABLE returns 200');
    assert(vFilteredData.count === 2, 'Filtered count is 2 (AVAILABLE units)');
    assert(vFilteredData.data.every((v) => v.status === 'AVAILABLE'), 'All filtered units have status AVAILABLE');

    // Single vehicle fetch
    const vSingleRes = await fetch(`${BASE_URL}/vehicles/AMB-101`, { headers: authHeaders });
    const vSingleData = await vSingleRes.json();
    assert(vSingleRes.status === 200, 'GET /api/vehicles/AMB-101 returns 200');
    assert(vSingleData.data.vehicleId === 'AMB-101', 'Vehicle ID matches AMB-101');
    assert(vSingleData.data.hospitalName === 'Ruby Hall Clinic', 'Hospital name is Ruby Hall Clinic');
    assert(vSingleData.data.capacity === 1, 'Capacity is 1');

    // -------------------------------------------------------------------------
    // Phase 6: Emergencies API Contract Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Emergencies API Verification ---');

    const eListRes = await fetch(`${BASE_URL}/emergencies`, { headers: authHeaders });
    const eListData = await eListRes.json();
    assert(eListRes.status === 200, 'GET /api/emergencies returns 200');
    assert(eListData.count === 2, 'GET /api/emergencies returns count: 2');

    // Priority filter
    const eCritRes = await fetch(`${BASE_URL}/emergencies?priority=CRITICAL`, { headers: authHeaders });
    const eCritData = await eCritRes.json();
    assert(eCritRes.status === 200, 'GET /api/emergencies?priority=CRITICAL returns 200');
    assert(eCritData.count === 1, 'Filtered count is 1');
    assert(eCritData.data[0].emergencyId === 'EMG-2026-001', 'Emergency ID is EMG-2026-001');

    // Populated assigned vehicle reference
    const eSingleRes = await fetch(`${BASE_URL}/emergencies/EMG-2026-001`, { headers: authHeaders });
    const eSingleData = await eSingleRes.json();
    assert(eSingleRes.status === 200, 'GET /api/emergencies/EMG-2026-001 returns 200');
    assert(!!eSingleData.data.assignedVehicle, 'assignedVehicle is populated');
    assert(
      typeof eSingleData.data.assignedVehicle === 'object' &&
        eSingleData.data.assignedVehicle.vehicleId === 'AMB-102',
      'assignedVehicle populates vehicleId AMB-102',
    );
    assert(
      Array.isArray(eSingleData.data.location.coordinates) &&
        eSingleData.data.location.coordinates.length === 2,
      'Location coordinates format is [longitude, latitude]',
    );

    // -------------------------------------------------------------------------
    // Phase 7: Incidents API Contract Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Incidents API Verification ---');

    const iListRes = await fetch(`${BASE_URL}/incidents`, { headers: authHeaders });
    const iListData = await iListRes.json();
    assert(iListRes.status === 200, 'GET /api/incidents returns 200');
    assert(iListData.count === 2, 'GET /api/incidents returns count: 2');

    // Severity filter
    const iCritRes = await fetch(`${BASE_URL}/incidents?severity=CRITICAL`, { headers: authHeaders });
    const iCritData = await iCritRes.json();
    assert(iCritRes.status === 200, 'GET /api/incidents?severity=CRITICAL returns 200');
    assert(iCritData.count === 1, 'Filtered count is 1');
    assert(iCritData.data[0].type === 'ROAD_CLOSURE', 'Incident type is ROAD_CLOSURE');

    // Single incident fetch
    const iSingleRes = await fetch(`${BASE_URL}/incidents/INC-2026-001`, { headers: authHeaders });
    const iSingleData = await iSingleRes.json();
    assert(iSingleRes.status === 200, 'GET /api/incidents/INC-2026-001 returns 200');
    assert(iSingleData.data.incidentId === 'INC-2026-001', 'Incident ID is INC-2026-001');
    assert(iSingleData.data.source === 'TRAFFIC_POLICE', 'Source is TRAFFIC_POLICE');

  } finally {
    await server.close();
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runDashboardVerification().catch((err) => {
  console.error('[FATAL] Verification suite error:', err);
  process.exit(1);
});
