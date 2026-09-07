import mockRoutingProvider from './providers/mockRoutingProvider.js';
import googleRoutingProvider from './providers/googleRoutingProvider.js';

class RoutingService {
  constructor() {
    this.provider = process.env.ROUTING_PROVIDER || 'mock';
  }

  /**
   * Retrieves the active routing provider based on runtime configuration
   * @returns {Object} Routing provider instance
   */
  getProvider() {
    const activeProvider = (process.env.ROUTING_PROVIDER || this.provider || 'mock').toLowerCase();
    switch (activeProvider) {
      case 'google':
        if (!process.env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY is required when using the google routing provider');
        }
        return googleRoutingProvider;
      case 'mapbox':
        if (!process.env.MAPBOX_ACCESS_TOKEN) {
          throw new Error('MAPBOX_ACCESS_TOKEN is required when using the mapbox routing provider');
        }
        throw new Error('Mapbox provider not implemented yet');
      case 'osrm':
        throw new Error('OSRM provider not implemented yet');
      case 'mock':
      default:
        return mockRoutingProvider;
    }
  }

  /**
   * Calculates a route between two points using the configured provider
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Routing options
   * @returns {Promise<Object>} { geometry, distanceMeters, durationSeconds, provider, ... }
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
      const err = new Error(`Unable to calculate route: ${error.message}`);
      err.status = error.status || 500;
      err.code = error.code || 'ROUTING_ERROR';
      err.isOperational = true;
      throw err;
    }
  }

  /**
   * Retrieves primary route along with up to 2 candidate alternative routes
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Routing options
   * @returns {Promise<Object>} { primary, alternatives: [...] }
   */
  async getRouteWithAlternatives(origin, destination, options = {}) {
    const activeProvider = (process.env.ROUTING_PROVIDER || this.provider || 'mock').toLowerCase();

    if (activeProvider === 'google') {
      const providerInstance = this.getProvider();
      return await providerInstance.getRouteWithAlternatives(origin, destination, options);
    }

    // Mock fallback: generate primary and a simulated alternative
    const primary = await this.getRoute(origin, destination, options);
    const [origLng, origLat] = origin.coordinates;
    const [destLng, destLat] = destination.coordinates;

    const altMidLng = (origLng + destLng) / 2 - 0.002;
    const altMidLat = (origLat + destLat) / 2 + 0.002;

    const alternative = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [origLng, origLat],
          [altMidLng, altMidLat],
          [destLng, destLat]
        ]
      },
      distanceMeters: Math.round(primary.distanceMeters * 1.08),
      durationSeconds: Math.round(primary.durationSeconds * 0.95), // alternative has slightly better traffic
      staticDurationSeconds: primary.durationSeconds,
      trafficDelaySeconds: 0,
      provider: 'MOCK',
      description: 'Alternative Corridor via Boulevard (Mock)',
      isAlternative: true,
      candidateIndex: 1,
      warnings: [],
      retrievedAt: new Date().toISOString()
    };

    return {
      primary: {
        ...primary,
        alternatives: [alternative]
      },
      alternatives: [alternative]
    };
  }
}

export default new RoutingService();
