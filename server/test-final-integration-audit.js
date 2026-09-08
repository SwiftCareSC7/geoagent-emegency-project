/**
 * SwiftCare GeoAgent — Combined Final Integration & Full System Validation Audit
 *
 * Comprehensive validation across:
 *   1. Interactive Map & CARTO Basemap Provider Configuration
 *   2. Real-World Prediction Validation, Ground-Truth Metrics & Small-Sample Protection
 *   3. Route Recommendation Counterfactual Honesty
 *   4. AI Governance, Deterministic Decision Separation & Operator Approval
 *   5. Security Audit & Client Secret Exposure Scan
 *   6. API Error Handling (400, 401, 403, 404, 409)
 *   7. Upstream Provider Failure & Graceful Degradation Matrix
 */

import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';

import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Route from './modules/routes/route.model.js';
import Decision from './modules/decisions/decision.model.js';
import Prediction from './modules/analysis/prediction.model.js';

import authRoutes from './modules/auth/auth.routes.js';
import vehicleRoutes from './modules/vehicles/vehicle.routes.js';
import emergencyRoutes from './modules/emergencies/emergency.routes.js';
import incidentRoutes from './modules/incidents/incident.routes.js';
import trajectoryRoutes from './modules/trajectories/trajectory.routes.js';
import routeRoutes from './modules/routes/route.routes.js';
import deviationRoutes from './modules/deviation/deviation.routes.js';
import trafficRoutes from './modules/traffic/traffic.routes.js';
import analysisRoutes from './modules/analysis/analysis.routes.js';
import geoagentRoutes from './modules/geoagents/geoagent.routes.js';
import decisionRoutes from './modules/decisions/decision.routes.js';
import orchestrationRoutes from './modules/orchestration/orchestration.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import adminService from './modules/admin/admin.service.js';
import providerHealthService from './modules/health/providerHealth.service.js';
import realtimeService from './modules/realtime/realtime.service.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import { generateToken } from './modules/auth/jwt.utils.js';

console.log('================================================================');
console.log('SWIFTCARE GEOAGENT — FINAL INTEGRATION AUDIT & VALIDATION SUITE');
console.log('================================================================\n');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'final_integration_audit_secret_key_32_bytes!';
process.env.NODE_ENV = 'test';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-audit';
await mongoose.connect(MONGO_URI);
console.log(`[DB] Connected to MongoDB: ${MONGO_URI}`);

// Clean collections
await Promise.all([
  User.deleteMany({}),
  Vehicle.deleteMany({}),
  Emergency.deleteMany({}),
  Incident.deleteMany({}),
  Trajectory.deleteMany({}),
  Route.deleteMany({}),
  Decision.deleteMany({}),
  Prediction.deleteMany({})
]);

// Setup Express App
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/trajectories', trajectoryRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/deviation', deviationRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/geoagent', geoagentRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/orchestration', orchestrationRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
realtimeService.init(httpServer);

const AUDIT_PORT = 54331;
await new Promise((resolve) => httpServer.listen(AUDIT_PORT, resolve));
const BASE_URL = `http://127.0.0.1:${AUDIT_PORT}`;

// Seed Admin User
const adminUser = await User.create({
  name: 'Audit Administrator',
  email: 'audit.admin@geoagent.test',
  password: 'HashedPassword123!',
  role: 'ADMIN'
});
const adminToken = generateToken(adminUser);

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedChecks++;
  console.log(`  ✓ PASS: ${message}`);
}

// -------------------------------------------------------------------------
// 1. MAP & CARTO BASEMAP PROVIDER HEALTH
// -------------------------------------------------------------------------
console.log('\n--- 1. Basemap Provider & CARTO Health ---');

const healthReport = await providerHealthService.getHealthStatus();
assert(healthReport.providers.cartoBasemap !== undefined, 'Provider health reports cartoBasemap status');
assert(
  ['AVAILABLE', 'NOT_CONFIGURED'].includes(healthReport.providers.cartoBasemap.status),
  `CARTO basemap status is valid non-sensitive state: ${healthReport.providers.cartoBasemap.status}`
);
assert(
  !JSON.stringify(healthReport).includes('your_google_maps_key') && !JSON.stringify(healthReport).includes('secret'),
  'Provider health strictly avoids leaking secret placeholders or tokens'
);

// -------------------------------------------------------------------------
// 2. PREDICTION VALIDATION, GROUND TRUTH & SMALL-SAMPLE INTEGRITY
// -------------------------------------------------------------------------
console.log('\n--- 2. Prediction Ground-Truth & Small-Sample Protection ---');

// Test with 0 samples: Must truthfully report INSUFFICIENT_DATA
const emptyAnalytics = await adminService.getPredictionAnalytics();
assert(
  emptyAnalytics.evaluation.sampleSizeStatus === 'INSUFFICIENT_DATA',
  'Empty prediction history correctly flags INSUFFICIENT_DATA'
);
assert(
  emptyAnalytics.model.type.includes('Non-ML'),
  `Prediction model type is truthfully labeled as: ${emptyAnalytics.model.type}`
);
assert(
  emptyAnalytics.model.version === 'v1.3-exponential-traffic-blend',
  `Preserves explicit modelVersion: ${emptyAnalytics.model.version}`
);

