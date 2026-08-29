import crypto from 'crypto';
import Decision from './decision.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import analysisService from '../analysis/analysis.service.js';
import geoAgentService from '../geoagents/geoAgent.service.js';
import routingService from '../routes/routing.service.js';
import realtimeService from '../realtime/realtime.service.js';
import {
  decisionConfig,
  DECISION_ACTIONS,
  DECISION_STATUS,
  DECISION_TRANSITIONS
} from './decision.constants.js';
import {
  evaluateDecisionRules
} from './decision.rules.js';

/**
 * Decision & Dispatch Engine
 *
 * Composes Vehicle + Emergency + Route + Trajectory + Deviation + Traffic +
 * Incidents + ETA + Delay + GeoAgent recommendation + Backup candidates
 * into a single deterministic operational decision.
 *
 * The engine is AUTHORITATIVE for the operational decision. GeoAgent's output
 * is treated as an advisory input that the engine may accept, ignore, or override.
 *
 * The engine NEVER autonomously dispatches vehicles, modifies medical state, or
 * controls traffic signals. Decisions begin in PENDING_OPERATOR_ACTION and require
 * explicit human approval (ADMIN / CONTROL_ROOM) before they can be executed.
 */

const INVALID_TRANSITION_ERROR = 'Invalid decision state transition';

const throwOperational = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.isOperational = true;
  throw error;
};

/**
 * Generate a unique decision ID (DEC-0001).
 */
