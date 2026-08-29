import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import Incident from '../incidents/incident.model.js';
import deviationService from '../deviation/deviation.service.js';
import trafficService from '../traffic/traffic.service.js';
import {
  calculateRouteProgress,
  calculateDistance,
  distanceToRoute
} from '../../shared/services/geospatial.service.js';
import { deviationConfig } from '../deviation/deviation.config.js';

class AnalysisService {
  /**
   * Incident proximity search radius in meters
   */
  getProximityRadius() {
    return parseFloat(process.env.INCIDENT_PROXIMITY_RADIUS_METERS) || 500;
  }

  /**
   * Correlates active incidents with the vehicle location and planned route
   * @param {Object} vehicleLocation GeoJSON Point
   * @param {Object} routeGeometry GeoJSON LineString
   * @returns {Promise<Array>} List of correlated nearby incidents
   */
  async getCorrelatedIncidents(vehicleLocation, routeGeometry) {
    const proximityRadius = this.getProximityRadius();

    const activeIncidents = await Incident.find({
      status: 'ACTIVE',
      isDeleted: false
    });

    const correlated = [];

    for (const incident of activeIncidents) {
      if (!incident.location || !incident.location.coordinates) continue;

      const distFromVehicle = calculateDistance(vehicleLocation, incident.location).meters;
      const distFromRoute = distanceToRoute(incident.location, routeGeometry);

      if (distFromVehicle <= proximityRadius || distFromRoute <= proximityRadius) {
        correlated.push({
          incidentId: incident.incidentId,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          description: incident.description,
          location: incident.location,
          distanceFromVehicleMeters: distFromVehicle,
          distanceFromRouteMeters: distFromRoute
        });
      }
    }

    // Sort by closest to vehicle first
    correlated.sort((a, b) => a.distanceFromVehicleMeters - b.distanceFromVehicleMeters);
    return correlated;
  }

  /**
   * Deterministic ETA & Delay calculation
   * @param {Number} remainingDistanceMeters
   * @param {Number} currentSpeedKmh
   * @param {Object} trafficData
   * @param {Number} originalDurationSeconds
   * @returns {Object} { currentMinutes, originalMinutes, remainingDistanceMeters, estimatedSpeedKmh, status, delayMinutes, timeSavedMinutes }
   */
  calculateETAAndDelay(remainingDistanceMeters, currentSpeedKmh, trafficData, originalDurationSeconds) {
    if (typeof remainingDistanceMeters !== 'number' || isNaN(remainingDistanceMeters)) {
      return {
        currentMinutes: null,
        originalMinutes: Math.round((originalDurationSeconds || 0) / 60),
        delayMinutes: 0,
        timeSavedMinutes: 0,
        status: 'ETA_UNAVAILABLE'
      };
    }

    // Original ETA in whole minutes
    const originalMinutes = Math.max(1, Math.round((originalDurationSeconds || 600) / 60));

    // Determine realistic speed for the remaining trip:
    // If vehicle is moving at a reasonable speed (>10 km/h), blend 40% current + 60% traffic
    // Otherwise rely on traffic speed.
    const trafficSpeed = (trafficData && trafficData.speedKmh) ? trafficData.speedKmh : 30;
    let effectiveSpeedKmh = trafficSpeed;

    if (typeof currentSpeedKmh === 'number' && currentSpeedKmh > 10) {
      effectiveSpeedKmh = 0.4 * currentSpeedKmh + 0.6 * trafficSpeed;
    }

    // Guard against zero / negative speeds to prevent division by zero or Infinity
    effectiveSpeedKmh = Math.max(5, effectiveSpeedKmh);

    // Convert speed to meters per second: speedKmh * (1000 / 3600) = speedKmh / 3.6
    const speedMps = effectiveSpeedKmh / 3.6;
    const remainingSeconds = remainingDistanceMeters / speedMps;
    const currentMinutes = Math.max(1, Math.round(remainingSeconds / 60));

    const delayMinutes = Math.max(0, currentMinutes - originalMinutes);
    const timeSavedMinutes = Math.max(0, originalMinutes - currentMinutes);

    return {
      currentMinutes,
      originalMinutes,
      remainingDistanceMeters: Number(remainingDistanceMeters.toFixed(1)),
      estimatedSpeedKmh: Number(effectiveSpeedKmh.toFixed(1)),
      status: 'AVAILABLE',
      delayMinutes,
      timeSavedMinutes
    };
  }

