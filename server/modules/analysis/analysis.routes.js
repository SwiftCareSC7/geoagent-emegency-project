import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateAnalysisRequest } from './analysis.validation.js';
import { getVehicleSituation, getVehiclePrediction } from './analysis.controller.js';

const router = express.Router();

// Apply auth middleware to all analysis routes
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

router.get('/vehicle/:vehicleId', validateAnalysisRequest, getVehicleSituation);
router.get('/vehicle/:vehicleId/prediction', validateAnalysisRequest, getVehiclePrediction);

export default router;
