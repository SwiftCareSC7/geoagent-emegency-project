import bcrypt from 'bcryptjs';
import User from './user.model.js';

/**
 * Register a new user securely
 */
export const registerUser = async (userData) => {
  const { name, email, password } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.status = 409;
    error.isOperational = true;
    throw error;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12); // High work factor
  const hashedPassword = await bcrypt.hash(password, salt);

  // Privilege escalation protection: All public registrations are quarantined with PENDING status.
  // Public accounts can NEVER receive ADMIN role or ADMIN workspaces.
  const rawRole = userData.role || userData.requestedRole || 'CONTROL_ROOM';
  const rawWorkspaces = Array.isArray(userData.requestedWorkspaces)
    ? userData.requestedWorkspaces
    : [];

  // Determine requested operational role (public can only be CONTROL_ROOM, DRIVER, PARAMEDIC; ADMIN is never granted)
  let requestedRole = 'CONTROL_ROOM';
  if (['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'].includes(rawRole)) {
    requestedRole = rawRole;
  }

  // Sanitize requested workspaces (operational only)
  const validOperationalWorkspaces = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'];
  const sanitizedWorkspaces = Array.from(new Set(rawWorkspaces.filter(w => validOperationalWorkspaces.includes(w))));
  if (!sanitizedWorkspaces.includes(requestedRole)) {
    sanitizedWorkspaces.unshift(requestedRole);
  }

  // Create user with PENDING approval status
  // Authoritative permissions are distinct from requested permissions.
  // CRITICAL SECURITY ENFORCEMENT:
  // All newly registered accounts are created in PENDING status with permittedWorkspaces: []
  // A PENDING account cannot log in, cannot receive JWT tokens, and cannot access any protected endpoints.
  const newUser = new User({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role: requestedRole,
    requestedRole: requestedRole,
    requestedWorkspaces: sanitizedWorkspaces,
    permittedWorkspaces: [], // Zero permitted workspaces until approved!
    status: 'PENDING',
    assignedVehicleId: userData.assignedVehicleId ? userData.assignedVehicleId.trim() : null
  });

  await newUser.save();

  return newUser;
};

/**
 * Authenticate a user
 */
export const loginUser = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    // We throw a generic error to prevent email enumeration
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.isOperational = true;
    throw error;
  }

  // Compare passwords securely
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.isOperational = true;
    throw error;
  }

  // Check account approval, suspension, and rejection status
  const currentStatus = user.status || 'APPROVED';
  if (currentStatus === 'PENDING') {
    const error = new Error('Account registration is pending administrator approval');
    error.status = 403;
    error.isOperational = true;
    throw error;
  }
  if (currentStatus === 'SUSPENDED') {
    const error = new Error('Account has been suspended. Please contact an administrator');
    error.status = 403;
    error.isOperational = true;
    throw error;
  }
  if (currentStatus === 'REJECTED') {
    const error = new Error('Account registration was rejected. Please contact an administrator');
    error.status = 403;
    error.isOperational = true;
    throw error;
  }

  return user;
};
