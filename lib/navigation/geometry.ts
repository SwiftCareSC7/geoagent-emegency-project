/**
 * SwiftCare GeoAgent — Navigation Geospatial Utilities
 *
 * Provides high-precision geospatial calculations for road snapping,
 * bearing, distance estimation, projection onto polyline, and coordinate conversions.
 *
 * Coordinate Convention:
 * - GeoJSON / MongoDB / Backend: [longitude, latitude]
 * - Leaflet: [latitude, longitude]
 */

import type { SnappedLocation } from './types'

const EARTH_RADIUS_METERS = 6371000

/**
 * Converts GeoJSON [lng, lat] to Leaflet [lat, lng]
 */
export function toLatLng(coord: [number, number]): [number, number] {
  return [coord[1], coord[0]]
}

/**
 * Converts Leaflet [lat, lng] to GeoJSON [lng, lat]
 */
export function toLngLat(coord: [number, number]): [number, number] {
  return [coord[1], coord[0]]
}

/**
 * Calculates Haversine distance in meters between two [lng, lat] coordinates
 */
export function haversineDistance(p1: [number, number], p2: [number, number]): number {
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

/**
 * Calculates compass bearing from p1 to p2 in degrees [0, 360)
 */
export function calculateBearing(p1: [number, number], p2: [number, number]): number {
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

/**
 * Projects point P onto line segment AB, returning the closest point on segment in [lng, lat]
 */
function projectPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): [number, number] {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b

  const dx = bx - ax
  const dy = by - ay

  if (dx === 0 && dy === 0) {
    return [ax, ay]
  }

  // Parameter t of closest point on segment AB
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))

  return [ax + t * dx, ay + t * dy]
}

/**
 * Snaps a vehicle location [lng, lat] to the nearest road polyline segment.
 * Returns the road-snapped point, distance to road, segment index, and heading bearing.
 */
export function snapPointToPolyline(
  point: [number, number],
  polyline: [number, number][]
): SnappedLocation {
  if (!polyline || polyline.length === 0) {
    return {
      snappedCoordinates: point,
      rawCoordinates: point,
      distanceToRouteMeters: 0,
      nearestSegmentIndex: 0,
      bearing: 0
    }
  }

  if (polyline.length === 1) {
    const dist = haversineDistance(point, polyline[0])
    return {
      snappedCoordinates: polyline[0],
      rawCoordinates: point,
      distanceToRouteMeters: dist,
      nearestSegmentIndex: 0,
      bearing: 0
    }
  }

  let minDistance = Infinity
  let bestSnapped: [number, number] = polyline[0]
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
    rawCoordinates: point,
    distanceToRouteMeters: minDistance,
    nearestSegmentIndex: bestSegmentIndex,
    bearing: bestBearing
  }
}

/**
 * Computes total length of a polyline in meters
 */
export function computePolylineLength(polyline: [number, number][]): number {
  if (!polyline || polyline.length < 2) return 0
  let total = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineDistance(polyline[i], polyline[i + 1])
  }
  return total
}

/**
 * Computes distance along polyline from start to a point on segment `segmentIndex`
 */
export function computeDistanceAlongPolyline(
  polyline: [number, number][],
  segmentIndex: number,
  pointOnSegment: [number, number]
): number {
  if (!polyline || polyline.length < 2) return 0
  let dist = 0
  const safeIndex = Math.min(segmentIndex, polyline.length - 2)

  for (let i = 0; i < safeIndex; i++) {
    dist += haversineDistance(polyline[i], polyline[i + 1])
  }

  if (polyline[safeIndex]) {
    dist += haversineDistance(polyline[safeIndex], pointOnSegment)
  }

  return dist
}

/**
 * Formats distance in meters into human-readable navigation strings:
 * e.g. 50 m, 350 m, 1.2 km
 */
export function formatDistance(meters?: number | null): string {
  if (meters === undefined || meters === null || isNaN(meters)) return '0 m'
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Formats duration in seconds into navigation strings:
 * e.g. 10 min, 1 hr 12 min
 */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '1 min'
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hours} hr ${remMins} min` : `${hours} hr`
}

/**
 * Formats estimated arrival time given remaining seconds:
 * e.g. "12:42 AM"
 */
export function formatArrivalTime(durationSeconds?: number | null): string {
  const now = new Date()
  const arrival = new Date(now.getTime() + (durationSeconds || 0) * 1000)
  return arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
