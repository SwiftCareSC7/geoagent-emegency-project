/**
 * Validates the creation of a new vehicle
 */
export const validateVehicleCreate = (req, res, next) => {
  const { vehicleId, registrationNumber, type, driverName, capacity } = req.body;

  if (!vehicleId || !registrationNumber || !type || !driverName || capacity === undefined) {
    const error = new Error('vehicleId, registrationNumber, type, driverName, and capacity are required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  const validTypes = ['AMBULANCE', 'FIRE_ENGINE', 'POLICE'];
  if (!validTypes.includes(type)) {
    const error = new Error('Invalid vehicle type');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  if (typeof capacity !== 'number' || capacity < 1) {
    const error = new Error('Capacity must be a positive integer');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};

/**
 * Validates the update of a vehicle
 */
export const validateVehicleUpdate = (req, res, next) => {
  const { status, capacity } = req.body;

  if (status) {
    const validStatuses = [
      'AVAILABLE',
      'DISPATCHED',
      'EN_ROUTE',
      'AT_SCENE',
      'RETURNING',
      'OFFLINE',
      'MAINTENANCE'
    ];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status value');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  if (capacity !== undefined) {
    if (typeof capacity !== 'number' || capacity < 1) {
      const error = new Error('Capacity must be a positive integer');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  next();
};
