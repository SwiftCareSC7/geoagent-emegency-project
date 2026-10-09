import express from 'express';
import { validateDeviationRequest } from './deviation.validation.js';
import { getVehicleDeviation } from './deviation.controller.js';

const router = express.Router();


router.get('/vehicle/:vehicleId', validateDeviationRequest, getVehicleDeviation);

export default router;
