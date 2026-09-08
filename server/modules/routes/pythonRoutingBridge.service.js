/**
 * Python Routing & V2X Corridor Bridge Service
 *
 * Connects the Node.js backend to the Python spatial routing engine (routing-engine/v2x_corridor_bridge.py).
 * Features a pure JavaScript deterministic fallback (fallbackV2XEngine) ensuring 100% portability and
 * zero downtime across container environments where Python3 might not be installed.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { calculateDistance, distanceToRoute } from '../../shared/services/geospatial.service.js';

const SCRIPT_PATH = path.resolve(process.cwd(), 'routing-engine/v2x_corridor_bridge.py');

// Default Corridor V2X Signals along Bengaluru Emergency Corridors
export const DEFAULT_V2X_SIGNALS = Object.freeze([
  { id: 'V2X-SIG-01', name: 'Mayo Hall Junction', lat: 12.9730, lng: 77.6030 },
  { id: 'V2X-SIG-02', name: '100ft Rd Signal #1', lat: 12.9760, lng: 77.6200 },
  { id: 'V2X-SIG-03', name: 'HAL 2nd Stage Signal', lat: 12.9690, lng: 77.6350 },
  { id: 'V2X-SIG-04', name: 'Airport Rd Preempt', lat: 12.9620, lng: 77.6430 }
]);

/**
 * Pure JavaScript fallback implementation of the V2X corridor engine
 * Provides identical spatial math and deterministic output when Python3 is unavailable.
 */
export function fallbackV2XEngine(params = {}) {
  const vehicleLat = params.vehicleLocation?.lat ?? 12.9730;
  const vehicleLng = params.vehicleLocation?.lng ?? 77.6030;
  const speedKmh = params.speedKmh || 40.0;
  const signals = Array.isArray(params.signals) && params.signals.length > 0 ? params.signals : DEFAULT_V2X_SIGNALS;
  const routeCoords = Array.isArray(params.plannedRouteCoordinates) && params.plannedRouteCoordinates.length > 0
    ? params.plannedRouteCoordinates
    : [
        [12.9716, 77.5946],
        [12.9730, 77.6030],
        [12.9735, 77.6110],
        [12.9725, 77.6180],
        [12.9660, 77.6300],
        [12.9610, 77.6400],
        [12.9582, 77.6483]
      ];

  // 1. Calculate route deviation
  let distToRouteMeters = 0;
  try {
    const geojsonRoute = {
      type: 'LineString',
      coordinates: routeCoords.map((c) => [c[1], c[0]]) // [lng, lat]
    };
    const point = { type: 'Point', coordinates: [vehicleLng, vehicleLat] };
    distToRouteMeters = distanceToRoute(point, geojsonRoute);
  } catch {
    distToRouteMeters = 0;
  }

  const isDeviated = distToRouteMeters > 100.0;

  // 2. Evaluate V2X Signals
  let preemptedCount = 0;
  let totalCivilianAlerted = 0;
  const evaluatedSignals = [];

  for (const sig of signals) {
    const d = calculateDistance(
      { type: 'Point', coordinates: [vehicleLng, vehicleLat] },
      { type: 'Point', coordinates: [sig.lng, sig.lat] }
    );
    const distM = d.meters;

    let status = 'APPROACHING';
    let crossState = 'NORMAL_CYCLE';
    let preempted = false;
    let civilianAlerted = 0;

    if (distM <= 150.0) {
      status = 'GREEN_WAVE_ACTIVE';
      crossState = 'HOLDING_RED';
      preempted = true;
      civilianAlerted = 45;
    } else if (distM <= 500.0) {
      status = 'FORCED_GREEN_4S';
      crossState = 'HOLDING_RED';
      preempted = true;
      civilianAlerted = 35;
    } else if (distM <= 1200.0) {
      status = 'PREEMPTION_REQUESTED';
      crossState = 'CLEARING_CROSS_TRAFFIC';
      preempted = true;
      civilianAlerted = 25;
    }

    if (preempted) {
      preemptedCount += 1;
      totalCivilianAlerted += civilianAlerted;
    }

    const effSpeedMps = Math.max(5.0, speedKmh / 3.6);
    const timeToSignalSec = Number((distM / effSpeedMps).toFixed(1));

    evaluatedSignals.push({
      id: sig.id,
      name: sig.name,
      lat: sig.lat,
      lng: sig.lng,
      distanceMeters: Number(distM.toFixed(1)),
      timeToSignalSeconds: timeToSignalSec,
      status,
      crossTrafficState: crossState,
      civilianAlertedCount: civilianAlerted
    });
  }

  evaluatedSignals.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // 3. Corridor Incident Check
  const incidents = Array.isArray(params.incidents) ? params.incidents : [];
  let corridorBlocked = false;
  for (const inc of incidents) {
    const loc = inc.location || {};
    const iLat = loc.lat ?? loc.coordinates?.[1];
    const iLng = loc.lng ?? loc.coordinates?.[0];
    if (iLat && iLng) {
      const p = { type: 'Point', coordinates: [iLng, iLat] };
      const geojsonRoute = {
        type: 'LineString',
        coordinates: routeCoords.map((c) => [c[1], c[0]])
      };
      if (distanceToRoute(p, geojsonRoute) < 120) {
        corridorBlocked = true;
        break;
      }
    }
  }

  // 4. Corridor Health Assessment
  let corridorHealth = 'APPROACHING_CORRIDOR';
  if (corridorBlocked) {
    corridorHealth = 'CORRIDOR_BLOCKED';
  } else if (preemptedCount >= signals.length - 1) {
    corridorHealth = 'GREEN_WAVE_ACTIVE';
  } else if (preemptedCount > 0) {
    corridorHealth = 'PARTIALLY_PREEMPTED';
  }

  const timeSavedMinutes = Number(((preemptedCount * 48.0) / 60.0).toFixed(1));

  return {
    engineUsed: 'javascript-fallback',
    deviation: {
      detected: isDeviated,
      distanceFromPlannedRouteMeters: Number(distToRouteMeters.toFixed(1)),
      thresholdMeters: 100.0,
      status: distToRouteMeters > 250 ? 'CRITICAL_DEVIATION' : (isDeviated ? 'WARNING' : 'NOMINAL')
    },
    v2xSignals: evaluatedSignals,
    corridorSummary: {
      totalSignals: signals.length,
      preemptedCount,
      civilianAlertedCount: totalCivilianAlerted,
      timeSavedMinutes,
      corridorHealth,
      corridorClearanceRate: Number(((preemptedCount / Math.max(1, signals.length)) * 100).toFixed(1))
    },
    alternativeRoutes: [
      {
        routeId: 'ROUTE_ALT_B',
        name: 'Route B (via Indiranagar 100ft Rd)',
        distanceKm: 6.48,
        etaMinutes: 11.0,
        greenWaveEtaMinutes: 9.0,
        trafficCondition: 'moderate_moving',
        description: 'Bypasses Trinity accident zone via 100ft Road.'
      },
      {
        routeId: 'ROUTE_ALT_C',
        name: 'Route C (via Inner Ring Road)',
        distanceKm: 6.79,
        etaMinutes: 14.0,
        greenWaveEtaMinutes: 12.0,
        trafficCondition: 'moderate_traffic',
        description: 'Longer southern bypass route.'
      }
    ]
  };
}

