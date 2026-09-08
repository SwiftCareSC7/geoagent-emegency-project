/**
 * Admin Routes
 *
 * Exposes system stats, health checks, and sanitized operational collections.
 * Strictly gated behind both JWT authentication (`protect`) and `ADMIN` role (`requireRole('ADMIN')`).
 */

import express from 'express';
import adminController from './admin.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { requireRole } from '../../shared/middleware/roleMiddleware.js';

const router = express.Router();

// All admin endpoints require authentication and ADMIN role
router.use(protect);
router.use(requireRole('ADMIN'));

// Observability & Health Endpoints
router.get('/stats', adminController.getStats);
router.get('/health', adminController.getHealth);
router.get('/providers', adminController.getProviders);
router.get('/prediction-analytics', adminController.getPredictionAnalytics);

// Approved Operational Records (Paginated & Sanitized)
router.get('/users', adminController.getUsers);
router.get('/vehicles', adminController.getVehicles);
router.get('/emergencies', adminController.getEmergencies);
router.get('/incidents', adminController.getIncidents);
router.get('/routes', adminController.getRoutes);
router.get('/trajectories', adminController.getTrajectories);
router.get('/predictions', adminController.getPredictions);
router.get('/decisions', adminController.getDecisions);

export default router;
