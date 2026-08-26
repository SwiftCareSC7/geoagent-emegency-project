import express from 'express';
import {
  createTrajectory,
  getLatestTrajectory,
  getTrajectoryHistory,
  getRecentTrajectories
} from './trajectory.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateTrajectoryCreate } from './trajectory.validation.js';

const router = express.Router();

// All trajectory routes require authentication
router.use(protect);
// Restrict to CONTROL_ROOM and ADMIN
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

router.post('/', validateTrajectoryCreate, createTrajectory);
router.get('/:vehicleId', getTrajectoryHistory);
router.get('/:vehicleId/latest', getLatestTrajectory);
router.get('/:vehicleId/recent', getRecentTrajectories);

export default router;
