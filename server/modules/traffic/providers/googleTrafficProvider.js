/**
 * Google Traffic Provider
 *
 * Derives traffic congestion metrics deterministically from Google Routes API
 * traffic-aware travel duration vs static baseline duration.
 *
 * CRITICAL CONTRACT:
 * Strictly distinguishes OBSERVED vs DERIVED data.
 * Never represents a derived estimate as directly observed Google raw data.
 */

import googleRoutingProvider from '../../routes/providers/googleRoutingProvider.js';
import { trafficConfig } from '../traffic.config.js';

class GoogleTrafficProvider {
  /**
   * Helper to classify congestion level based on derived congestion ratio
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
   * Derives traffic condition for a route LineString using Google Routes API
   * @param {Object} routeGeometry GeoJSON LineString
   * @returns {Promise<Object>} Normalized traffic response with explicit DERIVED attribution
   */
  async getTrafficForRoute(routeGeometry) {
    const freeFlowFallback = trafficConfig.defaultFreeFlowSpeedKmh;

    if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: freeFlowFallback,
        freeFlowSpeedKmh: freeFlowFallback,
        congestionRatio: 0,
        source: 'UNKNOWN',
        epistemicType: 'UNKNOWN'
      };
    }

    const coords = routeGeometry.coordinates;
    const origin = { type: 'Point', coordinates: coords[0] };
    const destination = { type: 'Point', coordinates: coords[coords.length - 1] };

    try {
      // Request traffic-aware route from Google Routes API
      const routeData = await googleRoutingProvider.getRoute(origin, destination, {
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternativeRoutes: false
      });

      const { durationSeconds, staticDurationSeconds, distanceMeters } = routeData;

      // Calculate traffic delay
      const trafficDelaySeconds = Math.max(0, durationSeconds - staticDurationSeconds);

      // Derive speeds in km/h
      // speed = distance (m) / time (s) * 3.6
      let freeFlowSpeedKmh = freeFlowFallback;
      let effectiveSpeedKmh = freeFlowFallback;

      if (staticDurationSeconds > 0 && distanceMeters > 0) {
        freeFlowSpeedKmh = Number(((distanceMeters / staticDurationSeconds) * 3.6).toFixed(1));
      }
      if (durationSeconds > 0 && distanceMeters > 0) {
        effectiveSpeedKmh = Number(((distanceMeters / durationSeconds) * 3.6).toFixed(1));
      }

      // Derived congestion ratio: delay relative to duration
      let congestionRatio = 0;
      if (durationSeconds > 0 && staticDurationSeconds > 0) {
        // ratio between 0.0 and 1.0
        congestionRatio = Number(Math.max(0, Math.min(1, 1 - (staticDurationSeconds / durationSeconds))).toFixed(2));
      }

      const level = this.classifyLevel(congestionRatio);

      return {
        level,
        speedKmh: effectiveSpeedKmh,
        freeFlowSpeedKmh,
        congestionRatio,
        trafficDelaySeconds,
        observedGoogleDurationSeconds: durationSeconds,
        observedGoogleStaticDurationSeconds: staticDurationSeconds,
        source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
        epistemicType: 'DERIVED',
        disclaimer: 'Derived from Google Routes API duration vs staticDuration'
      };
    } catch (err) {
      console.warn(`[GoogleTrafficProvider] Route traffic calculation fallback: ${err.message}`);
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: freeFlowFallback,
        freeFlowSpeedKmh: freeFlowFallback,
        congestionRatio: 0,
        source: 'FALLBACK',
        epistemicType: 'UNKNOWN',
        error: err.message
      };
    }
  }

  /**
   * Get traffic information for a single location point
   * @param {Object} location GeoJSON Point
   * @returns {Promise<Object>} Normalized traffic response
   */
  async getTrafficForLocation(location) {
    const freeFlowFallback = trafficConfig.defaultFreeFlowSpeedKmh;

    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: freeFlowFallback,
        freeFlowSpeedKmh: freeFlowFallback,
        congestionRatio: 0,
        source: 'UNKNOWN',
        epistemicType: 'UNKNOWN'
      };
    }

    const [lng, lat] = location.coordinates;
    // Project a 500m forward vector to query Google Routes for the local road segment
    const destination = {
      type: 'Point',
      coordinates: [lng + 0.004, lat + 0.004]
    };

    try {
      const routeData = await googleRoutingProvider.getRoute(location, destination, {
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternativeRoutes: false
      });

      const { durationSeconds, staticDurationSeconds, distanceMeters } = routeData;
      const trafficDelaySeconds = Math.max(0, durationSeconds - staticDurationSeconds);

      let freeFlowSpeedKmh = freeFlowFallback;
      let effectiveSpeedKmh = freeFlowFallback;

      if (staticDurationSeconds > 0 && distanceMeters > 0) {
        freeFlowSpeedKmh = Number(((distanceMeters / staticDurationSeconds) * 3.6).toFixed(1));
      }
      if (durationSeconds > 0 && distanceMeters > 0) {
        effectiveSpeedKmh = Number(((distanceMeters / durationSeconds) * 3.6).toFixed(1));
      }

      let congestionRatio = 0;
      if (durationSeconds > 0 && staticDurationSeconds > 0) {
        congestionRatio = Number(Math.max(0, Math.min(1, 1 - (staticDurationSeconds / durationSeconds))).toFixed(2));
      }

      const level = this.classifyLevel(congestionRatio);

      return {
        level,
        speedKmh: effectiveSpeedKmh,
        freeFlowSpeedKmh,
        congestionRatio,
        trafficDelaySeconds,
        source: 'GOOGLE_ROUTES_TRAFFIC_DERIVED',
        epistemicType: 'DERIVED',
        disclaimer: 'Derived from Google Routes API localized segment query'
      };
    } catch {
      return {
        level: trafficConfig.levels.UNKNOWN,
        speedKmh: freeFlowFallback,
        freeFlowSpeedKmh: freeFlowFallback,
        congestionRatio: 0,
        source: 'FALLBACK',
        epistemicType: 'UNKNOWN'
      };
    }
  }
}

export default new GoogleTrafficProvider();
