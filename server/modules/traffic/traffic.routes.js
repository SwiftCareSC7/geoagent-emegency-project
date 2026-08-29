import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { getTrafficAtLocation } from './traffic.controller.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

router.get('/location', getTrafficAtLocation);

export default router;
