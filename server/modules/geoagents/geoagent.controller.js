import geoAgentService from './geoAgent.service.js';

/**
 * @desc    Trigger AI decision-support analysis for an active emergency
 * @route   POST /api/geoagent/analyze
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const analyzeEmergency = async (req, res, next) => {
  try {
    const { emergencyId } = req.body;
    const recommendation = await geoAgentService.analyzeEmergency(emergencyId);

    res.status(200).json({
      success: true,
      message: 'GeoAgent emergency analysis generated',
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trigger AI decision-support analysis for a vehicle
 * @route   POST /api/geoagent/analyze/vehicle/:vehicleId
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const analyzeVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const recommendation = await geoAgentService.analyzeVehicle(vehicleId);

    res.status(200).json({
      success: true,
      message: 'GeoAgent vehicle analysis generated',
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
};
