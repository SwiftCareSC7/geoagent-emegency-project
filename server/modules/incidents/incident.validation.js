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
 * Validates the creation of a new incident
 */
export const validateIncidentCreate = (req, res, next) => {
  const { type, severity, location } = req.body;

  if (!type || !location) {
    const error = new Error('type and location are required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  const validTypes = ['ACCIDENT', 'ROAD_CLOSURE', 'ROAD_WORK', 'TRAFFIC_JAM', 'FIRE', 'WEATHER', 'PUBLIC_EVENT', 'OTHER'];
  if (!validTypes.includes(type)) {
    const error = new Error('Invalid incident type');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (severity) {
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!validSeverities.includes(severity)) {
      const error = new Error('Invalid severity');
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

  next();
};

/**
 * Validates the update of an incident
 */
export const validateIncidentUpdate = (req, res, next) => {
  const { severity, status, location } = req.body;

  if (severity) {
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!validSeverities.includes(severity)) {
      const error = new Error('Invalid severity');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  if (status) {
    const validStatuses = ['ACTIVE', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  if (location !== undefined && !isValidGeoJSONPoint(location)) {
    const error = new Error('Invalid location. Must be a valid GeoJSON Point [longitude, latitude]');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
