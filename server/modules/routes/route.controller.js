import routeService from './route.service.js';
import analysisService from '../analysis/analysis.service.js';
import corridorGreenWaveService from './corridorGreenWave.service.js';
import Route from './route.model.js';
import Vehicle from '../vehicles/vehicle.model.js';

/**
 * @desc    Calculate route plan with turn-by-turn maneuvers (Fastest vs Shortest)
 * @route   POST /api/routes/calculate
 * @access  Private (CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC)
 */
export const calculateRoute = async (req, res, next) => {
  try {
    const { origin, destination, preference, computeAlternatives } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination GeoJSON Points are required'
      });
    }

    const plan = await routeService.calculateRoutePlan(origin, destination, {
      preference: preference || 'FASTEST',
      computeAlternatives: computeAlternatives !== false
    });

    res.status(200).json({
      success: true,
      message: 'Route plan calculated successfully',
      data: plan
    });
  } catch (error) {
    if (error.message && error.message.includes('Unable to calculate route')) {
      res.status(502);
    } else {
      res.status(400);
    }
    next(error);
  }
};

/**
 * @desc    Generate and create a new route
 * @route   POST /api/routes
 * @access  Private (CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC)
 */
export const createRoute = async (req, res, next) => {
  try {
    const routeData = req.body;
    const userId = req.user._id;

    const route = await routeService.createRoute(routeData, userId);

    res.status(201).json({
      success: true,
      data: route.toSafeObject()
    });
  } catch (error) {
    if (error.message === 'Emergency not found' || error.message === 'Vehicle not found') {
      res.status(404);
    } else if (error.message.includes('Unable to calculate route')) {
      res.status(502); // Bad Gateway (External provider failed)
    } else {
      res.status(400);
    }
    next(error);
  }
};

/**
 * @desc    Get all routes with pagination and filters
 * @route   GET /api/routes
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getRoutes = async (req, res, next) => {
  try {
    const { page, limit, emergencyId, vehicleId, routeType, status } = req.query;
    
    const filters = { emergencyId, vehicleId, routeType, status };
    const result = await routeService.getRoutes(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.data.map(route => route.toSafeObject()),
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a specific route
 * @route   GET /api/routes/:routeId
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getRoute = async (req, res, next) => {
  try {
    const route = await routeService.getRouteById(req.params.routeId);
    
    res.status(200).json({
      success: true,
      data: route.toSafeObject()
    });
  } catch (error) {
    if (error.message === 'Route not found') {
      res.status(404);
    }
    next(error);
  }
};

/**
 * @desc    Get routes for a specific emergency
 * @route   GET /api/emergencies/:emergencyId/routes
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getEmergencyRoutes = async (req, res, next) => {
  try {
    const { page, limit, routeType, status } = req.query;
    
    const filters = { 
      emergencyId: req.params.emergencyId,
      routeType, 
      status 
    };
    
    const result = await routeService.getRoutes(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.data.map(route => route.toSafeObject()),
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete situation analysis for a specific route
 * @route   GET /api/routes/:routeId/analysis
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getRouteAnalysis = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const analysis = await analysisService.getRouteSituation(routeId);

    res.status(200).json({
      success: true,
      message: 'Route situation analysis generated',
      data: analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get deterministic route comparison and what-if analysis
 * @route   GET /api/routes/:routeId/compare
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const compareRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const comparison = await routeService.compareRoute(routeId);

    res.status(200).json({
      success: true,
      message: 'Route candidate comparison generated',
      data: comparison
    });
  } catch (error) {
    if (error.message === 'Route not found') {
      res.status(404);
    }
    next(error);
  }
};

/**
 * @desc    Get real-time V2X corridor and green-wave analysis for a route
 * @route   GET /api/routes/:routeId/corridor-v2x
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getCorridorV2X = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const route = await Route.findOne({ routeId });
    if (!route) {
      const err = new Error('Route not found');
      err.status = 404;
      throw err;
    }
    const vehicle = await Vehicle.findById(route.vehicle);
    if (!vehicle) {
      const err = new Error('Vehicle for route not found');
      err.status = 404;
      throw err;
    }
    const result = await corridorGreenWaveService.analyzeCorridorForVehicle(vehicle.vehicleId);
    res.status(200).json({
      success: true,
      message: 'V2X corridor and green-wave analysis generated',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept and activate a recommended reroute
 * @route   POST /api/routes/:routeId/accept-reroute
 * @access  Private (CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC)
 */
export const acceptReroute = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const rerouteData = req.body;
    const userId = req.user._id;

    const route = await routeService.acceptReroute(routeId, rerouteData, userId);

    res.status(200).json({
      success: true,
      message: 'Reroute accepted and activated successfully',
      data: route.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

