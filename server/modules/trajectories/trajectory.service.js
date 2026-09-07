import Trajectory from './trajectory.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import realtimeService from '../realtime/realtime.service.js';
import { formatVehicleLocationPayload } from '../realtime/realtime.events.js';
import { calculateDistance } from '../../shared/services/geospatial.service.js';

/**
 * Ingest a new GPS trajectory point with robust telemetry validation
 */
export const createTrajectory = async (trajectoryData) => {
  const { vehicleId, source } = trajectoryData;

  // 1. Resolve coordinates from either GeoJSON location or lat/lng properties
  let lng = trajectoryData.location?.coordinates?.[0] ?? trajectoryData.longitude;
  let lat = trajectoryData.location?.coordinates?.[1] ?? trajectoryData.latitude;

  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    const error = new Error('Invalid longitude coordinate: must be between -180 and 180 degrees');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    const error = new Error('Invalid latitude coordinate: must be between -90 and 90 degrees');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  const validLocation = {
    type: 'Point',
    coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))]
  };

  // 2. Validate timestamp
  const rawTimestamp = trajectoryData.timestamp || new Date();
  const parsedDate = new Date(rawTimestamp);
  if (isNaN(parsedDate.getTime())) {
    const error = new Error('Invalid timestamp: must be a valid date or ISO string');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // Reject impossible future timestamps (> 2 minutes in future)
  if (parsedDate.getTime() > Date.now() + 2 * 60 * 1000) {
    const error = new Error('Timestamp cannot be in the future');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // 3. Validate speed (0 - 250 km/h)
  const rawSpeed = trajectoryData.speed !== undefined ? trajectoryData.speed : 0;
  const speed = typeof rawSpeed === 'number' ? rawSpeed : parseFloat(rawSpeed);
  if (isNaN(speed) || speed < 0 || speed > 250) {
    const error = new Error('Speed must be a valid number between 0 and 250 km/h');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // 4. Validate heading (0 - 360 degrees)
  const rawHeading = trajectoryData.heading !== undefined ? trajectoryData.heading : 0;
  const heading = typeof rawHeading === 'number' ? rawHeading : parseFloat(rawHeading);
  if (isNaN(heading) || heading < 0 || heading > 360) {
    const error = new Error('Heading must be a valid number between 0 and 360 degrees');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // 5. Verify that the vehicle exists
  const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // 6. Verify vehicle status is appropriate for location tracking
  const allowedStatuses = ['DISPATCHED', 'EN_ROUTE', 'AT_SCENE', 'RETURNING', 'AVAILABLE'];
  if (!allowedStatuses.includes(vehicle.status)) {
    const error = new Error(`Cannot accept GPS updates from vehicle in ${vehicle.status} status`);
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // 7. Teleport / Jitter detection against latest known fix
  const latestFix = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
  if (latestFix && latestFix.location && latestFix.location.coordinates) {
    const timeDeltaSec = Math.abs((parsedDate.getTime() - new Date(latestFix.timestamp).getTime()) / 1000);
    const { meters } = calculateDistance(latestFix.location, validLocation);

    // If points are within 10 seconds of each other but jumped > 1,000 meters (>360 km/h)
    if (timeDeltaSec > 0 && timeDeltaSec < 10 && meters > 1000) {
      const error = new Error(`GPS teleport anomaly detected: vehicle jumped ${Math.round(meters)}m in ${timeDeltaSec.toFixed(1)}s`);
      error.status = 400;
      error.isOperational = true;
      throw error;
    }
  }

  // 8. Create trajectory record
  const newTrajectory = new Trajectory({
    vehicle: vehicle._id,
    location: validLocation,
    speed: Number(speed.toFixed(1)),
    heading: Number(heading.toFixed(1)),
    timestamp: parsedDate,
    source: source || 'SIMULATOR'
  });

  await newTrajectory.save();

  // 4. Emit Real-Time Events
  try {
    const locationPayload = formatVehicleLocationPayload(
      vehicle.vehicleId,
      location,
      speed,
      heading,
      newTrajectory.timestamp.toISOString()
    );

    realtimeService.emitVehicleLocationUpdated(vehicle.vehicleId, locationPayload);
    realtimeService.emitTrajectoryCreated(vehicle.vehicleId, {
      trajectoryId: newTrajectory._id.toString(),
      ...locationPayload
    });
  } catch (err) {
    // Non-blocking real-time error logging
    console.error(`[TrajectoryService] Real-time event emission error: ${err.message}`);
  }

  return newTrajectory;
};


/**
 * Get the latest GPS point for a specific vehicle
 */
export const getLatestTrajectory = async (vehicleId) => {
  const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Uses compound index { vehicle: 1, timestamp: -1 }
  const latest = await Trajectory.findOne({ vehicle: vehicle._id })
    .sort({ timestamp: -1 });

  if (!latest) {
    const error = new Error('No trajectory data found for this vehicle');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  return latest;
};

/**
 * Get paginated trajectory history for a vehicle
 */
export const getTrajectoryHistory = async (vehicleId, page = 1, limit = 50) => {
  const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Enforce a maximum limit to prevent loading the entire collection into memory
  const maxLimit = 100;
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 50 : Math.min(parsedLimit, maxLimit);
  const parsedPage = parseInt(page, 10);
  const safePage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const skip = (safePage - 1) * safeLimit;

  // Uses compound index { vehicle: 1, timestamp: -1 }
  const trajectories = await Trajectory.find({ vehicle: vehicle._id })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(safeLimit);

  const total = await Trajectory.countDocuments({ vehicle: vehicle._id });

  return {
    data: trajectories,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total
    }
  };
};

/**
 * Get recent trajectory points (optimized for live maps/deviation checking)
 */
export const getRecentTrajectories = async (vehicleId, limit = 20) => {
  const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Enforce a sensible max limit for recent points
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100);

  // Uses compound index { vehicle: 1, timestamp: -1 }
  return await Trajectory.find({ vehicle: vehicle._id })
    .sort({ timestamp: -1 })
    .limit(safeLimit);

};
