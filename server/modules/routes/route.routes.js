import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateRouteCreate } from './route.validation.js';
import { createRoute, getRoutes, getRoute, getRouteAnalysis, compareRoute, getCorridorV2X, calculateRoute } from './route.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'));

router.post('/calculate', calculateRoute);

router.route('/')
  .post(validateRouteCreate, createRoute)
  .get(getRoutes);

router.route('/:routeId')
  .get(getRoute);

router.route('/:routeId/analysis')
  .get(getRouteAnalysis);

router.route('/:routeId/compare')
  .get(compareRoute);

router.route('/:routeId/corridor-v2x')
  .get(getCorridorV2X);

export default router;

