import express from 'express';
import {
  getClearanceForVehicle,
  advanceClearanceCycle,
  resetClearance
} from './clearance.controller.js';

const router = express.Router();


router.get('/vehicle/:vehicleId', getClearanceForVehicle);
router.post('/vehicle/:vehicleId/cycle', advanceClearanceCycle);
router.post('/vehicle/:vehicleId/reset', resetClearance);

export default router;
