import { verifyToken } from './jwt.utils.js';
import User from './user.model.js';

/**
 * Protect routes by requiring a valid JWT in the HTTP-only cookie
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // Read token from cookie or Authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
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

      // Defense-in-depth: Immediately block tokens from suspended or pending accounts
      if (user.status === 'SUSPENDED') {
        const error = new Error('Account has been suspended');
        error.status = 403;
        error.isOperational = true;
        return next(error);
      }

      if (user.status === 'PENDING') {
        const error = new Error('Account registration is pending administrator approval');
        error.status = 403;
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

// requireRole moved to roleMiddleware.js
