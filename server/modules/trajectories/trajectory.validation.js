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
 * Validates the creation of a new trajectory GPS point
 */
export const validateTrajectoryCreate = (req, res, next) => {
  const { vehicleId, location, speed, heading, timestamp, source } = req.body;

  if (!vehicleId) {
    const error = new Error('vehicleId is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (!isValidGeoJSONPoint(location)) {
    const error = new Error('Invalid location. Must be a valid GeoJSON Point [longitude, latitude]');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (typeof speed !== 'number' || speed < 0 || speed > 250) {
    const error = new Error('Invalid speed. Must be a number between 0 and 250 km/h');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (typeof heading !== 'number' || heading < 0 || heading > 360) {
    const error = new Error('Invalid heading. Must be a number between 0 and 360 degrees');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (!timestamp) {
    const error = new Error('timestamp is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  const parsedTimestamp = new Date(timestamp);
  if (isNaN(parsedTimestamp.getTime())) {
    const error = new Error('Invalid timestamp format');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Allow max 5 minutes of future clock skew
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60000);
  if (parsedTimestamp > fiveMinutesFromNow) {
    const error = new Error('Timestamp cannot be unreasonably in the future');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (source && !['SIMULATOR', 'DEVICE', 'API'].includes(source)) {
    const error = new Error('Invalid source');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