class PythonRoutingBridgeService {
  constructor() {
    this.pythonExecutable = process.env.PYTHON_BIN || 'python3';
    this.scriptPath = SCRIPT_PATH;
    this.timeoutMs = 1500;
  }

  /**
   * Checks whether the Python3 runtime and script are available
   * @returns {Object} { available, engine, message, version }
   */
  checkAvailability() {
    if (!fs.existsSync(this.scriptPath)) {
      return {
        available: true,
        engine: 'javascript-fallback',
        status: 'DEGRADED',
        message: 'Python script not found; using in-process JS fallback V2X engine'
      };
    }
    try {
      const proc = spawnSync(this.pythonExecutable, ['--version'], {
        timeout: 1000,
        encoding: 'utf8'
      });
      if (proc.status === 0) {
        const version = (proc.stdout || proc.stderr || '').trim();
        return {
          available: true,
          engine: 'python',
          status: 'AVAILABLE',
          version,
          message: `Native Python V2X engine active (${version})`
        };
      }
      return {
        available: true,
        engine: 'javascript-fallback',
        status: 'DEGRADED',
        message: 'Python process unavailable; running in Node.js fallback V2X engine'
      };
    } catch (err) {
      return {
        available: true,
        engine: 'javascript-fallback',
        status: 'DEGRADED',
        message: `Running in Node.js fallback V2X engine (${err.message})`
      };
    }
  }

  /**
   * Executes the Python spatial V2X bridge or falls back to JS implementation
   * @param {Object} params
   * @returns {Object} V2X Corridor analysis result
   */
  executeV2XBridge(params = {}) {
    const startTime = Date.now();

    // Check if script exists
    if (!fs.existsSync(this.scriptPath)) {
      const fallbackResult = fallbackV2XEngine(params);
      fallbackResult.executionTimeMs = Date.now() - startTime;
      return fallbackResult;
    }

    try {
      const payloadString = JSON.stringify(params);
      const proc = spawnSync(
        this.pythonExecutable,
        [this.scriptPath, '--json', payloadString],
        {
          timeout: this.timeoutMs,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024
        }
      );

      if (proc.status === 0 && proc.stdout) {
        const parsed = JSON.parse(proc.stdout.trim());
        parsed.engineUsed = 'python';
        parsed.executionTimeMs = Date.now() - startTime;
        return parsed;
      }

      // If Python errored, fall back to pure JS
      const fallbackResult = fallbackV2XEngine(params);
      fallbackResult.engineUsed = 'javascript-fallback';
      fallbackResult.warning = proc.error ? proc.error.message : (proc.stderr || 'Python process returned non-zero code');
      fallbackResult.executionTimeMs = Date.now() - startTime;
      return fallbackResult;
    } catch (err) {
      const fallbackResult = fallbackV2XEngine(params);
      fallbackResult.engineUsed = 'javascript-fallback';
      fallbackResult.warning = err.message;
      fallbackResult.executionTimeMs = Date.now() - startTime;
      return fallbackResult;
    }
  }
}

export const pythonRoutingBridge = new PythonRoutingBridgeService();
export default pythonRoutingBridge;
