import express from 'express';
import {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle
} from './vehicle.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateVehicleCreate, validateVehicleUpdate } from './vehicle.validation.js';

const router = express.Router();

// All vehicle routes require authentication
router.use(protect);

router
  .route('/')
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getVehicles)
  // POST: ADMIN only
  .post(requireRole('ADMIN'), validateVehicleCreate, createVehicle);

router
  .route('/:vehicleId')
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getVehicle)
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(requireRole('CONTROL_ROOM', 'ADMIN'), validateVehicleUpdate, updateVehicle)
  // DELETE: ADMIN only
  .delete(requireRole('ADMIN'), deleteVehicle);

export default router;
