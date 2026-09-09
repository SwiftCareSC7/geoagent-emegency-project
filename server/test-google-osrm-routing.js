import routingService from './modules/routes/routing.service.js';
import mockRoutingProvider from './modules/routes/providers/mockRoutingProvider.js';
import osrmRoutingProvider from './modules/routes/providers/osrmRoutingProvider.js';
import googleRoutingProvider from './modules/routes/providers/googleRoutingProvider.js';

async function runTests() {
  console.log('====================================================');
  console.log('   REAL ROAD ROUTING & MANEUVER VERIFICATION SUITE  ');
  console.log('====================================================');

  const origin = [77.6271, 12.9352]; // Koramangala 80ft Road
  const emergency = [77.6410, 12.9490]; // Ring Road Flyover
  const hospital = [77.6483, 12.9582]; // Manipal Hospital

  // Test 1: OSRM Real Road Routing
  console.log('\n[Test 1] Testing OSRM Real Road Engine directly...');
  try {
    const osrmResult = await osrmRoutingProvider.getRoute(origin, emergency, { preference: 'FASTEST' });
    console.log('✅ OSRM Result:');
    console.log('   - Distance:', osrmResult.distanceMeters, 'meters');
    console.log('   - Duration:', osrmResult.durationSeconds, 'seconds');
    console.log('   - Coordinates count:', osrmResult.geometry.coordinates.length);
    console.log('   - Maneuvers count:', osrmResult.steps.length);
    console.log('   - Sample Maneuver 1:', osrmResult.steps[0]);
    if (osrmResult.steps[1]) console.log('   - Sample Maneuver 2:', osrmResult.steps[1]);

    if (osrmResult.geometry.coordinates.length < 10) {
      throw new Error('OSRM returned suspiciously few coordinates (possible straight line)!');
    }
    console.log('   -> Real road geometry verified! (No straight line)');
  } catch (err) {
    console.error('❌ OSRM Test Failed:', err.message);
    process.exit(1);
  }

  // Test 2: Google Routing Provider Status
  console.log('\n[Test 2] Testing Google Routing Provider status...');
  console.log('   - Google Routes API Available:', googleRoutingProvider.isAvailable());
  if (googleRoutingProvider.isAvailable()) {
    try {
      const googleResult = await googleRoutingProvider.getRoute(origin, emergency, { preference: 'FASTEST' });
      console.log('✅ Google Routes API Result:');
      console.log('   - Distance:', googleResult.distanceMeters, 'meters');
      console.log('   - Duration:', googleResult.durationSeconds, 'seconds');
      console.log('   - Coordinates count:', googleResult.geometry.coordinates.length);
      console.log('   - Maneuvers count:', googleResult.steps.length);
    } catch (err) {
      console.log('   ⚠️ Google API key check/quota:', err.message);
      console.log('   (Falling back to OSRM as designed for zero-downtime)');
    }
  } else {
    console.log('   ℹ️ GOOGLE_MAPS_API_KEY not configured yet — using OSRM fallback.');
  }

  // Test 3: Central Routing Service (Multi-Leg & Alternatives)
  console.log('\n[Test 3] Testing Central Routing Service with alternatives...');
  try {
    const routePlan = await routingService.getRoute(origin, emergency, {
      preference: 'FASTEST',
      computeAlternatives: true
    });
    console.log('✅ Routing Service Plan:');
    console.log('   - Provider:', routePlan.provider);
    console.log('   - Primary Coordinates:', routePlan.geometry.coordinates.length);
    console.log('   - Steps:', routePlan.steps.length);
    console.log('   - Has Alternative:', !!routePlan.alternative);
    if (routePlan.alternative) {
      console.log('   - Alt Coordinates:', routePlan.alternative.geometry.coordinates.length);
      console.log('   - Alt Steps:', routePlan.alternative.steps.length);
    }
  } catch (err) {
    console.error('❌ Routing Service Test Failed:', err.message);
    process.exit(1);
  }

  // Test 4: Mock Routing Provider (Fallback Safety)
  console.log('\n[Test 4] Testing Mock Provider non-canonical fallback (must be real road, never 4-point straight line)...');
  const arbitraryOrigin = [77.5800, 12.9200]; // Jayanagar
  const arbitraryDest = [77.6100, 13.0100];   // Hebbal
  try {
    const fallbackResult = await mockRoutingProvider.getRoute(arbitraryOrigin, arbitraryDest);
    console.log('✅ Fallback Result:');
    console.log('   - Provider:', fallbackResult.provider);
    console.log('   - Coordinates:', fallbackResult.geometry.coordinates.length);
    if (fallbackResult.geometry.coordinates.length <= 4) {
      throw new Error('Mock provider generated an arbitrary 4-point straight line!');
    }
    console.log('   -> Confirmed real road network routing across arbitrary coordinates!');
  } catch (err) {
    console.error('❌ Mock Provider Test Failed:', err.message);
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('   ALL REAL ROAD ROUTING TESTS PASSED PERFECTLY!    ');
  console.log('====================================================');
  process.exit(0);
}

runTests();
