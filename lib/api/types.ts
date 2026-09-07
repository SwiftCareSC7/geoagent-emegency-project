/**
 * SwiftCare GeoAgent — API Type Definitions
 *
 * TypeScript types derived from the backend OpenAPI 3.0 specification
 * (docs/openapi.yaml) and verified against actual backend source code.
 *
 * These types represent the shapes returned by the Express backend.
 * Do not invent fields — all properties come from the real API contract.
 */

// ---------------------------------------------------------------------------
// GeoJSON Primitives
// ---------------------------------------------------------------------------

/** GeoJSON Point — [longitude, latitude] in WGS84 */
export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

/** GeoJSON LineString */
export interface GeoJSONLineString {
  type: 'LineString'
  coordinates: [number, number][]
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type UserRole = 'ADMIN' | 'CONTROL_ROOM' | 'DRIVER' | 'PARAMEDIC'

/** Safe user object (password never returned by backend) */
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
  updatedAt?: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export type VehicleType = 'AMBULANCE' | 'FIRE_TRUCK' | 'POLICE' | 'RESCUE'

export type VehicleStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'AT_SCENE'
  | 'TRANSPORTING'
  | 'MAINTENANCE'

export interface Vehicle {
  id: string
  vehicleId: string
  registrationNumber: string
  type: VehicleType
  status: VehicleStatus
  capacity: number
  driverName: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateVehiclePayload {
  vehicleId: string
  registrationNumber: string
  type: VehicleType
  driverName: string
  capacity: number
}

export interface UpdateVehiclePayload {
  status?: VehicleStatus
  driverName?: string
  capacity?: number
}

// ---------------------------------------------------------------------------
// Emergencies
// ---------------------------------------------------------------------------

export type EmergencyType =
  | 'ACCIDENT'
  | 'CARDIAC'
  | 'FIRE'
  | 'TRAUMA'
  | 'RESPIRATORY'
  | 'OTHER'

export type EmergencyPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type EmergencyStatus =
  | 'REPORTED'
  | 'DISPATCHED'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'CANCELLED'

export interface Emergency {
  id: string
  emergencyId: string
  type: EmergencyType
  priority: EmergencyPriority
  status: EmergencyStatus
  description?: string
  callerName?: string
  callerContact?: string
  location: GeoJSONPoint
  destination?: GeoJSONPoint
  assignedVehicle?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateEmergencyPayload {
  type: EmergencyType
  priority: EmergencyPriority
  description?: string
  callerName?: string
  callerContact?: string
  location: GeoJSONPoint
  destination?: GeoJSONPoint
}

export interface UpdateEmergencyPayload {
  priority?: EmergencyPriority
  status?: EmergencyStatus
  description?: string
  destination?: GeoJSONPoint
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export interface Incident {
  id: string
  incidentId?: string
  type: string
  severity: string
  status?: string
  description?: string
  location: GeoJSONPoint
  createdAt?: string
  updatedAt?: string
}

export interface CreateIncidentPayload {
  type: string
  severity: string
  description?: string
  location: GeoJSONPoint
}

export interface UpdateIncidentPayload {
  type?: string
  severity?: string
  description?: string
  status?: string
}

// ---------------------------------------------------------------------------
// Trajectories
// ---------------------------------------------------------------------------

export type TrajectorySource = 'DEVICE' | 'SIMULATOR' | 'MANUAL'

export interface Trajectory {
  id: string
  vehicle: string
  location: GeoJSONPoint
  speed: number
  heading?: number
  timestamp: string
  source: TrajectorySource
}

export interface IngestTrajectoryPayload {
  vehicleId: string
  location: GeoJSONPoint
  speed: number
  heading?: number
  timestamp?: string
  source?: TrajectorySource
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export type RouteType = 'PLANNED' | 'ALTERNATIVE' | 'HISTORICAL'
export type RouteStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'

export interface Route {
  id: string
  routeId: string
  emergency: string
  vehicle: string
  origin: GeoJSONPoint
  destination: GeoJSONPoint
  geometry: GeoJSONLineString
  distance: number // meters
  duration: number // seconds
  status: RouteStatus
  routeType?: RouteType
  createdAt?: string
  updatedAt?: string
}

export interface CreateRoutePayload {
  emergencyId: string
  vehicleId: string
  origin: GeoJSONPoint
  destination: GeoJSONPoint
  routeType?: RouteType
}

// ---------------------------------------------------------------------------
// Deviation & Analysis
// ---------------------------------------------------------------------------

export type DeviationStatus =
  | 'ON_ROUTE'
  | 'WARNING'
  | 'DEVIATED'
  | 'CRITICAL_DEVIATION'

export type StabilityStatus = 'STABLE' | 'UNSTABLE' | 'JITTER'

export interface DeviationResult {
  status: DeviationStatus
  crossTrackDistanceMeters: number
  bearingDifferenceDegrees: number
  stability: StabilityStatus
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export type DecisionAction =
  | 'MAINTAIN_ROUTE'
  | 'REROUTE'
  | 'DISPATCH_BACKUP'
  | 'ALERT_CONTROL_ROOM'
  | 'REQUEST_TRAFFIC_OVERRIDE'
  | 'ESCALATE_TO_SUPERVISOR'
  | 'STANDBY'

export type DecisionSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export type DecisionStatus =
  | 'PENDING_OPERATOR_ACTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'EXPIRED'
  | 'AUTO_APPLIED'

export interface Decision {
  id: string
  decisionId: string
  emergency: string
  vehicle: string
  primaryAction: DecisionAction
  severity: DecisionSeverity
  status: DecisionStatus
  reasonCodes: string[]
  situationHash: string
  createdAt?: string
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type WorkflowStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED'

export interface EpistemicBreakdown {
  observed: string[]
  inferred: string[]
  unknown: string[]
}

export interface OrchestrationResult {
  workflowStatus: WorkflowStatus
  emergency: Emergency
  vehicle: Vehicle
  route: Route
  situationAnalysis: Record<string, unknown>
  geoAgentRecommendation: Record<string, unknown>
  decision: Decision
  epistemicBreakdown: EpistemicBreakdown
}

// ---------------------------------------------------------------------------
// API Response Wrappers
// ---------------------------------------------------------------------------

/** Standard success response from the backend */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  user?: User
  message?: string
}

/** Standard error response from the backend */
export interface ApiErrorResponse {
  success: false
  error?: string
  message?: string
}

/** Pagination metadata returned by paginated endpoints */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

/** Paginated response shape */
export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: PaginationMeta
}

// ---------------------------------------------------------------------------
// Client-side API Error
// ---------------------------------------------------------------------------

/** Normalized error thrown by the API client */
export class ApiError extends Error {
  public readonly status: number
  public readonly success: false = false

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  /** True if this is a network or connection failure */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  /** True if this is a 400 Bad Request error */
  get isBadRequest(): boolean {
    return this.status === 400
  }

  /** True if this is a 401 Unauthorized error */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** True if this is a 403 Forbidden error */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** True if this is a 404 Not Found error */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /** True if this is a 409 Conflict error */
  get isConflict(): boolean {
    return this.status === 409
  }
}
