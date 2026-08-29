import Trajectory from './trajectory.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import realtimeService from '../realtime/realtime.service.js';
import { formatVehicleLocationPayload } from '../realtime/realtime.events.js';

/**
 * Ingest a new GPS trajectory point
 */
export const createTrajectory = async (trajectoryData) => {
  const { vehicleId, location, speed, heading, timestamp, source } = trajectoryData;

  // 1. Verify that the vehicle exists
  const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // 2. Verify vehicle status is appropriate for location tracking
  const allowedStatuses = ['DISPATCHED', 'EN_ROUTE', 'AT_SCENE', 'RETURNING', 'AVAILABLE'];
  if (!allowedStatuses.includes(vehicle.status)) {
    const error = new Error(`Cannot accept GPS updates from vehicle in ${vehicle.status} status`);
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // 3. Create trajectory record
  // Note: For duplicate or out-of-order GPS data, we simply ingest it as-is with its actual timestamp.
  // We rely on sorting by timestamp descending during retrieval to reconstruct the timeline accurately.
  const newTrajectory = new Trajectory({
    vehicle: vehicle._id,
    location,
    speed,
    heading,
    timestamp: new Date(timestamp),
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
