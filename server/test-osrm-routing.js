/**
 * Test script to verify OSRM routing provider is working correctly
 * Run with: node test-osrm-routing.js
 */

import osrmRoutingProvider from './modules/routes/providers/osrmRoutingProvider.js';

async function testOSRMRouting() {
  console.log('🧪 Testing OSRM Routing Provider\n');

  // Test 1: Route within Bengaluru (existing corridor area)
  console.log('Test 1: Bengaluru route (Koramangala to Manipal Hospital)');
  const bengaluruOrigin = { type: 'Point', coordinates: [77.6271, 12.9352] };
  const bengaluruDest = { type: 'Point', coordinates: [77.6483, 12.9582] };

  try {
    const route1 = await osrmRoutingProvider.getRoute(bengaluruOrigin, bengaluruDest);
    console.log(`✅ Route calculated successfully`);
    console.log(`   Distance: ${route1.distanceMeters}m`);
    console.log(`   Duration: ${route1.durationSeconds}s (${Math.round(route1.durationSeconds / 60)} min)`);
    console.log(`   Coordinates: ${route1.geometry.coordinates.length} points`);
    console.log(`   Provider: ${route1.provider}`);
    console.log(`   Steps: ${route1.steps.length} maneuvers`);
    console.log(`   First step: ${route1.steps[0]?.instruction || 'N/A'}`);
    console.log();
  } catch (err) {
    console.error(`❌ Test 1 failed: ${err.message}\n`);
  }

  // Test 2: Route outside Bengaluru (New York City)
  console.log('Test 2: New York City route (Times Square to Central Park)');
  const nycOrigin = { type: 'Point', coordinates: [-73.9857, 40.7580] };
  const nycDest = { type: 'Point', coordinates: [-73.9654, 40.7829] };

  try {
    const route2 = await osrmRoutingProvider.getRoute(nycOrigin, nycDest);
    console.log(`✅ Route calculated successfully`);
    console.log(`   Distance: ${route2.distanceMeters}m`);
    console.log(`   Duration: ${route2.durationSeconds}s (${Math.round(route2.durationSeconds / 60)} min)`);
    console.log(`   Coordinates: ${route2.geometry.coordinates.length} points`);
    console.log(`   Provider: ${route2.provider}`);
    console.log(`   Steps: ${route2.steps.length} maneuvers`);
    console.log();

    // Verify geometry quality (not a straight line)
    if (route2.distanceMeters > 500 && route2.geometry.coordinates.length < 5) {
      console.error(`❌ WARNING: Route appears to be a straight-line fallback`);
      console.error(`   Only ${route2.geometry.coordinates.length} points for ${route2.distanceMeters}m route`);
    } else {
      console.log(`✅ Geometry quality check passed (not a straight-line fallback)`);
    }
  } catch (err) {
    console.error(`❌ Test 2 failed: ${err.message}\n`);
  }

  // Test 3: Route with alternatives
  console.log('Test 3: Route with alternatives (London route)');
  const londonOrigin = { type: 'Point', coordinates: [-0.1276, 51.5074] };
  const londonDest = { type: 'Point', coordinates: [-0.1278, 51.5074] };

  try {
    const route3 = await osrmRoutingProvider.getRouteWithAlternatives(londonOrigin, londonDest, {
      computeAlternativeRoutes: true
    });
    console.log(`✅ Route with alternatives calculated successfully`);
    console.log(`   Primary route: ${route3.primary.distanceMeters}m, ${route3.primary.durationSeconds}s`);
    console.log(`   Alternatives: ${route3.alternatives.length} routes`);
    if (route3.alternatives.length > 0) {
      route3.alternatives.forEach((alt, i) => {
        console.log(`   Alternative ${i + 1}: ${alt.distanceMeters}m, ${alt.durationSeconds}s`);
      });
    }
  } catch (err) {
    console.error(`❌ Test 3 failed: ${err.message}\n`);
  }

  console.log('\n🎉 OSRM routing tests completed');
}

// Run tests
testOSRMRouting().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