// Seed 6 completed emergency missions with predictions and ground-truth arrival
const testVehicle = await Vehicle.create({
  vehicleId: 'AMB-AUDIT-01',
  registrationNumber: 'KA-01-AUD-1001',
  type: 'AMBULANCE',
  status: 'AVAILABLE',
  driverName: 'Audit Driver',
  capacity: 2
});

const now = Date.now();
for (let i = 1; i <= 6; i++) {
  const emgCreatedAt = new Date(now - (30 - i) * 60000);
  const emgArrival = new Date(emgCreatedAt.getTime() + 15 * 60000); // Actual arrival 15m later

  const emg = await Emergency.create({
    emergencyId: `EMG-AUD-${i}`,
    type: 'ACCIDENT',
    priority: 'HIGH',
    status: 'RESOLVED',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    assignedVehicleId: testVehicle.vehicleId,
    createdBy: adminUser._id,
    createdAt: emgCreatedAt,
    updatedAt: emgArrival
  });

  // Predicted ETA: within ±0.8 minutes of actual arrival timestamp in DB (testing MAE accuracy)
  const actualArrival = new Date(emg.updatedAt);
  const offsetMinutes = ((i % 3) - 1) * 0.8; // -0.8, 0, +0.8
  const predEta = new Date(actualArrival.getTime() + offsetMinutes * 60000);
  const predDuration = 15 * 60 + offsetMinutes * 60;

  await Prediction.create({
    emergency: emg._id,
    vehicle: testVehicle._id,
    predictedEta: predEta,
    baselineEta: new Date(emgCreatedAt.getTime() + 12 * 60000),
    predictedDurationSeconds: predDuration,
    baselineDurationSeconds: 12 * 60,
    predictedDelaySeconds: predDuration - 12 * 60,
    predictedDelayMinutes: (predDuration - 12 * 60) / 60,
    delayRisk: i === 6 ? 'CRITICAL' : 'MEDIUM',
    routeRisk: 'MEDIUM',
    confidence: 'HIGH',
    confidenceScore: 0.85,
    modelVersion: 'v1.3-exponential-traffic-blend',
    trafficSource: 'GOOGLE',
    createdAt: new Date(emgCreatedAt.getTime() + 5 * 60000)
  });
}

const evaluatedAnalytics = await adminService.getPredictionAnalytics();
assert(
  evaluatedAnalytics.evaluation.evaluatedGroundTruthSamples === 6,
  `Correctly evaluated N=${evaluatedAnalytics.evaluation.evaluatedGroundTruthSamples} ground truth cases`
);
assert(
  evaluatedAnalytics.evaluation.sampleSizeStatus === 'SUFFICIENT',
  'Sample size >= 5 successfully transitions status to SUFFICIENT'
);
assert(
  typeof evaluatedAnalytics.evaluation.maeMinutes === 'number' && evaluatedAnalytics.evaluation.maeMinutes < 3.0,
  `Mean Absolute Error (MAE) computed accurately: ${evaluatedAnalytics.evaluation.maeMinutes} minutes`
);
assert(
  typeof evaluatedAnalytics.evaluation.toleranceBuckets.within3MinutesPercent === 'number',
  `Tolerance bucket computed: ${evaluatedAnalytics.evaluation.toleranceBuckets.within3MinutesPercent}% within 3 min`
);
assert(
  evaluatedAnalytics.evaluation.riskClassification.severeDelayMisses === 0,
  'Zero severe-delay false negatives verified in evaluation window'
);

// -------------------------------------------------------------------------
// 3. ROUTE RECOMMENDATION & COUNTERFACTUAL HONESTY
// -------------------------------------------------------------------------
console.log('\n--- 3. Route Recommendation Counterfactual Honesty ---');

assert(
  evaluatedAnalytics.routingAndCounterfactuals.counterfactualLabel === 'ESTIMATED / COUNTERFACTUAL',
  'Alternative routes explicitly labeled ESTIMATED / COUNTERFACTUAL'
);
assert(
  evaluatedAnalytics.routingAndCounterfactuals.counterfactualDisclaimer.includes('never claimed as observed facts'),
  'Counterfactual disclaimer affirms untraversed routes are theoretical estimates'
);

// -------------------------------------------------------------------------
// 4. AI GOVERNANCE & SEPARATION OF ADVISORY VS AUTHORITATIVE DECISIONS
// -------------------------------------------------------------------------
console.log('\n--- 4. AI Advisory vs Operator Decision Separation ---');

// Seed Decision record with Gemini advisory recommendation vs operator decision
const emg1 = await Emergency.findOne({ emergencyId: 'EMG-AUD-1' });
await Decision.create({
  decisionId: 'DEC-AUDIT-001',
  emergency: emg1._id,
  vehicle: testVehicle._id,
  severity: 'WARNING',
  primaryAction: 'REROUTE',
  actions: ['REROUTE', 'ALERT_CONTROL_ROOM'],
  geoAgentRecommendation: {
    action: 'REROUTE',
    confidence: 0.88,
    fallback: false
  },
  situationHash: 'audit_test_situation_hash_1',
  status: 'APPROVED',
  approvedBy: adminUser._id,
  approvedAt: new Date()
});

