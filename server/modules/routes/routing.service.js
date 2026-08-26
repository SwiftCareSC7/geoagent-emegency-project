import mockRoutingProvider from './providers/mockRoutingProvider.js';

class RoutingService {
  constructor() {
    this.provider = process.env.ROUTING_PROVIDER || 'mock';
  }

  /**
   * Retrieves a routing provider based on configuration
   * @returns {Object} Routing provider instance
   */
  getProvider() {
    switch (this.provider.toLowerCase()) {
      case 'google':
        if (!process.env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY is required when using the google routing provider');
        }
        // TODO: return googleRoutingProvider
        throw new Error('Google provider not implemented yet');
      case 'mapbox':
        if (!process.env.MAPBOX_ACCESS_TOKEN) {
          throw new Error('MAPBOX_ACCESS_TOKEN is required when using the mapbox routing provider');
        }
        // TODO: return mapboxRoutingProvider
        throw new Error('Mapbox provider not implemented yet');
      case 'osrm':
        // TODO: return osrmRoutingProvider
        throw new Error('OSRM provider not implemented yet');
      case 'mock':
      default:
        console.warn('Using MOCK routing provider. This should not be used in production.');
        return mockRoutingProvider;
    }
  }

  /**
   * Calculates a route between two points using the configured provider
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Routing options
   * @returns {Promise<Object>} { geometry, distanceMeters, durationSeconds, provider }
   */
  async getRoute(origin, destination, options = {}) {
    const providerInstance = this.getProvider();
    
    try {
      const routeData = await providerInstance.getRoute(origin, destination, options);
      
      // Safety check: ensure provider returned valid structure
      if (!routeData.geometry || routeData.geometry.type !== 'LineString') {
        throw new Error('Routing provider returned invalid geometry');
      }
      if (typeof routeData.distanceMeters !== 'number' || typeof routeData.durationSeconds !== 'number') {
        throw new Error('Routing provider returned invalid distance or duration');
      }

      return routeData;
    } catch (error) {
      console.error(`[RoutingService] Error calculating route: ${error.message}`);
      // Throw a safe generic error so we don't leak external API details to the client
      throw new Error('Unable to calculate route. Provider error.');
    }
  }

  /**
   * Compares multiple routes and scores them based on heuristics (Placeholder for Part 7)
   */
  compareRoutes() {
    throw new Error('compareRoutes is not implemented yet');
  }
}

export default new RoutingService();
