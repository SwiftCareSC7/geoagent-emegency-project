import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import analysisService from '../analysis/analysis.service.js';
import geoAgentService from '../geoagents/geoAgent.service.js';
import decisionService from '../decisions/decision.service.js';
import realtimeService from '../realtime/realtime.service.js';
import { REALTIME_ROOMS } from '../realtime/realtime.constants.js';
import {
  WORKFLOW_STAGES,
  ORCHESTRATION_EVENTS,
  DATA_STATUS,
  STANDARD_UNITS
} from './orchestration.constants.js';

class OrchestrationService {
  /**
   * Builds explicit three-tier epistemic breakdown (OBSERVED, INFERRED, UNKNOWN)
   * @private
   */
  _buildEpistemicBreakdown(situation, geoAgentResult, decisionResult) {
    const observed = [];
    const inferred = [];
    const unknown = [];

    if (situation) {
      if (situation.deviation) {
        observed.push(
          `Vehicle is ${situation.deviation.distanceFromRouteMeters}m from planned route (${situation.deviation.status})`
        );
        observed.push(
          `GPS stability is ${situation.deviation.gpsStability} with ${situation.deviation.confidence} confidence`
        );
      }

      if (situation.traffic) {
        observed.push(
          `Corridor traffic congestion level is ${situation.traffic.level} (speed: ${situation.traffic.speedKmh} km/h)`
        );
      }

      if (situation.progress) {
        observed.push(
          `Route progress is ${situation.progress.progressPercentage}% (${situation.progress.remainingDistanceMeters}m remaining)`
        );
      }

      if (situation.eta && situation.delay) {
        observed.push(
          `Current ETA is ${situation.eta.currentMinutes} min (delay: +${situation.delay.delayMinutes} min, estimated speed: ${situation.eta.estimatedSpeedKmh} km/h)`
        );
      }

      if (Array.isArray(situation.incidents) && situation.incidents.length > 0) {
        observed.push(
          `${situation.incidents.length} active incident(s) correlated near route corridor (closest: ${situation.incidents[0].type} at ${situation.incidents[0].distanceFromRouteMeters}m from route)`
        );
      } else {
        observed.push('No active incidents detected along primary route corridor');
      }
    }

    // Inferences from GeoAgent and Decision Engine
    if (geoAgentResult && geoAgentResult.assessment) {
      if (geoAgentResult.assessment.likelyCause) {
        inferred.push(
          `Likely primary cause for delay/deviation: ${geoAgentResult.assessment.likelyCause}`
        );
      }
      if (geoAgentResult.recommendation && geoAgentResult.recommendation.summary) {
        inferred.push(`GeoAgent recommendation rationale: ${geoAgentResult.recommendation.summary}`);
      }
    }

    if (decisionResult) {
      inferred.push(
        `Decision Engine primary operational action: ${decisionResult.primaryAction} (${decisionResult.severity} severity)`
      );
      if (Array.isArray(decisionResult.reasonCodes)) {
        inferred.push(`Decision rule triggers: ${decisionResult.reasonCodes.join(', ')}`);
      }
    }

    // Explicit data gaps / unknowns
    unknown.push("Driver's verbal confirmation of road blockage or diversion intent");
    unknown.push('Real-time hospital emergency department receiving capacity');

    return {
      observed,
      inferred,
      unknown
    };
  }

