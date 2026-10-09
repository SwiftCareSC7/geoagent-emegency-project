/**
 * Real-Time ETA & Delay Prediction Service
 *
 * Implements a transparent, defensible prediction model using real observed telemetry:
 * - Rolling speed estimation & exponential smoothing
 * - Route remaining distance
 * - Google traffic-aware travel duration vs baseline static duration
 * - Deviation status and cross-track penalties
 * - Proximity and severity of correlated corridor incidents
 * - Evidence-based confidence scoring
 */

import Prediction from './prediction.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import deviationService from '../deviation/deviation.service.js';
import trafficService from '../traffic/traffic.service.js';
import analysisService from './analysis.service.js';
import corridorGreenWaveService from '../routes/corridorGreenWave.service.js';
import { deviationConfig } from '../deviation/deviation.config.js';
import { calculateRouteProgress } from '../../shared/services/geospatial.service.js';
import realtimeService from '../realtime/realtime.service.js';

export const deriveRouteDegradationReasons = ({
  route,
  latestTrajectory,
  recentTrajectories = [],
  deviation,
  traffic,
  incidents = [],
  prediction,
  nowMs = Date.now()
}) => {
  if (!route) return [];

  const reasons = [];
  const isDeviated = deviation && ['DEVIATED', 'CRITICAL_DEVIATION'].includes(deviation.status);
  if (isDeviated && deviation.gpsStability === 'STABLE' && deviation.sustainedDeviation === true) {
    reasons.push('SUSTAINED_DEVIATION');
  }

  if (Array.isArray(incidents) && incidents.some((incident) =>
    incident.status === 'ACTIVE' &&
    ['ROAD_CLOSURE', 'ROADBLOCK', 'LANE_BLOCKAGE'].includes(incident.type) &&
    Number.isFinite(incident.distanceFromRouteMeters) &&
    incident.distanceFromRouteMeters <= deviationConfig.warningDistanceMeters
  )) {
    reasons.push('ACTIVE_ROUTE_BLOCKAGE');
  }

  const trafficFreshness = trafficService.assessTrafficFreshness(traffic, nowMs).status;
  if (
    trafficFreshness === 'FRESH' && ['HEAVY', 'SEVERE'].includes(traffic?.level) &&
    prediction?.rerouteAdvised === true
  ) {
    reasons.push('FRESH_TRAFFIC_DEGRADATION');
  }

  const telemetryAt = latestTrajectory ? new Date(latestTrajectory.timestamp).getTime() : NaN;
  const telemetryAgeMs = nowMs - telemetryAt;
  if (
    prediction?.rerouteAdvised === true && prediction.predictedDelayMinutes >= 5 &&
    Number.isFinite(telemetryAgeMs) && telemetryAgeMs >= 0 && telemetryAgeMs <= 60_000 &&
    recentTrajectories.length >= deviationConfig.gpsStabilityWindow &&
    deviation?.gpsStability === 'STABLE'
  ) {
    reasons.push('SUSTAINED_ETA_DELAY');
  }

  return reasons.sort();
};

