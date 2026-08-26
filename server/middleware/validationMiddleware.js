/**
 * Validates registration input
 */
export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
    const error = new Error('Valid name is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    const error = new Error('Valid email is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Password validation: minimum 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    const error = new Error('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();

  next();
};

/**
 * Validates login input
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();

  next();
};

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
