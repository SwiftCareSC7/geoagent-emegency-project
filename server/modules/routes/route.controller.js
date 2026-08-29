import routeService from './route.service.js';
import analysisService from '../analysis/analysis.service.js';

/**
 * @desc    Generate and create a new route
 * @route   POST /api/routes
 * @access  Private (CONTROL_ROOM, ADMIN)
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

