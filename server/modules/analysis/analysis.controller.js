import analysisService from './analysis.service.js';

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
