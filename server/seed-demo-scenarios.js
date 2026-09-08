#!/usr/bin/env node
/**
 * SwiftCare GeoAgent — Canonical Demonstration Scenarios CLI Seeder
 *
 * Seeds the 5 primary Bengaluru demo scenarios directly into MongoDB
 * using real Mongoose models and verified Bangalore road coordinates.
 *
 * Usage:
 *   node server/seed-demo-scenarios.js
 *   node server/seed-demo-scenarios.js --reset  (Clean wipe of demo records)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import demoService, { DEMO_SCENARIO_CONFIGS } from './modules/admin/demo.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

async function run() {
  console.log('================================================================');
  console.log('SWIFTCARE GEOAGENT: 5 PRIMARY DEMO SCENARIOS SEEDER');
  console.log('================================================================');

  if (mongoose.connection.readyState === 0) {
    console.log(`[DB] Connecting to: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[DB] Connected successfully.\n');
  }

  const isReset = process.argv.includes('--reset');
  if (isReset) {
    console.log('[Reset] Performing complete reset of demo data...');
    const result = await demoService.resetDemoData();
    console.log(`[Reset] ${result.message}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Seeding 5 Canonical Bengaluru Scenarios:');
  DEMO_SCENARIO_CONFIGS.forEach((sc, idx) => {
    console.log(`  ${idx + 1}. [${sc.id}] ${sc.title}`);
    console.log(`     Route: ${sc.originName} -> ${sc.destinationName}`);
    console.log(`     Details: ${sc.subtitle}`);
  });

  console.log('\n[Seeding] Executing demo persistence pipeline in MongoDB...');
  const result = await demoService.seedDemoScenarios({ clean: true });
  console.log(`\n✓ SUCCESS: ${result.message}`);
  console.log(`  Vehicles:     ${result.stats.vehiclesCount}`);
  console.log(`  Emergencies:  ${result.stats.emergenciesCount}`);
  console.log(`  Incidents:    ${result.stats.incidentsCount}`);
  console.log(`  Routes:       ${result.stats.routesCount}`);
  console.log(`  Trajectories: ${result.stats.trajectoriesCount}`);

  console.log('================================================================\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ FATAL: Seeding failed:', err);
  process.exit(1);
});
