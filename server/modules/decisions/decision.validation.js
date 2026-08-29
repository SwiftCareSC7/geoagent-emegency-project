/**
 * Request-level validation for Decision Engine endpoints.
 *
 * The Decision Engine deliberately accepts a minimal input payload
 * (typically only `emergencyId`). Operational truth (ETA, deviation, traffic,
 * incidents, GeoAgent output) is always loaded server-side and is NEVER
 * accepted from the client.
 */

const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;

export const validateAnalyzeRequest = (req, res, next) => {
  const { emergencyId } = req.body || {};
  if (!isNonEmptyString(emergencyId)) {
    const error = new Error('A valid emergencyId is required in the request body');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Explicitly reject any client-supplied operational fields — server is authoritative.
  const forbidden = [
    'eta', 'traffic', 'deviation', 'incidents', 'geoAgentRecommendation',
    'alternativeRoutes', 'availableBackupVehicles', 'delayMinutes', 'severity',
    'actions', 'primaryAction', 'reasonCodes', 'status', 'vehicleStatus', 'routeStatus'
  ];
  const present = forbidden.filter((k) => req.body && req.body[k] !== undefined);
  if (present.length > 0) {
    const error = new Error(`Client-supplied operational fields are not allowed: ${present.join(', ')}`);
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};

export const validateDecisionIdParam = (req, res, next) => {
  const { decisionId } = req.params;
  if (!isNonEmptyString(decisionId)) {
    const error = new Error('A valid decisionId path parameter is required');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }
  next();
};

export const validateRejectionPayload = (req, res, next) => {
  const { reason } = req.body || {};
  if (reason !== undefined && typeof reason !== 'string') {
    const error = new Error('Rejection reason must be a string if provided');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }
  next();
};