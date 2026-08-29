/**
 * Deterministic Decision Rules
 *
 * Pure functions only. No database, no I/O. Given a normalized decision context,
 * produce a structured rule evaluation.
 *
 * Design contract:
 * - The rules are AUTHORITATIVE for the operational decision.
 * - GeoAgent's recommendation is an ADVISORY input that may be accepted, ignored,
 *   or overridden — but it never replaces the deterministic safety rules.
 */

import {
  decisionConfig,
  DECISION_ACTIONS,
  DECISION_SEVERITY,
  REASON_CODES
} from './decision.constants.js';

const { criticalEtaMinutes, maxAcceptableDelayMinutes, backupTimeAdvantageMinutes } = decisionConfig;

/**
 * @typedef {Object} DecisionContext
 * @property {Object} emergency   { id, priority, status }
 * @property {Object} vehicle     { id, status }
 * @property {Object} route       { id, status }
 * @property {Object} deviation   { status, distanceFromRouteMeters }
 * @property {Object} traffic     { level }
 * @property {Object} eta         { currentMinutes, originalMinutes, delayMinutes }
 * @property {Array}  alternativeRoutes
 * @property {Array}  availableBackupVehicles
 * @property {Object} geoAgentRecommendation { action, confidence }
 */

/**
 * Routes below this delta in ETA minutes are not considered meaningfully better.
 * Keeps the engine from recommending a "faster" route that only saves 30 seconds.
 */
const MIN_ROUTE_TIME_ADVANTAGE_MINUTES = 2;

const isHighOrCriticalPriority = (priority) =>
  priority === 'CRITICAL' || priority === 'HIGH';

const isVehicleOperational = (status) =>
  ['DISPATCHED', 'EN_ROUTE', 'AT_SCENE'].includes(status);

/**
 * Heuristically scores alternative routes using deterministic criteria only.
 * Lower score is better.
 *
 * @param {Array} alternatives Array of { etaMinutes, traffic, incidentExposure }
 * @returns {Array} Scored copy with `routeScore` added
 */
export const scoreAlternativeRoutes = (alternatives = []) => {
  if (!Array.isArray(alternatives) || alternatives.length === 0) return [];

  const trafficWeight = { FREE: 0, LIGHT: 1, MODERATE: 2, HEAVY: 3, SEVERE: 4, UNKNOWN: 2 };
  const incidentWeight = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3, NONE: 0 };

  return alternatives.map((alt, idx) => {
    const etaScore = typeof alt.etaMinutes === 'number' ? alt.etaMinutes : 99;
    const trafficScore = (trafficWeight[alt.traffic] !== undefined ? trafficWeight[alt.traffic] : 2);
    const incidentScore = (incidentWeight[alt.incidentExposure] !== undefined ? incidentWeight[alt.incidentExposure] : 1);
    const total = etaScore + trafficScore + incidentScore;

    return {
      ...alt,
      candidateIndex: idx,
      routeScore: Number(total.toFixed(2))
    };
  }).sort((a, b) => a.routeScore - b.routeScore);
};

/**
 * Picks the best viable alternative (lowest score, faster than current ETA by
 * at least MIN_ROUTE_TIME_ADVANTAGE_MINUTES).
 *
 * @param {Array} scoredRoutes Output of scoreAlternativeRoutes
 * @param {Number} currentEtaMinutes
 * @returns {Object|null} Best viable alternative, or null if none improve ETA meaningfully
 */
export const pickBestAlternative = (scoredRoutes, currentEtaMinutes) => {
  if (!Array.isArray(scoredRoutes) || scoredRoutes.length === 0) return null;

  const candidates = scoredRoutes.filter((r) => {
    if (typeof r.etaMinutes !== 'number') return false;
    if (typeof currentEtaMinutes !== 'number') return true;
    return (currentEtaMinutes - r.etaMinutes) >= MIN_ROUTE_TIME_ADVANTAGE_MINUTES;
  });

  return candidates.length > 0 ? candidates[0] : null;
};

/**
 * Detects whether GeoAgent's recommendation conflicts with what the deterministic
 * rules will choose. Used to attach AI_RECOMMENDATION_CONFLICT reason code so the
 * disagreement is auditable.
 */