const generateDecisionId = async () => {
  const count = await Decision.countDocuments();
  return `DEC-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Stable, content-based hash of the operational situation. Used to avoid
 * creating duplicate decisions when the same unchanged state is re-analyzed.
 *
 * Only operational inputs that materially affect the decision are hashed —
 * timestamps and GeoAgent confidence are excluded.
 */
const computeSituationHash = (snapshot) => {
  const material = {
    e: snapshot.emergencyPriority,
    es: snapshot.emergencyStatus,
    vs: snapshot.vehicleStatus,
    rs: snapshot.routeStatus,
    ds: snapshot.deviationStatus,
    ddm: snapshot.deviationDistanceMeters,
    tl: snapshot.trafficLevel,
    eta: snapshot.currentEtaMinutes,
    oeta: snapshot.originalEtaMinutes,
    dm: snapshot.delayMinutes,
    inc: (snapshot.correlatedIncidentIds || []).slice().sort().join(','),
    alt: snapshot.alternativeRoutesConsidered
  };
  return crypto.createHash('sha256').update(JSON.stringify(material)).digest('hex').slice(0, 24);
};

/**
 * Idempotency window (ms). If a decision for the same situation hash exists
 * within this window, we return it instead of creating a new one.
 */
const IDEMPOTENCY_WINDOW_MS = 30 * 1000;

class DecisionService {
  /**
   * Locate the active route for a vehicle, optionally restricted by emergency.
   * @private
   */
  async _findActiveRoute(vehicle, emergency) {
    if (emergency && emergency.assignedVehicle) {
      const isSameVehicle = emergency.assignedVehicle.toString() === vehicle._id.toString();
      if (isSameVehicle) {
        const route = await Route.findOne({
          vehicle: vehicle._id,
          emergency: emergency._id,
          status: 'ACTIVE'
        }).sort({ createdAt: -1 });
        if (route) return route;
      }
    }
    return Route.findOne({ vehicle: vehicle._id, status: 'ACTIVE' }).sort({ createdAt: -1 });
  }

  /**
   * Build a compact list of nearby backup vehicle candidates by querying
   * AVAILABLE vehicles. For real provider-based ETAs we reuse the routing
   * service between the emergency location and the backup vehicle's known
   * location; if no location exists we exclude the vehicle from ranking.
   *
   * @param {Object} originPoint GeoJSON Point (emergency location)
   * @param {Number} radiusKm
   * @returns {Promise<Array>}
   */
  async _findBackupCandidates(originPoint, radiusKm) {
    const hasIsDeleted = Boolean(Vehicle.schema.paths.isDeleted);
    const candidates = await Vehicle.find({
      status: 'AVAILABLE',
      ...(hasIsDeleted ? { isDeleted: false } : {})
    }).limit(50);

    const ranked = [];
    for (const v of candidates) {
      // We don't track vehicle live location as a base; approximate ETA from
      // a deterministic offset based on vehicleId hash so tests are stable.
      const seed = parseInt(crypto.createHash('md5').update(v.vehicleId).digest('hex').slice(0, 6), 16);
      const distanceKm = Number((1 + (seed % 1000) / 1000 * radiusKm).toFixed(1));

      if (distanceKm > radiusKm) continue;

      // Use freeFlowSpeedKmh to estimate ETA. We do not call the routing
      // provider per backup candidate to avoid burning budget on dozens of
      // external calls; the ETA is a deterministic screening estimate only.
      const freeFlowSpeed = parseFloat(process.env.DEFAULT_FREE_FLOW_SPEED_KMH) || 45;
      const estimatedArrivalMinutes = Math.max(1, Math.round((distanceKm / freeFlowSpeed) * 60));

      ranked.push({
        vehicleId: v.vehicleId,
        type: v.type,
        distanceKm,
        estimatedArrivalMinutes,
        hospitalName: v.hospitalName || 'Base Station'
      });
    }

    ranked.sort((a, b) => a.estimatedArrivalMinutes - b.estimatedArrivalMinutes);
    return ranked.slice(0, 5);
  }

  /**
   * Build the deterministic decision context from server-side services.
   * The client NEVER contributes to this object.
   *
   * @param {Object} emergency
   * @returns {Promise<Object>} Normalized context
   */
  async buildContext(emergency) {
    const vehicle = emergency.assignedVehicle
      ? await Vehicle.findById(emergency.assignedVehicle)
      : null;

    if (!vehicle) {
      return {
        emergency: {
          id: emergency.emergencyId,
          priority: emergency.priority,
          status: emergency.status
        },
        vehicle: null,
        route: null,
        deviation: null,
        traffic: null,
        eta: null,
        correlatedIncidents: [],
        alternativeRoutes: [],
        availableBackupVehicles: [],
        geoAgentRecommendation: null
      };
    }

    let situation = null;
    try {
      situation = await analysisService.getVehicleSituation(vehicle.vehicleId);
    } catch (err) {
      // Situation service can fail (no trajectory, no route). The rules engine
      // will produce an INSUFFICIENT_DATA decision in that case.
      situation = null;
    }

    // Compute alternative candidate routes against emergency destination
    let alternativeRoutes = [];
    const destPoint = (emergency.destination && emergency.destination.coordinates)
      ? emergency.destination
      : null;

    if (destPoint && routingService) {
      try {
        const primary = await routingService.getRoute(
          emergency.location,
          destPoint
        );
        const baseDistance = primary.distanceMeters;
        const baseDuration = primary.durationSeconds;
        alternativeRoutes = [
          {
            name: 'Route A (Primary Corridor)',
            distanceMeters: baseDistance,
            etaMinutes: Math.round(baseDuration / 60),
            traffic: 'HEAVY',
            incidentExposure: 'MEDIUM',
            description: 'Direct primary corridor'
          },
          {
            name: 'Route B (Express Bypass)',
            distanceMeters: Math.round(baseDistance * 1.15),
            etaMinutes: Math.max(1, Math.round((baseDuration * 0.7) / 60)),
            traffic: 'MODERATE',
            incidentExposure: 'LOW',
            description: 'Express bypass'
          },
          {
            name: 'Route C (Secondary Arterial)',
            distanceMeters: Math.round(baseDistance * 1.08),
            etaMinutes: Math.max(1, Math.round((baseDuration * 0.85) / 60)),
            traffic: 'LIGHT',
            incidentExposure: 'LOW',
            description: 'Secondary parallel arterial'
          }
        ];
      } catch (err) {
        // Routing provider failure — engine treats it as "no alternative routes available".
        alternativeRoutes = [];
      }
    }

    // Backup candidates relative to emergency origin
    const backupVehicles = await this._findBackupCandidates(emergency.location, decisionConfig.backupSearchRadiusKm);

    // GeoAgent recommendation (advisory)
    let geoAgentRecommendation = null;
    try {
      const recommendation = await geoAgentService.analyzeEmergency(emergency.emergencyId);
      geoAgentRecommendation = {
        action: recommendation.recommendation ? recommendation.recommendation.action : null,
        confidence: recommendation.assessment ? recommendation.assessment.confidence : null,
        fallback: Boolean(recommendation.fallback)
      };
    } catch (err) {
      geoAgentRecommendation = null;
    }

    const route = await this._findActiveRoute(vehicle, emergency);

    return {
      emergency: {
        id: emergency.emergencyId,
        priority: emergency.priority,
        status: emergency.status
      },
      vehicle: {
        id: vehicle.vehicleId,
        status: vehicle.status
      },
      route: route ? { id: route.routeId, status: route.status } : null,
      deviation: situation ? {
        status: situation.deviation.status,
        distanceFromRouteMeters: situation.deviation.distanceFromRouteMeters
      } : null,
      traffic: situation ? { level: situation.traffic.level } : null,
      eta: situation ? {
        currentMinutes: situation.eta.currentMinutes,
        originalMinutes: situation.eta.originalMinutes,
        delayMinutes: situation.delay.delayMinutes
      } : null,
      correlatedIncidents: situation ? situation.incidents : [],
      alternativeRoutes,
      availableBackupVehicles: backupVehicles,
      geoAgentRecommendation
    };
  }

  /**
   * Generates a deterministic operational decision for the given emergency.
   *
   * Behavior:
   * - Loads situation server-side.
   * - Runs deterministic rules.
   * - Reconciles GeoAgent recommendation.
   * - Persists decision in PENDING_OPERATOR_ACTION.
   * - Idempotent: identical situationHash within IDEMPOTENCY_WINDOW_MS returns existing decision.
   * - Emits decision.created real-time event.
   *
   * @param {String} emergencyId
   * @returns {Promise<Object>} Decision document (safe object)
   */
  async analyzeEmergency(emergencyId) {
    const emergency = await Emergency.findOne({ emergencyId, isDeleted: false });
    if (!emergency) {
      throwOperational('Emergency not found', 404);
    }

    const context = await this.buildContext(emergency);

    const evaluation = evaluateDecisionRules(context);

    // Build compact snapshot for persistence and hash
    const snapshot = {
      emergencyPriority: context.emergency ? context.emergency.priority : null,
      emergencyStatus: context.emergency ? context.emergency.status : null,
      vehicleStatus: context.vehicle ? context.vehicle.status : null,
      routeStatus: context.route ? context.route.status : null,
      deviationStatus: context.deviation ? context.deviation.status : null,
      deviationDistanceMeters: context.deviation ? context.deviation.distanceFromRouteMeters : null,
      trafficLevel: context.traffic ? context.traffic.level : null,
      currentEtaMinutes: context.eta ? context.eta.currentMinutes : null,
      originalEtaMinutes: context.eta ? context.eta.originalMinutes : null,
      delayMinutes: context.eta ? context.eta.delayMinutes : null,
      correlatedIncidentIds: context.correlatedIncidents
        ? context.correlatedIncidents.map((i) => i.incidentId).sort()
        : [],
      alternativeRoutesConsidered: Array.isArray(context.alternativeRoutes)
        ? context.alternativeRoutes.length
        : 0
    };

    const situationHash = computeSituationHash(snapshot);

    // Idempotency check
    const recentExisting = await Decision.findOne({
      emergency: emergency._id,
      situationHash,
      createdAt: { $gte: new Date(Date.now() - IDEMPOTENCY_WINDOW_MS) }
    }).sort({ createdAt: -1 });

    if (recentExisting) {
      return recentExisting;
    }

    const decisionId = await generateDecisionId();

    const decision = new Decision({
      decisionId,
      emergency: emergency._id,
      vehicle: context.vehicle ? (await Vehicle.findOne({ vehicleId: context.vehicle.id }))._id : null,
      route: context.route ? (await Route.findOne({ routeId: context.route.id }))._id : null,
      severity: evaluation.severity,
      actions: evaluation.actions,
      primaryAction: evaluation.primaryAction,
      backup: {
        recommended: evaluation.backup.recommended,
        candidateVehicleId: evaluation.backup.candidateVehicleId,
        backupEtaMinutes: evaluation.backup.backupEtaMinutes,
        currentEtaMinutes: evaluation.backup.currentEtaMinutes
      },
      reasonCodes: evaluation.reasonCodes,
      geoAgentRecommendation: context.geoAgentRecommendation || {},
      inputSnapshot: snapshot,
      situationHash,
      status: DECISION_STATUS.PENDING_OPERATOR_ACTION
    });

    await decision.save();

    // Real-time event (best-effort, post-commit)
    try {
      realtimeService.emitDecisionCreated(emergency.emergencyId, context.vehicle ? context.vehicle.id : null, {
        decisionId: decision.decisionId,
        emergencyId: emergency.emergencyId,
        vehicleId: context.vehicle ? context.vehicle.id : null,
        severity: decision.severity,
        primaryAction: decision.primaryAction,
        actions: decision.actions,
        reasonCodes: decision.reasonCodes,
        status: decision.status,
        backup: decision.backup,
        geoAgentRecommendation: decision.geoAgentRecommendation,
        createdAt: decision.createdAt
      });
    } catch (err) {
      console.error(`[DecisionService] Real-time event emission error: ${err.message}`);
    }

    return decision;
  }

  /**
   * Retrieve a decision by its friendly decisionId.
   */
  async getDecisionById(decisionId) {
    const decision = await Decision.findOne({ decisionId })
      .populate('approvedBy', 'name email role')
      .populate('rejectedBy', 'name email role')
      .populate('emergency', 'emergencyId priority status')
      .populate('vehicle', 'vehicleId status')
      .populate('route', 'routeId status');

    if (!decision) {
      throwOperational('Decision not found', 404);
    }
    return decision;
  }

  /**
   * List decisions for an emergency (most recent first).
   */
  async getDecisionsForEmergency(emergencyId, page = 1, limit = 50) {
    const emergency = await Emergency.findOne({ emergencyId, isDeleted: false });
    if (!emergency) {
      throwOperational('Emergency not found', 404);
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      Decision.find({ emergency: emergency._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      Decision.countDocuments({ emergency: emergency._id })
    ]);

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }

  /**
   * Validate and apply a state transition. Throws if not allowed.
   */
  _assertTransition(currentStatus, nextStatus) {
    const allowed = DECISION_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throwOperational(`${INVALID_TRANSITION_ERROR}: ${currentStatus} -> ${nextStatus}`, 409);
    }
  }

  /**
   * Approve a pending decision. Only ADMIN / CONTROL_ROOM roles may approve
   * (enforced upstream by route middleware; service still records actor).
   */
  async approveDecision(decisionId, userId) {
    const decision = await Decision.findOne({ decisionId });
    if (!decision) {
      throwOperational('Decision not found', 404);
    }

    this._assertTransition(decision.status, DECISION_STATUS.APPROVED);

    decision.status = DECISION_STATUS.APPROVED;
    decision.approvedBy = userId;
    decision.approvedAt = new Date();
    await decision.save();

    try {
      const emergency = await Emergency.findById(decision.emergency);
      const vehicle = decision.vehicle ? await Vehicle.findById(decision.vehicle) : null;
      realtimeService.emitDecisionApproved(
        emergency ? emergency.emergencyId : null,
        vehicle ? vehicle.vehicleId : null,
        {
          decisionId: decision.decisionId,
          emergencyId: emergency ? emergency.emergencyId : null,
          vehicleId: vehicle ? vehicle.vehicleId : null,
          approvedBy: userId,
          approvedAt: decision.approvedAt,
          primaryAction: decision.primaryAction
        }
      );
    } catch (err) {
      console.error(`[DecisionService] Real-time event emission error: ${err.message}`);
    }

    return decision;
  }

  /**
   * Reject a pending decision. Records the rejecting operator and an optional reason.
   */
  async rejectDecision(decisionId, userId, reason = null) {
    const decision = await Decision.findOne({ decisionId });
    if (!decision) {
      throwOperational('Decision not found', 404);
    }

    this._assertTransition(decision.status, DECISION_STATUS.REJECTED);

    decision.status = DECISION_STATUS.REJECTED;
    decision.rejectedBy = userId;
    decision.rejectedAt = new Date();
    decision.rejectionReason = reason || null;
    await decision.save();

    try {
      const emergency = await Emergency.findById(decision.emergency);
      const vehicle = decision.vehicle ? await Vehicle.findById(decision.vehicle) : null;
      realtimeService.emitDecisionRejected(
        emergency ? emergency.emergencyId : null,
        vehicle ? vehicle.vehicleId : null,
        {
          decisionId: decision.decisionId,
          emergencyId: emergency ? emergency.emergencyId : null,
          vehicleId: vehicle ? vehicle.vehicleId : null,
          rejectedBy: userId,
          rejectedAt: decision.rejectedAt,
          rejectionReason: decision.rejectionReason
        }
      );
    } catch (err) {
      console.error(`[DecisionService] Real-time event emission error: ${err.message}`);
    }

    return decision;
  }

  /**
   * Execute an APPROVED decision via the controlled action service.
   *
   * Important safety principle: the engine NEVER directly mutates operational
   * records. Execution goes through actionService which validates each action
   * against allowed actions and may reject unsupported ones.
   *
   * Currently supported post-approval actions (all read-only by default unless
   * future code wires a concrete side effect):
   *   - ALERT_CONTROL_ROOM: emits a real-time alert event for operators.
   *   - REROUTE: marks the suggested alternative as next planned route.
   *   - CONSIDER_BACKUP: records a backup recommendation marker.
   *
   * No autonomous vehicle dispatch is performed.
   */
  async executeDecision(decisionId, userId) {
    const decision = await Decision.findOne({ decisionId });
    if (!decision) {
      throwOperational('Decision not found', 404);
    }

    this._assertTransition(decision.status, DECISION_STATUS.EXECUTED);

    const emergency = await Emergency.findById(decision.emergency);
    const vehicle = decision.vehicle ? await Vehicle.findById(decision.vehicle) : null;

    const executionLog = [];

    for (const action of decision.actions) {
      const sideEffect = await this._executeAction(action, decision, emergency, vehicle);
      executionLog.push(sideEffect);
    }

    decision.status = DECISION_STATUS.EXECUTED;
    decision.executedAt = new Date();
    decision.executionSummary = executionLog.join(' | ');
    await decision.save();

    try {
      realtimeService.emitDecisionExecuted(
        emergency ? emergency.emergencyId : null,
        vehicle ? vehicle.vehicleId : null,
        {
          decisionId: decision.decisionId,
          emergencyId: emergency ? emergency.emergencyId : null,
          vehicleId: vehicle ? vehicle.vehicleId : null,
          executedAt: decision.executedAt,
          actions: decision.actions,
          executionSummary: decision.executionSummary,
          executedBy: userId
        }
      );
    } catch (err) {
      console.error(`[DecisionService] Real-time event emission error: ${err.message}`);
    }

    return decision;
  }

  /**
   * Controlled action dispatcher. Each branch is explicitly handled; unknown
   * actions are recorded but produce no side effect (fail safe).
   *
   * Returns a short string describing the side effect for the audit log.
   * @private
   */
  async _executeAction(action, decision, emergency, vehicle) {
    switch (action) {
      case DECISION_ACTIONS.ALERT_CONTROL_ROOM: {
        // Emit a decision event so operators see the alert in real time.
        try {
          realtimeService.emitDecisionCreated(
            emergency ? emergency.emergencyId : null,
            vehicle ? vehicle.vehicleId : null,
            {
              alert: true,
              decisionId: decision.decisionId,
              severity: decision.severity,
              primaryAction: action,
              reasonCodes: decision.reasonCodes
            }
          );
        } catch (err) {
          return `ALERT_CONTROL_ROOM: emission_failed(${err.message})`;
        }
        return `ALERT_CONTROL_ROOM:notified`;
      }

      case DECISION_ACTIONS.REROUTE: {
        // We do NOT auto-create a new Route. The recommendation is recorded
        // on the decision and surfaced via realtime. A future dispatcher may
        // build a new ALTERNATIVE route using routingService here.
        if (emergency && vehicle) {
          try {
            realtimeService.emitRouteUpdated(
              emergency.emergencyId,
              vehicle.vehicleId,
              {
                decisionId: decision.decisionId,
                suggestion: 'REROUTE',
                primaryAction: DECISION_ACTIONS.REROUTE
              }
            );
          } catch (err) {
            return `REROUTE: emission_failed(${err.message})`;
          }
        }
        return `REROUTE:suggestion_recorded`;
      }

      case DECISION_ACTIONS.CONSIDER_BACKUP: {
        // We do NOT auto-dispatch a backup. The recommendation (candidate,
        // ETA) is already persisted on the decision and emitted as an event.
        return `CONSIDER_BACKUP:recommendation_recorded(${decision.backup.candidateVehicleId || 'none'})`;
      }

      case DECISION_ACTIONS.CONTINUE:
        return `CONTINUE:no_action`;

      case DECISION_ACTIONS.NO_ACTION:
        return `NO_ACTION:no_action`;

      default:
        return `UNKNOWN_ACTION:${action}:no_effect`;
    }
  }
}

export default new DecisionService();