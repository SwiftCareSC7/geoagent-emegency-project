/**
 * OSRM (Open Source Routing Machine) Provider
 *
 * Implements real drivable road routing using OpenStreetMap road network geometry.
 * Fetches high-resolution street centerlines, real street turns, distances,
 * durations, and turn-by-turn maneuvers without API key requirements.
 *
 * Serves as the high-availability real road engine and fallback when Google Maps API
 * is unconfigured or rate-limited, guaranteeing routes never cut through buildings.
 *
 * Endpoint: https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
 */

class OsrmRoutingProvider {
  constructor() {
    this.endpoint = process.env.OSRM_API_URL || 'https://router.project-osrm.org/route/v1/driving';
    this.cache = new Map();
    this.cacheTtlMs = 60 * 1000; // 60-second TTL
  }

  /**
   * Generates a cache key based on route coordinates
   * @private
   */
  _getCacheKey(origin, destination, options = {}) {
    const orig = origin.coordinates.map((c) => c.toFixed(4)).join(',');
    const dest = destination.coordinates.map((c) => c.toFixed(4)).join(',');
    const alt = Boolean(options.computeAlternativeRoutes);
    return `osrm_${orig}_${dest}_${alt}`;
  }

  /**
   * Validates and normalizes GeoJSON Point or [lng, lat] coordinates
   */
  validateCoordinates(point, name = 'coordinate') {
    if (Array.isArray(point) && point.length >= 2) {
      point = { type: 'Point', coordinates: [Number(point[0]), Number(point[1])] };
    }
    if (!point || typeof point !== 'object') {
      const error = new Error(`Invalid ${name}: point must be a GeoJSON object or [longitude, latitude] array`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    if ((point.type && point.type !== 'Point') || !Array.isArray(point.coordinates) || point.coordinates.length < 2) {
      const error = new Error(`Invalid ${name}: must be a GeoJSON Point with [longitude, latitude]`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    const [lng, lat] = point.coordinates;
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      const error = new Error(`Invalid ${name} longitude: ${lng}. Must be between -180 and 180 degrees.`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      const error = new Error(`Invalid ${name} latitude: ${lat}. Must be between -90 and 90 degrees.`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
    return point;
  }

  /**
   * Maps OSRM step maneuver to standardized maneuver type
   * @private
   */
  _normalizeManeuver(step) {
    const type = (step.maneuver?.type || '').toLowerCase();
    const modifier = (step.maneuver?.modifier || '').toLowerCase();

    if (type === 'depart') return 'DEPART';
    if (type === 'arrive') return 'ARRIVE';
    if (type === 'roundabout' || type === 'rotary') return 'ROUNDABOUT';
    if (modifier.includes('uturn')) return 'U_TURN';
    if (modifier.includes('sharp left')) return 'SHARP_LEFT';
    if (modifier.includes('sharp right')) return 'SHARP_RIGHT';
    if (modifier.includes('slight left')) return 'SLIGHT_LEFT';
    if (modifier.includes('slight right')) return 'SLIGHT_RIGHT';
    if (modifier.includes('left')) return 'TURN_LEFT';
    if (modifier.includes('right')) return 'TURN_RIGHT';
    if (type === 'on ramp' || type === 'ramp') return 'RAMP';
    if (type === 'fork') return modifier.includes('left') ? 'FORK_LEFT' : 'FORK_RIGHT';
    return 'CONTINUE';
  }

  /**
   * Normalizes an OSRM route object into our internal schema
   */
  normalizeRoute(osrmRoute, index = 0) {
    const coordinates = osrmRoute.geometry?.coordinates || [];
    const distanceMeters = Math.round(osrmRoute.distance || 0);
    const durationSeconds = Math.round(osrmRoute.duration || 0);
    const staticDurationSeconds = durationSeconds;
    const trafficDelaySeconds = 0; // OSRM base does not include live telemetry

    const steps = [];
    if (Array.isArray(osrmRoute.legs)) {
      for (const leg of osrmRoute.legs) {
        if (Array.isArray(leg.steps)) {
          for (const step of leg.steps) {
            const maneuver = this._normalizeManeuver(step);
            const streetName = step.name || (step.ref ? `Route ${step.ref}` : '');
            let instruction = '';

            switch (maneuver) {
              case 'DEPART':
                instruction = streetName ? `Depart onto ${streetName}` : 'Depart towards route';
                break;
              case 'ARRIVE':
                instruction = 'Arrive at destination';
                break;
              case 'TURN_LEFT':
                instruction = streetName ? `Turn left onto ${streetName}` : 'Turn left';
                break;
              case 'TURN_RIGHT':
                instruction = streetName ? `Turn right onto ${streetName}` : 'Turn right';
                break;
              case 'SLIGHT_LEFT':
                instruction = streetName ? `Slight left onto ${streetName}` : 'Slight left';
                break;
              case 'SLIGHT_RIGHT':
                instruction = streetName ? `Slight right onto ${streetName}` : 'Slight right';
                break;
              case 'U_TURN':
                instruction = streetName ? `Make a U-turn onto ${streetName}` : 'Make a U-turn';
                break;
              default:
                instruction = streetName ? `Continue on ${streetName}` : 'Continue straight';
            }

            steps.push({
              maneuver,
              instruction,
              distance: Math.round(step.distance || 0),
              duration: Math.round(step.duration || 0),
              startLocation: step.maneuver?.location || undefined,
              stepPolyline: step.geometry?.coordinates || []
            });
          }
        }
      }
    }

    return {
      geometry: {
        type: 'LineString',
        coordinates
      },
      distanceMeters,
      durationSeconds,
      staticDurationSeconds,
      trafficDelaySeconds,
      provider: 'OSRM',
      dataSource: 'OPENSTREETMAP_ROAD_NETWORK',
      description: index === 0 ? 'Primary Road Route (OSRM Street Network)' : `Alternative Road Route ${index}`,
      warnings: [],
      steps,
      isAlternative: index > 0,
      candidateIndex: index,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Fetches real drivable road route between origin and destination
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Routing options
   * @returns {Promise<Object>} Normalized route
   */
  async getRoute(origin, destination, options = {}) {
    origin = this.validateCoordinates(origin, 'origin');
    destination = this.validateCoordinates(destination, 'destination');

    const cacheKey = this._getCacheKey(origin, destination, options);
    const cached = this.cache.get(cacheKey);
    const effectiveTtl = typeof options.cacheTtlMs === 'number' ? options.cacheTtlMs : this.cacheTtlMs;
    if (cached && (Date.now() - cached.cachedAt) < effectiveTtl) {
      return cached.data;
    }

    const [origLng, origLat] = origin.coordinates;
    const [destLng, destLat] = destination.coordinates;

    const computeAlternatives = options.computeAlternativeRoutes !== false;
    const url = `${this.endpoint}/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=${computeAlternatives ? 'true' : 'false'}`;

    const controller = new AbortController();
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 7000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`OSRM road router returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error(`OSRM routing failed: ${data.message || 'No drivable route found between points'}`);
      }

      const primaryRoute = this.normalizeRoute(data.routes[0], 0);

      // Alternatives (up to 2)
      const alternatives = [];
      for (let i = 1; i < data.routes.length && i <= 2; i++) {
        alternatives.push(this.normalizeRoute(data.routes[i], i));
      }

      primaryRoute.alternatives = alternatives;
      primaryRoute.apiLatencyMs = latencyMs;

      this.cache.set(cacheKey, {
        data: primaryRoute,
        cachedAt: Date.now()
      });

      return primaryRoute;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('OSRM road router request timed out after 7 seconds');
      }
      throw err;
    }
  }

  /**
   * Retrieves route with alternatives
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

export default new OsrmRoutingProvider();