const detectAIConflict = (recommendedActions, aiRecommendation) => {
  if (!aiRecommendation || !aiRecommendation.action) return false;
  // MONITOR is the AI's "do nothing yet" signal; treat as agreement with CONTINUE.
  const aiAlignedAction = aiRecommendation.action === 'MONITOR'
    ? DECISION_ACTIONS.CONTINUE
    : aiRecommendation.action;

  return !recommendedActions.includes(aiAlignedAction);
};

/**
 * Evaluate all decision rules against the normalized context.
 *
 * @param {DecisionContext} context
 * @returns {{
 *   actions: string[],
 *   primaryAction: string,
 *   severity: string,
 *   reasonCodes: string[],
 *   backup: { recommended: boolean, candidateVehicleId: string|null, backupEtaMinutes: number|null, currentEtaMinutes: number|null }
 * }}
 */
export const evaluateDecisionRules = (context) => {
  const actions = new Set();
  const reasonCodes = new Set();

  // ---- Insufficient data safety net ----
  const hasMinimumData = Boolean(
    context && context.emergency && context.vehicle
  );

  if (!hasMinimumData) {
    actions.add(DECISION_ACTIONS.ALERT_CONTROL_ROOM);
    reasonCodes.add(REASON_CODES.INSUFFICIENT_DATA);
    return {
      actions: [DECISION_ACTIONS.ALERT_CONTROL_ROOM],
      primaryAction: DECISION_ACTIONS.ALERT_CONTROL_ROOM,
      severity: DECISION_SEVERITY.CRITICAL,
      reasonCodes: [REASON_CODES.INSUFFICIENT_DATA],
      backup: { recommended: false, candidateVehicleId: null, backupEtaMinutes: null, currentEtaMinutes: null }
    };
  }

  const { emergency, vehicle, route, deviation, traffic, eta, alternativeRoutes, availableBackupVehicles, geoAgentRecommendation } = context;

  // ---- Severity baseline ----
  let severity = DECISION_SEVERITY.NORMAL;

  // ---- 1. Vehicle / route status sanity ----
  if (!isVehicleOperational(vehicle.status)) {
    actions.add(DECISION_ACTIONS.ALERT_CONTROL_ROOM);
    reasonCodes.add(REASON_CODES.VEHICLE_STATUS_ABNORMAL);
    severity = DECISION_SEVERITY.CRITICAL;
  }

  if (route && route.status && route.status !== 'ACTIVE') {
    // No active route is operationally problematic
    actions.add(DECISION_ACTIONS.ALERT_CONTROL_ROOM);
    if (severity === DECISION_SEVERITY.NORMAL) severity = DECISION_SEVERITY.WARNING;
  }

  // ---- 2. Deviation-driven reroute trigger ----
  let needsReroute = false;
  if (deviation && (deviation.status === 'DEVIATED' || deviation.status === 'CRITICAL_DEVIATION')) {
    reasonCodes.add(REASON_CODES.ROUTE_DEVIATION);
    needsReroute = true;
    if (deviation.status === 'CRITICAL_DEVIATION') {
      severity = DECISION_SEVERITY.CRITICAL;
    } else if (severity === DECISION_SEVERITY.NORMAL) {
      severity = DECISION_SEVERITY.WARNING;
    }
  }

  // ---- 3. Traffic-driven reroute trigger ----
  if (traffic && (traffic.level === 'HEAVY' || traffic.level === 'SEVERE')) {
    reasonCodes.add(REASON_CODES.HEAVY_TRAFFIC);
    needsReroute = true;
    if (traffic.level === 'SEVERE' && severity !== DECISION_SEVERITY.CRITICAL) {
      severity = DECISION_SEVERITY.WARNING;
    }
  }

  // ---- 4. Delay / ETA threshold ----
  const delayMinutes = (eta && typeof eta.delayMinutes === 'number') ? eta.delayMinutes : 0;
  const currentMinutes = (eta && typeof eta.currentMinutes === 'number') ? eta.currentMinutes : null;

  if (delayMinutes > maxAcceptableDelayMinutes) {
    reasonCodes.add(REASON_CODES.HIGH_DELAY);
  }

  if (currentMinutes !== null && currentMinutes > criticalEtaMinutes) {
    severity = DECISION_SEVERITY.CRITICAL;
  }

  // ---- 5. Critical incident blocking route ----
  const correlatedCriticalIncident = Array.isArray(context.correlatedIncidents)
    ? context.correlatedIncidents.find((i) => i.severity === 'CRITICAL' && i.status === 'ACTIVE')
    : null;

  if (correlatedCriticalIncident) {
    reasonCodes.add(REASON_CODES.CRITICAL_INCIDENT);
    reasonCodes.add(REASON_CODES.ROAD_BLOCKED);
    needsReroute = true;
    severity = DECISION_SEVERITY.CRITICAL;
  }

  // ---- 6. Alternative route viability check ----
  const scoredAlternatives = scoreAlternativeRoutes(alternativeRoutes);
  const bestAlternative = pickBestAlternative(scoredAlternatives, currentMinutes);

  if (needsReroute) {
    if (bestAlternative) {
      actions.add(DECISION_ACTIONS.REROUTE);
      reasonCodes.add(REASON_CODES.ALTERNATIVE_ROUTE_AVAILABLE);
    } else {
      // We want to reroute but no viable alternative; escalate rather than invent one.
      actions.add(DECISION_ACTIONS.ALERT_CONTROL_ROOM);
      reasonCodes.add(REASON_CODES.ROAD_BLOCKED);
    }
  }

  // ---- 7. Backup evaluation ----
  let backupRecommended = false;
  let backupCandidateId = null;
  let backupEtaMinutes = null;

  if (isHighOrCriticalPriority(emergency.priority)) {
    reasonCodes.add(
      emergency.priority === 'CRITICAL'
        ? REASON_CODES.CRITICAL_EMERGENCY
        : REASON_CODES.HIGH_PRIORITY_EMERGENCY
    );

    const etaExceedsThreshold = currentMinutes !== null && currentMinutes > criticalEtaMinutes;
    const delayExceedsAcceptable = delayMinutes > maxAcceptableDelayMinutes;

    if ((etaExceedsThreshold || delayExceedsAcceptable) && Array.isArray(availableBackupVehicles) && availableBackupVehicles.length > 0) {
      // Pick fastest backup that meaningfully beats current ETA
      const sortedBackups = [...availableBackupVehicles]
        .filter((b) => typeof b.estimatedArrivalMinutes === 'number')
        .sort((a, b) => a.estimatedArrivalMinutes - b.estimatedArrivalMinutes);

      const candidate = sortedBackups.find((b) => {
        if (currentMinutes === null) return true;
        return (currentMinutes - b.estimatedArrivalMinutes) >= backupTimeAdvantageMinutes;
      });

      if (candidate) {
        backupRecommended = true;
        backupCandidateId = candidate.vehicleId || null;
        backupEtaMinutes = candidate.estimatedArrivalMinutes;
        actions.add(DECISION_ACTIONS.CONSIDER_BACKUP);
        reasonCodes.add(REASON_CODES.BACKUP_AVAILABLE);
        reasonCodes.add(REASON_CODES.BACKUP_FASTER);
        if (severity === DECISION_SEVERITY.NORMAL) severity = DECISION_SEVERITY.WARNING;
      }
    }
  }

  // ---- 8. Default CONTINUE / NO_ACTION ----
  if (actions.size === 0) {
    actions.add(DECISION_ACTIONS.CONTINUE);
    reasonCodes.add(REASON_CODES.OPERATIONAL_BASELINE);
  }

  // GeoAgent conflict detection — informational, never blocks approval
  if (detectAIConflict([...actions], geoAgentRecommendation)) {
    reasonCodes.add(REASON_CODES.AI_RECOMMENDATION_CONFLICT);
  }

  // ---- Pick primary action with deterministic priority order ----
  const PRIORITY_ORDER = [
    DECISION_ACTIONS.ALERT_CONTROL_ROOM,
    DECISION_ACTIONS.REROUTE,
    DECISION_ACTIONS.CONSIDER_BACKUP,
    DECISION_ACTIONS.CONTINUE,
    DECISION_ACTIONS.NO_ACTION
  ];

  const sortedActions = PRIORITY_ORDER.filter((a) => actions.has(a));
  const actionsList = sortedActions.length > 0 ? sortedActions : [DECISION_ACTIONS.NO_ACTION];
  const primaryAction = actionsList[0];

  return {
    actions: actionsList,
    primaryAction,
    severity,
    reasonCodes: [...reasonCodes],
    backup: {
      recommended: backupRecommended,
      candidateVehicleId: backupCandidateId,
      backupEtaMinutes,
      currentEtaMinutes: currentMinutes
    }
  };
};

export default {
  evaluateDecisionRules,
  scoreAlternativeRoutes,
  pickBestAlternative
};