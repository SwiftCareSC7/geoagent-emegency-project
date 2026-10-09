import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateAnalyzeRequest, validateVehicleAnalyzeRequest } from './geoagent.validation.js';
import { analyzeEmergency, analyzeVehicle } from './geoagent.controller.js';
import { aiAnalysisRateLimiter } from '../../shared/middleware/rateLimiter.js';

const router = express.Router();

// Apply auth middleware to all geoagent routes
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

router.post('/analyze', aiAnalysisRateLimiter, validateAnalyzeRequest, analyzeEmergency);
router.post('/analyze/vehicle/:vehicleId', aiAnalysisRateLimiter, validateVehicleAnalyzeRequest, analyzeVehicle);

export default router;
