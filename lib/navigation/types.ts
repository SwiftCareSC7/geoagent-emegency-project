/**
 * SwiftCare GeoAgent — Unified Navigation Types
 *
 * One normalized navigation model shared across all map surfaces:
 * Driver Dashboard, Control Room, Emergency Detail, and Interactive Map.
 */

export type ManeuverType =
  | 'DEPART'
  | 'STRAIGHT'
  | 'CONTINUE'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'SLIGHT_LEFT'
  | 'SLIGHT_RIGHT'
  | 'SHARP_LEFT'
  | 'SHARP_RIGHT'
  | 'U_TURN'
  | 'MERGE'
  | 'FORK_LEFT'
  | 'FORK_RIGHT'
  | 'ROUNDABOUT'
  | 'EXIT_ROUNDABOUT'
  | 'RAMP'
  | 'RAMP_LEFT'
  | 'RAMP_RIGHT'
  | 'KEEP_LEFT'
  | 'KEEP_RIGHT'
  | 'ARRIVE'

export type NavigationState =
  | 'IDLE'
  | 'PLANNING'
  | 'ROUTE_READY'
  | 'NAVIGATING'
  | 'APPROACHING_TURN'
  | 'OFF_ROUTE'
  | 'REROUTING'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'ERROR'

export type TrafficCondition = 'LIGHT' | 'MODERATE' | 'HEAVY' | 'SEVERE' | 'UNKNOWN'

export type RouteLegType = 'TO_EMERGENCY' | 'TO_HOSPITAL' | 'NORMAL'
export type RouteLegStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED'

export interface NormalizedStep {
  stepIndex: number
  maneuver: ManeuverType
  instruction: string
  streetName?: string
  distanceMeters: number
  durationSeconds: number
  startLocation: [number, number] // [lng, lat]
  endLocation: [number, number] // [lng, lat]
  stepPolyline?: [number, number][] // [lng, lat][]
}

export interface NormalizedLeg {
  legNumber: number // 1 (To Scene) or 2 (To Hospital)
  type: RouteLegType
  title: string
  originName?: string
  destinationName?: string
  originCoordinates: [number, number] // [lng, lat]
  destinationCoordinates: [number, number] // [lng, lat]
  geometry: {
    type: 'LineString'
    coordinates: [number, number][] // [lng, lat][]
  }
  distanceMeters: number
  durationSeconds: number
  steps: NormalizedStep[]
  status: RouteLegStatus
  trafficDelaySeconds?: number
}

export interface NormalizedRoute {
  id?: string
  geometry: {
    type: 'LineString'
    coordinates: [number, number][] // [lng, lat][]
  }
  distanceMeters: number
  durationSeconds: number
  staticDurationSeconds?: number
  trafficDelaySeconds?: number
  trafficCondition: TrafficCondition
  preference: 'FASTEST' | 'SHORTEST' | 'TRAFFIC_AWARE_OPTIMAL'
  description?: string
  provider: 'GOOGLE' | 'OSRM' | 'MOCK' | 'GEOAGENT'
  dataSource?: string
  steps: NormalizedStep[]
  legs?: NormalizedLeg[]
  activeLegNumber?: number // 1 or 2
  alternatives?: NormalizedRoute[]
  calculatedAt: string
}

export interface VehicleTelemetry {
  coordinates: [number, number] // [lng, lat]
  heading?: number | null // degrees 0-360
  speed?: number | null // km/h
  accuracy?: number | null // meters
  timestamp?: number
  isStale?: boolean
}

export interface SnappedLocation {
  snappedCoordinates: [number, number] // [lng, lat]
  rawCoordinates: [number, number] // [lng, lat]
  distanceToRouteMeters: number
  nearestSegmentIndex: number
  bearing: number
}

export interface TurnByTurnEngineState {
  navState: NavigationState
  currentStepIndex: number
  currentStep: NormalizedStep | null
  nextStep: NormalizedStep | null
  distanceToNextStepMeters: number
  formattedDistanceToNextStep: string
  isImminentTurn: boolean // within 50m of turn ("NOW")
  upcomingSteps: NormalizedStep[]
  completedSteps: NormalizedStep[]
  traveledDistanceMeters: number
  remainingDistanceMeters: number
  remainingDurationSeconds: number
  routeProgressPercent: number // 0 to 100
  etaFormatted: string
  arrivalTimeFormatted: string
  trafficCondition: TrafficCondition
  isOffRoute: boolean
  offRouteDistanceMeters: number
  activeLegNumber: number
}
