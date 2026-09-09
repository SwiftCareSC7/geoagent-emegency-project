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
  role?: UserRole
}

export interface LoginPayload {
  email: string
  password: string
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export type VehicleType =
  | 'AMBULANCE'
  | 'FIRE_ENGINE'
  | 'POLICE'
  | 'FIRE_TRUCK'
  | 'RESCUE'

export type VehicleStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'AT_SCENE'
  | 'RETURNING'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'TRANSPORTING'

export interface Vehicle {
  id: string
  vehicleId: string
  registrationNumber: string
  type: VehicleType
  status: VehicleStatus
  capacity: number
  driverName: string
  driverContact?: string
  hospitalName?: string
  hospitalCode?: string
  speed?: number
  heading?: number
  location?: GeoJSONPoint
  createdAt?: string
  updatedAt?: string
}

export interface CreateVehiclePayload {
  vehicleId: string
  registrationNumber: string
  type: VehicleType
  driverName: string
  driverContact?: string
  hospitalName?: string
  hospitalCode?: string
  capacity: number
}

export interface UpdateVehiclePayload {
  status?: VehicleStatus
  driverName?: string
  driverContact?: string
  hospitalName?: string
  hospitalCode?: string
  capacity?: number
}

// ---------------------------------------------------------------------------
// Emergencies
// ---------------------------------------------------------------------------

export type EmergencyType =
  | 'MEDICAL'
  | 'ACCIDENT'
  | 'FIRE'
  | 'POLICE'
  | 'OTHER'
  | 'CARDIAC'
  | 'TRAUMA'
  | 'RESPIRATORY'

export type EmergencyPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type EmergencyStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'AT_SCENE'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'REPORTED'
  | 'ON_SCENE'

export interface AssignedVehicleSummary {
  id?: string
  _id?: string
  vehicleId: string
  registrationNumber: string
  status?: VehicleStatus
}

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
  assignedVehicle?: AssignedVehicleSummary | string | null
  createdBy?: string
  communication?: {
    lastSmsStatus?: 'READY' | 'SENDING' | 'SUBMITTED' | 'DELIVERED' | 'FAILED' | 'UNKNOWN'
    lastSmsProvider?: string
    lastSmsSentAt?: string
    lastSmsRecipient?: string
    lastSmsMessageId?: string
    lastSmsError?: string
  }
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

export type IncidentType =
  | 'ACCIDENT'
  | 'ROAD_CLOSURE'
  | 'ROAD_WORK'
  | 'TRAFFIC_JAM'
  | 'FIRE'
  | 'WEATHER'
  | 'PUBLIC_EVENT'
  | 'OTHER'

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED'

export type IncidentSource =
  | 'TRAFFIC_POLICE'
  | 'PUBLIC_REPORT'
  | 'SENSOR'
  | 'AUTOMATED_SYSTEM'
  | 'OTHER'

export interface Incident {
  id: string
  incidentId: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  description?: string
  location: GeoJSONPoint
  source?: IncidentSource
  emergency?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateIncidentPayload {
  type: IncidentType
  severity?: IncidentSeverity
  description?: string
  location: GeoJSONPoint
  source?: IncidentSource
}

export interface UpdateIncidentPayload {
  type?: IncidentType
  severity?: IncidentSeverity
  description?: string
  status?: IncidentStatus
}

// ---------------------------------------------------------------------------
// Trajectories
// ---------------------------------------------------------------------------

export type TrajectorySource = 'DEVICE' | 'SIMULATOR' | 'MANUAL' | 'API'

export interface Trajectory {
  id?: string
  _id?: string
  vehicle?: string
  vehicleId?: string
  location: GeoJSONPoint
  speed: number // km/h
  heading?: number // 0-360 degrees
  timestamp: string
  source?: TrajectorySource
  createdAt?: string
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

export type RouteType = 'PLANNED' | 'ALTERNATIVE' | 'CURRENT' | 'HISTORICAL'
export type RouteStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ABANDONED'
export type RouteProvider = 'MOCK' | 'GOOGLE' | 'MAPBOX' | 'OSRM'

export interface RoutePopulatedEmergency {
  _id?: string
  emergencyId: string
  status: EmergencyStatus
  priority: EmergencyPriority
}

export interface RoutePopulatedVehicle {
  _id?: string
  vehicleId: string
  status: VehicleStatus
  registrationNumber?: string
  driverName?: string
}

export interface Route {
  id?: string
  _id?: string
  routeId: string
  emergency: string | RoutePopulatedEmergency
  vehicle: string | RoutePopulatedVehicle
  origin: GeoJSONPoint
  destination: GeoJSONPoint
  geometry: GeoJSONLineString
  distance: number // meters
  duration: number // seconds
  distanceMeters?: number
  durationSeconds?: number
  description?: string
  provider?: RouteProvider
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
// Traffic & Deviation & Situation Analysis
// ---------------------------------------------------------------------------

export type TrafficLevel = 'FREE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'SEVERE' | 'UNKNOWN'

export type DeviationStatus =
  | 'ON_ROUTE'
  | 'WARNING'
  | 'DEVIATED'
  | 'CRITICAL_DEVIATION'
  | 'UNKNOWN'

export type StabilityStatus = 'STABLE' | 'UNSTABLE' | 'INSUFFICIENT_DATA' | 'JITTER'

export interface CorrelatedIncident {
  id?: string
  _id?: string
  incidentId: string
  type: IncidentType
  severity: IncidentSeverity
  description?: string
  location: GeoJSONPoint
  distanceFromVehicleMeters: number
  distanceFromRouteMeters: number
}

export interface DeviationAnalysis {
  status: DeviationStatus
  distanceFromRouteMeters: number
  nearestPointOnRoute: GeoJSONPoint
  bearingDifferenceDegrees: number | null
  vehicleBearing: number | null
  routeBearing: number
  gpsStability: StabilityStatus
  sustainedDeviation: boolean
  confidence: 'HIGH' | 'LOW'
}

export interface RouteProgress {
  remainingDistanceMeters: number
  progressPercentage: number
}

export interface TrafficAnalysis {
  level: TrafficLevel
  speedKmh: number
  freeFlowSpeedKmh: number
  congestionRatio: number
  source: string
}

export interface EtaAnalysis {
  currentMinutes: number | null
  originalMinutes: number
  remainingDistanceMeters: number
  estimatedSpeedKmh: number
  status: string
}

export interface DelayAnalysis {
  delayMinutes: number
  timeSavedMinutes: number
}

export interface SituationAnalysis {
  vehicleId: string
  routeId: string
  emergencyId: string | null
  analyzedAt: string
  status: {
    route: DeviationStatus
    traffic: TrafficLevel
  }
  deviation: DeviationAnalysis
  progress: RouteProgress
  traffic: TrafficAnalysis
  eta: EtaAnalysis
  delay: DelayAnalysis
  incidents: CorrelatedIncident[]
  evidence: string[]
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
  id?: string
  _id?: string
  decisionId: string
  emergency?: string
  emergencyId?: string
  vehicle?: string
  vehicleId?: string
  primaryAction?: DecisionAction
  action?: string | DecisionAction
  severity?: DecisionSeverity
  status: DecisionStatus
  reasonCodes?: string[]
  situationHash?: string
  details?: {
    summary?: string
    reasoning?: string[]
    [key: string]: any
  }
  evaluatedAt?: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  executedAt?: string
  executionSummary?: string
  createdAt?: string
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Real-Time Predictions
// ---------------------------------------------------------------------------

export interface PredictionFactor {
  factor: string
  impact: string
  epistemicType: 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'UNKNOWN'
}

export interface PredictionResult {
  predictedEta: string
  baselineEta: string
  predictedDurationSeconds: number
  baselineDurationSeconds: number
  predictedDurationMinutes: number
  baselineDurationMinutes: number
  predictedDelaySeconds: number
  predictedDelayMinutes: number
  delayRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  routeRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
  confidenceScore?: number
  confidenceBreakdown?: string[]
  rerouteAdvised: boolean
  rerouteUrgency: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE'
  factors: PredictionFactor[]
  inputsSummary?: Record<string, unknown>
  modelVersion?: string
  trafficSource?: string
  predictedAt: string
}

// ---------------------------------------------------------------------------
// Orchestration & Epistemic Breakdown
// ---------------------------------------------------------------------------

export type WorkflowStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED'

export interface EpistemicBreakdown {
  observed: string[]
  inferred: string[]
  unknown: string[]
}

export interface OrchestrationWorkflowResult {
  workflowStatus: WorkflowStatus
  stage?: string
  reason?: string
  units?: Record<string, string>
  emergency: {
    emergencyId: string
    type?: EmergencyType
    priority: EmergencyPriority
    status: EmergencyStatus
    location?: GeoJSONPoint
    destination?: GeoJSONPoint
  }
  vehicle: {
    vehicleId: string
    registrationNumber?: string
    type?: VehicleType
    status: VehicleStatus
    driverName?: string
  }
  route: {
    routeId: string
    distanceMeters?: number
    durationSeconds?: number
    routeType?: RouteType
    status?: RouteStatus
  } | null
  trajectory: {
    location: GeoJSONPoint
    speedKmh: number
    headingDegrees?: number
    recordedAt: string
  } | null
  analysis: SituationAnalysis | { status: string; error?: string } | null
  geoAgent?: {
    recommendation?: string
    riskLevel?: string
    explanation?: string
    status?: string
    error?: string
    fallback?: boolean
  } | null
  decision?: Decision | null
  epistemicBreakdown: EpistemicBreakdown
  executionTimeMs: number
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

/** Standard list response envelope returned by vehicles, emergencies, and incidents */
export interface ListResponse<T> {
  success: true
  count: number
  data: T[]
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

// ---------------------------------------------------------------------------
// Admin Types
// ---------------------------------------------------------------------------

export interface AdminSystemCounts {
  users: number
  vehicles: number
  activeVehicles: number
  emergencies: number
  activeEmergencies: number
  incidents: number
  activeIncidents: number
  trajectories: number
  routes: number
  decisions: number
  pendingDecisions: number
  predictions: number
}

export interface AdminSystemStats {
  databaseConnected: boolean
  connectionState: string
  counts: AdminSystemCounts
  recentActivity: {
    emergenciesLast24h: number
    decisionsLast24h: number
    incidentsLast24h: number
  }
  timestamp: string
}

export interface AdminDatabaseHealth {
  status: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED'
  connected: boolean
  latencyMs: number | null
  readyState: string
  databaseName: string | null
  checkedAt: string
}

export interface AdminProviderStatus {
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED'
  provider?: string
  mode?: string
  details?: string
  engine?: string
  version?: string
}

export interface AdminSystemHealthSummary {
  database: AdminDatabaseHealth
  providers: {
    googleRoutes: AdminProviderStatus
    googleRoads: AdminProviderStatus
    geminiAi: AdminProviderStatus
    socketIo?: AdminProviderStatus
    [key: string]: AdminProviderStatus | undefined
  }
  checkedAt: string
}

export interface AdminPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminPaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: AdminPagination
}

export interface AdminQueryParams {
  page?: number
  limit?: number
  sort?: string
  sortDir?: 'asc' | 'desc' | '1' | '-1'
  [key: string]: string | number | undefined
}

