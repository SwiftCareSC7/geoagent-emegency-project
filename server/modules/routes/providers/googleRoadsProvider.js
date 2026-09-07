/**
 * Google Roads API Provider (Supporting Road Context)
 *
 * Implements road snapping and speed-limit metadata context.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * 1. Google Roads speed-limit information is NOT real-time. It is strictly
 *    labeled as static road metadata, never as live speed data.
 * 2. Turf-based spatial projection is retained as local fallback.
 * 3. Bounded batching (max 100 points) and in-memory TTL caching prevent excessive API calls.
 */

import { point as turfPoint, lineString as turfLineString, nearestPointOnLine } from '@turf/turf';

class GoogleRoadsProvider {
  constructor() {
    this.snapEndpoint = 'https://roads.googleapis.com/v1/snapToRoads';
    this.speedLimitEndpoint = 'https://roads.googleapis.com/v1/speedLimits';
    this.cache = new Map();
    this.cacheTtlMs = 5 * 60 * 1000; // 5-minute TTL
  }

  /**
   * Generates a cache key from point list
   * @private
   */
  _getCacheKey(points) {
    return points.map((p) => {
      const coords = p.coordinates || p;
      return `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
    }).join('|');
  }

  /**
   * Snaps an array of GPS points to nearest roads
   * @param {Array<Object|Array<Number>>} points Array of GeoJSON Points or [lng, lat]
   * @param {Object} fallbackRouteGeometry Optional GeoJSON LineString for Turf fallback
   * @returns {Promise<Array<Object>>} Snapped points with road metadata
   */
  async snapToRoads(points = [], fallbackRouteGeometry = null) {
    if (!Array.isArray(points) || points.length === 0) {
      return [];
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Local Turf fallback if key is missing
    if (!apiKey) {
      return this.localTurfSnap(points, fallbackRouteGeometry);
    }

    // Limit batch to 100 points (Google Roads API maximum)
    const boundedPoints = points.slice(0, 100);
    const cacheKey = this._getCacheKey(boundedPoints);
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < this.cacheTtlMs) {
      return cached.data;
    }

    // Google Roads requires format "lat,lng|lat,lng"
    const pathParam = boundedPoints.map((pt) => {
      const coords = pt.coordinates || pt;
      return `${coords[1]},${coords[0]}`; // latitude, longitude
    }).join('|');

    const url = `${this.snapEndpoint}?path=${encodeURIComponent(pathParam)}&interpolate=true&key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[GoogleRoadsProvider] API returned HTTP ${response.status}; using Turf fallback`);
        return this.localTurfSnap(points, fallbackRouteGeometry);
      }

      const data = await response.json();
      if (!data.snappedPoints || !Array.isArray(data.snappedPoints)) {
        return this.localTurfSnap(points, fallbackRouteGeometry);
      }

      const snapped = data.snappedPoints.map((sp) => ({
        location: {
          type: 'Point',
          coordinates: [
            Number(sp.location.longitude.toFixed(6)),
            Number(sp.location.latitude.toFixed(6))
          ]
        },
        originalIndex: sp.originalIndex !== undefined ? sp.originalIndex : null,
        placeId: sp.placeId || null,
        source: 'GOOGLE_ROADS_SNAPPED'
      }));

      this.cache.set(cacheKey, {
        data: snapped,
        cachedAt: Date.now()
      });

      return snapped;
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`[GoogleRoadsProvider] Request failed (${err.message}); using Turf fallback`);
      return this.localTurfSnap(points, fallbackRouteGeometry);
    }
  }

  /**
   * Fallback using Turf.js nearest-point-on-line projection
   * @param {Array} points
   * @param {Object} routeGeometry
   * @returns {Array}
   */
  localTurfSnap(points, routeGeometry) {
    if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
      return points.map((p, idx) => {
        const coords = p.coordinates || p;
        return {
          location: {
            type: 'Point',
            coordinates: [coords[0], coords[1]]
          },
          originalIndex: idx,
          placeId: null,
          source: 'RAW_UNSNAPPED'
        };
      });
    }

    try {
      const line = turfLineString(routeGeometry.coordinates);
      return points.map((p, idx) => {
        const coords = p.coordinates || p;
        const pt = turfPoint(coords);
        const snapped = nearestPointOnLine(line, pt);
        return {
          location: {
            type: 'Point',
            coordinates: [
              Number(snapped.geometry.coordinates[0].toFixed(6)),
              Number(snapped.geometry.coordinates[1].toFixed(6))
            ]
          },
          originalIndex: idx,
          placeId: null,
          source: 'TURF_LOCAL_SNAPPED'
        };
      });
    } catch {
      return points.map((p, idx) => {
        const coords = p.coordinates || p;
        return {
          location: { type: 'Point', coordinates: [coords[0], coords[1]] },
          originalIndex: idx,
          placeId: null,
          source: 'RAW_UNSNAPPED'
        };
      });
    }
  }

  /**
   * Retrieves static road speed limit context
   * NOTE: Strictly labeled as static metadata, NEVER live traffic speed.
   * @param {Array<String>} placeIds Google Place IDs
   * @returns {Promise<Object>} Speed limit metadata
   */
  async getStaticSpeedLimitContext(placeIds = []) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !Array.isArray(placeIds) || placeIds.length === 0) {
      return {
        speedLimitKmh: null,
        source: 'UNKNOWN',
        isRealTime: false,
        disclaimer: 'Speed limit metadata unavailable'
      };
    }

    try {
      const boundedIds = placeIds.slice(0, 5).join('&placeId=');
      const url = `${this.speedLimitEndpoint}?placeId=${boundedIds}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.speedLimits && data.speedLimits.length > 0) {
        return {
          speedLimitKmh: data.speedLimits[0].speedLimit,
          units: data.speedLimits[0].units || 'KPH',
          source: 'GOOGLE_ROADS_STATIC_METADATA',
          isRealTime: false,
          disclaimer: 'Static posted speed limits only; not live traffic speed.'
        };
      }
    } catch {
      // Return safe fallback without throwing
    }

    return {
      speedLimitKmh: null,
      source: 'UNKNOWN',
      isRealTime: false,
      disclaimer: 'Speed limit metadata unavailable'
    };
  }
}

export default new GoogleRoadsProvider();
