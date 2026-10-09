import express from 'express';
import { validateAnalyzeRequest, validateVehicleAnalyzeRequest } from './geoagent.validation.js';
import { analyzeEmergency, analyzeVehicle } from './geoagent.controller.js';
import { aiAnalysisRateLimiter } from '../../shared/middleware/rateLimiter.js';

const router = express.Router();


router.post('/analyze', aiAnalysisRateLimiter, validateAnalyzeRequest, analyzeEmergency);
router.post('/analyze/vehicle/:vehicleId', aiAnalysisRateLimiter, validateVehicleAnalyzeRequest, analyzeVehicle);

export default router;