/** Advance a debounced, hysteretic degradation state without performing I/O. */
export const advanceRouteDegradationState = (
  previousState,
  routeId,
  reasonCodes = [],
  { confirmations = 2, recoveryConfirmations = 2, allowDecisionTrigger = true } = {}
) => {
  const sameRoute = previousState && previousState.routeId === routeId;
  const state = sameRoute
    ? { ...previousState }
    : { routeId, candidateKey: null, candidateCount: 0, activeKey: null, activeReasonCodes: [], recoveryCount: 0, decisionRequested: false };
  const reasons = [...new Set(Array.isArray(reasonCodes) ? reasonCodes : [])].sort();

  if (reasons.length === 0) {
    state.candidateKey = null;
    state.candidateCount = 0;
    if (!state.activeKey) {
      state.recoveryCount = 0;
      return {
        state,
        signal: { status: 'CLEAR', active: false, confirmed: false, reasonCodes: [], observations: 0, shouldReevaluate: false }
      };
    }

    state.recoveryCount += 1;
    if (state.recoveryCount >= recoveryConfirmations) {
      state.activeKey = null;
      state.activeReasonCodes = [];
      state.recoveryCount = 0;
      state.decisionRequested = false;
      return {
        state,
        signal: { status: 'RECOVERED', active: false, confirmed: false, reasonCodes: [], observations: 0, shouldReevaluate: false }
      };
    }

    return {
      state,
      signal: {
        status: 'RECOVERING',
        active: true,
        confirmed: true,
        reasonCodes: state.activeReasonCodes,
        observations: state.recoveryCount,
        shouldReevaluate: false
      }
    };
  }

  const candidateKey = reasons.join('|');
  state.recoveryCount = 0;
  if (candidateKey === state.activeKey) {
    state.candidateKey = null;
    state.candidateCount = 0;
    const shouldReevaluate = !state.decisionRequested && allowDecisionTrigger;
    if (shouldReevaluate) state.decisionRequested = true;
    return {
      state,
      signal: {
        status: 'SUSTAINED',
        active: true,
        confirmed: true,
        reasonCodes: reasons,
        observations: confirmations,
        shouldReevaluate,
        decisionRequestPending: !state.decisionRequested
      }
    };
  }

  if (candidateKey === state.candidateKey) {
    state.candidateCount += 1;
  } else {
    state.candidateKey = candidateKey;
    state.candidateCount = 1;
  }

  if (state.candidateCount >= confirmations) {
    const shouldReevaluate = candidateKey !== state.activeKey && allowDecisionTrigger;
    state.activeKey = candidateKey;
    state.activeReasonCodes = reasons;
    state.decisionRequested = shouldReevaluate;
    state.candidateKey = null;
    state.candidateCount = 0;
    return {
      state,
      signal: {
        status: 'SUSTAINED',
        active: true,
        confirmed: true,
        reasonCodes: reasons,
        observations: confirmations,
        shouldReevaluate,
        decisionRequestPending: !state.decisionRequested
      }
    };
  }

  return {
    state,
    signal: {
      status: 'PENDING',
      active: Boolean(state.activeKey),
      confirmed: Boolean(state.activeKey),
      reasonCodes: reasons,
      observations: state.candidateCount,
      shouldReevaluate: false
    }
  };
};

class PredictionService {
  constructor() {
    this.modelVersion = 'v1.3-exponential-traffic-blend';
    // Alpha for exponential smoothing of speed
    this.speedAlpha = 0.4;
    // Throttle snapshot saves: min 30 seconds between writes per vehicle
    this.lastSavedTimes = new Map();
    this.routeDegradationStates = new Map();
  }

  updateRouteDegradationSignal(vehicleId, routeId, reasonCodes, allowDecisionTrigger) {
    const result = advanceRouteDegradationState(
      this.routeDegradationStates.get(vehicleId),
      routeId,
      reasonCodes,
      {
        confirmations: deviationConfig.routeDegradationConfirmations,
        recoveryConfirmations: deviationConfig.routeRecoveryConfirmations,
        allowDecisionTrigger
      }
    );
    this.routeDegradationStates.set(vehicleId, result.state);
    return result.signal;
  }

  markRouteDegradationDecisionFailure(vehicleId, routeId) {
    const state = this.routeDegradationStates.get(vehicleId);
    if (state && state.routeId === routeId) {
      state.decisionRequested = false;
    }
  }

  /**
   * Calculates rolling exponential moving average (EMA) speed from recent fixes
   * @param {Array<Object>} trajectories Descending sorted trajectories
   * @returns {Object} { emaSpeedKmh, trend, speedDeltaKmh }
   */
  calculateSpeedTrend(trajectories = []) {
    if (!Array.isArray(trajectories) || trajectories.length === 0) {
      return { emaSpeedKmh: 30, trend: 'STABLE', speedDeltaKmh: 0 };
    }

    // Trajectories are sorted newest first
    const speeds = trajectories.map((t) => (typeof t.speed === 'number' ? t.speed : 0));
    
    // EMA calculation from oldest to newest
    const chronological = [...speeds].reverse();
    let ema = chronological[0];
    for (let i = 1; i < chronological.length; i++) {
      ema = this.speedAlpha * chronological[i] + (1 - this.speedAlpha) * ema;
    }

    // Trend: compare recent half vs older half
    let trend = 'STABLE';
    let speedDelta = 0;
    if (speeds.length >= 4) {
      const half = Math.floor(speeds.length / 2);
      const recentAvg = speeds.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const olderAvg = speeds.slice(half).reduce((a, b) => a + b, 0) / (speeds.length - half);
      speedDelta = Number((recentAvg - olderAvg).toFixed(1));

      if (speedDelta < -4.0) {
        trend = 'DECELERATING';
      } else if (speedDelta > 4.0) {
        trend = 'ACCELERATING';
      }
    }

    return {
      emaSpeedKmh: Number(ema.toFixed(1)),
      trend,
      speedDeltaKmh: speedDelta
    };
  }

