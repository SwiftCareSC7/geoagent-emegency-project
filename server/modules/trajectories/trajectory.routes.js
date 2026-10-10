import express from 'express';
import {
  createTrajectory,
  getLatestTrajectory,
  getTrajectoryHistory,
  getRecentTrajectories
} from './trajectory.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { requireVehicleOwnership } from '../../shared/middleware/ownershipMiddleware.js';
import { validateTrajectoryCreate } from './trajectory.validation.js';

const router = express.Router();

// All trajectory routes require authentication
router.use(protect);
// Restrict to CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
router.use(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'));

router.post('/', requireVehicleOwnership, validateTrajectoryCreate, createTrajectory);
router.get('/:vehicleId', requireVehicleOwnership, getTrajectoryHistory);
router.get('/:vehicleId/latest', requireVehicleOwnership, getLatestTrajectory);
router.get('/:vehicleId/recent', requireVehicleOwnership, getRecentTrajectories);

export default router;
