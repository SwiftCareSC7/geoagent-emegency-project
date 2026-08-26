/**
 * Helper to validate a GeoJSON Point
 */
const isValidGeoJSONPoint = (point) => {
  if (!point || typeof point !== 'object') return false;
  if (point.type !== 'Point') return false;
  if (!Array.isArray(point.coordinates) || point.coordinates.length !== 2) return false;
  
  const [lng, lat] = point.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (lng < -180 || lng > 180) return false;
  if (lat < -90 || lat > 90) return false;
  
  return true;
};

/**
 * Validates the creation of a new emergency
 */
export const validateEmergencyCreate = (req, res, next) => {
  const { type, priority, location, destination } = req.body;

  if (!type || !location) {
    const error = new Error('type and location are required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  const validTypes = ['MEDICAL', 'ACCIDENT', 'FIRE', 'POLICE', 'OTHER'];
  if (!validTypes.includes(type)) {
    const error = new Error('Invalid emergency type');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (priority) {
    const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(priority)) {
      const error = new Error('Invalid priority');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  if (!isValidGeoJSONPoint(location)) {
    const error = new Error('Invalid location. Must be a valid GeoJSON Point [longitude, latitude]');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (destination !== undefined && !isValidGeoJSONPoint(destination)) {
    const error = new Error('Invalid destination. Must be a valid GeoJSON Point [longitude, latitude]');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};

/**
 * Validates the update of an emergency
 */
export const validateEmergencyUpdate = (req, res, next) => {
  const { priority, status, destination } = req.body;

  if (priority) {
    const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(priority)) {
      const error = new Error('Invalid priority');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  if (status) {
    const validStatuses = ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'AT_SCENE', 'RESOLVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  if (destination !== undefined && !isValidGeoJSONPoint(destination)) {
    const error = new Error('Invalid destination. Must be a valid GeoJSON Point [longitude, latitude]');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};

/**
 * Validates the vehicle assignment
 */
export const validateEmergencyAssign = (req, res, next) => {
  const { vehicleId } = req.body;

  if (!vehicleId) {
    const error = new Error('vehicleId is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
