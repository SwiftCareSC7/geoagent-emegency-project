import express from 'express';
import {
  createEmergency,
  getEmergencies,
  getEmergency,
  updateEmergency,
  assignVehicle,
  deleteEmergency,
  sendEmergencyStatusSms,
  getEmergencySmsStatus
} from './emergency.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateEmergencyCreate, validateEmergencyUpdate, validateEmergencyAssign } from './emergency.validation.js';
import { getEmergencyRoutes } from '../routes/route.controller.js';
import { getEmergencyDecisions } from '../decisions/decision.controller.js';

const router = express.Router();

// All emergency routes require authentication
router.use(protect);

router
  .route('/')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), getEmergencies)
  // POST: CONTROL_ROOM & ADMIN
  .post(requireRole('CONTROL_ROOM', 'ADMIN'), validateEmergencyCreate, createEmergency);

router
  .route('/:emergencyId')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), getEmergency)
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
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), getEmergencyRoutes);

router
  .route('/:emergencyId/decisions')
  // GET: CONTROL_ROOM & ADMIN — list all decisions for this emergency
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getEmergencyDecisions);

router
  .route('/:emergencyId/send-status-sms')
  // POST: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC (Service enforces vehicle assignment for DRIVER)
  .post(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), sendEmergencyStatusSms)
  // GET: Read current SMS communication status
  .get(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), getEmergencySmsStatus);

export default router;
