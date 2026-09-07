/**
 * Google Maps Routes API Provider
 *
 * Implements the Google Routes API (Directions v2: computeRoutes)
 * with explicit field masks, traffic-aware routing, and route alternatives.
 *
 * Endpoint: POST https://routes.googleapis.com/directions/v2:computeRoutes
 * Field Mask: routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.warnings,routes.description
 */

export function decodeGooglePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    // GeoJSON coordinate order is [longitude, latitude]
    poly.push([
      Number((lng / 1e5).toFixed(6)),
      Number((lat / 1e5).toFixed(6))
    ]);
  }

  return poly;
}

export function parseDurationSeconds(durationStr) {
  if (typeof durationStr === 'number') return Math.round(durationStr);
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/^([0-9]+(?:\.[0-9]+)?)s?$/);
  if (match) {
    return Math.round(parseFloat(match[1]));
  }
  return 0;
}

class GoogleRoutingProvider {
  constructor() {
    this.endpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    this.fieldMask = [
      'routes.duration',
      'routes.staticDuration',
      'routes.distanceMeters',
      'routes.polyline.encodedPolyline',
      'routes.legs',
      'routes.warnings',
      'routes.description'
    ].join(',');
    
    // In-memory route cache with 60-second TTL to avoid duplicate billing
    this.cache = new Map();
    this.cacheTtlMs = 60 * 1000;
  }

  /**
   * Generates a cache key based on route coordinates
   * @private
   */
  _getCacheKey(origin, destination, options = {}) {
    const orig = origin.coordinates.map((c) => c.toFixed(4)).join(',');
    const dest = destination.coordinates.map((c) => c.toFixed(4)).join(',');
    const pref = options.routingPreference || 'TRAFFIC_AWARE_OPTIMAL';
    const alt = Boolean(options.computeAlternativeRoutes);
    return `${orig}_${dest}_${pref}_${alt}`;
  }

