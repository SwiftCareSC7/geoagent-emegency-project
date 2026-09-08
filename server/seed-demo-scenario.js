/**
 * SwiftCare GeoAgent — Canonical Demonstration Scenario Seeder
 *
 * Seeds the canonical demonstration scenario for Emergency E-DEMO-001 and Vehicle AMB-DEMO-01.
 *
 * Usage:
 *   node server/seed-demo-scenario.js
 *   node server/seed-demo-scenario.js --clean  (Removes previous demo records first)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';
import Route from './modules/routes/route.model.js';
import Trajectory from './modules/trajectories/trajectory.model.js';
import Decision from './modules/decisions/decision.model.js';
import Prediction from './modules/analysis/prediction.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

export async function seedDemoScenario(options = {}) {
  const isClean = options.clean || process.argv.includes('--clean');

  console.log('================================================================');
  console.log('SWIFTCARE GEOAGENT: CANONICAL DEMO SCENARIO SEEDER');
  console.log('Scenario: Emergency E-DEMO-001 | Vehicle AMB-DEMO-01');
  console.log('================================================================');

  if (mongoose.connection.readyState === 0) {
    console.log(`Connecting to MongoDB: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');
  }

  // 1. Clean previous demo records if requested or if already present
  if (isClean) {
    console.log('\n[Clean] Purging previous demo scenario records...');
    await Vehicle.deleteMany({ vehicleId: /^AMB-DEMO-/ });
    await Emergency.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Incident.deleteMany({ incidentId: /^INC-DEMO-/ });
    await Route.deleteMany({ routeId: /^ROUTE-DEMO-/ });
    await Decision.deleteMany({ emergencyId: 'E-DEMO-001' });
    await Prediction.deleteMany({ emergencyId: 'E-DEMO-001' });
    console.log('[Clean] Previous demo records purged cleanly.');
  }

  // 2. Ensure Demo Users
  console.log('\n[1/6] Provisioning Demo Personnel...');
  const opPasswordHash = await bcrypt.hash('Operator123!', 10);
  let operator = await User.findOne({ email: 'operator@swiftcare.local' });
  if (!operator) {
    operator = await User.create({
      name: 'Central Control Operator',
      email: 'operator@swiftcare.local',
      password: opPasswordHash,
      role: 'CONTROL_ROOM',
    });
    console.log('  ✓ Created Demo Operator: operator@swiftcare.local');
  } else {
    console.log('  ✓ Found existing Demo Operator: operator@swiftcare.local');
  }

  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  let admin = await User.findOne({ email: 'admin@swiftcare.local' });
  if (!admin) {
    admin = await User.create({
      name: 'Chief Systems Administrator',
      email: 'admin@swiftcare.local',
      password: adminPasswordHash,
      role: 'ADMIN',
    });
    console.log('  ✓ Created Demo Admin: admin@swiftcare.local');
  } else {
    console.log('  ✓ Found existing Demo Admin: admin@swiftcare.local');
  }

  // 3. Demo Vehicle: AMB-DEMO-01
  console.log('\n[2/6] Provisioning Demo Vehicle AMB-DEMO-01...');
  let vehicle = await Vehicle.findOne({ vehicleId: 'AMB-DEMO-01' });
  if (!vehicle) {
    vehicle = await Vehicle.create({
      vehicleId: 'AMB-DEMO-01',
      registrationNumber: 'KA-01-DEMO-991',
      type: 'AMBULANCE',
      capacity: 2,
      driverName: 'Kavita Rao',
      driverContact: '+91 98450 11991',
      hospitalName: 'Manipal Hospital HAL Old Airport Rd',
      hospitalCode: 'MH-HAL-01',
      status: 'EN_ROUTE',
      isDeleted: false,
    });
    console.log('  ✓ Created Vehicle AMB-DEMO-01 (Ambulance - EN_ROUTE)');
  } else {
    vehicle.status = 'EN_ROUTE';
    vehicle.isDeleted = false;
    await vehicle.save();
    console.log('  ✓ Updated Vehicle AMB-DEMO-01 (Status: EN_ROUTE)');
  }

  // 4. Demo Emergency: E-DEMO-001
  console.log('\n[3/6] Provisioning Demo Emergency E-DEMO-001...');
  let emergency = await Emergency.findOne({ emergencyId: 'E-DEMO-001' });
  if (!emergency) {
    emergency = await Emergency.create({
      emergencyId: 'E-DEMO-001',
      type: 'MEDICAL',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      description: 'Acute myocardial infarction alert near Mayo Hall Junction. Transit corridor to Manipal Hospital Cath Lab.',
      callerName: 'Dr. Anand Raman',
      callerContact: '+91 98450 55001',
      location: {
        type: 'Point',
        coordinates: [77.6030, 12.9730], // Mayo Hall Junction
      },
      destination: {
        type: 'Point',
        coordinates: [77.6483, 12.9582], // Manipal Hospital HAL
      },
      assignedVehicle: vehicle._id,
      createdBy: operator._id,
      isDeleted: false,
    });
    console.log('  ✓ Created Emergency E-DEMO-001 (Priority: CRITICAL, Type: MEDICAL)');
  } else {
    emergency.assignedVehicle = vehicle._id;
    emergency.status = 'IN_PROGRESS';
    emergency.isDeleted = false;
    await emergency.save();
    console.log('  ✓ Updated Emergency E-DEMO-001 (Assigned: AMB-DEMO-01)');
  }

  // 5. Demo Primary Route & Bypass Alternative Route
  console.log('\n[4/6] Provisioning Corridor Routes...');
  const plannedCoordinates = [
    [77.6030, 12.9730], // Mayo Hall
    [77.6110, 12.9720], // Trinity Circle
    [77.6180, 12.9690], // Incident bottleneck zone
    [77.6300, 12.9640], // Domlur Flyover
    [77.6400, 12.9600], // HAL Main Rd
    [77.6483, 12.9582], // Manipal Hospital
  ];

  let primaryRoute = await Route.findOne({ routeId: 'ROUTE-DEMO-01' });
  if (!primaryRoute) {
    primaryRoute = await Route.create({
      routeId: 'ROUTE-DEMO-01',
      emergency: emergency._id,
      vehicle: vehicle._id,
      origin: { type: 'Point', coordinates: [77.6030, 12.9730] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      distance: 5500,
      duration: 600,
      provider: 'GOOGLE',
      routeType: 'PLANNED',
      status: 'ACTIVE',
      geometry: {
        type: 'LineString',
        coordinates: plannedCoordinates,
      },
      createdBy: operator._id,
    });
    console.log('  ✓ Created Primary Corridor Route: ROUTE-DEMO-01 (5.5 km, 10 min base)');
  }

  let altRoute = await Route.findOne({ routeId: 'ROUTE-DEMO-ALT' });
  if (!altRoute) {
    altRoute = await Route.create({
      routeId: 'ROUTE-DEMO-ALT',
      emergency: emergency._id,
      vehicle: vehicle._id,
      origin: { type: 'Point', coordinates: [77.6030, 12.9730] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      distance: 5200,
      duration: 520,
      provider: 'GOOGLE',
      routeType: 'ALTERNATIVE',
      status: 'ACTIVE',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6030, 12.9730],
          [77.6150, 12.9760], // 100ft Rd bypass
          [77.6320, 12.9710], // Indiranagar arterial
          [77.6420, 12.9620], // Bypass junction
          [77.6483, 12.9582], // Manipal Hospital
        ],
      },
      createdBy: operator._id,
    });
    console.log('  ✓ Created Alternative Corridor Bypass: ROUTE-DEMO-ALT (5.2 km, saves ~2 min)');
  }

  // 6. Demo Incident
  console.log('\n[5/6] Provisioning Road Hazard Incident...');
  let incident = await Incident.findOne({ incidentId: 'INC-DEMO-01' });
  if (!incident) {
    incident = await Incident.create({
      incidentId: 'INC-DEMO-01',
      type: 'ACCIDENT',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'Three-car collision blocking central and left lanes. Severe traffic bottleneck propagating backwards.',
      location: {
        type: 'Point',
        coordinates: [77.6180, 12.9690], // Directly on planned corridor
      },
      reportedBy: operator._id,
      isDeleted: false,
    });
    console.log('  ✓ Created Road Incident: INC-DEMO-01 (Trinity Overpass Bottleneck)');
  }

  // 7. Initial Telemetry Fix
  console.log('\n[6/6] Emitting Baseline Telemetry Fix...');
  await Trajectory.deleteMany({ vehicle: vehicle._id });
  const initialTrajectory = await Trajectory.create({
    vehicle: vehicle._id,
    location: {
      type: 'Point',
      coordinates: [77.6030, 12.9730],
    },
    speed: 45.0,
    heading: 90,
    timestamp: new Date(Date.now() - 160000),
    source: 'SIMULATOR',
  });
  console.log(`  ✓ Seeded Initial Telemetry for ${vehicle.vehicleId} (Speed: 45 km/h, ON_ROUTE, Source: SIMULATOR)`);

  console.log('\n================================================================');
  console.log('DEMO SEEDING COMPLETE');
  console.log('Available Credentials:');
  console.log('  Operator: operator@swiftcare.local / Operator123!');
  console.log('  Admin:    admin@swiftcare.local    / AdminPassword123!');
  console.log('Active Demo Mission:');
  console.log(`  Emergency ID: ${emergency.emergencyId}`);
  console.log(`  Vehicle ID:   ${vehicle.vehicleId}`);
  console.log(`  Route ID:     ${primaryRoute.routeId}`);
  console.log('================================================================\n');

  return {
    operator,
    admin,
    vehicle,
    emergency,
    primaryRoute,
    altRoute,
    incident,
    initialTrajectory,
  };
}

if (process.argv[1] && process.argv[1].endsWith('seed-demo-scenario.js')) {
  seedDemoScenario()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Demo seeding failed:', err);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(1);
    });
}
