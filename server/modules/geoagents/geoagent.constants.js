/**
 * GeoAgent AI Constants and Enumerations
 */

export const geoAgentConstants = {
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  maxToolCallRounds: 3,
  backupMaxDistanceKm: 10,
  
  // Valid recommendation actions
  actions: {
    CONTINUE: 'CONTINUE',
    REROUTE: 'REROUTE',
    MONITOR: 'MONITOR',
    CONSIDER_BACKUP: 'CONSIDER_BACKUP'
  },

  // Valid likely cause categories
  causes: {
    ACCIDENT_INDUCED_CONGESTION: 'ACCIDENT_INDUCED_CONGESTION',
    TRAFFIC_CONGESTION: 'TRAFFIC_CONGESTION',
    ROAD_BLOCKAGE: 'ROAD_BLOCKAGE',
    DRIVER_NAVIGATION_DEVIATION: 'DRIVER_NAVIGATION_DEVIATION',
    WEATHER_SLOWDOWN: 'WEATHER_SLOWDOWN',
    UNKNOWN_FACTORS: 'UNKNOWN_FACTORS'
  },

  // Observation confidence categories
  observationTypes: {
    OBSERVED: 'OBSERVED',
    INFERRED: 'INFERRED',
    UNKNOWN: 'UNKNOWN'
  }
};

export default geoAgentConstants;
