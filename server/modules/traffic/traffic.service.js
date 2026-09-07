import mockTrafficProvider from './providers/mockTrafficProvider.js';
import googleTrafficProvider from './providers/googleTrafficProvider.js';
import { trafficConfig } from './traffic.config.js';

class TrafficService {
  constructor() {
    this.providerName = trafficConfig.provider;
  }

  /**
   * Retrieves the traffic provider based on dynamic runtime configuration
   */
  getProvider() {
    const activeProvider = (process.env.TRAFFIC_PROVIDER || this.providerName || 'mock').toLowerCase();
    switch (activeProvider) {
      case 'google':
        if (!process.env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY required for google traffic provider');
        }
        return googleTrafficProvider;
      case 'mock':
      default:
        return mockTrafficProvider;
    }
  }

  /**
   * Get traffic information for a specific point location
   * @param {Object} location GeoJSON Point
   * @returns {Promise<Object>} Normalized traffic response
   */
  async getTrafficForLocation(location) {
    const activeProvider = (process.env.TRAFFIC_PROVIDER || this.providerName || 'mock').toLowerCase();
    try {
      const provider = this.getProvider();
      return await provider.getTrafficForLocation(location);
    } catch (error) {
      console.error(`[TrafficService] Error fetching traffic: ${error.message}`);
      if (activeProvider === 'google') {
        return {
          level: trafficConfig.levels.UNKNOWN,
          speedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
          freeFlowSpeedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
          congestionRatio: 0,
          source: 'GOOGLE_UNAVAILABLE',
          epistemicType: 'UNKNOWN',
          error: error.message
        };
      }
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        freeFlowSpeedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        congestionRatio: 0,
        source: 'FALLBACK',
        epistemicType: 'UNKNOWN'
      };
    }
  }

  /**
   * Get traffic conditions for a whole route LineString
   * @param {Object} routeGeometry GeoJSON LineString
   * @returns {Promise<Object>} Normalized traffic response
   */
  async getTrafficForRoute(routeGeometry) {
    const activeProvider = (process.env.TRAFFIC_PROVIDER || this.providerName || 'mock').toLowerCase();
    try {
      const provider = this.getProvider();
      return await provider.getTrafficForRoute(routeGeometry);
    } catch (error) {
      console.error(`[TrafficService] Error fetching route traffic: ${error.message}`);
      if (activeProvider === 'google') {
        return {
          level: trafficConfig.levels.UNKNOWN,
          speedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
          freeFlowSpeedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
          congestionRatio: 0,
          source: 'GOOGLE_UNAVAILABLE',
          epistemicType: 'UNKNOWN',
          error: error.message
        };
      }
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        freeFlowSpeedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        congestionRatio: 0,
        source: 'FALLBACK',
        epistemicType: 'UNKNOWN'
      };
    }
  }
}

export default new TrafficService();
