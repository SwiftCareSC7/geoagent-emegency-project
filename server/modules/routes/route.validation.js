import { validateCoordinates } from '../../shared/services/geospatial.service.js';

/**
 * Validates the creation of a new route
 */
export const validateRouteCreate = (req, res, next) => {
  const { emergencyId, vehicleId, routeType, origin, destination } = req.body;

  if (!emergencyId) {
    const error = new Error('emergencyId is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (!vehicleId) {
    const error = new Error('vehicleId is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (routeType) {
    const validTypes = ['PLANNED', 'ALTERNATIVE'];
    if (!validTypes.includes(routeType)) {
      const error = new Error('Invalid routeType');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  const isValidGeoJSONPoint = (point) => {
    if (!point || typeof point !== 'object') return false;
    if (point.type !== 'Point') return false;
    return validateCoordinates(point.coordinates);
  };

  if (!isValidGeoJSONPoint(origin)) {
    const error = new Error('Invalid origin. Must be a valid GeoJSON Point');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (!isValidGeoJSONPoint(destination)) {
    const error = new Error('Invalid destination. Must be a valid GeoJSON Point');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
