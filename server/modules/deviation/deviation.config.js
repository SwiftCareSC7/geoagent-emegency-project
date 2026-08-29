/**
 * Configuration thresholds for route deviation analysis.
 * Initial prototype thresholds — can be overridden via environment variables.
 */
export const deviationConfig = {
  warningDistanceMeters: parseFloat(process.env.ROUTE_WARNING_DISTANCE_METERS) || 50,
  deviationDistanceMeters: parseFloat(process.env.ROUTE_DEVIATION_DISTANCE_METERS) || 100,
  criticalDistanceMeters: parseFloat(process.env.ROUTE_CRITICAL_DISTANCE_METERS) || 250,
  bearingWarningDegrees: parseFloat(process.env.BEARING_WARNING_DEGREES) || 30,
  bearingDeviationDegrees: parseFloat(process.env.BEARING_DEVIATION_DEGREES) || 60,
  gpsStabilityWindow: parseInt(process.env.GPS_STABILITY_WINDOW, 10) || 3
};

export default deviationConfig;
