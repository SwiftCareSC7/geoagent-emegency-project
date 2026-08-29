/**
 * Validates vehicle analysis request parameters
 */
export const validateAnalysisRequest = (req, res, next) => {
  const { vehicleId } = req.params;

  if (!vehicleId || typeof vehicleId !== 'string' || vehicleId.trim() === '') {
    const error = new Error('A valid vehicleId parameter is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
