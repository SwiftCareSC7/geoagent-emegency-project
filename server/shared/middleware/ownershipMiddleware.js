/**
 * SwiftCare GeoAgent — Resource Ownership Middleware
 *
 * Enforces resource-level authorization boundaries:
 * - ADMIN: Organization-wide supervisory authority
 * - CONTROL_ROOM: Full dispatch and monitoring operations
 * - DRIVER: Confined strictly to assigned vehicle operations
 * - PARAMEDIC: Confined strictly to assigned clinical triage & vehicle operations
 */

export const requireVehicleOwnership = (req, res, next) => {
  if (!req.user) {
    const error = new Error('Authentication required');
    error.status = 401;
    error.isOperational = true;
    return next(error);
  }

  // ADMIN and CONTROL_ROOM have organization-wide dispatch authority
  if (req.user.role === 'ADMIN' || req.user.role === 'CONTROL_ROOM') {
    return next();
  }

  const targetVehicleId = req.params.vehicleId || req.body.vehicleId;

  if (req.user.role === 'DRIVER') {
    if (!req.user.assignedVehicleId || req.user.assignedVehicleId !== targetVehicleId) {
      const error = new Error('Access denied: Drivers can only operate on their assigned vehicle');
      error.status = 403;
      error.isOperational = true;
      return next(error);
    }
  }

  if (req.user.role === 'PARAMEDIC') {
    if (req.user.assignedVehicleId && req.user.assignedVehicleId !== targetVehicleId) {
      const error = new Error('Access denied: Paramedics can only operate on their assigned vehicle');
      error.status = 403;
      error.isOperational = true;
      return next(error);
    }
  }

  next();
};
