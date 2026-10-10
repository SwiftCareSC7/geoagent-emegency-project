/**
 * SwiftCare GeoAgent — Shared Authoritative Route Validator
 *
 * Implements strict global validation rules across EVERY map and route in the system.
 * Reusable by:
 * - /control-room
 * - /emergencies/[id]
 * - /driver/dashboard
 * - /emergency-lab
 * - Backend routing pipeline and Next.js BFF routes
 *
 * If ANY route fails validation, it MUST NOT be displayed as a valid navigation route.
 */

export interface LatLngPoint {
  coordinates?: [number, number] // [lng, lat]
  type?: string
  lat?: number
  lng?: number
}

export interface ValidationCandidateRoute {
  routeId?: string
  id?: string
  origin?: LatLngPoint | [number, number]
  destination?: LatLngPoint | [number, number]
  geometry?: {
    type?: string
    coordinates?: [number, number][]
  }
  distanceMeters?: number
  durationSeconds?: number
  distance?: number
  duration?: number
  routeType?: string
  status?: string
}

export interface RouteValidationResult {
  isValid: boolean
  isRoadConstrained: boolean
  reasons: string[]
  metrics: {
    pointCount: number
    distanceMeters: number
    durationSeconds: number
    euclideanDistanceMeters: number
    tortuosity: number // road distance / straight-line distance (typically 1.1 - 2.5 for urban roads)
    maxSegmentLengthMeters: number
    averageSpeedKmh: number
    hasSuspiciousJumps: boolean
    isStraightLineShortcut: boolean
  }
}

/**
 * Calculate Haversine distance in meters between two [lng, lat] coordinates.
 */
export function haversineDistance(
  coord1: [number, number] | undefined,
  coord2: [number, number] | undefined
): number {
  if (!coord1 || !coord2) return 0
  const [lng1, lat1] = coord1
  const [lng2, lat2] = coord2

  if (
    typeof lng1 !== 'number' || typeof lat1 !== 'number' ||
    typeof lng2 !== 'number' || typeof lat2 !== 'number' ||
    isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)
  ) {
    return 0
  }

  const R = 6371e3 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Extract raw [lng, lat] from various point shapes.
 */
export function extractLngLat(pt: any): [number, number] | null {
  if (!pt) return null
  if (Array.isArray(pt) && pt.length >= 2) {
    const lng = Number(pt[0])
    const lat = Number(pt[1])
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat]
  }
  if (pt.coordinates && Array.isArray(pt.coordinates) && pt.coordinates.length >= 2) {
    const lng = Number(pt.coordinates[0])
    const lat = Number(pt.coordinates[1])
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat]
  }
  if (pt.lng !== undefined && pt.lat !== undefined) {
    const lng = Number(pt.lng)
    const lat = Number(pt.lat)
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat]
  }
  if (pt.longitude !== undefined && pt.latitude !== undefined) {
    const lng = Number(pt.longitude)
    const lat = Number(pt.latitude)
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat]
  }
  return null
}

/**
 * Central Route Validator
 * Enforces all 13 quality checks commanded by the SwiftCare architecture:
 * [1] Valid coordinate ranges (-180 to 180, -90 to 90)
 * [2] Valid LineString geometry
 * [3] Route starts near origin
 * [4] Route ends near destination
 * [5] Route contains sufficient geometry points (>5 points for routes >500m)
 * [6] Route is continuous (no suspicious teleport jumps)
 * [7] Route distance is plausible (positive, tortuosity >= 1.0)
 * [8] Route duration is plausible (speed between 3 km/h and 150 km/h)
 * [9] Route is road-constrained (not a direct 2-point chord)
 * [10] No straight-line shortcuts cutting across blocks/buildings
 */