  /**
   * Executes the full end-to-end emergency response analysis and decision workflow
   * @param {String} emergencyId Friendly emergency ID (e.g. EMG-0001) or ObjectId
   * @returns {Promise<Object>} Comprehensive normalized orchestration result
   */
  async executeEmergencyWorkflow(emergencyId) {
    const startTime = Date.now();

    // 1. Resolve and validate Emergency
    const isObjectId = typeof emergencyId === 'string' && emergencyId.match(/^[0-9a-fA-F]{24}$/);
    const emergencyQuery = isObjectId
      ? { _id: emergencyId, isDeleted: false }
      : { emergencyId, isDeleted: false };

    const emergency = await Emergency.findOne(emergencyQuery);
    if (!emergency) {
      const error = new Error('Emergency not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    const emergencyRoom = REALTIME_ROOMS.emergency(emergency.emergencyId);

    // Emit workflow started event
    try {
      realtimeService.emitToRooms(
        [REALTIME_ROOMS.CONTROL_ROOM, emergencyRoom],
        ORCHESTRATION_EVENTS.ANALYSIS_STARTED,
        {
          emergencyId: emergency.emergencyId,
          stage: WORKFLOW_STAGES.INITIALIZING,
          timestamp: new Date().toISOString()
        }
      );
    } catch (err) {
      console.error(`[OrchestrationService] Real-time start emission error: ${err.message}`);
    }

    // 2. Validate Assigned Vehicle
    if (!emergency.assignedVehicle) {
      return {
        workflowStatus: WORKFLOW_STAGES.PARTIAL,
        stage: WORKFLOW_STAGES.VALIDATING,
        reason: 'NO_ASSIGNED_VEHICLE',
        units: STANDARD_UNITS,
        emergency: {
          emergencyId: emergency.emergencyId,
          type: emergency.type,
          priority: emergency.priority,
          status: emergency.status,
          location: emergency.location,
          destination: emergency.destination
        },
        vehicle: null,
        route: null,
        trajectory: null,
        analysis: null,
        geoAgent: null,
        decision: null,
        epistemicBreakdown: {
          observed: ['Emergency registered in system without an assigned response vehicle'],
          inferred: [],
          unknown: ['Vehicle dispatch status']
        },
        executionTimeMs: Date.now() - startTime
      };
    }

    const vehicle = await Vehicle.findById(emergency.assignedVehicle);
    if (!vehicle || vehicle.isDeleted) {
      return {
        workflowStatus: WORKFLOW_STAGES.PARTIAL,
        stage: WORKFLOW_STAGES.VALIDATING,
        reason: 'ASSIGNED_VEHICLE_NOT_FOUND',
        units: STANDARD_UNITS,
        emergency: {
          emergencyId: emergency.emergencyId,
          priority: emergency.priority,
          status: emergency.status
        },
        vehicle: null,
        route: null,
        trajectory: null,
        analysis: null,
        geoAgent: null,
        decision: null,
        epistemicBreakdown: {
          observed: ['Vehicle referenced by emergency no longer exists or was deleted'],
          inferred: [],
          unknown: []
        },
        executionTimeMs: Date.now() - startTime
      };
    }

    // 3. Validate Active Route & Association
    const route = await Route.findOne({
      vehicle: vehicle._id,
      emergency: emergency._id,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    if (!route) {
      return {
        workflowStatus: WORKFLOW_STAGES.PARTIAL,
        stage: WORKFLOW_STAGES.VALIDATING,
        reason: 'NO_ACTIVE_ROUTE',
        units: STANDARD_UNITS,
        emergency: {
          emergencyId: emergency.emergencyId,
          priority: emergency.priority,
          status: emergency.status
        },
        vehicle: {
          vehicleId: vehicle.vehicleId,
          registrationNumber: vehicle.registrationNumber,
          status: vehicle.status
        },
        route: null,
        trajectory: null,
        analysis: null,
        geoAgent: null,
        decision: null,
        epistemicBreakdown: {
          observed: [`Ambulance ${vehicle.vehicleId} assigned to emergency without an active planned route`],
          inferred: [],
          unknown: ['Route geometry']
        },
        executionTimeMs: Date.now() - startTime
      };
    }

    // Ensure route vehicle matches assigned vehicle
    if (route.vehicle.toString() !== vehicle._id.toString()) {
      const error = new Error('Cross-module consistency error: Route vehicle does not match assigned emergency vehicle');
      error.status = 409;
      error.isOperational = true;
      throw error;
    }

    // 4. Validate Trajectory
    const latestTrajectory = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
    if (!latestTrajectory) {
      return {
        workflowStatus: WORKFLOW_STAGES.PARTIAL,
        stage: WORKFLOW_STAGES.VALIDATING,
        reason: 'NO_TRAJECTORY_DATA',
        units: STANDARD_UNITS,
        emergency: {
          emergencyId: emergency.emergencyId,
          priority: emergency.priority,
          status: emergency.status
        },
        vehicle: {
          vehicleId: vehicle.vehicleId,
          status: vehicle.status
        },
        route: {
          routeId: route.routeId,
          distanceMeters: route.distance,
          durationSeconds: route.duration
        },
        trajectory: null,
        analysis: null,
        geoAgent: null,
        decision: null,
        epistemicBreakdown: {
          observed: [`No GPS telemetry points received for vehicle ${vehicle.vehicleId}`],
          inferred: [],
          unknown: ['Current vehicle position', 'Deviation status']
        },
        executionTimeMs: Date.now() - startTime
      };
    }

    // 5. Execute Deterministic Situation Analysis
    let situation = null;
    let spatialError = null;
    try {
      situation = await analysisService.getVehicleSituation(vehicle.vehicleId);
    } catch (err) {
      spatialError = err.message;
    }

    // 6. Execute GeoAgent AI Reasoning
    let geoAgentResult = null;
    try {
      geoAgentResult = await geoAgentService.analyzeEmergency(emergency.emergencyId);
    } catch (err) {
      geoAgentResult = {
        status: 'AI_ANALYSIS_UNAVAILABLE',
        error: err.message,
        fallback: true
      };
    }

    // 7. Execute Decision Engine
    let decisionResult = null;
    try {
      decisionResult = await decisionService.analyzeEmergency(emergency.emergencyId);
    } catch (err) {
      decisionResult = {
        status: 'DECISION_EVALUATION_FAILED',
        error: err.message
      };
    }

    // 8. Build 3-tier Epistemic Breakdown
    const epistemicBreakdown = this._buildEpistemicBreakdown(situation, geoAgentResult, decisionResult);

    // 9. Emit Workflow Completed Real-Time Event
    const executionTimeMs = Date.now() - startTime;
    try {
      realtimeService.emitToRooms(
        [REALTIME_ROOMS.CONTROL_ROOM, emergencyRoom],
        ORCHESTRATION_EVENTS.ANALYSIS_COMPLETED,
        {
          emergencyId: emergency.emergencyId,
          vehicleId: vehicle.vehicleId,
          primaryAction: decisionResult && decisionResult.primaryAction ? decisionResult.primaryAction : 'MONITOR',
          executionTimeMs,
          timestamp: new Date().toISOString()
        }
      );
    } catch (err) {
      console.error(`[OrchestrationService] Real-time completion emission error: ${err.message}`);
    }

    // 10. Assemble and Return Unified Response
    return {
      workflowStatus: WORKFLOW_STAGES.COMPLETED,
      units: STANDARD_UNITS,
      emergency: {
        emergencyId: emergency.emergencyId,
        type: emergency.type,
        priority: emergency.priority,
        status: emergency.status,
        location: emergency.location,
        destination: emergency.destination
      },
      vehicle: {
        vehicleId: vehicle.vehicleId,
        registrationNumber: vehicle.registrationNumber,
        type: vehicle.type,
        status: vehicle.status,
        driverName: vehicle.driverName
      },
      route: {
        routeId: route.routeId,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        routeType: route.routeType,
        status: route.status
      },
      trajectory: {
        location: latestTrajectory.location,
        speedKmh: latestTrajectory.speed,
        headingDegrees: latestTrajectory.heading,
        recordedAt: latestTrajectory.timestamp
      },
      analysis: situation
        ? {
            deviation: situation.deviation,
            progress: situation.progress,
            traffic: situation.traffic,
            eta: situation.eta,
            delay: situation.delay,
            incidents: situation.incidents,
            evidence: situation.evidence
          }
        : { status: 'PARTIAL', error: spatialError },
      geoAgent: geoAgentResult,
      decision: decisionResult,
      epistemicBreakdown,
      executionTimeMs
    };
  }
}

export default new OrchestrationService();
