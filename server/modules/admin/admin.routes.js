/**
 * Admin Routes
 *
 * Exposes system stats, health checks, and sanitized operational collections.
 * Open (no authentication); the demo reset stays guarded by ALLOW_PRODUCTION_RESET in production.
 */

import express from 'express';
import adminController from './admin.controller.js';

const router = express.Router();


// Observability & Health Endpoints
router.get('/stats', adminController.getStats);
router.get('/health', adminController.getHealth);
router.get('/providers', adminController.getProviders);
router.get('/prediction-analytics', adminController.getPredictionAnalytics);

// Operational Records
router.get('/vehicles', adminController.getVehicles);
router.get('/emergencies', adminController.getEmergencies);
router.get('/incidents', adminController.getIncidents);
router.get('/routes', adminController.getRoutes);
router.get('/trajectories', adminController.getTrajectories);
router.get('/predictions', adminController.getPredictions);
router.get('/decisions', adminController.getDecisions);

// Demonstration Scenarios & Data Management
router.get('/demo/scenarios', adminController.getDemoScenarios);
router.post('/demo/seed', adminController.seedDemoScenarios);
router.post('/demo/reset', adminController.resetDemoData);

export default router;