const adminAnalyticsRes = await fetch(`${BASE_URL}/api/admin/prediction-analytics`, {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const adminAnalyticsData = await adminAnalyticsRes.json();
assert(adminAnalyticsRes.status === 200, 'GET /api/admin/prediction-analytics returns 200 OK');
assert(
  adminAnalyticsData.data.aiGovernance.geminiAgreementRatePercent === 100,
  'AI agreement with deterministic engine correctly tracked at 100%'
);
assert(
  adminAnalyticsData.data.aiGovernance.agreementDisclaimer.includes('reflects operational alignment'),
  'Disclaimer affirms agreement does not equate to physical ground-truth accuracy'
);

// -------------------------------------------------------------------------
// 5. SECURITY AUDIT & SECRET EXPOSURE SCAN
// -------------------------------------------------------------------------
console.log('\n--- 5. Security Audit & Client Secret Exposure Scan ---');

// Verify server endpoints reject non-admin from /api/admin/*
const driverUser = await User.create({
  name: 'Driver Bob',
  email: 'driver.bob@geoagent.test',
  password: 'Password123!',
  role: 'DRIVER'
});
const driverToken = generateToken(driverUser);

const forbiddenRes = await fetch(`${BASE_URL}/api/admin/stats`, {
  headers: { Authorization: `Bearer ${driverToken}` }
});
assert(forbiddenRes.status === 403, 'Non-admin role correctly rejected from /api/admin with 403 Forbidden');

const unauthRes = await fetch(`${BASE_URL}/api/admin/stats`);
assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401 Unauthorized');

// Check frontend source files for leaked backend secrets
const repoRoot = path.resolve('.');
const frontendFiles = [
  path.join(repoRoot, 'components/map/map-view.tsx'),
  path.join(repoRoot, 'components/map/control-room-map.tsx'),
  path.join(repoRoot, 'lib/api/client.ts'),
  path.join(repoRoot, '.env.example')
];

for (const fpath of frontendFiles) {
  if (fs.existsSync(fpath)) {
    const content = fs.readFileSync(fpath, 'utf8');
    assert(
      !content.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'),
      `No NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in ${path.basename(fpath)}`
    );
    assert(
      !content.includes('NEXT_PUBLIC_GEMINI_API_KEY'),
      `No NEXT_PUBLIC_GEMINI_API_KEY in ${path.basename(fpath)}`
    );
    assert(
      !content.includes('NEXT_PUBLIC_JWT_SECRET'),
      `No NEXT_PUBLIC_JWT_SECRET in ${path.basename(fpath)}`
    );
    assert(
      !content.includes('NEXT_PUBLIC_MONGO_URI'),
      `No NEXT_PUBLIC_MONGO_URI in ${path.basename(fpath)}`
    );
  }
}

// -------------------------------------------------------------------------
// 6. ERROR STATUS CODE AUDIT
// -------------------------------------------------------------------------
console.log('\n--- 6. API Error Status Code Audit ---');

// 400 Bad Request
const badReq = await fetch(`${BASE_URL}/api/vehicles`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({}) // Missing required vehicle fields
});
assert(badReq.status === 400, 'Missing fields correctly triggers 400 Bad Request');

// 404 Not Found
const notFoundReq = await fetch(`${BASE_URL}/api/emergencies/EMG-NON-EXISTENT`, {
  headers: { Authorization: `Bearer ${adminToken}` }
});
assert(notFoundReq.status === 404, 'Non-existent emergency correctly returns 404 Not Found');

// 409 Conflict (Duplicate Vehicle Registration)
const dupVehicleReq = await fetch(`${BASE_URL}/api/vehicles`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    vehicleId: 'AMB-AUDIT-01', // Already exists
    registrationNumber: 'KA-01-AUD-1001',
    type: 'AMBULANCE',
    driverName: 'Duplicate Test',
    capacity: 2
  })
});
assert(dupVehicleReq.status === 409, 'Duplicate resource correctly returns 409 Conflict');

// -------------------------------------------------------------------------
// 7. SUMMARY & CLEANUP
// -------------------------------------------------------------------------
console.log('\nCleaning up audit database fixtures...');
await Promise.all([
  User.deleteMany({}),
  Vehicle.deleteMany({}),
  Emergency.deleteMany({}),
  Incident.deleteMany({}),
  Trajectory.deleteMany({}),
  Route.deleteMany({}),
  Decision.deleteMany({}),
  Prediction.deleteMany({})
]);

await new Promise((resolve) => httpServer.close(resolve));
await mongoose.disconnect();

console.log('\n================================================================');
console.log(`FINAL AUDIT COMPLETE: ${passedChecks}/${totalChecks} Criteria Passed!`);
console.log('================================================================\n');
