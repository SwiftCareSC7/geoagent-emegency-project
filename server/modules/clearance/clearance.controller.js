import clearanceService from './clearance.service.js';

/**
 * @desc    Get active clearance session for an ambulance
 * @route   GET /api/clearance/vehicle/:vehicleId
 * @access  Private (CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC)
 */
export const getClearanceForVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const session = await clearanceService.getClearanceForVehicle(vehicleId);
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Advance clearance simulation cycle
 * @route   POST /api/clearance/vehicle/:vehicleId/cycle
 * @access  Private (CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC)
 */
export const advanceClearanceCycle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { cycleStep = 1 } = req.body;
    const session = await clearanceService.advanceClearanceCycle(vehicleId, Number(cycleStep));
    res.status(200).json({
      success: true,
      message: 'Clearance simulation cycle advanced',
      data: session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset clearance session for an ambulance
 * @route   POST /api/clearance/vehicle/:vehicleId/reset
 * @access  Private (CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC)
 */
export const resetClearance = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const session = await clearanceService.resetClearance(vehicleId);
    res.status(200).json({
      success: true,
      message: 'Clearance session reset',
      data: session
    });
  } catch (error) {
    next(error);
  }
};
