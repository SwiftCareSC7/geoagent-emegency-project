import deviationService from './deviation.service.js';

/**
 * @desc    Analyze route deviation for a specific vehicle
 * @route   GET /api/deviation/vehicle/:vehicleId
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getVehicleDeviation = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const result = await deviationService.getDeviationForVehicle(vehicleId);

    res.status(200).json({
      success: true,
      message: 'Vehicle deviation analysis generated',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
