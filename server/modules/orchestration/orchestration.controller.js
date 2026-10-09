import orchestrationService from './orchestration.service.js';
import geoAgentService from '../geoagents/geoagent.service.js';

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

/**
 * @desc    Get task routing recommendations for an emergency
 * @route   POST /api/orchestration/emergencies/:emergencyId/recommendations
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getTaskRecommendations = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const geoAgentResult = await geoAgentService.analyzeEmergency(emergencyId);
    
    // Extract actionable recommendations from GeoAgent result
    const recommendations = [];
    
    if (geoAgentResult.recommendation) {
      recommendations.push({
        action: geoAgentResult.recommendation.action,
        reason: geoAgentResult.recommendation.summary || 'AI-generated recommendation',
        confidence: geoAgentResult.assessment?.confidence || 0.5,
        vehicleId: geoAgentResult.vehicleId || null,
        routeId: geoAgentResult.recommendation.routeId || null,
        priority: geoAgentResult.assessment?.likelyCause || 'UNKNOWN'
      });
    }
    
    if (geoAgentResult.backup?.recommended) {
      recommendations.push({
        action: 'BACKUP_DISPATCH',
        reason: geoAgentResult.backup.reason || 'Backup dispatch recommended',
        confidence: 0.7,
        vehicleId: geoAgentResult.backup.candidateVehicleId || null,
        priority: 'HIGH'
      });
    }
    
    res.status(200).json({
      success: true,
      data: recommendations,
      meta: {
        requiresOperatorReview: geoAgentResult.requiresOperatorReview || true,
        advisoryOnly: geoAgentResult.advisoryOnly || true,
        fallback: geoAgentResult.fallback || false
      }
    });
  } catch (error) {
    if (error.message === 'Emergency not found' || error.message === 'No vehicle assigned to this emergency yet') {
      res.status(404);
    } else {
      res.status(400);
    }
    next(error);
  }
};
