import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validationMiddleware.js';
import { validateRouteCreation } from './route.validation.js';
import { createRoute, getRoutes, getRoute } from './route.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('CONTROL_ROOM', 'ADMIN'));

router.route('/')
  .post(validateRouteCreation, validateRequest, createRoute)
  .get(getRoutes);

router.route('/:routeId')
  .get(getRoute);

export default router;
