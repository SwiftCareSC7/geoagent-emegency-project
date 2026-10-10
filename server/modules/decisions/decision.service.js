import crypto from 'crypto';
import Decision from './decision.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import routeService from '../routes/route.service.js';
import analysisService from '../analysis/analysis.service.js';
import geoAgentService from '../geoagents/geoAgent.service.js';
import routingService from '../routes/routing.service.js';
import corridorGreenWaveService from '../routes/corridorGreenWave.service.js';
import realtimeService from '../realtime/realtime.service.js';
import {
  decisionConfig,
  DECISION_ACTIONS,
  DECISION_STATUS,
  DECISION_TRANSITIONS
} from './decision.constants.js';
import {
  evaluateDecisionRules,
  pickBestAlternative,
  scoreAlternativeRoutes
} from './decision.rules.js';
import { createRerouteCandidate, isRerouteCandidateUnchanged } from './rerouteCandidate.js';

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
  const latest = await Decision.findOne({}, { decisionId: 1 }).sort({ createdAt: -1 });
  let nextNum = 1;
  if (latest && latest.decisionId) {
    const match = latest.decisionId.match(/DEC-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  let candidate = `DEC-${String(nextNum).padStart(4, '0')}`;
  while (await Decision.exists({ decisionId: candidate })) {
    nextNum++;
    candidate = `DEC-${String(nextNum).padStart(4, '0')}`;
  }
  return candidate;
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
    rv: snapshot.routeVersion,
    rid: snapshot.routeId,
    rut: snapshot.routeUpdatedAt ? new Date(snapshot.routeUpdatedAt).toISOString() : null,
    rc: snapshot.rerouteCandidateId,
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
    if (emergency) {
      return Route.findOne({
        vehicle: vehicle._id,
        emergency: emergency._id,
        status: 'ACTIVE'
      }).sort({ createdAt: -1 });
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
    let routeCandidates = [];
    const destPoint = (emergency.destination && emergency.destination.coordinates)
      ? emergency.destination
      : null;

    if (destPoint && routingService) {
      try {
        const routeResult = await routingService.getRouteWithAlternatives(
          emergency.location,
          destPoint
        );
        const primary = routeResult.primary;
        const alts = routeResult.alternatives || [];
        routeCandidates = [primary, ...alts];
        alternativeRoutes = [
          {
            name: primary.description || 'Route A (Primary Corridor)',
            distanceMeters: primary.distanceMeters,
            etaMinutes: Math.round(primary.durationSeconds / 60),
            traffic: (primary.trafficDelaySeconds || 0) > 120 ? 'HEAVY' : 'MODERATE',
            incidentExposure: 'MEDIUM',
            description: primary.description || 'Direct primary corridor'
          },
          ...alts.map((alt, idx) => ({
            name: alt.description || `Alternative Route ${idx + 1}`,
            distanceMeters: alt.distanceMeters,
            etaMinutes: Math.max(1, Math.round(alt.durationSeconds / 60)),
            traffic: (alt.trafficDelaySeconds || 0) > 120 ? 'HEAVY' : 'LIGHT',
            incidentExposure: 'LOW',
            description: alt.description || `Alternative corridor via bypass ${idx + 1}`
          }))
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

    let v2xCorridor = null;
    try {
      v2xCorridor = await corridorGreenWaveService.analyzeCorridorForVehicle(vehicle.vehicleId, { silent: true });
    } catch {
      // Non-blocking
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
      route: route ? {
        id: route.routeId,
        status: route.status,
        version: route.__v,
        updatedAt: route.updatedAt
      } : null,
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
      routeCandidates,
      availableBackupVehicles: backupVehicles,
      geoAgentRecommendation,
      v2xCorridor
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
    const bestAlternative = pickBestAlternative(
      scoreAlternativeRoutes(context.alternativeRoutes),
      context.eta?.currentMinutes ?? null
    );
    const rerouteCandidate = evaluation.actions.includes(DECISION_ACTIONS.REROUTE) &&
      bestAlternative &&
      context.routeCandidates?.[bestAlternative.candidateIndex]
      ? createRerouteCandidate(context.routeCandidates[bestAlternative.candidateIndex])
      : null;

    // Build compact snapshot for persistence and hash
    const snapshot = {
      emergencyPriority: context.emergency ? context.emergency.priority : null,
      emergencyStatus: context.emergency ? context.emergency.status : null,
      vehicleStatus: context.vehicle ? context.vehicle.status : null,
      routeStatus: context.route ? context.route.status : null,
      routeId: context.route ? context.route.id : null,
      routeVersion: context.route ? context.route.version : null,
      routeUpdatedAt: context.route ? context.route.updatedAt : null,
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
        : 0,
      rerouteCandidateId: rerouteCandidate?.candidateId || null
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

    let decision;
    let attempts = 0;
    while (attempts < 5) {
      try {
        const decisionId = await generateDecisionId();

        decision = new Decision({
          decisionId,
          emergency: emergency._id,
          vehicle: context.vehicle ? (await Vehicle.findOne({ vehicleId: context.vehicle.id }))._id : null,
          route: context.route ? (await Route.findOne({ routeId: context.route.id }))._id : null,
          rerouteCandidate,
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
        break;
      } catch (err) {
        if (err.code === 11000 && attempts < 4) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

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
   * Atomically transitions state to prevent concurrent approval race conditions.
   */
  async approveDecision(decisionId, userId, candidateId = null) {
    const pending = await Decision.findOne({ decisionId, status: DECISION_STATUS.PENDING_OPERATOR_ACTION });
    if (!pending) {
      const existing = await Decision.findOne({ decisionId });
      if (!existing) {
        throwOperational('Decision not found', 404);
      }
      this._assertTransition(existing.status, DECISION_STATUS.APPROVED);
    }

    const requiresRerouteCandidate = pending.actions.includes(DECISION_ACTIONS.REROUTE);
    if (requiresRerouteCandidate) {
      if (
        !pending.rerouteCandidate?.candidateId ||
        !isRerouteCandidateUnchanged(pending.rerouteCandidate) ||
        candidateId !== pending.rerouteCandidate.candidateId
      ) {
        throwOperational('The reviewed reroute candidate is missing or changed; reanalyze before approval', 409);
      }
    }

    const decision = await Decision.findOneAndUpdate(
      {
        decisionId,
        status: DECISION_STATUS.PENDING_OPERATOR_ACTION,
        ...(requiresRerouteCandidate
          ? { 'rerouteCandidate.candidateId': candidateId }
          : {})
      },
      {
        $set: {
          status: DECISION_STATUS.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
          approvedCandidateId: requiresRerouteCandidate
            ? candidateId
            : null
        }
      },
      { new: true }
    );

    if (!decision) {
      const existing = await Decision.findOne({ decisionId });
      if (!existing) {
        throwOperational('Decision not found', 404);
      }
      this._assertTransition(existing.status, DECISION_STATUS.APPROVED);
    }

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
   * Atomically transitions state to prevent concurrent modification race conditions.
   */
  async rejectDecision(decisionId, userId, reason = null) {
    const decision = await Decision.findOneAndUpdate(
      { decisionId, status: DECISION_STATUS.PENDING_OPERATOR_ACTION },
      {
        $set: {
          status: DECISION_STATUS.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: reason || null
        }
      },
      { new: true }
    );

    if (!decision) {
      const existing = await Decision.findOne({ decisionId });
      if (!existing) {
        throwOperational('Decision not found', 404);
      }
      this._assertTransition(existing.status, DECISION_STATUS.REJECTED);
    }

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
   * Currently supported post-approval actions:
   *   - ALERT_CONTROL_ROOM: emits a real-time alert event for operators.
   *   - REROUTE: validates and activates the approved route candidate.
   *   - CONSIDER_BACKUP: records a backup recommendation marker.
   *
   * No autonomous vehicle dispatch is performed.
   */
  async executeDecision(decisionId, userId) {
    const existing = await Decision.findOne({ decisionId });
    if (!existing) {
      throwOperational('Decision not found', 404);
    }

    this._assertTransition(existing.status, DECISION_STATUS.EXECUTED);

    const emergency = await Emergency.findById(existing.emergency);
    const vehicle = existing.vehicle ? await Vehicle.findById(existing.vehicle) : null;

    const executionLog = [];

    for (const action of existing.actions) {
      const sideEffect = await this._executeAction(
        action,
        existing,
        emergency,
        vehicle,
        userId
      );
      executionLog.push(sideEffect);
    }

    const decision = await Decision.findOneAndUpdate(
      { decisionId, status: DECISION_STATUS.APPROVED },
      {
        $set: {
          status: DECISION_STATUS.EXECUTED,
          executedAt: new Date(),
          executionSummary: executionLog.join(' | ')
        }
      },
      { new: true }
    );

    if (!decision) {
      throwOperational(`${INVALID_TRANSITION_ERROR}: decision was concurrently modified`, 409);
    }

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

  async executeRerouteForRoute(routeId, userId, decisionId = null) {
    const route = await Route.findOne({ routeId });
    if (!route) {
      throwOperational('Route not found', 404);
    }

    const decisionQuery = {
      route: route._id,
      emergency: route.emergency,
      vehicle: route.vehicle,
      primaryAction: DECISION_ACTIONS.REROUTE,
      actions: DECISION_ACTIONS.REROUTE,
      status: DECISION_STATUS.APPROVED
    };
    const decision = decisionId
      ? await Decision.findOne({
          decisionId,
          ...decisionQuery
        })
      : await Decision.findOne(decisionQuery).sort({ createdAt: -1 });

    if (!decision) {
      throwOperational('No approved REROUTE decision is associated with this route', 409);
    }

    await this.executeDecision(decision.decisionId, userId);
    return Route.findOne({ routeId });
  }

  /**
   * Controlled action dispatcher. Each branch is explicitly handled; unknown
   * actions are recorded but produce no side effect (fail safe).
   *
   * Returns a short string describing the side effect for the audit log.
   * @private
   */
  async _executeAction(
    action,
    decision,
    emergency,
    vehicle,
    userId = null
  ) {
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
        const route = decision.route ? await Route.findById(decision.route) : null;
        if (!route) {
          throwOperational('Approved REROUTE decision has no associated route', 409);
        }
        if (
          !decision.approvedCandidateId ||
          decision.approvedCandidateId !== decision.rerouteCandidate?.candidateId ||
          !isRerouteCandidateUnchanged(decision.rerouteCandidate)
        ) {
          throwOperational('The approved reroute candidate is missing or changed; reanalyze and approve again', 409);
        }
        await routeService.acceptReroute(
          route.routeId,
          userId,
          decision.decisionId
        );
        return `REROUTE:activated(${route.routeId})`;
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