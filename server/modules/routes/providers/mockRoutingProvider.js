import { calculateDistance } from '../../../shared/services/geospatial.service.js';

class MockRoutingProvider {
  /**
   * Generates a deterministic mock route between origin and destination
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Additional routing options
   * @returns {Promise<Object>} Normalized routing data
   */
  async getRoute(origin, destination, options = {}) {
    // 1. Calculate straight line distance
    const { meters } = calculateDistance(origin, destination);
    
    // 2. Generate a fake midpoint to create a LineString
    const [origLng, origLat] = origin.coordinates;
    const [destLng, destLat] = destination.coordinates;
    
    // Add a slight curve so it's not a perfect straight line
    const midLng = (origLng + destLng) / 2 + 0.001;
    const midLat = (origLat + destLat) / 2 + 0.001;

    // 3. Estimate duration assuming average speed of 40 km/h (11.11 m/s)
    const averageSpeedMps = 11.11;
    // Add 20% overhead for "traffic"
    const durationSeconds = Math.round((meters / averageSpeedMps) * 1.2);

    return {
      geometry: {
        type: 'LineString',
        coordinates: [
          [origLng, origLat],
          [midLng, midLat],
          [destLng, destLat]
        ]
      },
      distanceMeters: Math.round(meters * 1.2), // The LineString with a curve is slightly longer than straight-line
      durationSeconds: durationSeconds,
      provider: 'MOCK'
    };
  }
}

export default new MockRoutingProvider();
