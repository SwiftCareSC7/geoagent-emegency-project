/**
 * SwiftCare GeoAgent — /diff Hypothetical Emergency Scenario Simulation Engine
 *
 * Simulates a realistic, map-first, road-constrained emergency mission:
 * - Origin: MG Road Metro Station [77.594697, 12.971848]
 * - Destination: Manipal Hospital HAL Emergency Department [77.649028, 12.957836]
 * - Fleet Unit: AMB-01 (Advanced Life Support Ambulance)
 * - Road Networks: 100% Canonical vertices from CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL
 *
 * Deterministic Scenario Timeline:
 *   T+00  (00:00): Emergency Created (Critical Medical Emergency at Manipal Hospital HAL)
 *   T+05  (00:05): AMB-01 Dispatched (Status: DISPATCHED)
 *   T+20  (00:20): Primary Route Activated (Corridor MG Road -> Old Airport Rd -> Manipal Hospital, Blue)
 *   T+60  (01:00): Ambulance En Route (Speed 48 km/h, live GPS telemetry streaming)
 *   T+120 (02:00): Accident Occurs on Active Corridor (Multi-vehicle collision at Old Airport Rd / Domlur)
 *   T+125 (02:05): Incident Detected by System (Shockwave sensor & V2X broadcast)
 *   T+135 (02:15): Primary Route Marked Blocked / At Risk (+14.2 min projected delay)
 *   T+145 (02:25): Alternative Road Routes Calculated from Current Position (Purple Recommended Detour + Gray Alt)
 *   T+155 (02:35): GeoAgent Epistemic Reasoning Generated (Observed, Inferred, Unknown)
 *   T+165 (02:45): Human-in-the-Loop Operator Approval Requested
 *   T+180 (03:00): Operator Approves Reroute -> Recommended Detour becomes Active BLUE Corridor
 *   T+240 (04:00): Ambulance Continues from Current Location via Indiranagar Bypass (54 km/h with V2X green-wave)
 *   T+420 (07:00): Patient Destination Reached at Manipal Hospital Emergency Bay
 *   T+430 (07:10): Mission Completed
 */

import { CANONICAL_ROAD_CORRIDORS } from '../canonical-road-corridors'