  /**
   * Evidence-based confidence evaluation
   * @param {Object} context
   * @returns {Object} { level: 'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN', score: number, breakdown: Array }
   */
  evaluateConfidence({ recentTrajectories, latestTrajectory, deviation, traffic, incidents, trafficFreshness }) {
    let score = 0;
    const breakdown = [];

    // 1. Trajectory point density (max 25 pts)
    const fixCount = recentTrajectories ? recentTrajectories.length : 0;
    if (fixCount >= 5) {
      score += 25;
      breakdown.push(`High GPS sample density (${fixCount} fixes in window)`);
    } else if (fixCount >= 2) {
      score += 15;
      breakdown.push(`Moderate GPS sample density (${fixCount} fixes)`);
    } else {
      score += 5;
      breakdown.push('Low GPS sample density (<2 fixes)');
    }

    // 2. Telemetry freshness (max 25 pts)
    const now = Date.now();
    const fixAgeMs = latestTrajectory ? Math.max(0, now - new Date(latestTrajectory.timestamp).getTime()) : Infinity;
    if (fixAgeMs < 15 * 1000) {
      score += 25;
      breakdown.push('Real-time telemetry fix (<15s old)');
    } else if (fixAgeMs < 60 * 1000) {
      score += 15;
      breakdown.push(`Slightly aged telemetry (${Math.round(fixAgeMs / 1000)}s old)`);
    } else {
      score += 0;
      breakdown.push('Aged telemetry (>60s old)');
    }

    // 3. GPS stability (max 20 pts)
    if (deviation && deviation.gpsStability === 'STABLE') {
      score += 20;
      breakdown.push('Stable GPS signal without cross-track oscillation');
    } else {
      score += 5;
      breakdown.push('GPS jitter or unstable fix pattern');
    }

    // 4. Traffic source (max 20 pts)
    if (trafficFreshness === 'FRESH' && traffic && (traffic.source === 'GOOGLE_ROUTES_TRAFFIC_DERIVED' || traffic.source === 'GOOGLE')) {
      score += 20;
      breakdown.push('Fresh traffic data derived from Google Routes API');
    } else if (trafficFreshness === 'FRESH' && traffic && traffic.source === 'MOCK') {
      score += 10;
      breakdown.push('Fresh traffic data from deterministic local simulation');
    } else {
      score += 0;
      breakdown.push(`Traffic data ${String(trafficFreshness || 'UNKNOWN').toLowerCase()}; excluded from ETA speed input`);
    }

    // 5. Corridor hazard inspection (max 10 pts)
    if (Array.isArray(incidents)) {
      score += 10;
      breakdown.push('Corridor hazard scanning active');
    }

    const normalizedScore = Number((score / 100).toFixed(2));
    let level = 'LOW';
    if (normalizedScore >= 0.75) level = 'HIGH';
    else if (normalizedScore >= 0.45) level = 'MEDIUM';
    else if (normalizedScore >= 0.20) level = 'LOW';
    else level = 'UNKNOWN';

    return {
      level,
      score: normalizedScore,
      breakdown
    };
  }

