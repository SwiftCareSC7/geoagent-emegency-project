import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Protect routes by requiring a valid JWT in the HTTP-only cookie
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Read the token from the cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      const error = new Error('Authentication required');
      error.status = 401;
      error.isOperational = true;
      return next(error);
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Find user by id from token payload
      const user = await User.findById(decoded.userId);

      if (!user) {
        const error = new Error('Authentication required');
        error.status = 401;
        error.isOperational = true;
        return next(error);
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (err) {
      // Catch specific JWT errors (expired, invalid signature) and mask them
      const error = new Error('Authentication required');
      error.status = 401;
      error.isOperational = true;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware (for future use)
 * @param {...String} roles 
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('Forbidden: Insufficient privileges');
      error.status = 403;
      error.isOperational = true;
      return next(error);
    }
    next();
  };
};
