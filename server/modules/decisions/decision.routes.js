import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import {
  validateAnalyzeRequest,
  validateDecisionIdParam,
  validateRejectionPayload
} from './decision.validation.js';
import {
  analyzeDecision,
  getDecision,
  approveDecision,
  rejectDecision,
  executeDecision
} from './decision.controller.js';

const router = express.Router();

// All decision routes require authentication + operational role
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

/**
 * @route POST /api/decisions/analyze
 * @desc  Generate decision for an emergency (server loads truth)
 */
router.post('/analyze', validateAnalyzeRequest, analyzeDecision);

/**
 * @route GET /api/decisions/:decisionId
 * @desc  Retrieve a single decision
 */
router.get('/:decisionId', validateDecisionIdParam, getDecision);

/**
 * @route PATCH /api/decisions/:decisionId/approve
 * @desc  Approve a pending decision (human-in-the-loop)
 */
router.patch('/:decisionId/approve', validateDecisionIdParam, approveDecision);

/**
 * @route PATCH /api/decisions/:decisionId/reject
 * @desc  Reject a pending decision
 */
router.patch('/:decisionId/reject', validateDecisionIdParam, validateRejectionPayload, rejectDecision);

/**
 * @route PATCH /api/decisions/:decisionId/execute
 * @desc  Execute an approved decision via controlled action service
 */
router.patch('/:decisionId/execute', validateDecisionIdParam, executeDecision);

export default router;