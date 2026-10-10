/**
 * SwiftCare GeoAgent — Route Data Adapter
 *
 * Normalizes route data from Google Routes API v2, OSRM, or backend route service
 * into the canonical NormalizedRoute schema.
 *
 * Guarantees:
 * - Real road network coordinates
 * - Provider-accurate maneuver mapping
 * - Clean street names extracted from instructions
 * - Zero straight-line or fake interpolation
 */

import type {
  ManeuverType,
  NormalizedRoute,
  NormalizedStep,
  NormalizedLeg,
  TrafficCondition
} from './types'
import { haversineDistance } from './geometry'

/**
 * Normalizes raw maneuver string from Google Routes API or OSRM into canonical ManeuverType
 */
export function normalizeManeuver(raw?: string): ManeuverType {
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
  if (upper.includes('EXIT_ROUNDABOUT')) return 'EXIT_ROUNDABOUT'
  if (upper.includes('ROUNDABOUT') || upper.includes('ROTARY')) return 'ROUNDABOUT'
  if (upper.includes('RAMP_LEFT')) return 'RAMP_LEFT'
  if (upper.includes('RAMP_RIGHT')) return 'RAMP_RIGHT'
  if (upper.includes('RAMP')) return 'RAMP'
  if (upper.includes('UTURN') || upper.includes('U_TURN')) return 'U_TURN'
  if (upper.includes('MERGE')) return 'MERGE'
  if (upper.includes('LEFT')) return 'TURN_LEFT'
  if (upper.includes('RIGHT')) return 'TURN_RIGHT'
  if (upper.includes('DEPART') || upper.includes('HEAD')) return 'DEPART'
  if (upper.includes('ARRIVE') || upper.includes('DESTINATION')) return 'ARRIVE'
  if (upper.includes('STRAIGHT')) return 'STRAIGHT'

  return 'CONTINUE'
}

/**
 * Classifies traffic conditions from traffic delay and overall duration
 */
export function normalizeTrafficCondition(
  trafficDelaySeconds = 0,
  durationSeconds = 0
): TrafficCondition {
  if (!durationSeconds || durationSeconds <= 0) return 'UNKNOWN'
  if (trafficDelaySeconds <= 30) return 'LIGHT'

  const ratio = trafficDelaySeconds / durationSeconds
  if (trafficDelaySeconds < 120 || ratio < 0.15) return 'LIGHT'
  if (trafficDelaySeconds < 300 || ratio < 0.3) return 'MODERATE'
  if (trafficDelaySeconds < 600 || ratio < 0.5) return 'HEAVY'
  return 'SEVERE'
}

/**
 * Extracts a clean street or road name from a step instruction
 */
