import mockTrafficProvider from './providers/mockTrafficProvider.js';
import { trafficConfig } from './traffic.config.js';

class TrafficService {
  constructor() {
    this.providerName = trafficConfig.provider;
  }

  /**
   * Retrieves the traffic provider based on configuration
   */
  getProvider() {
    switch (this.providerName.toLowerCase()) {
      case 'google':
        if (!process.env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY required for google traffic provider');
        }
        throw new Error('Google traffic provider not implemented yet');
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
    try {
      const provider = this.getProvider();
      return await provider.getTrafficForLocation(location);
    } catch (error) {
      console.error(`[TrafficService] Error fetching traffic: ${error.message}`);
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        freeFlowSpeedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        congestionRatio: 0,
        source: 'FALLBACK'
      };
    }
  }

  /**
   * Get traffic conditions for a whole route LineString
   * @param {Object} routeGeometry GeoJSON LineString
   * @returns {Promise<Object>} Normalized traffic response
   */
  async getTrafficForRoute(routeGeometry) {
    try {
      const provider = this.getProvider();
      return await provider.getTrafficForRoute(routeGeometry);
    } catch (error) {
      console.error(`[TrafficService] Error fetching route traffic: ${error.message}`);
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        freeFlowSpeedKmh: trafficConfig.defaultFreeFlowSpeedKmh,
        congestionRatio: 0,
        source: 'FALLBACK'
      };
    }
  }
}

export default new TrafficService();
