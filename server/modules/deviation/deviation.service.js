import {
  distanceToRoute,
  nearestPointOnRoute,
  getRouteBearingAtPoint
} from '../../shared/services/geospatial.service.js';
import { deviationConfig } from './deviation.config.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';

class DeviationService {
  /**
   * Calculates the smallest angular difference between two bearings (0 to 180 degrees)
   * @param {Number} bearing1 Degrees (0-360)
   * @param {Number} bearing2 Degrees (0-360)
   * @returns {Number} Angular difference in degrees (0-180)
   */
  calculateBearingDifference(bearing1, bearing2) {
    if (typeof bearing1 !== 'number' || typeof bearing2 !== 'number') {
      return 0;
    }
    const diff = Math.abs(bearing1 - bearing2) % 360;
    return Number((diff > 180 ? 360 - diff : diff).toFixed(1));
  }

  /**
   * Analyzes recent GPS trajectories to evaluate noise and trajectory stability
   * @param {Array} recentTrajectories Array of Trajectory objects or GPS points (sorted newest to oldest)
   * @param {Object} routeGeometry GeoJSON LineString
   * @param {Number} windowSize Number of points to analyze
   * @returns {Object} { gpsStability: 'STABLE'|'UNSTABLE'|'INSUFFICIENT_DATA', sustainedDeviation: Boolean, averageDistanceMeters: Number }
   */
  evaluateGPSStability(recentTrajectories, routeGeometry, windowSize = deviationConfig.gpsStabilityWindow) {
    if (!recentTrajectories || recentTrajectories.length < 2) {
      return {
        gpsStability: 'INSUFFICIENT_DATA',
        sustainedDeviation: false,
        averageDistanceMeters: 0,
        samplesCount: recentTrajectories ? recentTrajectories.length : 0
      };
    }

    const windowPoints = recentTrajectories.slice(0, windowSize);
    const distances = windowPoints.map((traj) => {
      const loc = traj.location || traj;
      return distanceToRoute(loc, routeGeometry);
    });

    const sumDistance = distances.reduce((acc, d) => acc + d, 0);
    const avgDistance = Number((sumDistance / distances.length).toFixed(1));

    // Check variance among points to identify jitter
    const variance = distances.reduce((acc, d) => acc + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // If stdDev is high relative to window, there's significant jitter
    const isJittery = stdDev > 35;
    const allDeviated = distances.every((d) => d >= deviationConfig.deviationDistanceMeters);

    return {
      gpsStability: isJittery ? 'UNSTABLE' : 'STABLE',
      sustainedDeviation: allDeviated,
      averageDistanceMeters: avgDistance,
      stdDevMeters: Number(stdDev.toFixed(1)),
      samplesCount: distances.length
    };
  }

  /**
   * Evaluates deviation parameters and classifies status
   * @param {Object} vehicleLocation GeoJSON Point
   * @param {Object} plannedRoute Route object or object with .geometry GeoJSON LineString
   * @param {Array} recentTrajectories Array of recent Trajectory objects (sorted newest to oldest)
   * @param {Number} vehicleHeading Vehicle heading in degrees (0-360)
   * @returns {Object} Detailed deviation analysis
   */
  analyzeDeviation(vehicleLocation, plannedRoute, recentTrajectories = [], vehicleHeading = null) {
    const routeGeometry = plannedRoute.geometry || plannedRoute;

    if (!vehicleLocation || !vehicleLocation.coordinates) {
      throw new Error('Invalid vehicle location provided for deviation analysis');
    }
    if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.type !== 'LineString') {
      throw new Error('Invalid route geometry provided for deviation analysis');
    }

    // 1. Calculate distance from route & nearest point
    const distanceFromRouteMeters = distanceToRoute(vehicleLocation, routeGeometry);
    const { nearestPoint } = nearestPointOnRoute(vehicleLocation, routeGeometry);

    // 2. Calculate route bearing at the vehicle's position
    const routeBearing = getRouteBearingAtPoint(routeGeometry, vehicleLocation);

    // 3. Calculate bearing difference
    const hasHeading = typeof vehicleHeading === 'number';
    const bearingDifferenceDegrees = hasHeading
      ? this.calculateBearingDifference(vehicleHeading, routeBearing)
      : null;

    // 4. Evaluate GPS stability over recent points
    const stabilityAnalysis = this.evaluateGPSStability(recentTrajectories, routeGeometry);

    // 5. Determine Deviation Status
    let status = 'ON_ROUTE';
    let confidence = 'HIGH';

    if (distanceFromRouteMeters >= deviationConfig.criticalDistanceMeters) {
      status = 'CRITICAL_DEVIATION';
    } else if (distanceFromRouteMeters >= deviationConfig.deviationDistanceMeters) {
      // If sustained over window or heading away, confirm DEVIATED
      if (stabilityAnalysis.sustainedDeviation || (hasHeading && bearingDifferenceDegrees >= deviationConfig.bearingDeviationDegrees)) {
        status = 'DEVIATED';
      } else if (stabilityAnalysis.gpsStability === 'UNSTABLE') {
        // High jitter: classify as WARNING with lower confidence to avoid false alarms
        status = 'WARNING';
        confidence = 'LOW';
      } else {
        status = 'DEVIATED';
      }
    } else if (distanceFromRouteMeters >= deviationConfig.warningDistanceMeters) {
      status = 'WARNING';
      if (hasHeading && bearingDifferenceDegrees >= deviationConfig.bearingWarningDegrees) {
        confidence = 'HIGH';
      }
    } else {
      // Within warning threshold
      status = 'ON_ROUTE';
    }

    return {
      status,
      distanceFromRouteMeters,
      nearestPointOnRoute: nearestPoint,
      bearingDifferenceDegrees,
      vehicleBearing: vehicleHeading,
      routeBearing,
      gpsStability: stabilityAnalysis.gpsStability,
      sustainedDeviation: stabilityAnalysis.sustainedDeviation,
      confidence
    };
  }

  /**
   * Standalone helper to analyze deviation for a vehicle by vehicleId
   * @param {String} vehicleId
   * @returns {Promise<Object>} Deviation analysis
   */
  async getDeviationForVehicle(vehicleId) {
    const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
    if (!vehicle) {
      const error = new Error('Vehicle not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // Find active route for this vehicle
    const route = await Route.findOne({
      vehicle: vehicle._id,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    if (!route) {
      const error = new Error('No active route found for this vehicle');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // Get recent trajectories
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

    const deviation = this.analyzeDeviation(
      latestTrajectory.location,
      route,
      recentTrajectories,
      latestTrajectory.speed > 3 ? latestTrajectory.heading : null // only use heading if vehicle is moving
    );

    return {
      vehicleId: vehicle.vehicleId,
      routeId: route.routeId,
      deviation
    };
  }
}

export default new DeviationService();
