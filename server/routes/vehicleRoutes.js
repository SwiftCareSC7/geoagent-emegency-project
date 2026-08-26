import express from 'express';
import {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle
} from '../controllers/vehicleController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateVehicleCreate, validateVehicleUpdate } from '../middleware/validationMiddleware.js';

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
