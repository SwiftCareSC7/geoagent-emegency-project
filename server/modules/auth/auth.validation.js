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

  // Role validation
  const ALLOWED_PUBLIC_ROLES = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC', 'ADMIN'];
  const requestedRole = req.body.role;

  if (requestedRole) {
    if (!ALLOWED_PUBLIC_ROLES.includes(requestedRole)) {
      const error = new Error('Please select a valid role (CONTROL_ROOM, DRIVER, PARAMEDIC, ADMIN)');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }

    req.body.role = requestedRole;
  } else {
    req.body.role = 'CONTROL_ROOM';
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
