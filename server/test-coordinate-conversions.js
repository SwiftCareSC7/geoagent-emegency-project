/**
 * SwiftCare GeoAgent — Comprehensive Coordinate Conversion & Route Geometry Verification
 *
 * Verifies:
 * 1. Google Routes LatLng -> GeoJSON [lng, lat] conversion
 * 2. GeoJSON [lng, lat] -> Leaflet [lat, lng] conversion
 * 3. Inversion safety across Bengaluru coordinates (lat ~12.9, lng ~77.6)
 * 4. Google Encoded Polyline decoding accuracy
 * 5. Multi-coordinate road-following integrity (no 2-point straight lines)
 * 6. Distance and bearing consistency
 */

import assert from 'assert';
import { decodeGooglePolyline } from './modules/routes/providers/googleRoutingProvider.js';
import { CANONICAL_ROAD_CORRIDORS } from './modules/routes/canonicalRoadCorridors.js';

console.log('================================================================');
console.log('SWIFTCARE GEOAGENT: COORDINATE CONVERSION & ROUTE INTEGRITY TESTS');
console.log('================================================================\n');

// 1. Coordinate Order & Conversion Tests
console.log('[TEST 1/5] Coordinate Conversion & Inversion Safety...');

function toLatLng(geojsonCoord) {
  // geojsonCoord is [longitude, latitude]
  // Leaflet expects [latitude, longitude]
  return [geojsonCoord[1], geojsonCoord[0]];
}

function toLngLat(leafletCoord) {
  // leafletCoord is [latitude, longitude]
  // GeoJSON expects [longitude, latitude]
  return [leafletCoord[1], leafletCoord[0]];
}

function googleLatLngToGeoJson(googleObj) {
  return [googleObj.longitude, googleObj.latitude];
}

// Known Bengaluru Anchor Locations
const KORAMANGALA_GEOJSON = [77.6271, 12.9352]; // [lng, lat]
const MANIPAL_HOSPITAL_GEOJSON = [77.6483, 12.9582]; // [lng, lat]

// Leaflet conversions
const koraLeaflet = toLatLng(KORAMANGALA_GEOJSON);
assert.strictEqual(koraLeaflet[0], 12.9352, 'Leaflet lat must be 12.9352');
assert.strictEqual(koraLeaflet[1], 77.6271, 'Leaflet lng must be 77.6271');

const koraRoundTrip = toLngLat(koraLeaflet);
assert.deepStrictEqual(koraRoundTrip, KORAMANGALA_GEOJSON, 'Round trip conversion must preserve GeoJSON coordinates');

// Google LatLng Object
const googlePoint = { latitude: 12.9582, longitude: 77.6483 };
const geoJsonFromGoogle = googleLatLngToGeoJson(googlePoint);
assert.deepStrictEqual(geoJsonFromGoogle, MANIPAL_HOSPITAL_GEOJSON, 'Google LatLng must correctly map to GeoJSON [lng, lat]');

// Inversion Safety Guard
function assertValidBengaluruCoordinate(coord, format = 'GEOJSON') {
  let lat, lng;
  if (format === 'GEOJSON') {
    [lng, lat] = coord;
  } else {
    [lat, lng] = coord;
  }
  // Bengaluru latitude is ~12.7 to 13.2, longitude is ~77.3 to 77.9
  assert(lat >= 12.5 && lat <= 13.5, `Latitude ${lat} is out of Bengaluru bounds (coordinate inverted!)`);
  assert(lng >= 77.0 && lng <= 78.0, `Longitude ${lng} is out of Bengaluru bounds (coordinate inverted!)`);
}

assertValidBengaluruCoordinate(KORAMANGALA_GEOJSON, 'GEOJSON');
assertValidBengaluruCoordinate(koraLeaflet, 'LEAFLET');
console.log('  ✓ Inversion safety tests PASSED.');

