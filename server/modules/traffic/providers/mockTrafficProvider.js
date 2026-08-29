import { trafficConfig } from '../traffic.config.js';

class MockTrafficProvider {
  /**
   * Helper to classify congestion level based on congestion ratio
   * @param {Number} congestionRatio (0.0 to 1.0)
   * @returns {String} Traffic level
   */
  classifyLevel(congestionRatio) {
    const { thresholds, levels } = trafficConfig;
    if (congestionRatio < thresholds.free) return levels.FREE;
    if (congestionRatio < thresholds.light) return levels.LIGHT;
    if (congestionRatio < thresholds.moderate) return levels.MODERATE;
    if (congestionRatio < thresholds.heavy) return levels.HEAVY;
    return levels.SEVERE;
  }

  /**
   * Generates deterministic mock traffic data for a given GeoJSON Point location
   * @param {Object} location GeoJSON Point
   * @returns {Promise<Object>} Normalized traffic response
   */
  async getTrafficForLocation(location) {
    const freeFlowSpeedKmh = trafficConfig.defaultFreeFlowSpeedKmh;

    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: freeFlowSpeedKmh,
        freeFlowSpeedKmh,
        congestionRatio: 0,
        source: 'MOCK'
      };
    }

    const [lng, lat] = location.coordinates;
    
    // Deterministic pseudo-randomness based on coordinate digits to simulate traffic hotspots
    const seed = Math.abs(Math.sin(lng * 100 + lat * 100));
    
    // Speed varies between minSpeed (5 km/h) and freeFlow (45 km/h)
    const speedKmh = Number((trafficConfig.minSpeedKmh + seed * (freeFlowSpeedKmh - trafficConfig.minSpeedKmh)).toFixed(1));
    const congestionRatio = Number(Math.max(0, Math.min(1, 1 - (speedKmh / freeFlowSpeedKmh))).toFixed(2));
    const level = this.classifyLevel(congestionRatio);

    return {
      level,
      speedKmh,
      freeFlowSpeedKmh,
      congestionRatio,
      source: 'MOCK'
    };
  }

  /**
   * Generates deterministic mock traffic data for a route LineString
   * @param {Object} routeGeometry GeoJSON LineString
   * @returns {Promise<Object>} Normalized route traffic response
   */
  async getTrafficForRoute(routeGeometry) {
    const freeFlowSpeedKmh = trafficConfig.defaultFreeFlowSpeedKmh;

    if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: freeFlowSpeedKmh,
        freeFlowSpeedKmh,
        congestionRatio: 0,
        source: 'MOCK'
      };
    }

    // Sample coordinates along the route
    const coords = routeGeometry.coordinates;
    const samples = [
      coords[0],
      coords[Math.floor(coords.length / 2)],
      coords[coords.length - 1]
    ];

    let totalSpeed = 0;
    for (const [lng, lat] of samples) {
      const seed = Math.abs(Math.sin(lng * 100 + lat * 100));
      const speed = trafficConfig.minSpeedKmh + seed * (freeFlowSpeedKmh - trafficConfig.minSpeedKmh);
      totalSpeed += speed;
    }

    const avgSpeedKmh = Number((totalSpeed / samples.length).toFixed(1));
    const congestionRatio = Number(Math.max(0, Math.min(1, 1 - (avgSpeedKmh / freeFlowSpeedKmh))).toFixed(2));
    const level = this.classifyLevel(congestionRatio);

    return {
      level,
      speedKmh: avgSpeedKmh,
      freeFlowSpeedKmh,
      congestionRatio,
      source: 'MOCK'
    };
  }
}

export default new MockTrafficProvider();
