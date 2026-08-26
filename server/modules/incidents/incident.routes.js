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
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getIncidents)
  // POST: CONTROL_ROOM & ADMIN
  .post(requireRole('CONTROL_ROOM', 'ADMIN'), validateIncidentCreate, createIncident);

router
  .route('/:incidentId')
  // GET: CONTROL_ROOM & ADMIN
  .get(requireRole('CONTROL_ROOM', 'ADMIN'), getIncident)
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(requireRole('CONTROL_ROOM', 'ADMIN'), validateIncidentUpdate, updateIncident)
  // DELETE: ADMIN only
  .delete(requireRole('ADMIN'), deleteIncident);

export default router;
