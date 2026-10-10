/**
 * Corridor & Green-Wave Analysis Service
 *
 * Evaluates V2X signal preemption along active emergency response corridors:
 * - Dynamic signal states (APPROACHING, PREEMPTION_REQUESTED, FORCED_GREEN_4S, GREEN_WAVE_ACTIVE, HOLDING_RED)
 * - Civilian vehicle yield notifications along the clearance corridor
 * - Emergency transit time savings from automated traffic light preemption
 * - Real-time Socket.IO emission to Control Room operator dashboards
 */

import Vehicle from '../vehicles/vehicle.model.js';
import Route from './route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import Incident from '../incidents/incident.model.js';
import pythonRoutingBridge, { DEFAULT_V2X_SIGNALS } from './pythonRoutingBridge.service.js';
import realtimeService from '../realtime/realtime.service.js';
import { REALTIME_ROOMS } from '../realtime/realtime.constants.js';

class CorridorGreenWaveService {
  /**
   * Analyzes the emergency corridor and V2X signals for an active vehicle
   * @param {String} vehicleId
   * @param {Object} options
   * @returns {Promise<Object>} Corridor and Green-Wave analysis payload
   */
  async analyzeCorridorForVehicle(vehicleId, options = {}) {
    const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} not found`);
    }

    // 1. Fetch latest trajectory point
    const latestTrajectory = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
    const vehicleLocation = latestTrajectory?.location?.coordinates
      ? { lat: latestTrajectory.location.coordinates[1], lng: latestTrajectory.location.coordinates[0] }
      : (vehicle.currentLocation?.coordinates
          ? { lat: vehicle.currentLocation.coordinates[1], lng: vehicle.currentLocation.coordinates[0] }
          : { lat: 12.9730, lng: 77.6030 });

    const speedKmh = latestTrajectory?.speed || vehicle.speed || 40.0;
    const heading = latestTrajectory?.heading || 0.0;

    // 2. Fetch active route
    const route = await Route.findOne({
      vehicle: vehicle._id,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    let routeCoordinates = null;
    if (route && route.geometry && Array.isArray(route.geometry.coordinates)) {
      // GeoJSON LineString coordinates are [lng, lat] -> convert to [[lat, lng], ...]
      routeCoordinates = route.geometry.coordinates.map((c) => [c[1], c[0]]);
    }

    // 3. Fetch active nearby incidents
    const incidents = await Incident.find({ status: 'ACTIVE', isDeleted: false }).limit(10);
    const formattedIncidents = incidents.map((inc) => ({
      incidentId: inc.incidentId,
      severity: inc.severity,
      type: inc.type,
      location: inc.location
    }));

    // 4. Run Python / JS V2X Corridor Engine
    const v2xResult = pythonRoutingBridge.executeV2XBridge({
      vehicleLocation,
      plannedRouteCoordinates: routeCoordinates,
      speedKmh,
      heading,
      incidents: formattedIncidents,
      signals: options.signals || DEFAULT_V2X_SIGNALS
    });

    const isBlocked = v2xResult.corridorSummary.corridorHealth === 'CORRIDOR_BLOCKED';
    const recommendedAction = isBlocked
      ? 'REROUTE_CORRIDOR_BLOCKED'
      : (v2xResult.corridorSummary.preemptedCount > 0 ? 'MAINTAIN_GREEN_WAVE' : 'APPROACHING_CORRIDOR');

    const resultPayload = {
      timestamp: new Date().toISOString(),
      vehicleId: vehicle.vehicleId,
      routeId: route?.routeId || 'ROUTE_PLANNED_A',
      emergencyId: route?.emergency?.toString() || null,
      vehicleLocation,
      speedKmh,
      heading,
      engineUsed: v2xResult.engineUsed,
      deviation: v2xResult.deviation,
      v2xSignals: v2xResult.v2xSignals,
      corridorSummary: {
        ...v2xResult.corridorSummary,
        recommendedAction
      },
      alternativeRoutes: v2xResult.alternativeRoutes,
      preemptionActive: v2xResult.corridorSummary.preemptedCount > 0,
      executionTimeMs: v2xResult.executionTimeMs
    };

    // 5. Emit real-time update to Control Room
    if (!options.silent) {
      try {
        const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
        if (route?.emergency) {
          rooms.push(REALTIME_ROOMS.emergency(route.emergency));
        }
        realtimeService.emitToRooms(rooms, 'v2x.green_wave.updated', {
          vehicleId: vehicle.vehicleId,
          routeId: resultPayload.routeId,
          corridorHealth: resultPayload.corridorSummary.corridorHealth,
          preemptedCount: resultPayload.corridorSummary.preemptedCount,
          totalSignals: resultPayload.corridorSummary.totalSignals,
          civilianAlertedCount: resultPayload.corridorSummary.civilianAlertedCount,
          timeSavedMinutes: resultPayload.corridorSummary.timeSavedMinutes,
          signals: resultPayload.v2xSignals,
          timestamp: resultPayload.timestamp
        });
      } catch (err) {
        // Non-blocking real-time emission
        console.error(`[CorridorGreenWaveService] Socket emission error: ${err.message}`);
      }
    }

    return resultPayload;
  }
}

export const corridorGreenWaveService = new CorridorGreenWaveService();
export default corridorGreenWaveService;
