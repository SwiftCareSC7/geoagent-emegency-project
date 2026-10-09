import express from 'express';
import { validateOrchestrationRequest } from './orchestration.validation.js';
import { analyzeEmergencyWorkflow } from './orchestration.controller.js';

const router = express.Router();


/**
 * @route   POST /api/orchestration/emergencies/:emergencyId/analyze
 * @desc    Execute complete end-to-end situation analysis, AI reasoning, and decision workflow
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
router.post(
  '/emergencies/:emergencyId/analyze',
  validateOrchestrationRequest,
  analyzeEmergencyWorkflow
);

export default router;
