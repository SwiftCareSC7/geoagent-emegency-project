import crypto from 'crypto';
import Route from './route.model.js';
import routingService from './routing.service.js';
import routeComparisonService from './routeComparison.service.js';
import analysisService from '../analysis/analysis.service.js';
import predictionService from '../analysis/prediction.service.js';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import realtimeService from '../realtime/realtime.service.js';


class RouteService {
  /**
   * Creates a new route by calling the external routing provider and saving to DB
   * @param {Object} routeData Origin, destination, emergency, vehicle, etc.
   * @param {String} userId ID of user creating the route
   * @returns {Promise<Object>} Created route
   */
  async createRoute(routeData, userId) {
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
      createdBy: userId
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
      query.emergency = em ? em._id : filters.emergencyId;
    }
    if (filters.vehicleId) {
      const isVehicleObjectId = typeof filters.vehicleId === 'string' && filters.vehicleId.match(/^[0-9a-fA-F]{24}$/);
      const veh = await Vehicle.findOne(
        isVehicleObjectId ? { _id: filters.vehicleId } : { vehicleId: filters.vehicleId }
      );
      query.vehicle = veh ? veh._id : filters.vehicleId;
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
   * @param {Object} rerouteData { geometry, distanceMeters, durationSeconds, preference, steps, reason }
   * @param {String} userId
   * @returns {Promise<Object>} Updated route
   */
  async acceptReroute(routeId, rerouteData = {}, userId = null) {
    const route = await Route.findOne({ routeId });
    if (!route) {
      const error = new Error('Route not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    if (rerouteData.geometry) {
      route.geometry = rerouteData.geometry;
    }
    if (rerouteData.distanceMeters) {
      route.distance = rerouteData.distanceMeters;
    }
    if (rerouteData.durationSeconds) {
      route.duration = rerouteData.durationSeconds;
    }
    if (rerouteData.preference) {
      route.preference = rerouteData.preference;
    }
    if (Array.isArray(rerouteData.steps) && rerouteData.steps.length > 0) {
      route.steps = rerouteData.steps;
    }

    route.routeType = 'RECOMMENDED';
    route.status = 'ACTIVE';
    route.updatedBy = userId;
    await route.save();

    // Broadcast over Socket.IO
    try {
      const emergency = await Emergency.findById(route.emergency);
      const vehicle = await Vehicle.findById(route.vehicle);
      const payload = {
        routeId: route.routeId,
        emergencyId: emergency?.emergencyId || null,
        vehicleId: vehicle?.vehicleId || null,
        routeType: route.routeType,
        status: 'REROUTE_ACCEPTED',
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        preference: route.preference,
        stepsCount: (route.steps || []).length,
        reason: rerouteData.reason || 'GeoAgent recommended faster bypass accepted by driver',
        timestamp: new Date().toISOString()
      };

      realtimeService.emitRouteUpdated(
        emergency?.emergencyId || 'ALL',
        vehicle?.vehicleId || 'ALL',
        payload
      );
    } catch (err) {
      console.error(`[RouteService] Reroute socket broadcast error: ${err.message}`);
    }

    return route;
  }

  /**
   * Recalculates route from vehicle's current position
   * @param {String} vehicleId Vehicle ID
   * @param {String} routeId Route ID (optional, finds active route if not provided)
   * @param {Object} options { reason, userId, preference }
   * @returns {Promise<Object>} Updated route
   */
  async recalculateRouteFromCurrentPosition(vehicleId, routeId = null, options = {}) {
    const { reason = 'Manual re-route request', userId = null, preference = 'FASTEST' } = options;

    // 1. Find vehicle
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

    // 2. Find active route for this vehicle
    const routeQuery = { vehicle: vehicle._id, status: 'ACTIVE' };
    if (routeId) {
      const isRouteObjectId = typeof routeId === 'string' && routeId.match(/^[0-9a-fA-F]{24}$/);
      if (isRouteObjectId) {
        routeQuery._id = routeId;
      } else {
        routeQuery.routeId = routeId;
      }
    }
    const route = await Route.findOne(routeQuery).sort({ createdAt: -1 });
    if (!route) {
      const error = new Error('No active route found for this vehicle');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // 3. Get latest trajectory (current position)
    const latestTrajectory = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
    if (!latestTrajectory) {
      const error = new Error('No trajectory data available for this vehicle');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // 4. Calculate new route from current position to destination
    const currentOrigin = latestTrajectory.location;
    const destination = route.destination;
    const newRouteData = await routingService.getRoute(currentOrigin, destination, { preference });

    // 5. Update route with new geometry
    route.geometry = newRouteData.geometry;
    route.distance = newRouteData.distanceMeters;
    route.duration = newRouteData.durationSeconds;
    route.origin = currentOrigin;
    route.steps = newRouteData.steps || [];
    route.routeType = 'RECALCULATED';
    route.updatedBy = userId;
    await route.save();

    // 6. Broadcast over Socket.IO
    try {
      const emergency = await Emergency.findById(route.emergency);
      const payload = {
        routeId: route.routeId,
        emergencyId: emergency?.emergencyId || null,
        vehicleId: vehicle.vehicleId,
        routeType: route.routeType,
        status: 'REROUTE_CALCULATED',
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        preference: route.preference,
        stepsCount: (route.steps || []).length,
        origin: currentOrigin,
        reason,
        timestamp: new Date().toISOString()
      };

      realtimeService.emitRouteUpdated(
        emergency?.emergencyId || 'ALL',
        vehicle.vehicleId,
        payload
      );
    } catch (err) {
      console.error(`[RouteService] Re-route socket broadcast error: ${err.message}`);
    }

    return route;
  }

  /**
   * Manually override a route with specified geometry
   * @param {String} routeId
   * @param {Object} overrideData { newGeometry, overrideReason, userId }
   * @returns {Promise<Object>} Updated route
   */
  async overrideRoute(routeId, overrideData = {}) {
    const { newGeometry, overrideReason, userId } = overrideData;

    const route = await Route.findOne({ routeId });
    if (!route) {
      const error = new Error('Route not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // Validate new geometry if provided
    if (newGeometry) {
      if (!newGeometry.type || newGeometry.type !== 'LineString') {
        const error = new Error('Invalid geometry type: must be LineString');
        error.status = 400;
        error.isOperational = true;
        throw error;
      }
      if (!Array.isArray(newGeometry.coordinates) || newGeometry.coordinates.length < 2) {
        const error = new Error('Invalid geometry: must have at least 2 coordinates');
        error.status = 400;
        error.isOperational = true;
        throw error;
      }

      route.geometry = newGeometry;
      
      // Recalculate distance and duration using routing service
      try {
        const routeData = await routingService.getRoute(route.origin, route.destination, {
          preference: route.preference || 'FASTEST'
        });
        route.distance = routeData.distanceMeters;
        route.duration = routeData.durationSeconds;
      } catch (calcErr) {
        console.warn(`[RouteService] Could not recalculate distance/duration for override: ${calcErr.message}`);
      }
    }

    route.routeType = 'MANUAL_OVERRIDE';
    route.status = 'ACTIVE';
    route.updatedBy = userId;
    await route.save();

    // Log override in decision history
    try {
      const Decision = await import('../decisions/decision.model.js').then(m => m.default);
      const decision = new Decision({
        decisionId: `DEC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        emergency: route.emergency,
        vehicle: route.vehicle,
        primaryAction: 'MANUAL_ROUTE_OVERRIDE',
        severity: 'WARNING',
        status: 'EXECUTED',
        reasonCodes: ['MANUAL_OVERRIDE'],
        details: {
          summary: 'Control room operator manually overrode route',
          reasoning: [`Override reason: ${overrideReason || 'Not specified'}`],
          originalRouteId: route.routeId,
          overrideBy: userId
        },
        executedAt: new Date()
      });
      await decision.save();
    } catch (decisionErr) {
      console.error(`[RouteService] Failed to log override in decision history: ${decisionErr.message}`);
    }

    // Broadcast over Socket.IO
    try {
      const emergency = await Emergency.findById(route.emergency);
      const vehicle = await Vehicle.findById(route.vehicle);
      const payload = {
        routeId: route.routeId,
        emergencyId: emergency?.emergencyId || null,
        vehicleId: vehicle?.vehicleId || null,
        routeType: route.routeType,
        status: 'MANUAL_OVERRIDE',
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        preference: route.preference,
        stepsCount: (route.steps || []).length,
        reason: overrideReason || 'Manual override by control room',
        timestamp: new Date().toISOString()
      };

      realtimeService.emitRouteUpdated(
        emergency?.emergencyId || 'ALL',
        vehicle?.vehicleId || 'ALL',
        payload
      );
    } catch (err) {
      console.error(`[RouteService] Manual override socket broadcast error: ${err.message}`);
    }

    return route;
  }
}

export default new RouteService();
