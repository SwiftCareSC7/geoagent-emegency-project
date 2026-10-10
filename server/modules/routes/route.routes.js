import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';
import { validateRouteCreate } from './route.validation.js';
import {
  createRoute,
  getRoutes,
  getRoute,
  getRouteAnalysis,
  compareRoute,
  getCorridorV2X,
  calculateRoute,
  acceptReroute,
  rerouteFromCurrentPosition,
  overrideRoute
} from './route.controller.js';

const router = express.Router();

// Calculation does not mutate DB or expose private user data.
router.post('/calculate', calculateRoute);

// Authenticate management routes.
router.use(protect);
router.use(requireRole('CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'));

// Only control-room operators and admins may approve and activate reroutes.
router.post(
  '/:routeId/accept-reroute',
  requireRole('CONTROL_ROOM', 'ADMIN'),
  acceptReroute
);

// Recalculate from the vehicle's current position.
router.post('/:routeId/reroute', rerouteFromCurrentPosition);

// Manual route overrides are restricted to control-room operators and admins.
router.post(
  '/:routeId/override',
  requireRole('CONTROL_ROOM', 'ADMIN'),
  overrideRoute
);

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