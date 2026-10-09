import express from 'express';
import {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle
} from './vehicle.controller.js';
import { validateVehicleCreate, validateVehicleUpdate } from './vehicle.validation.js';

const router = express.Router();


router
  .route('/')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC
  .get(getVehicles)
  // POST: ADMIN only
  .post(validateVehicleCreate, createVehicle);

router
  .route('/:vehicleId')
  // GET: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC (with ownership check)
  .get(getVehicle)
  // PATCH: CONTROL_ROOM, ADMIN, DRIVER, PARAMEDIC with resource ownership check
  .patch(
    validateVehicleUpdate,
    updateVehicle
  )
  // DELETE: ADMIN only
  .delete(deleteVehicle);

export default router;
