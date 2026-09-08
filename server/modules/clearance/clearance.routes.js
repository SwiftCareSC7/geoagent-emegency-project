import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import {
  getClearanceForVehicle,
  advanceClearanceCycle,
  resetClearance
} from './clearance.controller.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'));

router.get('/vehicle/:vehicleId', getClearanceForVehicle);
router.post('/vehicle/:vehicleId/cycle', advanceClearanceCycle);
router.post('/vehicle/:vehicleId/reset', resetClearance);

export default router;
