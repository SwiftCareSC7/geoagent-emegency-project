/**
 * Decision & Dispatch Engine — Constants, Thresholds, Enumerations
 *
 * Thresholds are prototype policy values, NOT medically validated.
 * They are tunable via environment variables.
 */

export const decisionConfig = {
  // Critical ETA threshold: if current ETA exceeds this (minutes), consider it critical
  criticalEtaMinutes: parseFloat(process.env.CRITICAL_ETA_THRESHOLD_MINUTES) || 15,

  // Maximum acceptable delay (minutes) before backup / reroute is considered
  maxAcceptableDelayMinutes: parseFloat(process.env.MAX_ACCEPTABLE_DELAY_MINUTES) || 8,

  // Backup must arrive at least this many minutes faster than current ETA to be recommended
  backupTimeAdvantageMinutes: parseFloat(process.env.BACKUP_TIME_ADVANTAGE_MINUTES) || 5,

  // Critical deviation distance (meters) — overrides per-part-7 settings if explicitly set
  criticalDeviationDistanceMeters: parseFloat(process.env.CRITICAL_DEVIATION_DISTANCE_METERS) || 250,

  // Maximum distance (km) we will search for backup vehicles around the emergency location
  backupSearchRadiusKm: parseFloat(process.env.BACKUP_SEARCH_RADIUS_KM) || 10,

  // Maximum alternative route candidates considered
  maxAlternativeRoutes: parseInt(process.env.MAX_ALTERNATIVE_ROUTES, 10) || 3
};

export const DECISION_ACTIONS = Object.freeze({
  CONTINUE: 'CONTINUE',
  REROUTE: 'REROUTE',
  CONSIDER_BACKUP: 'CONSIDER_BACKUP',
  ALERT_CONTROL_ROOM: 'ALERT_CONTROL_ROOM',
  NO_ACTION: 'NO_ACTION'
});

export const ALL_DECISION_ACTIONS = Object.freeze(Object.values(DECISION_ACTIONS));

export const DECISION_SEVERITY = Object.freeze({
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
});

export const ALL_DECISION_SEVERITY = Object.freeze(Object.values(DECISION_SEVERITY));

export const DECISION_STATUS = Object.freeze({
  PENDING_OPERATOR_ACTION: 'PENDING_OPERATOR_ACTION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXECUTED: 'EXECUTED',
  CANCELLED: 'CANCELLED'
});

export const ALL_DECISION_STATUS = Object.freeze(Object.values(DECISION_STATUS));

export const REASON_CODES = Object.freeze({
  ROUTE_DEVIATION: 'ROUTE_DEVIATION',
  HIGH_DELAY: 'HIGH_DELAY',
  HEAVY_TRAFFIC: 'HEAVY_TRAFFIC',
  CRITICAL_INCIDENT: 'CRITICAL_INCIDENT',
  ROAD_BLOCKED: 'ROAD_BLOCKED',
  ALTERNATIVE_ROUTE_AVAILABLE: 'ALTERNATIVE_ROUTE_AVAILABLE',
  CRITICAL_EMERGENCY: 'CRITICAL_EMERGENCY',
  HIGH_PRIORITY_EMERGENCY: 'HIGH_PRIORITY_EMERGENCY',
  BACKUP_AVAILABLE: 'BACKUP_AVAILABLE',
  BACKUP_FASTER: 'BACKUP_FASTER',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  AI_RECOMMENDATION_CONFLICT: 'AI_RECOMMENDATION_CONFLICT',
  OPERATIONAL_BASELINE: 'OPERATIONAL_BASELINE',
  VEHICLE_STATUS_ABNORMAL: 'VEHICLE_STATUS_ABNORMAL'
});

export const ALL_REASON_CODES = Object.freeze(Object.values(REASON_CODES));

/**
 * Allowed state transitions. Keys are the current state, values are arrays of valid next states.
 */
export const DECISION_TRANSITIONS = Object.freeze({
  [DECISION_STATUS.PENDING_OPERATOR_ACTION]: [DECISION_STATUS.APPROVED, DECISION_STATUS.REJECTED, DECISION_STATUS.CANCELLED],
  [DECISION_STATUS.APPROVED]: [DECISION_STATUS.EXECUTED, DECISION_STATUS.CANCELLED],
  [DECISION_STATUS.REJECTED]: [],
  [DECISION_STATUS.EXECUTED]: [],
  [DECISION_STATUS.CANCELLED]: []
});

export default {
  decisionConfig,
  DECISION_ACTIONS,
  ALL_DECISION_ACTIONS,
  DECISION_SEVERITY,
  ALL_DECISION_SEVERITY,
  DECISION_STATUS,
  ALL_DECISION_STATUS,
  REASON_CODES,
  ALL_REASON_CODES,
  DECISION_TRANSITIONS
};