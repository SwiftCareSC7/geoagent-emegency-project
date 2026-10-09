import express from 'express';
import {
  createIncident,
  getIncidents,
  getIncident,
  updateIncident,
  deleteIncident
} from './incident.controller.js';
import { validateIncidentCreate, validateIncidentUpdate } from './incident.validation.js';

const router = express.Router();


router
  .route('/')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(getIncidents)
  // POST: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .post(validateIncidentCreate, createIncident);

router
  .route('/:incidentId')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(getIncident)
  // PATCH: CONTROL_ROOM & ADMIN
  .patch(validateIncidentUpdate, updateIncident)
  // DELETE: ADMIN only
  .delete(deleteIncident);

export default router;
