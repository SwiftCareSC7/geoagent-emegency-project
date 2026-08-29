import { geoAgentConstants } from './geoagent.constants.js';

/**
 * Sanitizes arbitrary text strings to strip out potential HTML or script tags
 * @param {String} text
 * @returns {String}
 */
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

/**
 * Validates and normalizes structured GeoAgent output from Gemini
 * @param {Object} rawOutput Parsed JSON output from LLM
 * @param {Object} fallbackContext Context to safely complete missing fields
 * @returns {Object} Validated and normalized response
 */
export const validateGeoAgentOutput = (rawOutput, fallbackContext = {}) => {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new Error('AI output must be a valid JSON object');
  }

  const { actions, causes } = geoAgentConstants;

  // 1. Vehicle and Emergency identifiers
  const vehicleId = rawOutput.vehicleId || fallbackContext.vehicleId || 'UNKNOWN';
  const emergencyId = rawOutput.emergencyId || fallbackContext.emergencyId || 'UNKNOWN';

  // 2. Assessment
  const rawAssessment = rawOutput.assessment || {};
  const routeStatus = rawAssessment.routeStatus || fallbackContext.routeStatus || 'ON_ROUTE';
  let likelyCause = rawAssessment.likelyCause;
  if (!Object.values(causes).includes(likelyCause)) {
    likelyCause = causes.UNKNOWN_FACTORS;
  }
  
  let confidence = typeof rawAssessment.confidence === 'number' ? rawAssessment.confidence : 0.75;
  confidence = Number(Math.max(0.0, Math.min(1.0, confidence)).toFixed(2));

  const assessment = {
    routeStatus,
    likelyCause,
    confidence
  };

  // 3. ETA & Delay
  const rawEta = rawOutput.eta || {};
  const currentMinutes = typeof rawEta.currentMinutes === 'number' && rawEta.currentMinutes >= 0
    ? rawEta.currentMinutes
    : (fallbackContext.currentMinutes || 0);

  const originalMinutes = typeof rawEta.originalMinutes === 'number' && rawEta.originalMinutes >= 0
    ? rawEta.originalMinutes
    : (fallbackContext.originalMinutes || 0);

  const delayMinutes = typeof rawEta.delayMinutes === 'number' && rawEta.delayMinutes >= 0
    ? rawEta.delayMinutes
    : Math.max(0, currentMinutes - originalMinutes);

  const eta = {
    currentMinutes,
    originalMinutes,
    delayMinutes
  };

  // 4. Recommendation
  const rawRec = rawOutput.recommendation || {};
  let action = rawRec.action;
  if (!Object.values(actions).includes(action)) {
    action = actions.MONITOR;
  }

  const recommendation = {
    action,
    routeId: rawRec.routeId ? sanitizeText(rawRec.routeId) : null,
    summary: rawRec.summary ? sanitizeText(rawRec.summary) : `Recommended action: ${action}`
  };

  // 5. Backup analysis
  const rawBackup = rawOutput.backup || {};
  const backup = {
    recommended: Boolean(rawBackup.recommended),
    reason: rawBackup.reason ? sanitizeText(rawBackup.reason) : 'No backup ambulance required at this time',
    candidateVehicleId: rawBackup.candidateVehicleId ? sanitizeText(rawBackup.candidateVehicleId) : null
  };

  // 6. Observations discipline (Observed vs Inferred vs Unknown)
  const rawObs = rawOutput.observations || {};
  const observations = {
    observed: Array.isArray(rawObs.observed) ? rawObs.observed.map(sanitizeText).filter(Boolean) : [],
    inferred: Array.isArray(rawObs.inferred) ? rawObs.inferred.map(sanitizeText).filter(Boolean) : [],
    unknown: Array.isArray(rawObs.unknown) ? rawObs.unknown.map(sanitizeText).filter(Boolean) : []
  };

  // 7. Reasoning
  const reasoning = rawOutput.reasoning
    ? sanitizeText(rawOutput.reasoning)
    : 'No detailed reasoning provided by the AI agent.';

  return {
    status: 'ANALYZED',
    vehicleId,
    emergencyId,
    assessment,
    eta,
    recommendation,
    backup,
    observations,
    reasoning,
    analyzedAt: new Date().toISOString()
  };
};
