/**
 * Validates GeoAgent analysis request parameters
 */

export const validateAnalyzeRequest = (req, res, next) => {
  const { emergencyId } = req.body;

  if (!emergencyId || typeof emergencyId !== 'string' || emergencyId.trim() === '') {
    const error = new Error('A valid emergencyId is required in the request body');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};

export const validateVehicleAnalyzeRequest = (req, res, next) => {
  const { vehicleId } = req.params;

  if (!vehicleId || typeof vehicleId !== 'string' || vehicleId.trim() === '') {
    const error = new Error('A valid vehicleId parameter is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
