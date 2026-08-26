import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateRouteCreate } from './route.validation.js';
import { createRoute, getRoutes, getRoute } from './route.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN'));

router.route('/')
  .post(validateRouteCreate, createRoute)
  .get(getRoutes);

router.route('/:routeId')
  .get(getRoute);

export default router;
