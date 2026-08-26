import * as trajectoryService from './trajectory.service.js';

/**
 * Handle POST /api/trajectories (Ingest GPS)
 */
export const createTrajectory = async (req, res, next) => {
  try {
    const trajectory = await trajectoryService.createTrajectory(req.body);
    
    // Convert to safe object but also append the vehicleId from the request
    // since the model stores an ObjectId reference to the vehicle
    const responseData = trajectory.toSafeObject();
    responseData.vehicleId = req.body.vehicleId;
    delete responseData.vehicle;

    res.status(201).json({
      success: true,
      message: 'Trajectory recorded successfully',
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET /api/trajectories/:vehicleId/latest
 */
export const getLatestTrajectory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const trajectory = await trajectoryService.getLatestTrajectory(vehicleId);
    
    const responseData = trajectory.toSafeObject();
    responseData.vehicleId = vehicleId;
    delete responseData.vehicle;

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET /api/trajectories/:vehicleId
 */
export const getTrajectoryHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { page, limit } = req.query;
    
    const result = await trajectoryService.getTrajectoryHistory(vehicleId, page, limit);
    
    res.status(200).json({
      success: true,
      data: result.data.map(t => {
        const safeT = t.toSafeObject();
        safeT.vehicleId = vehicleId;
        delete safeT.vehicle;
        return safeT;
      }),
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET /api/trajectories/:vehicleId/recent
 */
export const getRecentTrajectories = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { limit } = req.query;
    
    const trajectories = await trajectoryService.getRecentTrajectories(vehicleId, limit);
    
    res.status(200).json({
      success: true,
      count: trajectories.length,
      data: trajectories.map(t => {
        const safeT = t.toSafeObject();
        safeT.vehicleId = vehicleId;
        delete safeT.vehicle;
        return safeT;
      })
    });
  } catch (error) {
    next(error);
  }
};
