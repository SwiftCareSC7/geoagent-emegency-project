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
  const ALLOWED_PUBLIC_ROLES = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'];
  const rawRole = req.body.role || req.body.requestedRole;

  if (rawRole) {
    if (typeof rawRole !== 'string') {
      const error = new Error('Role must be a string');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }

    if (!ALLOWED_PUBLIC_ROLES.includes(rawRole)) {
      const error = new Error('Please select a valid role (CONTROL_ROOM, DRIVER, PARAMEDIC)');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }

    req.body.role = rawRole;
    req.body.requestedRole = rawRole;
  } else {
    req.body.role = 'CONTROL_ROOM';
    req.body.requestedRole = 'CONTROL_ROOM';
  }

  // Workspaces validation
  const ALLOWED_WORKSPACES = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC', 'ADMIN'];
  const rawWorkspaces = req.body.requestedWorkspaces;

  if (rawWorkspaces !== undefined) {
    if (!Array.isArray(rawWorkspaces)) {
      const error = new Error('Requested workspaces must be an array');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
    if (rawWorkspaces.length > 5) {
      const error = new Error('Too many requested workspaces');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
    for (const ws of rawWorkspaces) {
      if (typeof ws !== 'string' || !ALLOWED_WORKSPACES.includes(ws)) {
        const error = new Error(`Invalid workspace requested: ${ws}`);
        error.status = 400;
        error.isOperational = true;
        return next(error);
      }
    }
    // Deduplicate requested workspaces
    req.body.requestedWorkspaces = Array.from(new Set(rawWorkspaces));
  }

  // Vehicle assignment validation
  if (req.body.assignedVehicleId !== undefined && req.body.assignedVehicleId !== null) {
    if (typeof req.body.assignedVehicleId !== 'string') {
      const error = new Error('Assigned vehicle ID must be a string');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
    if (req.body.assignedVehicleId.trim().length > 50) {
      const error = new Error('Assigned vehicle ID must not exceed 50 characters');
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
    req.body.assignedVehicleId = req.body.assignedVehicleId.trim();
  }

  // Never trust client-supplied permittedWorkspaces, status, or approval audit metadata
  delete req.body.permittedWorkspaces;
  delete req.body.status;
  delete req.body.approvedBy;
  delete req.body.approvedAt;

  // Normalize email and name
  req.body.email = email.trim().toLowerCase();
  req.body.name = name.trim();

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
