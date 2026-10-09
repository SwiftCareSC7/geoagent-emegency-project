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

/**
 * Workspace-based authorization middleware
 * Ensures the authenticated user possesses access to at least one of the required workspaces.
 * ADMIN possesses all workspaces.
 * Non-admin must have the workspace explicitly in user.permittedWorkspaces.
 *
 * @param {...String} workspaces - Allowed workspaces (e.g., 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC')
 */
export const requireWorkspace = (...workspaces) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Authentication required');
      error.status = 401;
      error.isOperational = true;
      return next(error);
    }
    if (req.user.role === 'ADMIN') {
      return next();
    }
    const userWorkspaces = Array.isArray(req.user.permittedWorkspaces) ? req.user.permittedWorkspaces : [];
    const hasWorkspace = workspaces.some(w => userWorkspaces.includes(w));
    if (!hasWorkspace) {
      const error = new Error('Forbidden: Insufficient workspace permissions');
      error.status = 403;
      error.isOperational = true;
      return next(error);
    }
    next();
  };
};
