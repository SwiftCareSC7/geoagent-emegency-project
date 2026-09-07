import analysisService from './analysis.service.js';
import predictionService from './prediction.service.js';

/**
 * @desc    Get complete situation analysis for a vehicle (deviation, progress, traffic, incidents, ETA, delay)
 * @route   GET /api/analysis/vehicle/:vehicleId
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getVehicleSituation = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const situation = await analysisService.getVehicleSituation(vehicleId);

    res.status(200).json({
      success: true,
      message: 'Vehicle situation analysis generated',
      data: situation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get real-time ETA & delay prediction for a vehicle
 * @route   GET /api/analysis/vehicle/:vehicleId/prediction
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getVehiclePrediction = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const prediction = await predictionService.predictForVehicle(vehicleId);

    res.status(200).json({
      success: true,
      message: 'Vehicle ETA and delay prediction generated',
      data: prediction
    });
  } catch (error) {
    next(error);
  }
};
