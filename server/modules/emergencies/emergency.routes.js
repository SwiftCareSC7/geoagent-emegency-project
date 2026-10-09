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
import { validateEmergencyCreate, validateEmergencyUpdate, validateEmergencyAssign } from './emergency.validation.js';
import { getEmergencyRoutes } from '../routes/route.controller.js';
import { getEmergencyDecisions } from '../decisions/decision.controller.js';

const router = express.Router();


router
  .route('/')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(getEmergencies)
  // POST: CONTROL_ROOM & ADMIN
  .post(validateEmergencyCreate, createEmergency);

router
  .route('/:emergencyId')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(getEmergency)
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(validateEmergencyUpdate, updateEmergency)
  // DELETE: ADMIN only
  .delete(deleteEmergency);

router
  .route('/:emergencyId/assign')
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(validateEmergencyAssign, assignVehicle);

router
  .route('/:emergencyId/routes')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(getEmergencyRoutes);

router
  .route('/:emergencyId/decisions')
  // GET: CONTROL_ROOM & ADMIN — list all decisions for this emergency
  .get(getEmergencyDecisions);

router
  .route('/:emergencyId/send-status-sms')
  // POST: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC (Service enforces vehicle assignment for DRIVER)
  .post(sendEmergencyStatusSms)
  // GET: Read current SMS communication status
  .get(getEmergencySmsStatus);

export default router;
