import express from 'express';
import { validateAnalysisRequest } from './analysis.validation.js';
import { getVehicleSituation, getVehiclePrediction } from './analysis.controller.js';

const router = express.Router();


router.get('/vehicle/:vehicleId', validateAnalysisRequest, getVehicleSituation);
router.get('/vehicle/:vehicleId/prediction', validateAnalysisRequest, getVehiclePrediction);

export default router;
