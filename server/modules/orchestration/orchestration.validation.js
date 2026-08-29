/**
 * Request validation for Orchestration endpoints
 */

const FORBIDDEN_CLIENT_FIELDS = [
  'eta',
  'traffic',
  'status',
  'deviation',
  'decision',
  'actions',
  'speed',
  'location',
  'recommendation',
  'severity',
  'priority'
];

/**
 * Validates emergency analysis orchestration request
 */
export const validateOrchestrationRequest = (req, res, next) => {
  const { emergencyId } = req.params;

  if (!emergencyId || typeof emergencyId !== 'string' || emergencyId.trim() === '') {
    const error = new Error('Invalid or missing emergencyId parameter');
    error.status = 400;
    error.isOperational = true;
    return next(error);
  }

  // Check if client submitted any forbidden operational payload fields
  if (req.body && typeof req.body === 'object') {
    const presentForbidden = FORBIDDEN_CLIENT_FIELDS.filter((field) => field in req.body);
    if (presentForbidden.length > 0) {
      const error = new Error(
        `Client-supplied operational fields are forbidden: ${presentForbidden.join(', ')}`
      );
      error.status = 400;
      error.isOperational = true;
      return next(error);
    }
  }

  next();
};
