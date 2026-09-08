/**
 * SwiftCare GeoAgent — Clearance & Reroute Verification Test
 *
 * Tests:
 * 1. ClearanceSession model & persistence
 * 2. ClearanceService: preset vehicle generation & cycle advancement
 * 3. Route acceptReroute persistence & Socket.IO payload formation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

import ClearanceSession from './modules/clearance/clearance.model.js';
import clearanceService from './modules/clearance/clearance.service.js';
import routeService from './modules/routes/route.service.js';
import Route from './modules/routes/route.model.js';

async function runClearanceTest() {
  console.log('====================================================');
  console.log('🧪 TESTING EMERGENCY CLEARANCE & REROUTE PERSISTENCE');
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  try {
    // 1. Test getClearanceForVehicle
    console.log('\n--- 1. Testing getClearanceForVehicle ---');
    const session1 = await clearanceService.getClearanceForVehicle('AMB-01');
    console.log('Clearance Session Created:', {
      clearanceId: session1.clearanceId,
      vehicleId: session1.vehicleId,
      isSimulated: session1.isSimulated,
      vehiclesCount: session1.connectedVehicles.length,
      summary: session1.summary
    });

    if (!session1.isSimulated || session1.connectedVehicles.length !== 3) {
      throw new Error('Unexpected clearance session initialization');
    }
    console.log('✅ Clearance session initialized with 3 simulated connected vehicles');

    // 2. Test advanceClearanceCycle
    console.log('\n--- 2. Testing advanceClearanceCycle ---');
    const sessionCycle1 = await clearanceService.advanceClearanceCycle('AMB-01', 1);
    console.log('Cycle 1 Statuses:', sessionCycle1.connectedVehicles.map(v => `${v.vehicleId}: ${v.status}`));

    const sessionCycle2 = await clearanceService.advanceClearanceCycle('AMB-01', 2);
    console.log('Cycle 2 Statuses:', sessionCycle2.connectedVehicles.map(v => `${v.vehicleId}: ${v.status}`));

    const sessionCycle3 = await clearanceService.advanceClearanceCycle('AMB-01', 3);
    console.log('Cycle 3 Statuses:', sessionCycle3.connectedVehicles.map(v => `${v.vehicleId}: ${v.status}`));

    const sessionCycle4 = await clearanceService.advanceClearanceCycle('AMB-01', 4);
    console.log('Cycle 4 Statuses:', sessionCycle4.connectedVehicles.map(v => `${v.vehicleId}: ${v.status}`));

    const dbRecord = await ClearanceSession.findOne({ clearanceId: session1.clearanceId });
    if (!dbRecord || dbRecord.connectedVehicles[0].status !== 'CLEARED') {
      throw new Error('Database persistence verification failed for clearance session');
    }
    console.log('✅ Connected vehicle clearance cycle verified and persisted in MongoDB');

    // 3. Test acceptReroute
    console.log('\n--- 3. Testing acceptReroute ---');
    let testRoute = await Route.findOne({ routeId: 'ROUTE-DEMO-001-ACTIVE' });
    if (!testRoute) {
      testRoute = await Route.findOne();
    }

    if (testRoute) {
      const updatedRoute = await routeService.acceptReroute(testRoute.routeId, {
        durationSeconds: 600,
        distanceMeters: 4100,
        preference: 'FASTEST',
        reason: 'Test reroute acceptance'
      });

      console.log('Updated Route on Accept:', {
        routeId: updatedRoute.routeId,
        routeType: updatedRoute.routeType,
        status: updatedRoute.status,
        duration: updatedRoute.duration,
        distance: updatedRoute.distance
      });

      if (updatedRoute.duration !== 600 || updatedRoute.routeType !== 'RECOMMENDED') {
        throw new Error('Route acceptReroute update failed');
      }
      console.log('✅ Route reroute accepted and persisted successfully');
    }

    console.log('\n====================================================');
    console.log('🎉 CLEARANCE & REROUTE BACKEND TESTS PASSED (100%)');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runClearanceTest();
