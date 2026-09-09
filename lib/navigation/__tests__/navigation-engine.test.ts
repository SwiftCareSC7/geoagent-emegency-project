/**
 * SwiftCare GeoAgent — Navigation Engine & Geospatial Unit Tests
 */

import {
  toLatLng,
  toLngLat,
  haversineDistance,
  calculateBearing,
  snapPointToPolyline,
  computePolylineLength,
  computeDistanceAlongPolyline,
  formatDistance,
  formatDuration,
  formatArrivalTime
} from '../geometry'
import {
  normalizeManeuver,
  normalizeTrafficCondition,
  extractStreetName,
  normalizeRouteResponse
} from '../adapter'

describe('Geospatial Geometry & Coordinate Safety', () => {
  test('Coordinate inversion safety: toLatLng and toLngLat', () => {
    const lngLat: [number, number] = [77.6271, 12.9352]
    const latLng = toLatLng(lngLat)
    expect(latLng).toEqual([12.9352, 77.6271])

    const restored = toLngLat(latLng)
    expect(restored).toEqual(lngLat)
  })

  test('Haversine distance calculates accurate metric distance', () => {
    // Koramangala Sony World [77.6320, 12.9410] to Intermediate Ring Road [77.6385, 12.9490]
    const p1: [number, number] = [77.6320, 12.9410]
    const p2: [number, number] = [77.6385, 12.9490]
    const dist = haversineDistance(p1, p2)
    // Approximately 1100-1200 meters
    expect(dist).toBeGreaterThan(1000)
    expect(dist).toBeLessThan(1400)
  })

  test('Bearing calculation returns valid degree heading [0, 360)', () => {
    const origin: [number, number] = [77.6000, 12.9000]
    const dueNorth: [number, number] = [77.6000, 12.9100]
    const dueEast: [number, number] = [77.6100, 12.9000]

    const bearingNorth = calculateBearing(origin, dueNorth)
    expect(Math.round(bearingNorth)).toBe(0)

    const bearingEast = calculateBearing(origin, dueEast)
    expect(Math.round(bearingEast)).toBe(90)
  })

  test('snapPointToPolyline finds nearest projection and computes cross-track error', () => {
    const polyline: [number, number][] = [
      [77.6000, 12.9000],
      [77.6100, 12.9000], // Straight east-west road
      [77.6200, 12.9000]
    ]

    // Vehicle is slightly north of the road
    const vehiclePoint: [number, number] = [77.6050, 12.9005]
    const snapped = snapPointToPolyline(vehiclePoint, polyline)

    expect(snapped.snappedCoordinates[1]).toBeCloseTo(12.9000, 4)
    expect(snapped.distanceToRouteMeters).toBeGreaterThan(0)
    expect(snapped.distanceToRouteMeters).toBeLessThan(100)
    expect(snapped.nearestSegmentIndex).toBe(0)
  })

  test('computePolylineLength and computeDistanceAlongPolyline calculate accurate progress', () => {
    const polyline: [number, number][] = [
      [77.6000, 12.9000],
      [77.6100, 12.9000],
      [77.6200, 12.9000]
    ]

    const totalLen = computePolylineLength(polyline)
    expect(totalLen).toBeGreaterThan(2000)

    // Midpoint along first segment
    const midPoint: [number, number] = [77.6050, 12.9000]
    const progress = computeDistanceAlongPolyline(polyline, 0, midPoint)
    expect(progress).toBeCloseTo(totalLen / 4, -2)
  })

  test('formatDistance produces clean human-readable navigation tokens', () => {
    expect(formatDistance(45)).toBe('45 m')
    expect(formatDistance(350)).toBe('350 m')
    expect(formatDistance(1250)).toBe('1.3 km')
    expect(formatDistance(4800)).toBe('4.8 km')
  })

  test('formatDuration produces clean hours and minutes', () => {
    expect(formatDuration(45)).toBe('1 min')
    expect(formatDuration(660)).toBe('11 min')
    expect(formatDuration(3660)).toBe('1 hr 1 min')
  })
})

describe('Maneuver & Route Adapter Normalization', () => {
  test('Normalizes various provider maneuver strings to canonical ManeuverType', () => {
    expect(normalizeManeuver('turn-left')).toBe('TURN_LEFT')
    expect(normalizeManeuver('sharp_right')).toBe('SHARP_RIGHT')
    expect(normalizeManeuver('slight_left')).toBe('SLIGHT_LEFT')
    expect(normalizeManeuver('uturn')).toBe('U_TURN')
    expect(normalizeManeuver('roundabout-exit')).toBe('ROUNDABOUT')
    expect(normalizeManeuver('on ramp')).toBe('RAMP')
    expect(normalizeManeuver('fork left')).toBe('FORK_LEFT')
    expect(normalizeManeuver('depart')).toBe('DEPART')
    expect(normalizeManeuver('arrive')).toBe('ARRIVE')
    expect(normalizeManeuver('')).toBe('CONTINUE')
  })

  test('Classifies traffic conditions into LIGHT, MODERATE, HEAVY, SEVERE', () => {
    expect(normalizeTrafficCondition(10, 600)).toBe('LIGHT')
    expect(normalizeTrafficCondition(150, 600)).toBe('MODERATE')
    expect(normalizeTrafficCondition(350, 700)).toBe('HEAVY')
    expect(normalizeTrafficCondition(650, 800)).toBe('SEVERE')
  })

  test('Extracts street name from turn instructions', () => {
    expect(extractStreetName('Turn left onto 80 Feet Road')).toBe('80 Feet Road')
    expect(extractStreetName('Follow HAL Old Airport Road')).toBe('HAL Old Airport Road')
    expect(extractStreetName('Take ramp toward Intermediate Ring Road')).toBe('Intermediate Ring Road')
  })

  test('normalizeRouteResponse builds valid NormalizedRoute without fabrication', () => {
    const raw = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6271, 12.9352],
          [77.6320, 12.9410],
          [77.6385, 12.9490]
        ]
      },
      distanceMeters: 2500,
      durationSeconds: 360,
      staticDurationSeconds: 300,
      provider: 'GOOGLE',
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head north on 16th Main Road',
          distanceMeters: 750,
          durationSeconds: 110,
          startLocation: [77.6271, 12.9352],
          endLocation: [77.6320, 12.9410]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Intermediate Ring Road',
          distanceMeters: 1750,
          durationSeconds: 250,
          startLocation: [77.6320, 12.9410],
          endLocation: [77.6385, 12.9490]
        }
      ]
    }

    const normalized = normalizeRouteResponse(raw)
    expect(normalized).not.toBeNull()
    expect(normalized?.provider).toBe('GOOGLE')
    expect(normalized?.steps.length).toBe(2)
    expect(normalized?.steps[0].maneuver).toBe('DEPART')
    expect(normalized?.steps[0].streetName).toBe('16th Main Road')
    expect(normalized?.steps[1].maneuver).toBe('TURN_RIGHT')
    expect(normalized?.trafficCondition).toBe('LIGHT')
  })
})
