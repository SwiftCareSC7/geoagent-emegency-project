import express from 'express';
import { validateRouteCreate } from './route.validation.js';
import { createRoute, getRoutes, getRoute, getRouteAnalysis, compareRoute, getCorridorV2X, calculateRoute, acceptReroute } from './route.controller.js';

const router = express.Router();

// Calculation does not mutate DB or expose private user data — allow route planner & navigation
router.post('/calculate', calculateRoute);


router.post(
  '/:routeId/accept-reroute',
  acceptReroute
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