  /**
   * Pure deterministic prediction calculator
   * @param {Object} params
   * @returns {Object} Structured prediction result
   */
  calculatePrediction({
    latestTrajectory,
    recentTrajectories = [],
    route,
    progress,
    deviation,
    traffic,
    incidents = [],
    historicalSpeedKmh = null,
    v2x = null
  }) {
    const factors = [];
    const now = Date.now();
    const correlatedIncidents = Array.isArray(incidents) ? incidents : [];

    // 1. Baseline Route Metrics
    const baselineDurationSeconds = route && route.duration ? route.duration : 600;
    const baselineDistanceMeters = route && route.distance ? route.distance : 5000;
    const remainingDistanceMeters = progress && typeof progress.remainingDistanceMeters === 'number'
      ? progress.remainingDistanceMeters
      : baselineDistanceMeters;
    
    const remainingFraction = Math.max(0.01, Math.min(1.0, remainingDistanceMeters / Math.max(1, baselineDistanceMeters)));
    const baselineRemainingSeconds = Math.round(baselineDurationSeconds * remainingFraction);
    const baselineEta = new Date(now + baselineRemainingSeconds * 1000).toISOString();

    // 2. Rolling Vehicle Speed & Trend
    const { emaSpeedKmh, trend, speedDeltaKmh } = this.calculateSpeedTrend(recentTrajectories);
    factors.push({
      factor: `Vehicle speed averaged ${emaSpeedKmh} km/h (trend: ${trend}${speedDeltaKmh !== 0 ? ` ${speedDeltaKmh > 0 ? '+' : ''}${speedDeltaKmh} km/h` : ''})`,
      impact: trend === 'DECELERATING' ? 'SLOWDOWN_DETECTED' : 'NORMAL_PROGRESS',
      epistemicType: 'OBSERVED'
    });

    // 3. Traffic Speed Blend
    const trafficStatus = trafficService.assessTrafficFreshness(traffic, now);
    const usableTrafficSpeed = trafficStatus.status === 'FRESH' &&
      typeof traffic?.speedKmh === 'number' && Number.isFinite(traffic.speedKmh) && traffic.speedKmh > 0;
    let effectiveSpeedKmh = emaSpeedKmh;
    if (usableTrafficSpeed) {
      if (emaSpeedKmh > 10) {
        effectiveSpeedKmh = 0.5 * emaSpeedKmh + 0.5 * traffic.speedKmh;
      } else {
        effectiveSpeedKmh = 0.2 * emaSpeedKmh + 0.8 * traffic.speedKmh;
      }
    }

    // Historical speed benchmark blend (if available, gently weight 15% historical to smooth erratic traffic swings)
    if (typeof historicalSpeedKmh === 'number' && historicalSpeedKmh > 5) {
      factors.push({
        factor: `Historical corridor speed benchmark for vehicle: ${historicalSpeedKmh} km/h`,
        impact: 'HISTORICAL_BASELINE',
        epistemicType: 'DERIVED'
      });
      effectiveSpeedKmh = 0.85 * effectiveSpeedKmh + 0.15 * historicalSpeedKmh;
    }

    // Safety guard
    effectiveSpeedKmh = Math.max(5, effectiveSpeedKmh);

    factors.push({
      factor: trafficStatus.status === 'FRESH'
        ? `Traffic data is fresh (${traffic.level || 'level unavailable'}${trafficStatus.ageSeconds === null ? '' : `, ${trafficStatus.ageSeconds}s old`})`
        : `Traffic data is ${trafficStatus.status.toLowerCase()} and is excluded from ETA speed input`,
      impact: trafficStatus.status === 'FRESH'
        ? (traffic.level === 'HEAVY' || traffic.level === 'SEVERE' ? 'TRAFFIC_DELAY' : 'TRAFFIC_CONTEXT')
        : `TRAFFIC_${trafficStatus.status}`,
      epistemicType: trafficStatus.status === 'FRESH' ? (traffic.epistemicType || 'DERIVED') : 'UNKNOWN'
    });

    // Speed-based duration remaining: distance (m) / speed (m/s)
    const speedMps = effectiveSpeedKmh / 3.6;
    let predictedRemainingSeconds = Math.round(remainingDistanceMeters / speedMps);

    // Traffic-aware speed already reflects traffic duration. Apply delay only when speed is absent.
    let trafficDelayAppliedSeconds = 0;
    if (
      trafficStatus.status === 'FRESH' && !usableTrafficSpeed &&
      typeof traffic?.trafficDelaySeconds === 'number' && Number.isFinite(traffic.trafficDelaySeconds) &&
      traffic.trafficDelaySeconds > 0
    ) {
      trafficDelayAppliedSeconds = Math.round(traffic.trafficDelaySeconds * remainingFraction);
      predictedRemainingSeconds += trafficDelayAppliedSeconds;
      factors.push({
        factor: `Fresh provider traffic delay adds ${Math.round(trafficDelayAppliedSeconds / 60)} min; no traffic speed was supplied`,
        impact: 'CONGESTION_PENALTY',
        epistemicType: 'DERIVED'
      });
    } else if (trafficStatus.status === 'FRESH' && usableTrafficSpeed && traffic?.trafficDelaySeconds > 0) {
      factors.push({
        factor: 'Traffic-aware speed already reflects the reported traffic delay; delay was not added a second time',
        impact: 'TRAFFIC_DELAY_INCLUDED_IN_SPEED',
        epistemicType: 'DERIVED'
      });
    }

    // Incidents remain explicit risk evidence; no unverified duration is added on top of traffic.
    for (const inc of correlatedIncidents) {
      const incidentDistances = [];
      if (Number.isFinite(inc.distanceFromVehicleMeters)) {
        incidentDistances.push(`${Math.round(inc.distanceFromVehicleMeters)}m from vehicle`);
      }
      if (Number.isFinite(inc.distanceFromRouteMeters)) {
        incidentDistances.push(`${Math.round(inc.distanceFromRouteMeters)}m from planned route`);
      }
      const distanceContext = incidentDistances.length > 0 ? ` (${incidentDistances.join(', ')})` : '';
      factors.push({
        factor: `Reported ${inc.type || 'incident'} (${inc.severity || 'severity unknown'})${distanceContext}; no separate delay estimated`,
        impact: 'INCIDENT_RISK',
        epistemicType: 'OBSERVED'
      });
    }

    // 6. Deviation Penalties
    let deviationDelaySec = 0;
    if (deviation && (deviation.status === 'DEVIATED' || deviation.status === 'CRITICAL_DEVIATION')) {
      deviationDelaySec = deviation.status === 'CRITICAL_DEVIATION' ? 240 : 120;
      predictedRemainingSeconds += deviationDelaySec;
      factors.push({
        factor: `Vehicle is off planned route by ${Math.round(deviation.distanceFromRouteMeters || 0)}m (${deviation.status})`,
        impact: 'REROUTING_OVERHEAD',
        epistemicType: 'OBSERVED'
      });
    }

    // 6b. V2X Green-Wave Preemption Benefit
    let greenWaveSavingsSec = 0;
    if (v2x && v2x.corridorSummary && v2x.corridorSummary.preemptedCount > 0) {
      greenWaveSavingsSec = Math.min(predictedRemainingSeconds - 60, Math.round(v2x.corridorSummary.preemptedCount * 45));
      if (greenWaveSavingsSec > 0) {
        predictedRemainingSeconds = Math.max(60, predictedRemainingSeconds - greenWaveSavingsSec);
        factors.push({
          factor: `V2X Green-Wave preemption active across ${v2x.corridorSummary.preemptedCount} signal(s) (-${(greenWaveSavingsSec / 60).toFixed(1)} min savings)`,
          impact: 'PREEMPTION_ADVANTAGE',
          epistemicType: 'OBSERVED'
        });
      }
    }

    // 7. Compute Delay & Risk
    const predictedDelaySeconds = Math.max(0, predictedRemainingSeconds - baselineRemainingSeconds);
    const predictedDelayMinutes = Number((predictedDelaySeconds / 60).toFixed(1));
    const predictedEta = new Date(now + predictedRemainingSeconds * 1000).toISOString();

    factors.push({
      factor: `Model estimates net delay of ${predictedDelayMinutes} min relative to baseline planned arrival`,
      impact: predictedDelayMinutes > 4 ? 'SIGNIFICANT_DELAY' : 'MINIMAL_VARIANCE',
      epistemicType: 'INFERRED'
    });

    // Delay risk classification
    let delayRisk = 'LOW';
    if (predictedDelayMinutes >= 8) delayRisk = 'CRITICAL';
    else if (predictedDelayMinutes >= 5) delayRisk = 'HIGH';
    else if (predictedDelayMinutes >= 2) delayRisk = 'MEDIUM';

    // Route risk classification
    let routeRisk = 'LOW';
    if (deviation && deviation.status === 'CRITICAL_DEVIATION') routeRisk = 'CRITICAL';
    else if (correlatedIncidents.some((i) => i.type === 'ROAD_CLOSURE' || i.type === 'ROADBLOCK')) routeRisk = 'CRITICAL';
    else if (deviation && deviation.status === 'DEVIATED') routeRisk = 'HIGH';
    else if (delayRisk === 'CRITICAL' || delayRisk === 'HIGH') routeRisk = 'HIGH';
    else if (delayRisk === 'MEDIUM' || (trafficStatus.status === 'FRESH' && traffic && traffic.level === 'HEAVY')) routeRisk = 'MEDIUM';

    // Reroute advisability
    const rerouteAdvised = routeRisk === 'CRITICAL' || routeRisk === 'HIGH' || predictedDelayMinutes >= 5;
    let rerouteUrgency = 'NONE';
    if (routeRisk === 'CRITICAL') rerouteUrgency = 'IMMEDIATE';
    else if (routeRisk === 'HIGH') rerouteUrgency = 'HIGH';
    else if (routeRisk === 'MEDIUM') rerouteUrgency = 'MEDIUM';

    // 8. Evaluate Evidence-Based Confidence
    const confidenceResult = this.evaluateConfidence({
      recentTrajectories,
      latestTrajectory,
      deviation,
      traffic,
      incidents: correlatedIncidents,
      trafficFreshness: trafficStatus.status
    });

    return {
      predictedEta,
      baselineEta,
      predictedDurationSeconds: predictedRemainingSeconds,
      baselineDurationSeconds: baselineRemainingSeconds,
      predictedDurationMinutes: Number((predictedRemainingSeconds / 60).toFixed(1)),
      baselineDurationMinutes: Number((baselineRemainingSeconds / 60).toFixed(1)),
      predictedDelaySeconds,
      predictedDelayMinutes,
      delayRisk,
      routeRisk,
      confidence: confidenceResult.level,
      confidenceScore: confidenceResult.score,
      confidenceBreakdown: confidenceResult.breakdown,
      rerouteAdvised,
      rerouteUrgency,
      factors,
      inputsSummary: {
        remainingDistanceMeters: Number(remainingDistanceMeters.toFixed(1)),
        effectiveSpeedKmh: Number(effectiveSpeedKmh.toFixed(1)),
        emaSpeedKmh,
        speedTrend: trend,
        trafficLevel: traffic ? traffic.level : 'UNKNOWN',
        trafficFreshness: trafficStatus.status,
        trafficAgeSeconds: trafficStatus.ageSeconds,
        trafficDelayAppliedSeconds,
        deviationStatus: deviation ? deviation.status : 'UNKNOWN',
        incidentCount: correlatedIncidents.length,
        incidentImpactStatus: correlatedIncidents.length > 0 ? 'QUALITATIVE_ONLY' : 'NONE'
      },
      modelVersion: this.modelVersion,
      trafficSource: traffic ? traffic.source : 'UNKNOWN',
      trafficFreshness: trafficStatus.status,
      predictedAt: new Date().toISOString()
    };
  }

