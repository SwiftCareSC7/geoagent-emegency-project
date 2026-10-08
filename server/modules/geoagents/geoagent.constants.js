/**
 * GeoAgent AI Constants and Enumerations
 */

export const geoAgentConstants = {
  maxToolCallRounds: 6,
  maxToolCallsPerRound: 3,
  maxTotalToolCalls: 8,
  toolTimeoutMs: 8000,
  minConfidence: 0.5,
  materialTimeSavingMinutes: 2,
  backupMaxDistanceKm: 10,
  backupMaxCandidatesExamined: 50,
  backupMaxResults: 5,
  backupMaxEtaLookups: 5,
  maxIncidentRadiusMeters: 5000,
  maxIncidentsExamined: 200,
  maxMissionGeoOffsetMeters: 25000,
  maxTrajectoryPoints: 100,
  maxDecisionHistory: 50,

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
    DERIVED: 'DERIVED',
    UNKNOWN: 'UNKNOWN'
  }
};

export default geoAgentConstants;
