/**
 * SwiftCare GeoAgent — Dashboard Demonstration Data Seeder
 *
 * Populates realistic vehicles, emergencies, and road incidents in MongoDB.
 * Connects to process.env.MONGO_URI or fallback local MongoDB.
 *
 * Usage:
 *   node server/seed-dashboard-data.js
 *   node server/seed-dashboard-data.js --clean  (drops existing test records first)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './modules/auth/user.model.js';
import Vehicle from './modules/vehicles/vehicle.model.js';
import Emergency from './modules/emergencies/emergency.model.js';
import Incident from './modules/incidents/incident.model.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

async function seed() {
  console.log(`[Seed] Connecting to MongoDB: ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected successfully.');

  const isClean = process.argv.includes('--clean');
  if (isClean) {
    console.log('[Seed] --clean flag passed: Removing existing vehicles, emergencies, incidents...');
    await Vehicle.deleteMany({});
    await Emergency.deleteMany({});
    await Incident.deleteMany({});
  }

  // 1. Ensure Operator User exists for createdBy / reportedBy references
  let operator = await User.findOne({ email: 'operator@swiftcare.local' });
  if (!operator) {
    console.log('[Seed] Creating demo operator: operator@swiftcare.local');
    const hashedPassword = await bcrypt.hash('Operator123!', 10);
    operator = await User.create({
      name: 'Central Control Operator',
      email: 'operator@swiftcare.local',
      password: hashedPassword,
      role: 'CONTROL_ROOM',
    });
  } else {
    console.log(`[Seed] Found existing operator: ${operator.email}`);
  }

  // 2. Seed Vehicles
  const vehicleDefs = [
    {
      vehicleId: 'AMB-101',
      registrationNumber: 'MH-12-PA-101',
      type: 'AMBULANCE',
      status: 'AVAILABLE',
      capacity: 1,
      driverName: 'Ramesh Shinde',
      driverContact: '+91 98220 11001',
      hospitalName: 'Ruby Hall Clinic',
      hospitalCode: 'RHC-01',
    },
    {
      vehicleId: 'AMB-102',
      registrationNumber: 'MH-12-PA-102',
      type: 'AMBULANCE',
      status: 'DISPATCHED',
      capacity: 2,
      driverName: 'Anita Deshmukh',
      driverContact: '+91 98220 11002',
      hospitalName: 'KEM Hospital Pune',
      hospitalCode: 'KEM-02',
    },
    {
      vehicleId: 'AMB-103',
      registrationNumber: 'MH-12-PA-103',
      type: 'AMBULANCE',
      status: 'EN_ROUTE',
      capacity: 1,
      driverName: 'Suresh Patil',
      driverContact: '+91 98220 11003',
      hospitalName: 'Sahyadri Hospital',
      hospitalCode: 'SAH-03',
    },
    {
      vehicleId: 'FE-201',
      registrationNumber: 'MH-12-FE-201',
      type: 'FIRE_ENGINE',
      status: 'AVAILABLE',
      capacity: 4,
      driverName: 'Vikram Kadam',
      driverContact: '+91 98220 11004',
      hospitalName: 'Central Fire Station Pune',
      hospitalCode: 'CFS-01',
    },
    {
      vehicleId: 'POL-301',
      registrationNumber: 'MH-12-PL-301',
      type: 'POLICE',
      status: 'AT_SCENE',
      capacity: 2,
      driverName: 'Officer Pawar',
      driverContact: '+91 98220 11005',
      hospitalName: 'Shivajinagar Police Division',
      hospitalCode: 'SPD-01',
    },
  ];

  const vehicleDocs = {};
  for (const vData of vehicleDefs) {
    let v = await Vehicle.findOne({ vehicleId: vData.vehicleId });
    if (!v) {
      v = await Vehicle.create(vData);
      console.log(`[Seed] Created Vehicle: ${v.vehicleId} (${v.status})`);
    } else {
      console.log(`[Seed] Vehicle ${v.vehicleId} already exists`);
    }
    vehicleDocs[v.vehicleId] = v;
  }

  // 3. Seed Emergencies
  const emergencyDefs = [
    {
      emergencyId: 'EMG-2026-001',
      type: 'MEDICAL',
      priority: 'CRITICAL',
      status: 'DISPATCHED',
      description: 'Acute cardiac distress reported at Shivajinagar Junction. Immediate paramedic team required.',
      callerName: 'Rajesh Verma',
      callerContact: '+91 98230 11223',
      location: {
        type: 'Point',
        coordinates: [73.8567, 18.5204],
      },
      destination: {
        type: 'Point',
        coordinates: [73.8742, 18.5312],
      },
      assignedVehicle: vehicleDocs['AMB-102']?._id || null,
      createdBy: operator._id,
    },
    {
      emergencyId: 'EMG-2026-002',
      type: 'ACCIDENT',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      description: 'Two-vehicle collision near FC Road. Minor trauma reported. Lane blockage causing queue.',
      callerName: 'Neha Joshi',
      callerContact: '+91 98500 44556',
      location: {
        type: 'Point',
        coordinates: [73.8412, 18.5245],
      },
      destination: {
        type: 'Point',
        coordinates: [73.8742, 18.5312],
      },
      assignedVehicle: vehicleDocs['AMB-103']?._id || null,
      createdBy: operator._id,
    },
    {
      emergencyId: 'EMG-2026-003',
      type: 'FIRE',
      priority: 'HIGH',
      status: 'PENDING',
      description: 'Commercial kitchen grease fire on ground floor. Evacuation initiated. Structural smoke spreading.',
      callerName: 'Sunil Mehta',
      callerContact: '+91 98810 77889',
      location: {
        type: 'Point',
        coordinates: [73.8321, 18.5089],
      },
      destination: null,
      assignedVehicle: null,
      createdBy: operator._id,
    },
    {
      emergencyId: 'EMG-2026-004',
      type: 'MEDICAL',
      priority: 'LOW',
      status: 'RESOLVED',
      description: 'Dehydration and heat exhaustion during public marathon. Patient stabilized on site.',
      callerName: 'Pooja Kale',
      callerContact: '+91 98900 99112',
      location: {
        type: 'Point',
        coordinates: [73.8601, 18.5155],
      },
      destination: {
        type: 'Point',
        coordinates: [73.8688, 18.5284],
      },
      assignedVehicle: vehicleDocs['AMB-101']?._id || null,
      createdBy: operator._id,
    },
  ];

  for (const eData of emergencyDefs) {
    let e = await Emergency.findOne({ emergencyId: eData.emergencyId });
    if (!e) {
      e = await Emergency.create(eData);
      console.log(`[Seed] Created Emergency: ${e.emergencyId} (${e.priority}, ${e.status})`);
    } else {
      console.log(`[Seed] Emergency ${e.emergencyId} already exists`);
    }
  }

  // 4. Seed Road Incidents
  const incidentDefs = [
    {
      incidentId: 'INC-2026-001',
      type: 'ROAD_CLOSURE',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      description: 'Complete road closure on Senapati Bapat Road due to flyover girder repair work',
      location: {
        type: 'Point',
        coordinates: [73.8298, 18.5342],
      },
      source: 'TRAFFIC_POLICE',
      reportedBy: operator._id,
    },
    {
      incidentId: 'INC-2026-002',
      type: 'TRAFFIC_JAM',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'Heavy congestion backed up 1.8km on University Circle junction during peak transit',
      location: {
        type: 'Point',
        coordinates: [73.8267, 18.5412],
      },
      source: 'AUTOMATED_SYSTEM',
      reportedBy: operator._id,
    },
    {
      incidentId: 'INC-2026-003',
      type: 'ROAD_WORK',
      severity: 'MEDIUM',
      status: 'ACTIVE',
      description: 'Left lane restriction for metro station pillar construction near Deccan Gymkhana',
      location: {
        type: 'Point',
        coordinates: [73.8395, 18.5167],
      },
      source: 'SENSOR',
      reportedBy: operator._id,
    },
  ];

  for (const iData of incidentDefs) {
    let inc = await Incident.findOne({ incidentId: iData.incidentId });
    if (!inc) {
      inc = await Incident.create(iData);
      console.log(`[Seed] Created Incident: ${inc.incidentId} (${inc.severity}, ${inc.type})`);
    } else {
      console.log(`[Seed] Incident ${inc.incidentId} already exists`);
    }
  }

  console.log('\n[Seed] Data seeding complete!');
  const totalV = await Vehicle.countDocuments({ isDeleted: false });
  const totalE = await Emergency.countDocuments({ isDeleted: false });
  const totalI = await Incident.countDocuments({ isDeleted: false });
  console.log(`[Seed] Summary in DB -> Vehicles: ${totalV}, Emergencies: ${totalE}, Incidents: ${totalI}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error seeding data:', err);
  process.exit(1);
});
