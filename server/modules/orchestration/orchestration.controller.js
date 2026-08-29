import orchestrationService from './orchestration.service.js';

/**
 * Orchestration Controller
 */
export const analyzeEmergencyWorkflow = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const result = await orchestrationService.executeEmergencyWorkflow(emergencyId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
