import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateDeviationRequest } from './deviation.validation.js';
import { getVehicleDeviation } from './deviation.controller.js';

const router = express.Router();

// Apply auth middleware to all deviation routes
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

router.get('/vehicle/:vehicleId', validateDeviationRequest, getVehicleDeviation);

export default router;
