/**
 * Test script for Phase 2: Dynamic Re-Routing
 * Tests automatic re-route on deviation, incident-triggered re-route, and manual re-route
 * Run with: node test-phase2-reroute.js
 */

import routeService from './modules/routes/route.service.js';
import deviationService from './modules/deviation/deviation.service.js';
import Incident from './modules/incidents/incident.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Route from './modules/routes/route.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import mongoose from 'mongoose';

async function testPhase2Reroute() {
  console.log('🧪 Testing Phase 2: Dynamic Re-Routing\n');

  // Create test vehicle
  console.log('Test 1: Create test vehicle');
  const testVehicle = new Vehicle({
    vehicleId: 'TEST-VEH-001',
    registrationNumber: 'TEST-001',
    type: 'AMBULANCE',
    status: 'EN_ROUTE',
    driverName: 'Test Driver',
    capacity: 2,
    location: { type: 'Point', coordinates: [77.6271, 12.9352] }, // Koramangala
    isDeleted: false
  });
  await testVehicle.save();
  console.log(`✅ Vehicle created: ${testVehicle.vehicleId}\n`);

  // Create test route
  console.log('Test 2: Create test route');
  const testRoute = new Route({
    routeId: 'TEST-ROUTE-001',
    emergency: new mongoose.Types.ObjectId(),
    vehicle: testVehicle._id,
    origin: { type: 'Point', coordinates: [77.6271, 12.9352] },
    destination: { type: 'Point', coordinates: [77.6483, 12.9582] }, // Manipal Hospital
    geometry: {
      type: 'LineString',
      coordinates: [
        [77.6271, 12.9352],
        [77.6320, 12.9410],
        [77.6385, 12.9490],
        [77.6483, 12.9582]
      ]
    },
    distance: 4850,
    duration: 660,
    provider: 'OSRM',
    routeType: 'PLANNED',
    status: 'ACTIVE',
    preference: 'FASTEST',
    steps: [],
    createdBy: new mongoose.Types.ObjectId()
  });
  await testRoute.save();
  console.log(`✅ Route created: ${testRoute.routeId}\n`);

  // Create test trajectory (simulating GPS data)
  console.log('Test 3: Create test trajectory (GPS data)');
  const testTrajectory = new Trajectory({
    vehicle: testVehicle._id,
    location: { type: 'Point', coordinates: [77.6271, 12.9352] },
    speed: 40,
    heading: 45,
    timestamp: new Date().toISOString(),
    source: 'SIMULATOR'
  });
  await testTrajectory.save();
  console.log(`✅ Trajectory created for vehicle\n`);

  // Test 4: Manual re-route from current position
  console.log('Test 4: Manual re-route from current position');
  try {
    const reroutedRoute = await routeService.recalculateRouteFromCurrentPosition(
      testVehicle.vehicleId,
      testRoute.routeId,
      {
        reason: 'Test manual re-route',
        preference: 'FASTEST'
      }
    );
    console.log(`✅ Manual re-route successful`);
    console.log(`   New distance: ${reroutedRoute.distance}m`);
    console.log(`   New duration: ${reroutedRoute.duration}s`);
    console.log(`   Route type: ${reroutedRoute.routeType}`);
    console.log(`   Coordinates: ${reroutedRoute.geometry.coordinates.length} points\n`);
  } catch (err) {
    console.error(`❌ Manual re-route failed: ${err.message}\n`);
  }

  // Test 5: Deviation detection
  console.log('Test 5: Deviation detection');
  try {
    const deviationResult = await deviationService.getDeviationForVehicle(testVehicle.vehicleId);
    console.log(`✅ Deviation analysis successful`);
    console.log(`   Status: ${deviationResult.deviation.status}`);
    console.log(`   Distance from route: ${deviationResult.deviation.distanceFromRouteMeters}m`);
    console.log(`   GPS stability: ${deviationResult.deviation.gpsStability}`);
    console.log(`   Confidence: ${deviationResult.deviation.confidence}\n`);
  } catch (err) {
    console.error(`❌ Deviation detection failed: ${err.message}\n`);
  }

  // Test 6: Incident-triggered re-route (spatial query)
  console.log('Test 6: Incident-triggered re-route');
  try {
    // Create test incident near the route
    const testIncident = new Incident({
      incidentId: 'TEST-INC-001',
      type: 'ROAD_CLOSURE',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'Test road closure for re-route testing',
      location: { type: 'Point', coordinates: [77.6350, 12.9450] }, // Near the route
      source: 'AUTOMATED_SYSTEM',
      isDeleted: false
    });
    await testIncident.save();
    console.log(`✅ Test incident created: ${testIncident.incidentId}`);

    // Import and trigger re-route for incident
    const { triggerReroutesForIncident } = await import('./modules/incidents/incident.service.js');
    const affectedVehicles = await triggerReroutesForIncident(testIncident);
    
    console.log(`✅ Incident-triggered re-route check completed`);
    console.log(`   Affected vehicles: ${affectedVehicles.length}`);
    if (affectedVehicles.length > 0) {
      affectedVehicles.forEach(v => {
        console.log(`   - Vehicle ${v.vehicleId}: ${v.distanceFromRouteMeters.toFixed(0)}m from incident`);
      });
    }
    console.log();

    // Clean up test incident
    await Incident.deleteOne({ incidentId: 'TEST-INC-001' });
  } catch (err) {
    console.error(`❌ Incident-triggered re-route failed: ${err.message}\n`);
  }

  // Cleanup
  console.log('Cleaning up test data...');
  await Trajectory.deleteOne({ vehicle: testVehicle._id });
  await Route.deleteOne({ routeId: 'TEST-ROUTE-001' });
  await Vehicle.deleteOne({ vehicleId: 'TEST-VEH-001' });
  console.log('✅ Test data cleaned up\n');

  console.log('🎉 Phase 2 re-routing tests completed');
}

// Run tests
testPhase2Reroute().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
