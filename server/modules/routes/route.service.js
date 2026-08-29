import crypto from 'crypto';
import Route from './route.model.js';
import routingService from './routing.service.js';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
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
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      throw new Error('Emergency not found');
    }

    // 2. Validate Vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // 3. Call External Routing Service (Mock or Real)
    // The routingService throws safe errors if provider fails
    const generatedRoute = await routingService.getRoute(origin, destination);

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
        status: route.status
      });
    } catch (err) {
      console.error(`[RouteService] Real-time event emission error: ${err.message}`);
    }

    return route;
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
    if (filters.emergencyId) query.emergency = filters.emergencyId;
    if (filters.vehicleId) query.vehicle = filters.vehicleId;
    if (filters.routeType) query.routeType = filters.routeType;
    if (filters.status) query.status = filters.status;

    const [routes, total] = await Promise.all([
      Route.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('emergency', 'caseId status priority')
        .populate('vehicle', 'vehicleId status'),
      Route.countDocuments(query)
    ]);

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
      .populate('emergency', 'caseId status')
      .populate('vehicle', 'vehicleId status callSign');

    if (!route) {
      throw new Error('Route not found');
    }

    return route;
  }
}

export default new RouteService();
