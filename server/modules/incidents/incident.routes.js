import express from 'express';
import {
  createIncident,
  getIncidents,
  getIncident,
  updateIncident,
  deleteIncident
} from './incident.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateIncidentCreate, validateIncidentUpdate } from './incident.validation.js';

const router = express.Router();

// All incident routes require authentication
router.use(protect);

router
  .route('/')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), getIncidents)
  // POST: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .post(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), validateIncidentCreate, createIncident);

router
  .route('/:incidentId')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'), getIncident)
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(requireRole('CONTROL_ROOM', 'ADMIN'), validateIncidentUpdate, updateIncident)
  // DELETE: ADMIN only
  .delete(requireRole('ADMIN'), deleteIncident);

export default router;