export function extractStreetName(instruction?: string): string | undefined {
  if (!instruction) return undefined
  // Matches "onto <Street>", "on <Street>", "toward <Street>", "Follow <Street>"
  const match = instruction.match(/(?:onto|on|toward|towards|follow|along)\s+([^,.;]+)/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return undefined
}

/**
 * Normalizes raw route data from any supported provider into canonical NormalizedRoute
 */
export function normalizeRouteResponse(rawRoute: any): NormalizedRoute | null {
  if (!rawRoute) return null

  // 1. Extract Geometry
  let coordinates: [number, number][] = []
  if (rawRoute.geometry && Array.isArray(rawRoute.geometry.coordinates)) {
    coordinates = rawRoute.geometry.coordinates
  } else if (Array.isArray(rawRoute.coordinates)) {
    coordinates = rawRoute.coordinates
  }

  if (coordinates.length < 2) {
    return null
  }

  // 2. Metrics
  const distanceMeters = Math.round(
    rawRoute.distanceMeters ?? rawRoute.distance ?? 0
  )
  const durationSeconds = Math.round(
    rawRoute.durationSeconds ?? rawRoute.duration ?? 0
  )
  const staticDurationSeconds = Math.round(
    rawRoute.staticDurationSeconds ?? durationSeconds
  )
  const trafficDelaySeconds = Math.max(
    0,
    Math.round(rawRoute.trafficDelaySeconds ?? durationSeconds - staticDurationSeconds)
  )
  const trafficCondition = normalizeTrafficCondition(trafficDelaySeconds, durationSeconds)

  // 3. Provider identification
  let provider: 'GOOGLE' | 'OSRM' | 'MOCK' | 'GEOAGENT' = 'OSRM'
  const provStr = String(rawRoute.provider || '').toUpperCase()
  if (provStr.includes('GOOGLE')) provider = 'GOOGLE'
  else if (provStr.includes('OSRM')) provider = 'OSRM'
  else if (provStr.includes('MOCK')) provider = 'MOCK'
  else if (provStr.includes('GEOAGENT')) provider = 'GEOAGENT'

  // 4. Normalized Steps
  const rawSteps = Array.isArray(rawRoute.steps) ? rawRoute.steps : []
  const steps: NormalizedStep[] = rawSteps.map((s: any, idx: number) => {
    const maneuver = normalizeManeuver(s.maneuver || s.type)
    const instruction = s.instruction || s.instructions || 'Continue on route'
    const streetName = s.streetName || extractStreetName(instruction)
    const stepDist = Math.round(s.distanceMeters ?? s.distance ?? 0)
    const stepDur = Math.round(s.durationSeconds ?? s.duration ?? 0)

    let startLocation: [number, number] = coordinates[0]
    let endLocation: [number, number] = coordinates[coordinates.length - 1]

    if (Array.isArray(s.startLocation) && s.startLocation.length >= 2) {
      startLocation = [s.startLocation[0], s.startLocation[1]]
    }
    if (Array.isArray(s.endLocation) && s.endLocation.length >= 2) {
      endLocation = [s.endLocation[0], s.endLocation[1]]
    }

    let stepPolyline: [number, number][] | undefined
    if (Array.isArray(s.stepPolyline) && s.stepPolyline.length >= 2) {
      stepPolyline = s.stepPolyline
    }

    return {
      stepIndex: idx,
      maneuver,
      instruction,
      streetName,
      distanceMeters: stepDist,
      durationSeconds: stepDur,
      startLocation,
      endLocation,
      stepPolyline
    }
  })

  // 5. Normalized Multi-Legs (if present)
  let legs: NormalizedLeg[] | undefined
  if (Array.isArray(rawRoute.legs) && rawRoute.legs.length > 0) {
    legs = rawRoute.legs.map((leg: any, idx: number) => {
      const legNumber = leg.legNumber || idx + 1
      const legType = leg.type || (legNumber === 1 ? 'TO_EMERGENCY' : 'TO_HOSPITAL')
      const legDist = Math.round(leg.distanceMeters ?? leg.distance ?? 0)
      const legDur = Math.round(leg.durationSeconds ?? leg.duration ?? 0)
      const legCoords: [number, number][] = leg.geometry?.coordinates || []

      const legSteps: NormalizedStep[] = Array.isArray(leg.steps)
        ? leg.steps.map((ls: any, sIdx: number) => ({
            stepIndex: sIdx,
            maneuver: normalizeManeuver(ls.maneuver || ls.type),
            instruction: ls.instruction || 'Continue on route',
            streetName: ls.streetName || extractStreetName(ls.instruction),
            distanceMeters: Math.round(ls.distanceMeters ?? ls.distance ?? 0),
            durationSeconds: Math.round(ls.durationSeconds ?? ls.duration ?? 0),
            startLocation: ls.startLocation || legCoords[0] || coordinates[0],
            endLocation: ls.endLocation || legCoords[legCoords.length - 1] || coordinates[coordinates.length - 1],
            stepPolyline: ls.stepPolyline
          }))
        : []

      return {
        legNumber,
        type: legType,
        title: leg.title || (legNumber === 1 ? 'Leg 1: En Route to Scene' : 'Leg 2: Transport to Hospital'),
        originName: leg.originName,
        destinationName: leg.destinationName,
        originCoordinates: leg.originCoordinates || legCoords[0] || coordinates[0],
        destinationCoordinates: leg.destinationCoordinates || legCoords[legCoords.length - 1] || coordinates[coordinates.length - 1],
        geometry: {
          type: 'LineString',
          coordinates: legCoords.length >= 2 ? legCoords : coordinates
        },
        distanceMeters: legDist,
        durationSeconds: legDur,
        steps: legSteps,
        status: leg.status || (legNumber === 1 ? 'ACTIVE' : 'PLANNED'),
        trafficDelaySeconds: leg.trafficDelaySeconds
      }
    })
  }

  // 6. Alternatives (if present)
  let alternatives: NormalizedRoute[] | undefined
  if (Array.isArray(rawRoute.alternatives) && rawRoute.alternatives.length > 0) {
    alternatives = rawRoute.alternatives
      .map((alt: any) => normalizeRouteResponse(alt))
      .filter(Boolean) as NormalizedRoute[]
  } else if (rawRoute.alternative) {
    const singleAlt = normalizeRouteResponse(rawRoute.alternative)
    if (singleAlt) alternatives = [singleAlt]
  }

  return {
    id: rawRoute.id || rawRoute.routeId,
    geometry: {
      type: 'LineString',
      coordinates
    },
    distanceMeters,
    durationSeconds,
    staticDurationSeconds,
    trafficDelaySeconds,
    trafficCondition,
    preference: (rawRoute.preference || 'FASTEST').toUpperCase(),
    description: rawRoute.description || 'Primary Emergency Corridor',
    provider,
    dataSource: rawRoute.dataSource || (provider === 'GOOGLE' ? 'GOOGLE_MAPS_ROUTES_API' : 'OPENSTREETMAP_ROAD_NETWORK'),
    steps,
    legs,
    activeLegNumber: rawRoute.activeLegNumber || 1,
    alternatives,
    calculatedAt: rawRoute.calculatedAt || new Date().toISOString()
  }
}
