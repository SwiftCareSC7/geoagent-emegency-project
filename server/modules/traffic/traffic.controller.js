import trafficService from './traffic.service.js';
import { createPoint, validateCoordinates } from '../../shared/services/geospatial.service.js';

/**
 * @desc    Get traffic conditions at a specific coordinate
 * @route   GET /api/traffic/location
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getTrafficAtLocation = async (req, res, next) => {
  try {
    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);

    if (isNaN(lng) || isNaN(lat) || !validateCoordinates([lng, lat])) {
      const error = new Error('Valid lng and lat query parameters are required');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }

    const point = createPoint(lng, lat);
    const traffic = await trafficService.getTrafficForLocation(point);

    res.status(200).json({
      success: true,
      data: traffic
    });
  } catch (error) {
    next(error);
  }
};