  /**
   * Generates a real-time prediction for a vehicle and conditionally stores snapshot
   * @param {String} vehicleId
   * @returns {Promise<Object>}
   */
  async predictForVehicle(vehicleId, { triggerDecision = true } = {}) {
    const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
    if (!vehicle) {
      const error = new Error('Vehicle not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    const route = await Route.findOne({ vehicle: vehicle._id, status: 'ACTIVE' })
      .sort({ createdAt: -1 })
      .populate('emergency', 'emergencyId status priority');

    const recentTrajectories = await Trajectory.find({ vehicle: vehicle._id })
      .sort({ timestamp: -1 })
      .limit(10);

    if (!recentTrajectories || recentTrajectories.length === 0) {
      const error = new Error('No trajectory data available to compute prediction');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    const latestTrajectory = recentTrajectories[0];

    // Compute progress & deviation if route exists
    let progress = null;
    let deviation = null;
    let traffic = null;
    let incidents = [];

    if (route) {
      progress = calculateRouteProgress(latestTrajectory.location, route.geometry);
      deviation = deviationService.analyzeDeviation(
        latestTrajectory.location,
        route,
        recentTrajectories,
        latestTrajectory.heading
      );
      traffic = await trafficService.getTrafficForRoute(route.geometry);
      incidents = await analysisService.getCorrelatedIncidents(latestTrajectory.location, route.geometry);
    } else {
      traffic = await trafficService.getTrafficForLocation(latestTrajectory.location);
    }

    // Query vehicle-scoped historical trajectory speed benchmark (avoiding cross-vehicle / cross-emergency leakage)
    let historicalSpeedKmh = null;
    try {
      const pastTrajectories = await Trajectory.find({ vehicle: vehicle._id })
        .sort({ timestamp: -1 })
        .skip(10)
        .limit(20)
        .select('speed');
      if (pastTrajectories && pastTrajectories.length >= 5) {
        const validSpeeds = pastTrajectories
          .map((p) => (typeof p.speed === 'number' ? p.speed : 0))
          .filter((s) => s > 5);
        if (validSpeeds.length > 0) {
          historicalSpeedKmh = Number((validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length).toFixed(1));
        }
      }
    } catch {
      // Non-blocking query
    }

    let v2x = null;
    try {
      v2x = await corridorGreenWaveService.analyzeCorridorForVehicle(vehicleId, { silent: true });
    } catch {
      // Non-blocking if corridor cannot be evaluated
    }

    const prediction = this.calculatePrediction({
      latestTrajectory,
      recentTrajectories,
      route,
      progress,
      deviation,
      traffic,
      incidents,
      historicalSpeedKmh,
      v2x
    });

    const routeDegradationReasons = deriveRouteDegradationReasons({
      route,
      latestTrajectory,
      recentTrajectories,
      deviation,
      traffic,
      incidents,
      prediction
    });
    const activeRouteId = route
      ? `${route.routeId || route._id.toString()}:${route.__v ?? route.updatedAt?.getTime?.() ?? 'unknown'}`
      : null;
    const routeDegradationSignal = this.updateRouteDegradationSignal(
      vehicleId,
      activeRouteId,
      routeDegradationReasons,
      triggerDecision
    );
    prediction.routeDegradationSignal = routeDegradationSignal;
    prediction.inputsSummary.routeDegradationStatus = routeDegradationSignal.status;
    prediction.inputsSummary.routeDegradationReasons = routeDegradationSignal.reasonCodes;

    const emergencyId = route && route.emergency ? route.emergency.emergencyId : null;

    // Conditionally persist snapshot if delay is meaningful or at least 60s elapsed
    const lastSaved = this.lastSavedTimes.get(vehicleId) || 0;
    const shouldSave = (prediction.predictedDelayMinutes >= 2) || ((Date.now() - lastSaved) > 60000);

    if (shouldSave) {
      try {
        const snapshot = new Prediction({
          emergency: route && route.emergency ? route.emergency._id : undefined,
          vehicle: vehicle._id,
          route: route ? route._id : undefined,
          predictedEta: new Date(prediction.predictedEta),
          baselineEta: new Date(prediction.baselineEta),
          predictedDurationSeconds: prediction.predictedDurationSeconds,
          baselineDurationSeconds: prediction.baselineDurationSeconds,
          predictedDelaySeconds: prediction.predictedDelaySeconds,
          predictedDelayMinutes: prediction.predictedDelayMinutes,
          delayRisk: prediction.delayRisk,
          routeRisk: prediction.routeRisk,
          confidence: prediction.confidence,
          confidenceScore: prediction.confidenceScore,
          rerouteAdvised: prediction.rerouteAdvised,
          rerouteUrgency: prediction.rerouteUrgency,
          factors: prediction.factors,
          inputsSummary: prediction.inputsSummary,
          modelVersion: prediction.modelVersion,
          trafficSource: prediction.trafficSource
        });
        await snapshot.save();
        this.lastSavedTimes.set(vehicleId, Date.now());
      } catch (err) {
        console.warn(`[PredictionService] Snapshot save warning: ${err.message}`);
      }
    }

    // Emit Real-Time Socket.IO event
    try {
      realtimeService.emitPredictionUpdated(emergencyId, vehicleId, {
        vehicleId,
        emergencyId,
        ...prediction
      });
    } catch (err) {
      console.warn(`[PredictionService] Real-time socket emission warning: ${err.message}`);
    }

    // Re-evaluate only on a newly confirmed route-degradation state; route changes remain human-approved.
    // GeoAgent passes triggerDecision:false: decision -> GeoAgent -> prediction -> decision would recurse.
    if (emergencyId && triggerDecision && routeDegradationSignal.shouldReevaluate) {
      // Dynamic import avoids circular dependency; DecisionService retains situation-hash idempotency.
      import('../decisions/decision.service.js')
        .then(({ default: decisionService }) => decisionService.analyzeEmergency(emergencyId))
        .catch((err) => {
          this.markRouteDegradationDecisionFailure(vehicleId, activeRouteId);
          console.warn(`[PredictionService] Automated decision evaluation warning: ${err.message}`);
        });
    }

    return prediction;
  }

  /**
   * Retrieve the latest stored prediction snapshot for a vehicle
   * @param {string} vehicleId
   * @returns {Promise<Object|null>}
   */
  async getLatestPrediction(vehicleId) {
    return Prediction.findOne({ vehicleId }).sort({ createdAt: -1 });
  }
}

export default new PredictionService();
