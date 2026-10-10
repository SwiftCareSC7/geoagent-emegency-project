import crypto from 'crypto';
import Route from './route.model.js';
import routingService from './routing.service.js';
import routeComparisonService from './routeComparison.service.js';
import analysisService from '../analysis/analysis.service.js';
import predictionService from '../analysis/prediction.service.js';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import realtimeService from '../realtime/realtime.service.js';
import Decision from '../decisions/decision.model.js';
import { isRerouteCandidateUnchanged } from '../decisions/rerouteCandidate.js';
import { validateRouteGeometry } from './routeValidator.js';

const routeError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.isOperational = true;
  return error;
};


class RouteService {
  /**
   * Creates a new route by calling the external routing provider and saving to DB
   * @param {Object} routeData Origin, destination, emergency, vehicle, etc.
   * @returns {Promise<Object>} Created route
   */
  async createRoute(routeData) {
    const { emergencyId, vehicleId, origin, destination, routeType = 'PLANNED' } = routeData;

    // 1. Validate Emergency
    const isEmergencyObjectId = typeof emergencyId === 'string' && emergencyId.match(/^[0-9a-fA-F]{24}$/);
    const emergency = await Emergency.findOne(
      isEmergencyObjectId ? { _id: emergencyId, isDeleted: false } : { emergencyId, isDeleted: false }
    );
    if (!emergency) {
      const error = new Error('Emergency not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // 2. Validate Vehicle
    const isVehicleObjectId = typeof vehicleId === 'string' && vehicleId.match(/^[0-9a-fA-F]{24}$/);
    const vehicle = await Vehicle.findOne(
      isVehicleObjectId ? { _id: vehicleId, isDeleted: false } : { vehicleId, isDeleted: false }
    );
    if (!vehicle) {
      const error = new Error('Vehicle not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }


    // 3. Call External Routing Service (Mock or Real)
    // The routingService throws safe errors if provider fails
    const preference = (routeData.preference || 'FASTEST').toUpperCase();
    const generatedRoute = await routingService.getRoute(origin, destination, { preference });

    // 4. Generate unique immutable routeId
    const routeId = `ROUTE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // 5. Save to database
    const route = new Route({
      routeId,
      emergency: emergency._id,
      vehicle: vehicle._id,
      origin,
      destination,
      geometry: generatedRoute.geometry,
      distance: generatedRoute.distanceMeters,
      duration: generatedRoute.durationSeconds,
      provider: generatedRoute.provider,
      routeType,
      preference,
      steps: generatedRoute.steps || [],
    });

    await route.save();

    // Emit Real-Time Event
    try {
      realtimeService.emitRouteUpdated(emergency.emergencyId, vehicle.vehicleId, {
        routeId: route.routeId,
        emergencyId: emergency.emergencyId,
        vehicleId: vehicle.vehicleId,
        routeType: route.routeType,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        provider: route.provider,
        preference: route.preference,
        stepsCount: (route.steps || []).length,
        status: route.status
      });
    } catch (err) {
      console.error(`[RouteService] Real-time event emission error: ${err.message}`);
    }

    return route;
  }

  /**
   * Calculates a complete route plan with turn-by-turn steps without requiring pre-saved entities.
   * Also computes candidate alternative route with complementary preference when requested.
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options { preference: 'FASTEST'|'SHORTEST', computeAlternatives: boolean }
   * @returns {Promise<Object>} Calculated route with steps and optional alternative
   */
  async calculateRoutePlan(origin, destination, options = {}) {
    const preference = (options.preference || 'FASTEST').toUpperCase();
    const routeData = await routingService.getRoute(origin, destination, {
      ...options,
      preference
    });

    let alternative = null;
    if (options.computeAlternatives !== false) {
      // Calculate alternative with complementary preference
      const altPreference = preference === 'FASTEST' ? 'SHORTEST' : 'FASTEST';
      try {
        const altRoute = await routingService.getRoute(origin, destination, {
          ...options,
          preference: altPreference
        });
        alternative = {
          geometry: altRoute.geometry,
          distanceMeters: altRoute.distanceMeters,
          durationSeconds: altRoute.durationSeconds,
          preference: altPreference,
          description: altRoute.description,
          steps: altRoute.steps || [],
          trafficDelaySeconds: altRoute.trafficDelaySeconds || 0
        };
      } catch (err) {
        // Non-blocking alternative calculation
      }
    }

    return {
      geometry: routeData.geometry,
      distanceMeters: routeData.distanceMeters,
      durationSeconds: routeData.durationSeconds,
      staticDurationSeconds: routeData.staticDurationSeconds,
      trafficDelaySeconds: routeData.trafficDelaySeconds || 0,
      preference,
      description: routeData.description,
      provider: routeData.provider,
      steps: routeData.steps || [],
      alternative,
      calculatedAt: new Date().toISOString()
    };
  }


  /**
   * Retrieves routes with pagination and filters
   * @param {Object} filters
   * @param {Number} page
   * @param {Number} limit
   * @returns {Promise<Object>}
   */
  async getRoutes(filters = {}, page = 1, limit = 50) {
    // Safety cap on limit
    const safeLimit = Math.min(Number(limit) || 50, 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const query = {};
    if (filters.emergencyId) {
      const isEmergencyObjectId = typeof filters.emergencyId === 'string' && filters.emergencyId.match(/^[0-9a-fA-F]{24}$/);
      const em = await Emergency.findOne(
        isEmergencyObjectId ? { _id: filters.emergencyId } : { emergencyId: filters.emergencyId }
      );
      if (!em) return { data: [], meta: { total: 0, page: safePage, limit: safeLimit, totalPages: 0 } };
      query.emergency = em._id;
    }
    if (filters.vehicleId) {
      const isVehicleObjectId = typeof filters.vehicleId === 'string' && filters.vehicleId.match(/^[0-9a-fA-F]{24}$/);
      const veh = await Vehicle.findOne(
        isVehicleObjectId ? { _id: filters.vehicleId } : { vehicleId: filters.vehicleId }
      );
      if (!veh) return { data: [], meta: { total: 0, page: safePage, limit: safeLimit, totalPages: 0 } };
      query.vehicle = veh._id;
    }
    if (filters.routeType) query.routeType = filters.routeType;
    if (filters.status) query.status = filters.status;

    const [routes, total] = await Promise.all([
      Route.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('emergency', 'emergencyId status priority')
        .populate('vehicle', 'vehicleId status registrationNumber driverName'),
      Route.countDocuments(query)
    ]);

    if (filters.emergencyId && routes.length === 0) {
      try {
        const isEmergencyObjectId = typeof filters.emergencyId === 'string' && filters.emergencyId.match(/^[0-9a-fA-F]{24}$/);
        const em = await Emergency.findOne(
          isEmergencyObjectId ? { _id: filters.emergencyId } : { emergencyId: filters.emergencyId }
        ).populate('assignedVehicle');

        if (em && em.location) {
          const veh = em.assignedVehicle || (await Vehicle.findOne({ status: { $ne: 'MAINTENANCE' } }));
          if (veh && veh.location) {
            const origin = veh.location;
            const destination = em.destination || em.location;
            const newRoute = await this.createRoute({
              emergencyId: em.emergencyId,
              vehicleId: veh.vehicleId,
              origin,
              destination,
              routeType: 'PLANNED',
              preference: 'FASTEST'
            }, null);

            if (newRoute) {
              const populated = await Route.findById(newRoute._id)
                .populate('emergency', 'emergencyId status priority')
                .populate('vehicle', 'vehicleId status registrationNumber driverName');
              return {
                data: [populated],
                meta: {
                  total: 1,
                  page: 1,
                  limit: safeLimit,
                  totalPages: 1
                }
              };
            }
          }
        }
      } catch (autoErr) {
        console.warn(`[RouteService] Auto-route generation for ${filters.emergencyId} failed: ${autoErr.message}`);
      }
    }

    return {
      data: routes,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }

  /**
   * Get a single route by ID
   * @param {String} routeId Internal _id or friendly routeId
   * @returns {Promise<Object>}
   */
  async getRouteById(routeId) {
    // Check if it's an ObjectId or a friendly routeId
    const isObjectId = routeId.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: routeId } : { routeId };

    const route = await Route.findOne(query)
      .populate('emergency', 'emergencyId status priority')
      .populate('vehicle', 'vehicleId status registrationNumber driverName');

    if (!route) {
      throw new Error('Route not found');
    }

    return route;
  }

  /**
   * Compare a route against provider alternative candidates
   * @param {String} routeId
   * @returns {Promise<Object>} Structured route comparison
   */
  async compareRoute(routeId) {
    const route = await this.getRouteById(routeId);

    // Get candidate alternatives from routing provider
    const routeResult = await routingService.getRouteWithAlternatives(route.origin, route.destination);
    const candidates = routeResult.alternatives || [];

    // Attempt to enrich with live vehicle situation and prediction if vehicle is assigned
    let vehicleState = null;
    let predictionState = null;
    let deviationState = null;
    let incidents = [];

    if (route.vehicle && route.vehicle.vehicleId) {
      try {
        const situation = await analysisService.getVehicleSituation(route.vehicle.vehicleId);
        deviationState = situation.deviation;
        incidents = situation.incidents || [];
        vehicleState = {
          vehicleId: route.vehicle.vehicleId,
          status: route.vehicle.status
        };
      } catch {
        // Continue with un-enriched route comparison if situation unavailable
      }

      try {
        predictionState = await predictionService.predictForVehicle(route.vehicle.vehicleId);
      } catch {
        // Continue if prediction unavailable
      }
    }

    return routeComparisonService.compareRoutes({
      currentRoute: {
        description: `Route ${route.routeId} (Planned Corridor)`,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        provider: route.provider
      },
      candidateRoutes: candidates,
      currentVehicleState: vehicleState,
      predictionState,
      deviationState,
      incidents
    });
  }

  /**
   * Accepts and activates a recommended reroute
   * @param {String} routeId
   * @param {String} userId
   * @param {String} decisionId
   * @returns {Promise<Object>} Updated route
   */
  async acceptReroute(routeId, userId = null, decisionId) {
    const route = await Route.findOne({ routeId });
    if (!route) {
      throw routeError('Route not found', 404);
    }

    if (!decisionId) {
      throw routeError('An approved REROUTE decision is required', 400);
    }

    const decision = await Decision.findOne({ decisionId });
    if (!decision) {
      throw routeError('Decision not found', 404);
    }
    if (
      decision.status !== 'APPROVED' ||
      decision.primaryAction !== 'REROUTE' ||
      !Array.isArray(decision.actions) ||
      !decision.actions.includes('REROUTE')
    ) {
      throw routeError('Decision is not an approved REROUTE', 409);
    }
    if (
      !decision.approvedCandidateId ||
      decision.approvedCandidateId !== decision.rerouteCandidate?.candidateId ||
      !isRerouteCandidateUnchanged(decision.rerouteCandidate)
    ) {
      throw routeError('The approved reroute candidate is missing or changed', 409);
    }

    const sameId = (left, right) => left && right && left.toString() === right.toString();
    if (
      !sameId(decision.route, route._id) ||
      !sameId(decision.emergency, route.emergency) ||
      !sameId(decision.vehicle, route.vehicle)
    ) {
      throw routeError('Route does not belong to the approved decision', 409);
    }

    const [emergency, vehicle] = await Promise.all([
      Emergency.findById(route.emergency),
      Vehicle.findById(route.vehicle)
    ]);
    if (!emergency || !vehicle) {
      throw routeError('Route emergency or vehicle not found', 404);
    }
    if (!sameId(emergency.assignedVehicle, route.vehicle)) {
      throw routeError('Route vehicle is not assigned to its emergency', 409);
    }

    const {
      geometry,
      distanceMeters,
      durationSeconds,
      preference,
      steps,
      provider,
      description,
      candidateId
    } = decision.rerouteCandidate;
    if (
      !geometry ||
      geometry.type !== 'LineString' ||
      !Array.isArray(geometry.coordinates) ||
      geometry.coordinates.length < 2 ||
      geometry.coordinates.some(
        coordinate => !Array.isArray(coordinate) || coordinate.length < 2
      ) ||
      !Number.isFinite(distanceMeters) ||
      distanceMeters <= 0 ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      throw routeError('A valid reroute geometry, distance, and duration are required', 400);
    }
    if (preference !== undefined && !['FASTEST', 'SHORTEST'].includes(preference)) {
      throw routeError('Invalid reroute preference', 400);
    }
    if (
      steps !== undefined &&
      (!Array.isArray(steps) ||
        steps.some(step =>
          !step ||
          typeof step.instruction !== 'string' ||
          !Number.isFinite(step.distance) ||
          step.distance < 0 ||
          !Number.isFinite(step.duration) ||
          step.duration < 0
        ))
    ) {
      throw routeError('Invalid reroute steps', 400);
    }

    const validation = validateRouteGeometry(
      { geometry, distanceMeters, durationSeconds },
      route.origin?.coordinates,
      route.destination?.coordinates
    );
    if (!validation.isValid || !validation.isRoadConstrained) {
      const reasons = validation.reasons.join('; ') || 'Geometry is not road-constrained';
      throw routeError(`Invalid reroute geometry: ${reasons}`, 400);
    }

    const candidateSteps = Array.isArray(steps) && steps.length > 0
      ? steps.map(step => ({
          maneuver: step.maneuver || 'CONTINUE',
          instruction: step.instruction,
          distance: step.distance ?? 0,
          duration: step.duration ?? 0,
          startLocation: step.startLocation || [],
          endLocation: step.endLocation || [],
          stepPolyline: step.stepPolyline || []
        }))
      : null;
    const candidateAlreadyActivated =
      route.status === 'ACTIVE' &&
      route.routeType === 'RECOMMENDED' &&
      route.rerouteDecisionId === decision.decisionId &&
      route.rerouteCandidateId === candidateId &&
      JSON.stringify(route.geometry?.coordinates) === JSON.stringify(geometry.coordinates) &&
      route.distance === distanceMeters &&
      route.duration === durationSeconds &&
      route.preference === (preference || route.preference) &&
      (!['MOCK', 'GOOGLE', 'MAPBOX', 'OSRM'].includes(provider) || route.provider === provider) &&
      (!candidateSteps || JSON.stringify((route.steps || []).map(step => ({
        maneuver: step.maneuver || 'CONTINUE',
        instruction: step.instruction,
        distance: step.distance ?? 0,
        duration: step.duration ?? 0,
        startLocation: step.startLocation || [],
        endLocation: step.endLocation || [],
        stepPolyline: step.stepPolyline || []
      }))) === JSON.stringify(candidateSteps));
    if (candidateAlreadyActivated) {
      return route;
    }

    const routeVersion = decision.inputSnapshot?.routeVersion;
    const routeUpdatedAt = decision.inputSnapshot?.routeUpdatedAt;
    if (
      route.status !== 'ACTIVE' ||
      decision.inputSnapshot?.routeStatus !== 'ACTIVE' ||
      !Number.isInteger(routeVersion) ||
      routeVersion !== route.__v ||
      !routeUpdatedAt ||
      new Date(routeUpdatedAt).getTime() !== new Date(route.updatedAt).getTime()
    ) {
      throw routeError('Approved route state is stale or no longer active', 409);
    }

    const update = {
      $set: {
        geometry,
        distance: distanceMeters,
        duration: durationSeconds,
        preference: preference || route.preference,
        routeType: 'RECOMMENDED',
        status: 'ACTIVE',
        rerouteDecisionId: decision.decisionId,
        rerouteCandidateId: candidateId
      },
      $inc: { __v: 1 }
    };
    if (Array.isArray(steps) && steps.length > 0) {
      update.$set.steps = steps;
    }
    if (['MOCK', 'GOOGLE', 'MAPBOX', 'OSRM'].includes(provider)) {
      update.$set.provider = provider;
    }

    const updatedRoute = await Route.findOneAndUpdate(
      {
        _id: route._id,
        emergency: route.emergency,
        vehicle: route.vehicle,
        status: 'ACTIVE',
        __v: routeVersion,
        updatedAt: route.updatedAt
      },
      update,
      { new: true, runValidators: true }
    );
    if (!updatedRoute) {
      throw routeError('Route changed before reroute activation', 409);
    }

    // Broadcast over Socket.IO
    try {
      const payload = {
        routeId: updatedRoute.routeId,
        emergencyId: emergency.emergencyId,
        vehicleId: vehicle.vehicleId,
        routeType: updatedRoute.routeType,
        status: 'REROUTE_ACCEPTED',
        distanceMeters: updatedRoute.distance,
        durationSeconds: updatedRoute.duration,
        preference: updatedRoute.preference,
        stepsCount: (updatedRoute.steps || []).length,
        reason: description || `Approved route candidate ${candidateId} activated`,
        timestamp: new Date().toISOString()
      };

      realtimeService.emitRouteUpdated(
        emergency.emergencyId,
        vehicle.vehicleId,
        payload
      );
    } catch (err) {
      console.error(`[RouteService] Reroute socket broadcast error: ${err.message}`);
    }

    return updatedRoute;
  }
}

export default new RouteService();
