import express from 'express';
import {
  createEmergency,
  getEmergencies,
  getEmergency,
  updateEmergency,
  assignVehicle,
  deleteEmergency
} from './emergency.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateEmergencyCreate, validateEmergencyUpdate, validateEmergencyAssign } from './emergency.validation.js';
import { getEmergencyRoutes } from '../routes/route.controller.js';

const router = express.Router();

// All emergency routes require authentication
router.use(protect);

router
  .route('/')
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getEmergencies)
  // POST: CONTROL_ROOM & ADMIN
  .post(requireRole('CONTROL_ROOM', 'ADMIN'), validateEmergencyCreate, createEmergency);

router
  .route('/:emergencyId')
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getEmergency)
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(requireRole('CONTROL_ROOM', 'ADMIN'), validateEmergencyUpdate, updateEmergency)
  // DELETE: ADMIN only
  .delete(requireRole('ADMIN'), deleteEmergency);

router
  .route('/:emergencyId/assign')
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(requireRole('CONTROL_ROOM', 'ADMIN'), validateEmergencyAssign, assignVehicle);

router
  .route('/:emergencyId/routes')
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getEmergencyRoutes);

export default router;
