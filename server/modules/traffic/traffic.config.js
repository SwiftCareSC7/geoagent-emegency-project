/**
 * Traffic configuration definitions and thresholds
 */
export const trafficConfig = {
  provider: process.env.TRAFFIC_PROVIDER || 'mock',
  defaultFreeFlowSpeedKmh: parseFloat(process.env.DEFAULT_FREE_FLOW_SPEED_KMH) || 45,
  minSpeedKmh: 5,
  thresholds: {
    free: 0.15,
    light: 0.30,
    moderate: 0.50,
    heavy: 0.75
  },
  levels: {
    FREE: 'FREE',
    LIGHT: 'LIGHT',
    MODERATE: 'MODERATE',
    HEAVY: 'HEAVY',
    SEVERE: 'SEVERE',
    UNKNOWN: 'UNKNOWN'
  }
};

export default trafficConfig;