// Haversine distance in meters
export function haversineDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180
  const dLon = ((p2[0] - p1[0]) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Bearing in degrees (0-360) between two coordinates [lng, lat]
export function calculateBearing(from: [number, number], to: [number, number]): number {
  const lon1 = (from[0] * Math.PI) / 180
  const lat1 = (from[1] * Math.PI) / 180
  const lon2 = (to[0] * Math.PI) / 180
  const lat2 = (to[1] * Math.PI) / 180
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Format seconds into MM:SS
export function formatSimClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.floor(Math.max(0, seconds) % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Canonical Road Geometry
export const PRIMARY_ROAD_COORDS = [
  ...CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.primary.coordinates,
] as [number, number][]

export const ALTERNATIVE_ROAD_COORDS = [
  ...CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.alternative.coordinates,
] as [number, number][]

// Split index where primary & alternative diverge at Trinity Circle
export const DIVERGENCE_INDEX = 124
export const DIVERGENCE_COORD = PRIMARY_ROAD_COORDS[DIVERGENCE_INDEX] // [77.619544, 12.972663]

// Accident location: placed directly on Old Airport Road at index 200 of primary route
export const ACCIDENT_ROAD_INDEX = 200
export const ACCIDENT_COORDINATES: [number, number] = [
  PRIMARY_ROAD_COORDS[ACCIDENT_ROAD_INDEX][0],
  PRIMARY_ROAD_COORDS[ACCIDENT_ROAD_INDEX][1],
] // [77.638589, 12.961032]

// Secondary alternative route (Gray route) via Victoria Layout / Intermediate Ring Road for visual comparison
export const SECONDARY_ALTERNATIVE_COORDS: [number, number][] = (function () {
  // Shared start from MG Road to Trinity Circle
  const shared = PRIMARY_ROAD_COORDS.slice(0, DIVERGENCE_INDEX + 1)
  // Branch via Victoria Layout / Austin Town connecting to Intermediate Ring Road
  const bypassWaypoints: [number, number][] = [
    [77.6205, 12.9710],
    [77.6220, 12.9680],
    [77.6240, 12.9635],
    [77.6275, 12.9580],
    [77.6310, 12.9520],
    [77.6360, 12.9495],
    [77.640535, 12.948537], // Rejoining Intermediate Ring Road flyover
  ]
  const hospitalApproach = CANONICAL_ROAD_CORRIDORS.EMERGENCY_TO_MANIPAL.primary.coordinates
  return [...shared, ...bypassWaypoints, ...hospitalApproach] as [number, number][]
})()

export const SCENARIO_ORIGIN = {
  name: 'MG Road Metro Station (Depot Bay)',
  coordinates: PRIMARY_ROAD_COORDS[0], // [77.594697, 12.971848]
}

export const SCENARIO_DESTINATION = {
  name: 'Manipal Hospital HAL (Emergency Department)',
  coordinates: PRIMARY_ROAD_COORDS[PRIMARY_ROAD_COORDS.length - 1], // [77.649028, 12.957836]
}

export type DiffSimulationStatus =
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'ACCIDENT_DETECTED'
  | 'ROUTE_RECALCULATING'
  | 'REROUTE_PENDING'
  | 'REROUTE_APPROVED'
  | 'REROUTED'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'FAILED'

export type DiffMissionStatus =
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'CORRIDOR_BLOCKED'
  | 'REROUTE_APPROVED'
  | 'PATIENT_REACHED'

export interface ScenarioMilestone {
  id: string
  timestampSec: number
  timeLabel: string
  title: string
  shortTitle: string
  description: string
  category: 'DISPATCH' | 'ROUTE' | 'HAZARD' | 'GEOAGENT' | 'DECISION' | 'ARRIVAL'
  cameraTarget: [number, number] // [lat, lng] for Leaflet
  cameraZoom: number
  badgeColor: string
}

export const SCENARIO_MILESTONES: ScenarioMilestone[] = [
  {
    id: 'm1',
    timestampSec: 0,
    timeLabel: '00:00',
    title: 'Emergency Call Received & Triage',
    shortTitle: 'Emergency Created',
    description: 'Critical Category-1 emergency reported at Manipal Hospital HAL destination.',
    category: 'DISPATCH',
    cameraTarget: [SCENARIO_ORIGIN.coordinates[1], SCENARIO_ORIGIN.coordinates[0]],
    cameraZoom: 15,
    badgeColor: 'border-blue-500 text-blue-500',
  },
  {
    id: 'm2',
    timestampSec: 5,
    timeLabel: '00:05',
    title: 'Ambulance AMB-01 Dispatched',
    shortTitle: 'AMB-01 Dispatched',
    description: 'ALS Unit AMB-01 assigned with driver Ramesh Gowda. Paramedic crew ready.',
    category: 'DISPATCH',
    cameraTarget: [SCENARIO_ORIGIN.coordinates[1], SCENARIO_ORIGIN.coordinates[0]],
    cameraZoom: 15,
    badgeColor: 'border-emerald-500 text-emerald-500',
  },
  {
    id: 'm3',
    timestampSec: 20,
    timeLabel: '00:20',
    title: 'Primary Road Corridor Activated',
    shortTitle: 'Primary Route Active',
    description: '7.9 km corridor via Old Airport Road locked into navigation HUD (BLUE).',
    category: 'ROUTE',
    cameraTarget: [12.965, 77.622],
    cameraZoom: 14,
    badgeColor: 'border-blue-500 text-blue-500',
  },
  {
    id: 'm4',
    timestampSec: 60,
    timeLabel: '01:00',
    title: 'Ambulance En Route & GPS Active',
    shortTitle: 'Ambulance Moving',
    description: 'Unit cruising at 48 km/h. Orange GPS trajectory streaming live breadcrumbs.',
    category: 'ROUTE',
    cameraTarget: [12.973, 77.608],
    cameraZoom: 15,
    badgeColor: 'border-amber-500 text-amber-500',
  },
  {
    id: 'm5',
    timestampSec: 120,
    timeLabel: '02:00',
    title: 'Major Road Accident Occurs Ahead',
    shortTitle: 'Accident Detected',
    description: 'Overturned commercial vehicle blocks 3 lanes on Old Airport Road near Domlur.',
    category: 'HAZARD',
    cameraTarget: [ACCIDENT_COORDINATES[1], ACCIDENT_COORDINATES[0]],
    cameraZoom: 16,
    badgeColor: 'border-red-500 text-red-500',
  },
  {
    id: 'm6',
    timestampSec: 135,
    timeLabel: '02:15',
    title: 'Active Corridor Disrupted & At Risk',
    shortTitle: 'Route Blocked',
    description: 'Shockwave sensors detect 0 km/h standstill. Primary corridor ETA +14.2 min.',
    category: 'HAZARD',
    cameraTarget: [12.964, 77.635],
    cameraZoom: 15,
    badgeColor: 'border-red-500 text-red-500',
  },
  {
    id: 'm7',
    timestampSec: 145,
    timeLabel: '02:25',
    title: 'Alternative Road Corridors Evaluated',
    shortTitle: 'Alternatives Found',
    description: 'Road engine calculates bypass routes from current vehicle position. Detour shown in PURPLE.',
    category: 'ROUTE',
    cameraTarget: [12.972663, 77.619544],
    cameraZoom: 14,
    badgeColor: 'border-purple-500 text-purple-500',
  },
  {
    id: 'm8',
    timestampSec: 155,
    timeLabel: '02:35',
    title: 'GeoAgent Epistemic Recommendation',
    shortTitle: 'GeoAgent Advice',
    description: '3-tier analysis recommends Indiranagar 100ft Rd bypass. Net savings: 6.5 min.',
    category: 'GEOAGENT',
    cameraTarget: [12.972663, 77.619544],
    cameraZoom: 14,
    badgeColor: 'border-cyan-500 text-cyan-500',
  },
  {
    id: 'm9',
    timestampSec: 165,
    timeLabel: '02:45',
    title: 'Operator Decision Action Requested',
    shortTitle: 'Approval Pending',
    description: 'Control room operator human-in-the-loop action pending for detour authorization.',
    category: 'DECISION',
    cameraTarget: [12.972663, 77.619544],
    cameraZoom: 15,
    badgeColor: 'border-amber-500 text-amber-500',
  },
  {
    id: 'm10',
    timestampSec: 180,
    timeLabel: '03:00',
    title: 'Operator Approves Reroute Activation',
    shortTitle: 'Reroute Approved',
    description: 'Reroute approved! Recommended detour becomes ACTIVE (BLUE). Vehicle continues.',
    category: 'DECISION',
    cameraTarget: [12.972663, 77.619544],
    cameraZoom: 15,
    badgeColor: 'border-emerald-500 text-emerald-500',
  },
  {
    id: 'm11',
    timestampSec: 240,
    timeLabel: '04:00',
    title: 'Navigating Indiranagar Bypass Corridor',
    shortTitle: 'Bypass Navigated',
    description: 'Ambulance advances along 100ft road corridor with V2X green-wave clearance.',
    category: 'ROUTE',
    cameraTarget: [12.970, 77.640],
    cameraZoom: 14,
    badgeColor: 'border-blue-500 text-blue-500',
  },
  {
    id: 'm12',
    timestampSec: 420,
    timeLabel: '07:00',
    title: 'Original Patient Location Reached',
    shortTitle: 'Patient Reached',
    description: 'Ambulance successfully arrives at Manipal Hospital HAL Emergency Bay.',
    category: 'ARRIVAL',
    cameraTarget: [SCENARIO_DESTINATION.coordinates[1], SCENARIO_DESTINATION.coordinates[0]],
    cameraZoom: 16,
    badgeColor: 'border-emerald-500 text-emerald-500',
  },
  {
    id: 'm13',
    timestampSec: 430,
    timeLabel: '07:10',
    title: 'Emergency Mission Completed',
    shortTitle: 'Mission Complete',
    description: 'Patient transfer complete. SwiftCare GeoAgent what-if scenario executed seamlessly.',
    category: 'ARRIVAL',
    cameraTarget: [SCENARIO_DESTINATION.coordinates[1], SCENARIO_DESTINATION.coordinates[0]],
    cameraZoom: 15,
    badgeColor: 'border-emerald-500 text-emerald-500',
  },
]

export interface DiffSimulationSnapshot {
  timestampSec: number
  timeLabel: string
  simulationState: DiffSimulationStatus
  missionState: DiffMissionStatus
  routeState: 'NORMAL' | 'AT_RISK' | 'BLOCKED' | 'REROUTING' | 'REROUTED'
  vehiclePosition: [number, number] // [lng, lat]
  vehicleLatLng: [number, number] // [lat, lng] for Leaflet
  vehicleHeading: number
  vehicleSpeedKmh: number
  distanceTraveledMeters: number
  distanceRemainingMeters: number
  etaSeconds: number
  activeRouteType: 'PRIMARY' | 'REROUTE'
  activeRouteCoords: [number, number][] // [lng, lat][]
  recommendedRouteCoords: [number, number][] | null // [lng, lat][] (purple)
  secondaryRouteCoords: [number, number][] | null // [lng, lat][] (gray)
  trajectoryPoints: Array<{ coordinates: [number, number]; timestamp: string; speed: number }>
  accidentActive: boolean
  accidentCoords: [number, number] // [lng, lat]
  accidentSeverity: 'CRITICAL'
  accidentDescription: string
  rerouteAvailable: boolean
  rerouteApproved: boolean
  decisionPending: boolean
  geoAgentAnalysis: {
    situation: string
    impact: string
    recommendation: string
    observed: string[]
    inferred: string[]
    unknown: string[]
    delayAvoidedMinutes: number
    v2xClearanceActive: boolean
  }
  origin: typeof SCENARIO_ORIGIN
  destination: typeof SCENARIO_DESTINATION
  currentMilestoneIndex: number
}

/**
 * Precompute cumulative distance lookup tables for linear interpolation along routes
 */
function buildDistanceLookup(coords: [number, number][]): number[] {
  const dists = [0]
  for (let i = 1; i < coords.length; i++) {
    dists.push(dists[i - 1] + haversineDistanceMeters(coords[i - 1], coords[i]))
  }
  return dists
}

const PRIMARY_DISTS = buildDistanceLookup(PRIMARY_ROAD_COORDS)
const TOTAL_PRIMARY_METERS = PRIMARY_DISTS[PRIMARY_DISTS.length - 1] // ~7939m
const DISTANCE_TO_DIVERGENCE = PRIMARY_DISTS[DIVERGENCE_INDEX] // ~3618m

const ALT_DISTS = buildDistanceLookup(ALTERNATIVE_ROAD_COORDS)
const TOTAL_ALT_METERS = ALT_DISTS[ALT_DISTS.length - 1] // ~9229m
const ALT_DETOUR_METERS = TOTAL_ALT_METERS - ALT_DISTS[DIVERGENCE_INDEX] // ~5611m

/**
 * Interpolate coordinate and bearing at a given distance along a polyline
 */
function interpolateAtDistance(
  coords: [number, number][],
  dists: number[],
  targetMeters: number
): { coord: [number, number]; heading: number; segmentIndex: number } {
  const clamped = Math.max(0, Math.min(targetMeters, dists[dists.length - 1]))

  if (clamped <= 0) {
    const heading = coords.length > 1 ? calculateBearing(coords[0], coords[1]) : 0
    return { coord: coords[0], heading, segmentIndex: 0 }
  }

  if (clamped >= dists[dists.length - 1]) {
    const last = coords.length - 1
    const heading = coords.length > 1 ? calculateBearing(coords[last - 1], coords[last]) : 0
    return { coord: coords[last], heading, segmentIndex: last }
  }

  // Binary search for segment
  let low = 0
  let high = dists.length - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (dists[mid] <= clamped) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const i = Math.max(0, high)
  const p1 = coords[i]
  const p2 = coords[i + 1] || coords[i]
  const segmentLen = dists[i + 1] - dists[i]

  if (segmentLen <= 0.001) {
    return { coord: p1, heading: calculateBearing(p1, p2), segmentIndex: i }
  }

  const fraction = (clamped - dists[i]) / segmentLen
  const lng = p1[0] + (p2[0] - p1[0]) * fraction
  const lat = p1[1] + (p2[1] - p1[1]) * fraction
  const heading = calculateBearing(p1, p2)

  return { coord: [lng, lat], heading, segmentIndex: i }
}

/**
 * Compute the complete simulation snapshot for any given simulation second (0 to 430s)
 * @param t Current simulation time in seconds
 * @param manualOperatorApproved Optional override if the operator manually clicked "Approve Reroute" before T=180s
 */
export function computeSimulationSnapshot(
  t: number,
  manualOperatorApproved: boolean = false
): DiffSimulationSnapshot {
  const clampedT = Math.max(0, Math.min(t, 430))
  const timeLabel = formatSimClock(clampedT)

  // Determine current milestone index
  let currentMilestoneIndex = 0
  for (let i = 0; i < SCENARIO_MILESTONES.length; i++) {
    if (clampedT >= SCENARIO_MILESTONES[i].timestampSec) {
      currentMilestoneIndex = i
    } else {
      break
    }
  }

  // Reroute authorization is active if timestamp is >= 180s OR manual operator approved at >= 165s
  const rerouteApproved = clampedT >= 180 || (manualOperatorApproved && clampedT >= 165)
  const decisionPending = clampedT >= 165 && !rerouteApproved
  const accidentActive = clampedT >= 120
  const rerouteAvailable = clampedT >= 145

  // Simulation Status
  let simulationState: DiffSimulationStatus = 'READY'
  if (clampedT === 0) {
    simulationState = 'READY'
  } else if (clampedT >= 430) {
    simulationState = 'COMPLETED'
  } else if (clampedT >= 420) {
    simulationState = 'ARRIVED'
  } else if (rerouteApproved && clampedT >= 181) {
    simulationState = 'REROUTED'
  } else if (rerouteApproved) {
    simulationState = 'REROUTE_APPROVED'
  } else if (decisionPending) {
    simulationState = 'REROUTE_PENDING'
  } else if (clampedT >= 135) {
    simulationState = 'ROUTE_RECALCULATING'
  } else if (clampedT >= 120) {
    simulationState = 'ACCIDENT_DETECTED'
  } else {
    simulationState = 'RUNNING'
  }

  // Mission Status
  let missionState: DiffMissionStatus = 'DISPATCHED'
  if (clampedT < 20) {
    missionState = 'DISPATCHED'
  } else if (clampedT >= 420) {
    missionState = 'PATIENT_REACHED'
  } else if (rerouteApproved) {
    missionState = 'REROUTE_APPROVED'
  } else if (accidentActive) {
    missionState = 'CORRIDOR_BLOCKED'
  } else {
    missionState = 'EN_ROUTE'
  }

  // Route State
  let routeState: 'NORMAL' | 'AT_RISK' | 'BLOCKED' | 'REROUTING' | 'REROUTED' = 'NORMAL'
  if (rerouteApproved) {
    routeState = 'REROUTED'
  } else if (clampedT >= 145) {
    routeState = 'REROUTING'
  } else if (clampedT >= 135) {
    routeState = 'BLOCKED'
  } else if (clampedT >= 120) {
    routeState = 'AT_RISK'
  } else {
    routeState = 'NORMAL'
  }

  // Distance, Position, Speed, and Heading Calculation
  let currentPosition: [number, number]
  let currentHeading = 90
  let currentSpeedKmh = 0
  let distanceTraveledMeters = 0
  let distanceRemainingMeters = TOTAL_PRIMARY_METERS
  let etaSeconds = 420 - clampedT

  if (clampedT < 20) {
    // Before moving: at origin
    currentPosition = SCENARIO_ORIGIN.coordinates
    currentHeading = calculateBearing(PRIMARY_ROAD_COORDS[0], PRIMARY_ROAD_COORDS[1])
    currentSpeedKmh = 0
    distanceTraveledMeters = 0
    distanceRemainingMeters = TOTAL_PRIMARY_METERS
    etaSeconds = 400
  } else if (!rerouteApproved && clampedT < 180) {
    // Phase A: Moving along primary route from origin toward Trinity Circle (index 0 to 124)
    // Between T=20 and T=180 (160 seconds), travels from 0m to DISTANCE_TO_DIVERGENCE (~3618m)
    const travelProgress = (clampedT - 20) / (180 - 20)
    distanceTraveledMeters = travelProgress * DISTANCE_TO_DIVERGENCE

    const interp = interpolateAtDistance(PRIMARY_ROAD_COORDS, PRIMARY_DISTS, distanceTraveledMeters)
    currentPosition = interp.coord
    currentHeading = interp.heading

    // Speed profile: accelerates to 48-52 km/h, decelerates around T=120-135 when accident is flagged
    if (clampedT < 40) {
      currentSpeedKmh = 25 + (clampedT - 20) * 1.3
    } else if (clampedT < 120) {
      currentSpeedKmh = 50 + Math.sin(clampedT * 0.1) * 3
    } else if (clampedT < 145) {
      currentSpeedKmh = 32 + Math.sin(clampedT * 0.2) * 2
    } else {
      currentSpeedKmh = 38 + Math.sin(clampedT * 0.1) * 2
    }

    if (accidentActive) {
      // Primary route is blocked, so normal ETA is heavily delayed (+14.2 min)
      distanceRemainingMeters = TOTAL_PRIMARY_METERS - distanceTraveledMeters
      etaSeconds = (TOTAL_PRIMARY_METERS - distanceTraveledMeters) / (currentSpeedKmh / 3.6) + 852 // +14.2 min
    } else {
      distanceRemainingMeters = TOTAL_PRIMARY_METERS - distanceTraveledMeters
      etaSeconds = Math.max(10, (420 - clampedT))
    }
  } else if (clampedT >= 420) {
    // Arrived at destination
    currentPosition = SCENARIO_DESTINATION.coordinates
    currentHeading = calculateBearing(
      ALTERNATIVE_ROAD_COORDS[ALTERNATIVE_ROAD_COORDS.length - 2],
      ALTERNATIVE_ROAD_COORDS[ALTERNATIVE_ROAD_COORDS.length - 1]
    )
    currentSpeedKmh = 0
    distanceTraveledMeters = TOTAL_ALT_METERS
    distanceRemainingMeters = 0
    etaSeconds = 0
  } else {
    // Phase B: Rerouted! Moving along the alternative corridor from Trinity Circle (index 124) to Manipal Hospital
    // Between T=180 and T=420 (240 seconds), travels from DISTANCE_TO_DIVERGENCE (~3618m) to TOTAL_ALT_METERS (~9229m)
    const detourProgress = (clampedT - 180) / (420 - 180)
    const detourMetersTraveled = detourProgress * ALT_DETOUR_METERS
    distanceTraveledMeters = ALT_DISTS[DIVERGENCE_INDEX] + detourMetersTraveled

    const interp = interpolateAtDistance(ALTERNATIVE_ROAD_COORDS, ALT_DISTS, distanceTraveledMeters)
    currentPosition = interp.coord
    currentHeading = interp.heading

    // Speed profile with active V2X green-wave corridor clearance: 52-60 km/h
    currentSpeedKmh = 54 + Math.sin(clampedT * 0.15) * 4
    distanceRemainingMeters = Math.max(0, TOTAL_ALT_METERS - distanceTraveledMeters)
    etaSeconds = Math.max(0, Math.round(420 - clampedT))
  }

  // Calculate actual GPS breadcrumbs (Trajectory) up to current simulation second
  // Step every 10 seconds of travel
  const trajectoryPoints: Array<{ coordinates: [number, number]; timestamp: string; speed: number }> = []
  if (clampedT >= 20) {
    const stepSeconds = 8
    for (let simSec = 20; simSec <= clampedT; simSec += stepSeconds) {
      if (simSec < 180 && !rerouteApproved) {
        const pProg = (simSec - 20) / (180 - 20)
        const d = pProg * DISTANCE_TO_DIVERGENCE
        const { coord } = interpolateAtDistance(PRIMARY_ROAD_COORDS, PRIMARY_DISTS, d)
        trajectoryPoints.push({
          coordinates: coord,
          timestamp: formatSimClock(simSec),
          speed: Math.round(48 + Math.sin(simSec * 0.1) * 3),
        })
      } else {
        const dProg = (simSec - 180) / (420 - 180)
        const d = ALT_DISTS[DIVERGENCE_INDEX] + Math.max(0, dProg * ALT_DETOUR_METERS)
        const { coord } = interpolateAtDistance(ALTERNATIVE_ROAD_COORDS, ALT_DISTS, d)
        trajectoryPoints.push({
          coordinates: coord,
          timestamp: formatSimClock(simSec),
          speed: Math.round(54 + Math.sin(simSec * 0.15) * 4),
        })
      }
    }

    // Always include current position as latest fix
    trajectoryPoints.push({
      coordinates: currentPosition,
      timestamp: timeLabel,
      speed: Math.round(currentSpeedKmh),
    })
  }

  // Active Route Geometry:
  // Before reroute: BLUE = Primary Route
  // After reroute: BLUE = Alternative Route (detour from current position to patient)
  const activeRouteType = rerouteApproved ? 'REROUTE' : 'PRIMARY'
  const activeRouteCoords = rerouteApproved ? ALTERNATIVE_ROAD_COORDS : PRIMARY_ROAD_COORDS

  // Recommended Route Geometry (Purple):
  // Shown when alternatives are evaluated (T >= 145) and before reroute is approved (T < 180)
  // Must originate road-constrained from current vehicle position or divergence point!
  let recommendedRouteCoords: [number, number][] | null = null
  let secondaryRouteCoords: [number, number][] | null = null

  if (rerouteAvailable && !rerouteApproved) {
    // PURPLE recommended reroute connects seamlessly from the divergence junction to Manipal Hospital
    recommendedRouteCoords = ALTERNATIVE_ROAD_COORDS
    // GRAY secondary alternative route
    secondaryRouteCoords = SECONDARY_ALTERNATIVE_COORDS
  }

  // GeoAgent 3-Tier Epistemic Analysis
  const geoAgentAnalysis = {
    situation:
      clampedT < 120
        ? 'Corridor clear. Vehicle operating under nominal free-flow traffic conditions.'
        : clampedT < 180
        ? 'CRITICAL DISRUPTION: Overturned commercial vehicle & secondary collision blocking all 3 eastbound lanes on Old Airport Road near Domlur flyover.'
        : 'CORRIDOR RECOVERY: Reroute via Indiranagar 100ft Road / 12th Main active with V2X green-wave corridor clearance.',
    impact:
      clampedT < 120
        ? 'Zero expected delay. Optimal arrival trajectory maintained.'
        : clampedT < 180
        ? 'Active corridor delay projected at +14.2 minutes (severe bottleneck). Direct route impassable for emergency ALS unit.'
        : 'Detour adds +1.29 km physical road distance, but green-wave preemption saves 6.5 minutes vs waiting on primary corridor.',
    recommendation:
      clampedT < 145
        ? 'Continue monitoring corridor telemetry.'
        : clampedT < 180
        ? 'RECOMMENDATION: Diverge north at Trinity Circle onto Indiranagar 100ft Road -> 12th Main -> Old Airport Road bypass directly to Manipal Hospital HAL. Operator authorization requested.'
        : 'RECOMMENDATION EXECUTED: Maintain 55 km/h on bypass corridor. Pre-clear signals at CMH Road and 100ft Road junction.',
    observed: [
      `Telemetry Fix: [${currentPosition[0].toFixed(5)}, ${currentPosition[1].toFixed(5)}] at speed ${Math.round(currentSpeedKmh)} km/h.`,
      clampedT >= 120
        ? `Accident location verified at [${ACCIDENT_COORDINATES[0]}, ${ACCIDENT_COORDINATES[1]}] on Old Airport Rd (Domlur).`
        : 'Primary corridor speed sensors reporting nominal free-flow (48 km/h).',
      clampedT >= 135
        ? 'Traffic standstill: 0 km/h upstream shockwave extending 1.1 km.'
        : 'No lane closures reported on active route.',
    ],
    inferred: [
      clampedT >= 120
        ? 'Active corridor ETA degraded: projected delay +14.2 min (Severe Risk).'
        : 'Expected time to arrival: 4.8 min.',
      clampedT >= 145
        ? 'Alternative corridor (Indiranagar 100ft Rd) capacity: 84% free-flow, net travel time 4.0 min.'
        : 'Alternative corridors on standby in route cache.',
      clampedT >= 155
        ? 'Net time saved by taking Indiranagar bypass: 6.5 minutes.'
        : 'Telemetry confidence score: 98.4%.',
    ],
    unknown: [
      clampedT >= 120
        ? 'Heavy recovery crane ETA at Domlur flyover: unknown (est. 45-60 min).'
        : 'Peak rush-hour congestion burst probabilities on secondary links.',
      'Emergency room bay availability at Manipal Hospital HAL (currently reporting 4 bays open).',
    ],
    delayAvoidedMinutes: 6.5,
    v2xClearanceActive: rerouteApproved && clampedT < 420,
  }

  return {
    timestampSec: clampedT,
    timeLabel,
    simulationState,
    missionState,
    routeState,
    vehiclePosition: currentPosition,
    vehicleLatLng: [currentPosition[1], currentPosition[0]], // [lat, lng] for Leaflet
    vehicleHeading: currentHeading,
    vehicleSpeedKmh: Math.round(currentSpeedKmh),
    distanceTraveledMeters: Math.round(distanceTraveledMeters),
    distanceRemainingMeters: Math.round(distanceRemainingMeters),
    etaSeconds: Math.round(etaSeconds),
    activeRouteType,
    activeRouteCoords,
    recommendedRouteCoords,
    secondaryRouteCoords,
    trajectoryPoints,
    accidentActive,
    accidentCoords: ACCIDENT_COORDINATES,
    accidentSeverity: 'CRITICAL',
    accidentDescription:
      'Overturned commercial truck and 2-vehicle collision blocking Old Airport Road eastbound corridor near Domlur Flyover.',
    rerouteAvailable,
    rerouteApproved,
    decisionPending,
    geoAgentAnalysis,
    origin: SCENARIO_ORIGIN,
    destination: SCENARIO_DESTINATION,
    currentMilestoneIndex,
  }
}
