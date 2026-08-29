/**
 * Real-Time Event Envelopes & Formatting
 */

/**
 * Wraps payload into a standardized, versioned event envelope
 * @param {String} eventName
 * @param {Object} data
 * @param {Number} version
 * @returns {Object}
 */
export const createEventEnvelope = (eventName, data, version = 1) => ({
  version,
  event: eventName,
  timestamp: new Date().toISOString(),
  data
});

/**
 * Normalizes vehicle location event payload
 */
export const formatVehicleLocationPayload = (vehicleId, location, speed, heading, timestamp) => ({
  vehicleId,
  location,
  speedKmh: typeof speed === 'number' ? speed : 0,
  heading: typeof heading === 'number' ? heading : 0,
  recordedAt: timestamp || new Date().toISOString()
});

/**
 * Normalizes deviation event payload
 */
export const formatDeviationPayload = (vehicleId, routeId, emergencyId, deviation) => ({
  vehicleId,
  routeId,
  emergencyId,
  status: deviation.status,
  distanceFromRouteMeters: deviation.distanceFromRouteMeters,
  bearingDifferenceDegrees: deviation.bearingDifferenceDegrees,
  gpsStability: deviation.gpsStability,
  confidence: deviation.confidence
});

/**
 * Normalizes ETA event payload
 */
export const formatEtaPayload = (vehicleId, emergencyId, eta, delay) => ({
  vehicleId,
  emergencyId,
  currentMinutes: eta.currentMinutes,
  originalMinutes: eta.originalMinutes,
  remainingDistanceMeters: eta.remainingDistanceMeters,
  delayMinutes: delay.delayMinutes,
  timeSavedMinutes: delay.timeSavedMinutes
});