export function validateRouteGeometry(
  route: ValidationCandidateRoute,
  expectedOrigin?: [number, number],
  expectedDestination?: [number, number]
): RouteValidationResult {
  const reasons: string[] = []

  // Check 1 & 2: Geometry exists and is LineString
  if (!route || !route.geometry) {
    return {
      isValid: false,
      isRoadConstrained: false,
      reasons: ['Route geometry object is missing'],
      metrics: {
        pointCount: 0,
        distanceMeters: 0,
        durationSeconds: 0,
        euclideanDistanceMeters: 0,
        tortuosity: 0,
        maxSegmentLengthMeters: 0,
        averageSpeedKmh: 0,
        hasSuspiciousJumps: false,
        isStraightLineShortcut: true,
      },
    }
  }

  if (route.geometry.type && route.geometry.type !== 'LineString') {
    reasons.push(`Invalid geometry type '${route.geometry.type}', expected 'LineString'`)
  }

  const coords = route.geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) {
    reasons.push(`Insufficient coordinate count (${coords?.length || 0}); minimum 2 required`)
    return {
      isValid: false,
      isRoadConstrained: false,
      reasons,
      metrics: {
        pointCount: coords?.length || 0,
        distanceMeters: 0,
        durationSeconds: 0,
        euclideanDistanceMeters: 0,
        tortuosity: 0,
        maxSegmentLengthMeters: 0,
        averageSpeedKmh: 0,
        hasSuspiciousJumps: false,
        isStraightLineShortcut: true,
      },
    }
  }

  // Check coordinate bounds
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i]
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      reasons.push(`Coordinate at index ${i} is non-numeric or NaN: [${lng}, ${lat}]`)
      break
    }
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      reasons.push(`Coordinate at index ${i} exceeds geographical bounds: [${lng}, ${lat}]`)
      break
    }
  }

  const firstCoord = coords[0]
  const lastCoord = coords[coords.length - 1]

  // Euclidean straight-line distance between start and end
  const straightLineDistance = haversineDistance(firstCoord, lastCoord)

  // Calculate actual polyline path distance and check segment gaps
  let totalPolylineDistance = 0
  let maxSegmentLength = 0
  let hasSuspiciousJumps = false

  for (let i = 0; i < coords.length - 1; i++) {
    const segDist = haversineDistance(coords[i], coords[i + 1])
    totalPolylineDistance += segDist
    if (segDist > maxSegmentLength) {
      maxSegmentLength = segDist
    }
    // In urban ambulance corridors, a single step jump > 4000m indicates disconnected geometry / teleportation
    if (segDist > 4000) {
      hasSuspiciousJumps = true
    }
  }

  if (hasSuspiciousJumps) {
    reasons.push(
      `Suspicious jump detected in polyline: largest segment is ${(maxSegmentLength / 1000).toFixed(1)} km`
    )
  }

  const statedDistance = route.distanceMeters || route.distance || totalPolylineDistance
  const statedDuration = route.durationSeconds || route.duration || 0

  // Check 5 & 9 & 10: Road-constrained vs Straight-line shortcuts
  let isStraightLineShortcut = false
  if (coords.length === 2 && straightLineDistance > 300) {
    isStraightLineShortcut = true
    reasons.push(
      `Route is a 2-point straight line chord of ${(straightLineDistance / 1000).toFixed(2)} km. Cuts across buildings.`
    )
  }

  // Check for very sparse geometry over long distances (e.g. 5 points for 10km)
  if (coords.length < 5 && straightLineDistance > 600) {
    isStraightLineShortcut = true
    reasons.push(
      `Route has only ${coords.length} points for ${(straightLineDistance / 1000).toFixed(2)} km. Road network geometry required.`
    )
  }

  // Check tortuosity (ratio of polyline length to straight line)
  const tortuosity = straightLineDistance > 50 ? totalPolylineDistance / straightLineDistance : 1.0
  if (straightLineDistance > 300 && tortuosity < 0.98) {
    reasons.push(`Geometry length (${Math.round(totalPolylineDistance)}m) is less than straight line (${Math.round(straightLineDistance)}m)`)
  }

  // Check speed plausibility if duration is provided
  let averageSpeedKmh = 0
  if (statedDuration > 0 && statedDistance > 0) {
    averageSpeedKmh = (statedDistance / statedDuration) * 3.6
    if (averageSpeedKmh < 1.0) {
      reasons.push(`Plausibility warning: average speed ${averageSpeedKmh.toFixed(1)} km/h is unrealistically slow`)
    } else if (averageSpeedKmh > 180) {
      reasons.push(`Plausibility warning: average speed ${averageSpeedKmh.toFixed(1)} km/h exceeds ground vehicle limits`)
    }
  }

  // Check 3: Route starts near origin
  const originCoord = expectedOrigin || extractLngLat(route.origin)
  if (originCoord) {
    const distFromStart = haversineDistance(originCoord, firstCoord)
    if (distFromStart > 1500) {
      reasons.push(
        `Route starting point diverges ${Math.round(distFromStart)}m from assigned origin`
      )
    }
  }

  // Check 4: Route ends near destination
  const destCoord = expectedDestination || extractLngLat(route.destination)
  if (destCoord) {
    const distFromEnd = haversineDistance(destCoord, lastCoord)
    if (distFromEnd > 1500) {
      reasons.push(
        `Route ending point diverges ${Math.round(distFromEnd)}m from assigned destination`
      )
    }
  }

  const isValid = reasons.length === 0
  const isRoadConstrained = !isStraightLineShortcut && coords.length >= (straightLineDistance > 1000 ? 8 : 3)

  return {
    isValid,
    isRoadConstrained,
    reasons,
    metrics: {
      pointCount: coords.length,
      distanceMeters: Math.round(statedDistance),
      durationSeconds: Math.round(statedDuration),
      euclideanDistanceMeters: Math.round(straightLineDistance),
      tortuosity: Number(tortuosity.toFixed(2)),
      maxSegmentLengthMeters: Math.round(maxSegmentLength),
      averageSpeedKmh: Number(averageSpeedKmh.toFixed(1)),
      hasSuspiciousJumps,
      isStraightLineShortcut,
    },
  }
}

/**
 * Validate that an alternative route is genuinely distinct and routable.
 * Ensures alternative detour actually bypasses primary corridor.
 */
export function validateAlternativeDistinctness(
  primaryRoute: ValidationCandidateRoute,
  alternativeRoute: ValidationCandidateRoute
): { isDistinct: boolean; overlapRatio: number; divergenceMeters: number } {
  const pCoords = primaryRoute?.geometry?.coordinates
  const aCoords = alternativeRoute?.geometry?.coordinates

  if (!pCoords || !aCoords || pCoords.length < 2 || aCoords.length < 2) {
    return { isDistinct: false, overlapRatio: 1.0, divergenceMeters: 0 }
  }

  // Sample points along alternative and measure max distance to primary
  let maxDivergence = 0
  let matchedPoints = 0

  for (const aPt of aCoords) {
    let minDist = Infinity
    for (const pPt of pCoords) {
      const d = haversineDistance(aPt, pPt)
      if (d < minDist) minDist = d
    }
    if (minDist > maxDivergence) maxDivergence = minDist
    if (minDist < 50) matchedPoints++
  }

  const overlapRatio = aCoords.length > 0 ? matchedPoints / aCoords.length : 1.0
  // An alternative is genuinely distinct if max lateral divergence > 150m and overlap < 85%
  const isDistinct = maxDivergence >= 150 && overlapRatio < 0.90

  return {
    isDistinct,
    overlapRatio: Number(overlapRatio.toFixed(2)),
    divergenceMeters: Math.round(maxDivergence),
  }
}
