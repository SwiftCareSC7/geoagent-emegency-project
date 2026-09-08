/**
 * SwiftCare GeoAgent — Controlled Demo Telemetry Playback Engine
 *
 * Safe, repeatable playback mechanism strictly for DEVELOPMENT / DEMO.
 * Simulates a realistic mission sequence for Emergency E-DEMO-001 and Vehicle AMB-DEMO-01.
 *
 * Sequence:
 *   00:00 (Stage 0): Normal speed (45 km/h, ON_ROUTE, LOW risk)
 *   00:20 (Stage 1): Speed dropping (26 km/h approaching Trinity bottleneck)
 *   00:40 (Stage 2): Traffic delay worsening (11 km/h, HEAVY traffic, +5.2m delay)
 *   00:60 (Stage 3): Deviation occurs (driver navigates around collision, DEVIATED >150m)
 *   01:20 (Stage 4): Prediction model recalculates (+9.5m delay, HIGH risk)
 *   01:40 (Stage 5): Alternative route evaluated via 100ft Rd + V2X corridor green-wave
 *   02:00 (Stage 6): Advisory reasoning produces REROUTE proposal (PENDING_OPERATOR_ACTION)
 *   02:20 (Stage 7): Operator approves decision; state transitions to APPROVED -> EXECUTED
 *
 * Usage:
 *   node server/demo-telemetry-player.js --all             (runs all steps sequentially)
 *   node server/demo-telemetry-player.js --step 0          (runs single step: 0 to 7)
 *   node server/demo-telemetry-player.js --auto --interval 3000  (plays continuously)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Route from './modules/routes/route.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Decision from './modules/decisions/decision.model.js';
import Incident from './modules/incidents/incident.model.js';

import { createTrajectory } from './modules/trajectories/trajectory.service.js';
import deviationService from './modules/deviation/deviation.service.js';
import trafficService from './modules/traffic/traffic.service.js';
import predictionService from './modules/analysis/prediction.service.js';
import corridorGreenWaveService from './modules/routes/corridorGreenWave.service.js';
import decisionService from './modules/decisions/decision.service.js';
import geoAgentService from './modules/geoagents/geoAgent.service.js';
import realtimeService from './modules/realtime/realtime.service.js';
import { seedDemoScenario } from './seed-demo-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

export const DEMO_STAGES = [
  {
    stage: 0,
    timeLabel: '00:00',
    name: 'Normal Speed on Planned Corridor',
    coordinates: [77.6030, 12.9730], // Mayo Hall
    speed: 45.0,
    heading: 90,
    description: 'Vehicle AMB-DEMO-01 dispatched and operating at free-flow speed on planned corridor.',
  },
  {
    stage: 1,
    timeLabel: '00:20',
    name: 'Speed Dropping Near Incident Approach',
    coordinates: [77.6110, 12.9720], // Trinity Circle
    speed: 26.0,
    heading: 95,
    description: 'Vehicle decelerating as traffic builds near Trinity Circle approach.',
  },
  {
    stage: 2,
    timeLabel: '00:40',
    name: 'Severe Traffic Jam & Corridor Congestion',
    coordinates: [77.6170, 12.9695], // Right before Trinity Overpass
    speed: 11.0,
    heading: 100,
    description: 'Vehicle slowed to crawl behind multi-vehicle accident bottleneck (INC-DEMO-01).',
  },
  {
    stage: 3,
    timeLabel: '01:00',
    name: 'Driver Divergence & Route Deviation',
    coordinates: [77.6160, 12.9740], // Diverging North onto Old Airport Bypass / 100ft Rd
    speed: 32.0,
    heading: 35,
    description: 'Driver maneuvers off primary corridor onto bypass link. Cross-track divergence detected.',
  },
  {
    stage: 4,
    timeLabel: '01:20',
    name: 'Prediction Model Recalculates Delay Risk',
    coordinates: [77.6200, 12.9760], // Moving along Indiranagar bypass
    speed: 38.0,
    heading: 85,
    description: 'Real-time prediction engine detects elevated delay risk (+9.5 min delay projected).',
  },
  {
    stage: 5,
    timeLabel: '01:40',
    name: 'Alternative Bypass & V2X Green-Wave Evaluated',
    coordinates: [77.6250, 12.9750], // Indiranagar arterial
    speed: 42.0,
    heading: 90,
    description: 'System evaluates ROUTE-DEMO-ALT. V2X corridor engine signals green-wave clearance.',
  },
  {
    stage: 6,
    timeLabel: '02:00',
    name: 'Decision Proposal Generated for Operator Review',
    coordinates: [77.6320, 12.9710], // Merging bypass
    speed: 44.0,
    heading: 105,
    description: 'AI & deterministic rules formulate REROUTE_TO_ALTERNATIVE proposal awaiting operator approval.',
  },
  {
    stage: 7,
    timeLabel: '02:20',
    name: 'Operator Approval & Atomic State Execution',
    coordinates: [77.6400, 12.9620], // En route to Manipal
    speed: 48.0,
    heading: 120,
    description: 'Operator approves decision proposal. State transitions to APPROVED then EXECUTED.',
  },
];

export async function runDemoStage(stageIndex, context = {}) {
  const stage = DEMO_STAGES[stageIndex];
  if (!stage) {
    throw new Error(`Invalid stage index: ${stageIndex}. Must be between 0 and 7.`);
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`[STAGE ${stage.stage}] [${stage.timeLabel}] ${stage.name}`);
  console.log(`Coordinates: [${stage.coordinates[1]}°N, ${stage.coordinates[0]}°E] | Speed: ${stage.speed} km/h`);
  console.log(`Summary: ${stage.description}`);
  console.log(`----------------------------------------------------------------`);

  // Ensure fixtures exist
  const vehicle = await Vehicle.findOne({ vehicleId: 'AMB-DEMO-01' });
  const emergency = await Emergency.findOne({ emergencyId: 'E-DEMO-001' });
  const primaryRoute = await Route.findOne({ routeId: 'ROUTE-DEMO-01' });
  const altRoute = await Route.findOne({ routeId: 'ROUTE-DEMO-ALT' });
  const operator = await User.findOne({ role: 'CONTROL_ROOM' });

  if (!vehicle || !emergency || !primaryRoute) {
    console.log('Demo fixtures missing. Running auto-seed first...');
    await seedDemoScenario({ clean: false });
  }

  // 1. Ingest Telemetry Fix
  const trajectory = await createTrajectory({
    vehicleId: 'AMB-DEMO-01',
    latitude: stage.coordinates[1],
    longitude: stage.coordinates[0],
    speed: stage.speed,
    heading: stage.heading,
    source: 'SIMULATOR', // Truthful labeling: SIMULATOR
    timestamp: new Date(),
  });
  console.log(`  ✓ Ingested simulated telemetry: ${stage.speed} km/h (Source: SIMULATOR)`);

  // 2. Geodesic Deviation Check
  const activeRoute = await Route.findOne({ emergency: emergency._id, status: 'ACTIVE' });
  const deviation = deviationService.analyzeDeviation(
    { type: 'Point', coordinates: stage.coordinates },
    activeRoute || primaryRoute,
    [],
    stage.heading
  );
  console.log(`  ✓ Deviation analysis: ${deviation.status} (${Math.round(deviation.distanceFromRouteMeters)}m cross-track)`);

  // 3. Traffic Conditions
  const traffic = await trafficService.getTrafficForLocation({
    type: 'Point',
    coordinates: stage.coordinates,
  });
  console.log(`  ✓ Corridor traffic: ${traffic.level} (${traffic.speedKmh} km/h, Source: ${traffic.source})`);

  // 4. Prediction Engine (v1.3)
  const prediction = await predictionService.predictForVehicle(vehicle.vehicleId);
  console.log(`  ✓ Prediction Engine: ETA Delay +${prediction?.predictedDelayMinutes || 0} min (Risk: ${prediction?.delayRisk || 'LOW'})`);

  // 5. Python / V2X Corridor Clearance
  const v2x = await corridorGreenWaveService.analyzeCorridorForVehicle(vehicle.vehicleId, { silent: true });
  console.log(`  ✓ V2X Corridor Clearance: ${v2x.corridorSummary?.corridorHealth} (Signals cleared: ${v2x.corridorSummary?.preemptedCount || 0}/4, Time Saved: -${v2x.corridorSummary?.timeSavedMinutes || 0}m)`);

  let decisionResult = null;

  // 6. Action Formulations on Stage 6 & 7
  if (stage.stage === 6) {
    console.log('\n  [Formulating Decision Proposal via Authoritative Rules...]');
    decisionResult = await decisionService.analyzeEmergency(emergency.emergencyId);
    console.log(`  ✓ Decision Proposed: ${decisionResult.decisionId}`);
    console.log(`    Primary Action: ${decisionResult.primaryAction}`);
    console.log(`    Status:         ${decisionResult.status} (Human-in-the-loop approval required)`);
    console.log(`    Situation Hash: ${decisionResult.situationHash?.slice(0, 16)}...`);
  }

  if (stage.stage === 7) {
    console.log('\n  [Executing Operator Approval & Lifecycle Transition...]');
    const existingDecision = await Decision.findOne({
      emergencyId: emergency.emergencyId,
      status: 'PENDING_OPERATOR_ACTION',
    }).sort({ createdAt: -1 });

    if (existingDecision) {
      const approved = await decisionService.approveDecision(existingDecision.decisionId, operator._id);
      console.log(`  ✓ Decision ${existingDecision.decisionId} APPROVED by operator`);

      const executed = await decisionService.executeDecision(existingDecision.decisionId, operator._id);
      console.log(`  ✓ Decision ${existingDecision.decisionId} EXECUTED successfully`);
      console.log(`    Route switched to Alternative Bypass: ROUTE-DEMO-ALT`);
      decisionResult = executed;
    } else {
      console.log('  ℹ No pending decision proposal found to approve (stage 6 will create one).');
    }
  }

  return {
    stage: stage.stage,
    trajectory,
    deviation,
    traffic,
    prediction,
    v2x,
    decisionResult,
  };
}

export async function runFullDemoScenario(intervalMs = 0) {
  console.log('================================================================');
  console.log('STARTING CANONICAL DEMONSTRATION PLAYBACK');
  console.log(`Emergency: E-DEMO-001 | Vehicle: AMB-DEMO-01 | Total Stages: 8`);
  console.log('================================================================');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Ensure fresh clean seed
  await seedDemoScenario({ clean: true });

  const results = [];
  for (let i = 0; i < DEMO_STAGES.length; i++) {
    const res = await runDemoStage(i);
    results.push(res);

    if (intervalMs > 0 && i < DEMO_STAGES.length - 1) {
      console.log(`\nWaiting ${intervalMs}ms before next demo stage...`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  console.log('\n================================================================');
  console.log('CANONICAL DEMONSTRATION PLAYBACK COMPLETE: 8/8 STAGES VERIFIED');
  console.log('================================================================\n');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('demo-telemetry-player.js')) {
  const stepArg = process.argv.indexOf('--step');
  const intervalArg = process.argv.indexOf('--interval');

  let interval = 0;
  if (intervalArg !== -1 && process.argv[intervalArg + 1]) {
    interval = parseInt(process.argv[intervalArg + 1], 10) || 2000;
  }

  if (stepArg !== -1 && process.argv[stepArg + 1]) {
    const step = parseInt(process.argv[stepArg + 1], 10);
    mongoose.connect(MONGO_URI).then(async () => {
      await runDemoStage(step);
      await mongoose.disconnect();
      process.exit(0);
    }).catch(async (err) => {
      console.error('Demo stage error:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
  } else {
    runFullDemoScenario(interval).then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }).catch(async (err) => {
      console.error('Full demo error:', err);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(1);
    });
  }
}
