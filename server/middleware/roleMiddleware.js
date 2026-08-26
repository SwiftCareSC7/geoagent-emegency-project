/**
 * Role-based authorization middleware
 * Ensures the authenticated user possesses one of the required roles.
 * 
 * @param {...String} roles - Allowed roles (e.g., 'ADMIN', 'CONTROL_ROOM')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    // req.user is populated by the authMiddleware (protect)
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('Forbidden: Insufficient privileges');
      error.status = 403;
      error.isOperational = true;
      return next(error);
    }
    next();
  };
};
