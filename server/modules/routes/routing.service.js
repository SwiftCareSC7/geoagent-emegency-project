import mockRoutingProvider from './providers/mockRoutingProvider.js';
import googleRoutingProvider from './providers/googleRoutingProvider.js';
import osrmRoutingProvider from './providers/osrmRoutingProvider.js';

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
        if (!googleRoutingProvider.isAvailable()) {
          console.warn('[RoutingService] Google Maps routing unavailable: GOOGLE_MAPS_API_KEY is not configured. Falling back to OpenStreetMap/OSRM real road router.');
          return osrmRoutingProvider;
        }
        return googleRoutingProvider;
      case 'osrm':
        return osrmRoutingProvider;
      case 'mapbox':
        if (!process.env.MAPBOX_ACCESS_TOKEN) {
          console.warn('[RoutingService] MAPBOX_ACCESS_TOKEN is not configured. Falling back to OSRM road router.');
          return osrmRoutingProvider;
        }
        throw new Error('Mapbox provider not implemented yet');
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
      // If Google failed (e.g. quota or network error), fallback to OSRM road router
      if (providerInstance !== osrmRoutingProvider) {
        try {
          console.warn(`[RoutingService] Primary provider failed (${error.message}). Attempting OSRM road router fallback.`);
          const fallbackData = await osrmRoutingProvider.getRoute(origin, destination, options);
          return fallbackData;
        } catch (fallbackErr) {
          console.error(`[RoutingService] OSRM fallback also failed: ${fallbackErr.message}`);
        }
      }

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
    const providerInstance = this.getProvider();

    if (typeof providerInstance.getRouteWithAlternatives === 'function') {
      try {
        return await providerInstance.getRouteWithAlternatives(origin, destination, options);
      } catch (err) {
        console.warn(`[RoutingService] Primary getRouteWithAlternatives failed (${err.message}). Trying OSRM fallback.`);
        if (providerInstance !== osrmRoutingProvider) {
          return await osrmRoutingProvider.getRouteWithAlternatives(origin, destination, options);
        }
      }
    }

    // Fallback: calculate primary and return
    const primary = await this.getRoute(origin, destination, options);
    return {
      primary,
      alternatives: primary.alternatives || []
    };
  }
}

export default new RoutingService();