// 2. Google Polyline Decoding Test
console.log('\n[TEST 2/5] Google Polyline Decoding Accuracy...');
// Official Google Polyline test vector: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
const testPolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
const decoded = decodeGooglePolyline(testPolyline);
assert(decoded.length === 3, `Expected 3 coordinates, got ${decoded.length}`);
// Decoded coordinates are [lng, lat] in GeoJSON format
assert.strictEqual(decoded[0][0], -120.2, `First coordinate longitude mismatch: ${decoded[0][0]}`);
assert.strictEqual(decoded[0][1], 38.5, `First coordinate latitude mismatch: ${decoded[0][1]}`);
assert.strictEqual(decoded[1][0], -120.95, `Second coordinate longitude mismatch: ${decoded[1][0]}`);
assert.strictEqual(decoded[1][1], 40.7, `Second coordinate latitude mismatch: ${decoded[1][1]}`);
assert.strictEqual(decoded[2][0], -126.453, `Third coordinate longitude mismatch: ${decoded[2][0]}`);
assert.strictEqual(decoded[2][1], 43.252, `Third coordinate latitude mismatch: ${decoded[2][1]}`);
console.log('  ✓ Google official polyline test vector decoded with 100% precision.');

// 3. Canonical Road Corridors Verification
console.log('\n[TEST 3/5] Canonical Road Corridors Coordinate Density...');
for (const [name, corridor] of Object.entries(CANONICAL_ROAD_CORRIDORS)) {
  const primaryCoords = corridor.primary.coordinates;
  assert(primaryCoords.length >= 80, `${name} primary must have at least 80 coordinates (got ${primaryCoords.length})`);

  // Verify all coordinates in primary corridor follow Bengaluru bounds
  for (const c of primaryCoords) {
    assertValidBengaluruCoordinate(c, 'GEOJSON');
  }

  // Verify alternative corridor if present
  if (corridor.alternative) {
    const altCoords = corridor.alternative.coordinates;
    assert(altCoords.length >= 80, `${name} alternative must have at least 80 coordinates (got ${altCoords.length})`);
    for (const c of altCoords) {
      assertValidBengaluruCoordinate(c, 'GEOJSON');
    }
  }

  // Verify steps match route
  assert(corridor.primary.steps.length >= 2, `${name} must have at least 2 steps`);
  console.log(`  ✓ ${name}: Primary=${primaryCoords.length} pts, Alt=${corridor.alternative ? corridor.alternative.coordinates.length : 'N/A'} pts, Steps=${corridor.primary.steps.length}`);
}

// 4. Distance & Bearing Integrity
console.log('\n[TEST 4/5] Distance & Bearing Calculation Verification...');
function haversineDistance(p1, p2) {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const straightDist = haversineDistance(KORAMANGALA_GEOJSON, MANIPAL_HOSPITAL_GEOJSON);
assert(straightDist > 3000 && straightDist < 4000, `Expected straight line distance ~3.5km, got ${straightDist}`);

// Road network distance along corridor
const corridorCoords = CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.primary.coordinates;
let cumulativeRoadDist = 0;
for (let i = 0; i < corridorCoords.length - 1; i++) {
  cumulativeRoadDist += haversineDistance(corridorCoords[i], corridorCoords[i + 1]);
}
assert(cumulativeRoadDist > 5000 && cumulativeRoadDist < 9000, `Expected road distance 5-9km, got ${cumulativeRoadDist}`);
console.log(`  ✓ Haversine distance calculations verified. Road distance (${cumulativeRoadDist}m) > Straight distance (${straightDist}m).`);

// 5. No 2-Point Straight Line Routes Guard
console.log('\n[TEST 5/5] Anti-Straight-Line Routing Guard...');
function validateOperationalRoute(route) {
  if (!route || !route.coordinates || route.coordinates.length < 10) {
    throw new Error('ROUTE UNAVAILABLE: Insufficient route geometry resolution (refusing straight-line fallback)');
  }
  return true;
}

assert.throws(() => {
  validateOperationalRoute({ coordinates: [KORAMANGALA_GEOJSON, MANIPAL_HOSPITAL_GEOJSON] });
}, /ROUTE UNAVAILABLE/, 'Must reject 2-point straight line fallback');

assert(validateOperationalRoute({ coordinates: corridorCoords }) === true, 'Dense road geometry must pass validation');
console.log('  ✓ Operational route validation rejects fake straight-line routes cleanly.');

console.log('\n================================================================');
console.log('ALL 5/5 COORDINATE & ROUTE INTEGRITY TESTS PASSED PERFECTLY!');
console.log('================================================================\n');
