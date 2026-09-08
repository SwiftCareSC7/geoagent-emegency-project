/**
 * SwiftCare GeoAgent — Geospatial Map Data Models
 *
 * Frontend map models derived strictly from backend API & Socket.IO contracts.
 * GeoJSON positions are [longitude, latitude]. Leaflet positions are [latitude, longitude].
 */

import type {
  EmergencyPriority,
  EmergencyStatus,
  EmergencyType,
  GeoJSONLineString,
  GeoJSONPoint,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  RouteStatus,
  RouteType,
  VehicleStatus,
  VehicleType,
} from '@/lib/api/types'

export type DataFreshness = 'LIVE' | 'STALE' | 'OFFLINE' | 'UNKNOWN'

export type TileLayerProvider = 'carto_dark' | 'osm' | 'esri_satellite'

export type MapProviderHealth = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED'

/** Single vehicle represented on the map */
export interface MapVehicle {
  id: string
  vehicleId: string
  registrationNumber: string
  type: VehicleType
  status: VehicleStatus
  capacity: number
  driverName: string
  driverContact?: string
  location?: GeoJSONPoint
  speed?: number // km/h
  heading?: number // 0-360 deg
  assignedEmergencyId?: string
  assignedEmergencyRef?: string
  lastUpdate?: string // ISO timestamp
  freshness: DataFreshness
}

/** Emergency incident / mission represented on the map */
export interface MapEmergency {
  id: string
  emergencyId: string
  type: EmergencyType
  priority: EmergencyPriority
  status: EmergencyStatus
  description?: string
  callerName?: string
  callerContact?: string
  location: GeoJSONPoint // [lng, lat]
  destination?: GeoJSONPoint // [lng, lat]
  assignedVehicleId?: string
  createdAt?: string
  updatedAt?: string
}

export interface MapRoute {
  id: string
  routeId: string
  emergencyId: string
  vehicleId?: string
  origin: GeoJSONPoint
  destination: GeoJSONPoint
  geometry: GeoJSONLineString // Array of [lng, lat]
  distanceMeters: number
  durationSeconds: number
  routeType: RouteType // 'PLANNED' | 'ALTERNATIVE' | 'CURRENT'
  status: RouteStatus // 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  provider?: string
  isRecommended?: boolean
  legs?: Array<{
    legNumber: number
    type: 'TO_EMERGENCY' | 'TO_HOSPITAL'
    geometry: GeoJSONLineString
    distanceMeters: number
    durationSeconds: number
    status?: string
  }>
  emergencyLocation?: GeoJSONPoint
  hospitalLocation?: GeoJSONPoint
}

/** Road hazard / incident on the map */
export interface MapIncident {
  id: string
  incidentId: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  description?: string
  location: GeoJSONPoint
  source?: string
  emergencyId?: string | null
  createdAt?: string
}

/** Bounded GPS trajectory breadcrumb track */
export interface MapTrajectory {
  vehicleId: string
  points: Array<{
    coordinates: [number, number] // [lng, lat]
    speed: number
    heading?: number
    timestamp: string
  }>
}

/** Route deviation report */
export interface MapDeviation {
  vehicleId: string
  emergencyId?: string
  status: 'ON_ROUTE' | 'WARNING' | 'DEVIATED' | 'CRITICAL_DEVIATION' | 'UNKNOWN'
  crossTrackDistanceMeters: number
  bearingDifferenceDegrees?: number | null
  stability?: string
  timestamp: string
  epistemicType?: 'OBSERVED' | 'INFERRED' | 'UNKNOWN'
}

/** Prediction state for active corridor */
export interface MapPrediction {
  vehicleId: string
  emergencyId?: string
  predictedEta?: string
  baselineEta?: string
  predictedDelayMinutes?: number
  delayRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  routeRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
  trafficLightTimeSavedMinutes?: number
  factors?: Array<{ factor: string; impact: string; epistemicType: string }>
}

/** Layer visibility toggles */
export interface MapLayerVisibility {
  vehicles: boolean
  emergencies: boolean
  routes: boolean
  incidents: boolean
  trajectories: boolean
  deviations: boolean
  v2xSignals: boolean
}

/** Active interactive selection */
export interface MapSelectionState {
  selectedEmergencyId: string | null
  selectedVehicleId: string | null
  selectedRouteId: string | null
}

/** Helper: Convert GeoJSON [lng, lat] to Leaflet [lat, lng] */
export function toLatLng(coordinates: [number, number]): [number, number] {
  return [coordinates[1], coordinates[0]]
}

/** Helper: Convert GeoJSON LineString coordinates [[lng, lat], ...] to Leaflet [[lat, lng], ...] */
export function toLatLngArray(coordinates: [number, number][]): [number, number][] {
  return coordinates.map(toLatLng)
}

/** Helper: Calculate telemetry freshness from timestamp */
export function evaluateFreshness(timestamp?: string | Date | null): DataFreshness {
  if (!timestamp) return 'UNKNOWN'
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime()
  if (isNaN(time)) return 'UNKNOWN'
  const diffSec = (Date.now() - time) / 1000
  if (diffSec < 15) return 'LIVE'
  if (diffSec < 60) return 'STALE'
  return 'OFFLINE'
}