  /**
   * Builds structured evidence list from analysis data
   * @param {Object} deviation
   * @param {Object} traffic
   * @param {Array} incidents
   * @param {Number} vehicleSpeed
   * @returns {Array<String>} Evidence tags
   */
  buildEvidenceList(deviation, traffic, incidents, vehicleSpeed) {
    const evidence = [];

    if (deviation && (deviation.status === 'DEVIATED' || deviation.status === 'CRITICAL_DEVIATION')) {
      evidence.push('ROUTE_DEVIATION');
    }

    if (traffic && (traffic.level === 'HEAVY' || traffic.level === 'SEVERE')) {
      evidence.push('HEAVY_TRAFFIC');
    }

    if (Array.isArray(incidents)) {
      if (incidents.some((i) => i.type === 'ACCIDENT')) {
        evidence.push('ACCIDENT_NEAR_ROUTE');
      }
      if (incidents.some((i) => i.type === 'ROAD_CLOSURE')) {
        evidence.push('ROAD_CLOSURE_NEAR_ROUTE');
      }
      if (incidents.some((i) => i.type === 'ROAD_WORK')) {
        evidence.push('ROAD_WORK_NEAR_ROUTE');
      }
      if (incidents.some((i) => i.type === 'TRAFFIC_JAM')) {
        evidence.push('TRAFFIC_JAM_NEAR_ROUTE');
      }
    }

    if (typeof vehicleSpeed === 'number' && vehicleSpeed < 15) {
      evidence.push('LOW_VEHICLE_SPEED');
    }

    if (deviation && deviation.gpsStability === 'UNSTABLE') {
      evidence.push('GPS_UNCERTAINTY');
    }

    return evidence;
  }

  /**
   * Generates a complete Situation Analysis for a specific vehicle
   * @param {String} vehicleId
   * @returns {Promise<Object>} Normalized vehicle situation
   */
  async getVehicleSituation(vehicleId) {
    // 1. Resolve vehicle
    const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
    if (!vehicle) {
      const error = new Error('Vehicle not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // 2. Find active route
    const route = await Route.findOne({
      vehicle: vehicle._id,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 }).populate('emergency', 'emergencyId status priority');

    if (!route) {
      const error = new Error('No active route found for this vehicle');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // 3. Find recent trajectories
    const recentTrajectories = await Trajectory.find({ vehicle: vehicle._id })
      .sort({ timestamp: -1 })
      .limit(deviationConfig.gpsStabilityWindow);

    if (!recentTrajectories || recentTrajectories.length === 0) {
      const error = new Error('No trajectory data available for this vehicle');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    const latestTrajectory = recentTrajectories[0];
    const vehicleHeading = latestTrajectory.speed > 3 ? latestTrajectory.heading : null;

    // 4. Calculate Route Deviation
    const deviation = deviationService.analyzeDeviation(
      latestTrajectory.location,
      route,
      recentTrajectories,
      vehicleHeading
    );

    // 5. Calculate Route Progress
    const progress = calculateRouteProgress(latestTrajectory.location, route.geometry);

    // 6. Analyze Traffic
    const traffic = await trafficService.getTrafficForLocation(latestTrajectory.location);

    // 7. Correlate Active Incidents
    const incidents = await this.getCorrelatedIncidents(latestTrajectory.location, route.geometry);

    // 8. Calculate ETA & Delay
    const etaAnalysis = this.calculateETAAndDelay(
      progress.remainingDistanceMeters,
      latestTrajectory.speed,
      traffic,
      route.duration
    );

    // 9. Build Evidence List
    const evidence = this.buildEvidenceList(
      deviation,
      traffic,
      incidents,
      latestTrajectory.speed
    );

    return {
      vehicleId: vehicle.vehicleId,
      routeId: route.routeId,
      emergencyId: route.emergency ? route.emergency.emergencyId : null,
      analyzedAt: new Date().toISOString(),
      status: {
        route: deviation.status,
        traffic: traffic.level
      },
      deviation,
      progress,
      traffic,
      eta: {
        currentMinutes: etaAnalysis.currentMinutes,
        originalMinutes: etaAnalysis.originalMinutes,
        remainingDistanceMeters: etaAnalysis.remainingDistanceMeters,
        estimatedSpeedKmh: etaAnalysis.estimatedSpeedKmh,
        status: etaAnalysis.status
      },
      delay: {
        delayMinutes: etaAnalysis.delayMinutes,
        timeSavedMinutes: etaAnalysis.timeSavedMinutes
      },
      incidents,
      evidence
    };
  }

  /**
   * Generates analysis for a specific route
   * @param {String} routeId
   * @returns {Promise<Object>} Route-specific analysis
   */
  async getRouteSituation(routeId) {
    const isObjectId = routeId.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: routeId } : { routeId };

    const route = await Route.findOne(query)
      .populate('vehicle', 'vehicleId status')
      .populate('emergency', 'emergencyId status priority');

    if (!route) {
      const error = new Error('Route not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    if (!route.vehicle) {
      const error = new Error('No vehicle associated with this route');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    return await this.getVehicleSituation(route.vehicle.vehicleId);
  }
}

export default new AnalysisService();
