import express from 'express';
import {
  createTrajectory,
  getLatestTrajectory,
  getTrajectoryHistory,
  getRecentTrajectories
} from './trajectory.controller.js';
import { validateTrajectoryCreate } from './trajectory.validation.js';

const router = express.Router();

// Restrict to CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC

router.post('/', validateTrajectoryCreate, createTrajectory);
router.get('/:vehicleId', getTrajectoryHistory);
router.get('/:vehicleId/latest', getLatestTrajectory);
router.get('/:vehicleId/recent', getRecentTrajectories);

export default router;