  /**
   * Normalizes a raw Google route candidate into our internal schema
   * @param {Object} rawRoute Raw route object from Google Routes API
   * @param {Number} index 0 for primary, >0 for alternatives
   * @returns {Object} Normalized route
   */
  normalizeRoute(rawRoute, index = 0) {
    const encoded = rawRoute.polyline && rawRoute.polyline.encodedPolyline
      ? rawRoute.polyline.encodedPolyline
      : '';
    const coordinates = decodeGooglePolyline(encoded);

    const durationSeconds = parseDurationSeconds(rawRoute.duration);
    const staticDurationSeconds = rawRoute.staticDuration
      ? parseDurationSeconds(rawRoute.staticDuration)
      : durationSeconds;
    const trafficDelaySeconds = Math.max(0, durationSeconds - staticDurationSeconds);

    const distanceMeters = typeof rawRoute.distanceMeters === 'number'
      ? rawRoute.distanceMeters
      : 0;

    return {
      geometry: {
        type: 'LineString',
        coordinates
      },
      distanceMeters,
      durationSeconds,
      staticDurationSeconds,
      trafficDelaySeconds,
      provider: 'GOOGLE',
      description: rawRoute.description || (index === 0 ? 'Primary Route (Optimal Traffic)' : `Alternative Route ${index}`),
      warnings: rawRoute.warnings || [],
      isAlternative: index > 0,
      candidateIndex: index,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Validates a GeoJSON Point coordinate structure
   * @param {Object} point GeoJSON Point
   * @param {String} name Identifier name for error messages
   */
  validateCoordinates(point, name = 'coordinate') {
    if (!point || typeof point !== 'object') {
      const error = new Error(`Invalid ${name}: point must be a GeoJSON object`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    if (point.type !== 'Point' || !Array.isArray(point.coordinates) || point.coordinates.length < 2) {
      const error = new Error(`Invalid ${name}: must be a GeoJSON Point with [longitude, latitude]`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    const [lng, lat] = point.coordinates;
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      const error = new Error(`Invalid ${name} longitude: ${lng}. Must be a valid number between -180 and 180 degrees.`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      const error = new Error(`Invalid ${name} latitude: ${lat}. Must be a valid number between -90 and 90 degrees.`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
  }

  /**
   * Fetches route from Google Maps Routes API
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Routing options
   * @returns {Promise<Object>} Normalized route with optional alternatives
   */
  async getRoute(origin, destination, options = {}) {
    // 1. Validate inputs before doing any work
    this.validateCoordinates(origin, 'origin');
    this.validateCoordinates(destination, 'destination');

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      const error = new Error('GOOGLE_MAPS_API_KEY is not configured on the server');
      error.status = 503;
      error.code = 'PROVIDER_NOT_CONFIGURED';
      error.isOperational = true;
      throw error;
    }

    // Check cache
    const cacheKey = this._getCacheKey(origin, destination, options);
    const cached = this.cache.get(cacheKey);
    const effectiveTtl = typeof options.cacheTtlMs === 'number' ? options.cacheTtlMs : this.cacheTtlMs;
    if (cached && (Date.now() - cached.cachedAt) < effectiveTtl) {
      return cached.data;
    }

    const [origLng, origLat] = origin.coordinates;
    const [destLng, destLat] = destination.coordinates;

    const computeAlternatives = options.computeAlternativeRoutes !== false;
    let routingPreference = options.routingPreference || 'TRAFFIC_AWARE_OPTIMAL';
    if (!['TRAFFIC_AWARE_OPTIMAL', 'TRAFFIC_AWARE'].includes(routingPreference)) {
      routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
    }

    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origLat,
            longitude: origLng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destLat,
            longitude: destLng
          }
        }
      },
      travelMode: 'DRIVE',
      routingPreference,
      computeAlternativeRoutes: computeAlternatives,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: true
      }
    };

    if (Array.isArray(options.intermediates) && options.intermediates.length > 0) {
      if (options.intermediates.length > 25) {
        const error = new Error('Google Routes API supports a maximum of 25 intermediate waypoints');
        error.status = 400;
        error.isOperational = true;
        throw error;
      }
      for (let i = 0; i < options.intermediates.length; i++) {
        this.validateCoordinates(options.intermediates[i], `intermediate waypoint #${i + 1}`);
      }
      requestBody.intermediates = options.intermediates.map((pt) => ({
        location: {
          latLng: {
            latitude: pt.coordinates[1],
            longitude: pt.coordinates[0]
          }
        }
      }));
    }

    const controller = new AbortController();
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 8000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': this.fieldMask
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        let errorBody = {};
        try {
          errorBody = await response.json();
        } catch {
          // ignore json parse error
        }

        const errorMsg = errorBody.error && errorBody.error.message
          ? errorBody.error.message
          : `HTTP ${response.status} ${response.statusText}`;

        if (response.status === 403) {
          throw new Error(`Google Routes API access denied: ${errorMsg}`);
        }
        if (response.status === 429) {
          throw new Error(`Google Routes API quota exceeded: ${errorMsg}`);
        }
        throw new Error(`Google Routes API error (${response.status}): ${errorMsg}`);
      }

      const data = await response.json();

      if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error('Google Routes API returned no routes for the specified coordinates');
      }

      // Primary route
      const primaryRoute = this.normalizeRoute(data.routes[0], 0);

      // Alternatives (up to 2)
      const alternatives = [];
      for (let i = 1; i < data.routes.length && i <= 2; i++) {
        alternatives.push(this.normalizeRoute(data.routes[i], i));
      }

      primaryRoute.alternatives = alternatives;
      primaryRoute.apiLatencyMs = latencyMs;

      // Cache result
      this.cache.set(cacheKey, {
        data: primaryRoute,
        cachedAt: Date.now()
      });

      return primaryRoute;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Google Routes API request timed out after 8 seconds');
      }
      throw err;
    }
  }

  /**
   * Helper to fetch primary route and alternatives as separate candidates
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options
   * @returns {Promise<Object>} { primary, alternatives: [...] }
   */
  async getRouteWithAlternatives(origin, destination, options = {}) {
    const route = await this.getRoute(origin, destination, {
      ...options,
      computeAlternativeRoutes: true
    });

    return {
      primary: route,
      alternatives: route.alternatives || []
    };
  }
}

export default new GoogleRoutingProvider();
