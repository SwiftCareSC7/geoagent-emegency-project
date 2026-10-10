import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateOrchestrationRequest } from './orchestration.validation.js';
import { analyzeEmergencyWorkflow } from './orchestration.controller.js';

const router = express.Router();

// Apply authentication to all orchestration routes
router.use(protect);

/**
 * @route   POST /api/orchestration/emergencies/:emergencyId/analyze
 * @desc    Execute complete end-to-end situation analysis, AI reasoning, and decision workflow
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
router.post(
  '/emergencies/:emergencyId/analyze',
  requireRole('CONTROL_ROOM', 'ADMIN'),
  validateOrchestrationRequest,
  analyzeEmergencyWorkflow
);

export default router;
