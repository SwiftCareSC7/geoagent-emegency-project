/**
 * SwiftCare GeoAgent — Standalone Navigation Engine & Geometry Verification Script
 */

import assert from 'assert'

// Replicate geometry functions for standalone Node testing
const EARTH_RADIUS_METERS = 6371000

function toLatLng(coord) {
  return [coord[1], coord[0]]
}

function toLngLat(coord) {
  return [coord[1], coord[0]]
}

function haversineDistance(p1, p2) {
  const [lng1, lat1] = p1
  const [lng2, lat2] = p2

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const rLat1 = (lat1 * Math.PI) / 180
  const rLat2 = (lat2 * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(EARTH_RADIUS_METERS * c)
}

function calculateBearing(p1, p2) {
  const [lng1, lat1] = p1
  const [lng2, lat2] = p2

  const rLat1 = (lat1 * Math.PI) / 180
  const rLat2 = (lat2 * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const y = Math.sin(dLng) * Math.cos(rLat2)
  const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

function projectPointOnSegment(p, a, b) {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b

  const dx = bx - ax
  const dy = by - ay

  if (dx === 0 && dy === 0) return [ax, ay]

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))

  return [ax + t * dx, ay + t * dy]
}

function snapPointToPolyline(point, polyline) {
  if (!polyline || polyline.length === 0) {
    return { snappedCoordinates: point, distanceToRouteMeters: 0, nearestSegmentIndex: 0, bearing: 0 }
  }

  let minDistance = Infinity
  let bestSnapped = polyline[0]
  let bestSegmentIndex = 0
  let bestBearing = 0

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]
    const b = polyline[i + 1]
    const projected = projectPointOnSegment(point, a, b)
    const dist = haversineDistance(point, projected)

    if (dist < minDistance) {
      minDistance = dist
      bestSnapped = projected
      bestSegmentIndex = i
      bestBearing = calculateBearing(a, b)
    }
  }

  return {
    snappedCoordinates: bestSnapped,
    distanceToRouteMeters: minDistance,
    nearestSegmentIndex: bestSegmentIndex,
    bearing: bestBearing
  }
}

function normalizeManeuver(raw) {
  if (!raw) return 'CONTINUE'
  const upper = raw.toUpperCase().replace(/[\s-]+/g, '_')
  if (upper.includes('SHARP_LEFT')) return 'SHARP_LEFT'
  if (upper.includes('SHARP_RIGHT')) return 'SHARP_RIGHT'
  if (upper.includes('SLIGHT_LEFT')) return 'SLIGHT_LEFT'
  if (upper.includes('SLIGHT_RIGHT')) return 'SLIGHT_RIGHT'
  if (upper.includes('KEEP_LEFT')) return 'KEEP_LEFT'
  if (upper.includes('KEEP_RIGHT')) return 'KEEP_RIGHT'
  if (upper.includes('FORK_LEFT')) return 'FORK_LEFT'
  if (upper.includes('FORK_RIGHT')) return 'FORK_RIGHT'
  if (upper.includes('ROUNDABOUT')) return 'ROUNDABOUT'
  if (upper.includes('UTURN') || upper.includes('U_TURN')) return 'U_TURN'
  if (upper.includes('MERGE')) return 'MERGE'
  if (upper.includes('LEFT')) return 'TURN_LEFT'
  if (upper.includes('RIGHT')) return 'TURN_RIGHT'
  if (upper.includes('DEPART')) return 'DEPART'
  if (upper.includes('ARRIVE')) return 'ARRIVE'
  return 'CONTINUE'
}

function normalizeTrafficCondition(trafficDelaySeconds = 0, durationSeconds = 0) {
  if (!durationSeconds || durationSeconds <= 0) return 'UNKNOWN'
  if (trafficDelaySeconds <= 30) return 'LIGHT'
  const ratio = trafficDelaySeconds / durationSeconds
  if (trafficDelaySeconds < 120 || ratio < 0.15) return 'LIGHT'
  if (trafficDelaySeconds < 300 || ratio < 0.3) return 'MODERATE'
  if (trafficDelaySeconds < 600 || ratio < 0.5) return 'HEAVY'
  return 'SEVERE'
}

console.log('====================================================')
console.log('   NAVIGATION ENGINE & GEOMETRY VERIFICATION')
console.log('====================================================')

// Test 1: Coordinates
console.log('\n[Test 1] Testing coordinate conversions...')
const coord = [77.6271, 12.9352]
const latLng = toLatLng(coord)
assert.deepStrictEqual(latLng, [12.9352, 77.6271])
assert.deepStrictEqual(toLngLat(latLng), coord)
console.log('✅ Coordinate conversions passed!')

// Test 2: Distance
console.log('\n[Test 2] Testing Haversine distance...')
const dist = haversineDistance([77.6320, 12.9410], [77.6385, 12.9490])
assert(dist > 1000 && dist < 1300, `Expected ~1100m, got ${dist}m`)
console.log(`✅ Haversine distance passed (${dist} meters)!`)

// Test 3: Bearing
console.log('\n[Test 3] Testing bearing calculation...')
const bNorth = calculateBearing([77.6, 12.9], [77.6, 12.91])
assert(Math.abs(bNorth) < 1 || Math.abs(bNorth - 360) < 1)
const bEast = calculateBearing([77.6, 12.9], [77.61, 12.9])
assert(Math.abs(bEast - 90) < 1)
console.log('✅ Compass bearing calculations passed!')

// Test 4: Road Snapping
console.log('\n[Test 4] Testing road polyline snapping...')
const road = [
  [77.6000, 12.9000],
  [77.6100, 12.9000],
  [77.6200, 12.9000]
]
const offRoadVehicle = [77.6050, 12.9004] // ~44m north of road
const snapped = snapPointToPolyline(offRoadVehicle, road)
assert(Math.abs(snapped.snappedCoordinates[1] - 12.9000) < 0.0001)
assert(snapped.distanceToRouteMeters > 30 && snapped.distanceToRouteMeters < 60)
console.log(`✅ Road snapping passed (snapped to y=${snapped.snappedCoordinates[1].toFixed(4)}, cross-track: ${snapped.distanceToRouteMeters}m)!`)

// Test 5: Maneuvers
console.log('\n[Test 5] Testing maneuver normalization...')
assert.strictEqual(normalizeManeuver('turn-left'), 'TURN_LEFT')
assert.strictEqual(normalizeManeuver('sharp_right'), 'SHARP_RIGHT')
assert.strictEqual(normalizeManeuver('uturn'), 'U_TURN')
assert.strictEqual(normalizeManeuver('roundabout'), 'ROUNDABOUT')
assert.strictEqual(normalizeManeuver('arrive'), 'ARRIVE')
assert.strictEqual(normalizeManeuver('depart'), 'DEPART')
console.log('✅ Maneuver normalization passed!')

// Test 6: Traffic
console.log('\n[Test 6] Testing traffic condition classification...')
assert.strictEqual(normalizeTrafficCondition(10, 600), 'LIGHT')
assert.strictEqual(normalizeTrafficCondition(150, 600), 'MODERATE')
assert.strictEqual(normalizeTrafficCondition(350, 700), 'HEAVY')
assert.strictEqual(normalizeTrafficCondition(700, 900), 'SEVERE')
console.log('✅ Traffic condition classification passed!')

console.log('\n====================================================')
console.log('   ALL NAVIGATION TESTS PASSED SUCCESSFULLY!       ')
console.log('====================================================')
