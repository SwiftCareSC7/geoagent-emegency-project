/**
 * SwiftCare GeoAgent — Canonical Demonstration Scenarios Service
 *
 * Implements the 5 primary demonstration scenarios for Bengaluru emergency operations
 * using real Mongoose models, genuine persistence in MongoDB, and Socket.IO broadcast.
 *
 * Primary Scenarios:
 *   DEMO-001: Koramangala -> Manipal Hospital (Accident + Congestion -> Route Change -> ~6 min saved)
 *   DEMO-002: Hebbal -> Victoria Hospital (Moderate Traffic -> Road Closure -> Alternative Route)
 *   DEMO-003: Whitefield -> Manipal Hospital (Severe Congestion -> Ambulance Deviation -> Auto Reroute)
 *   DEMO-004: Yelahanka -> Bowring Hospital (Normal Traffic -> Stable Navigation -> No Reroute)
 *   DEMO-005: Electronic City -> St John's Hospital (Accident + Congestion -> Backup Ambulance Recommended)
 */

import bcrypt from 'bcryptjs';
import User from '../auth/user.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Incident from '../incidents/incident.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import Decision from '../decisions/decision.model.js';
import Prediction from '../analysis/prediction.model.js';
import realtimeService from '../realtime/realtime.service.js';

export const DEMO_SCENARIO_CONFIGS = [
  {
    id: 'DEMO-001',
    code: 'DEMO_001',
    title: 'Demo 001: Koramangala to Manipal Hospital',
    subtitle: 'Heavy Traffic + Accident Ahead -> Reroute with 6 min saved',
    originName: 'Koramangala 4th Block',
    originCoordinates: [77.6271, 12.9352],
    destinationName: 'Manipal Hospital (Old Airport Road)',
    destinationCoordinates: [77.6483, 12.9582],
    vehicleId: 'AMB-01',
    emergencyId: 'E-DEMO-001',
    type: 'CARDIAC_ARREST',
    severity: 'CRITICAL',
    hasAccident: true,
    hasReroute: true,
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Accident Ahead & Dynamic Reroute'
  },
  {
    id: 'DEMO-002',
    code: 'DEMO_002',
    title: 'Demo 002: Hebbal to Victoria Hospital',
    subtitle: 'Moderate Traffic + Road Closure -> Alternative Route Available',
    originName: 'Hebbal Flyover',
    originCoordinates: [77.5925, 13.0358],
    destinationName: 'Victoria Hospital (K.R. Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-02',
    emergencyId: 'E-DEMO-002',
    type: 'TRAUMA',
    severity: 'CRITICAL',
    hasRoadClosure: true,
    hasAlternative: true,
    scenarioTag: 'Road Closure & Bypass Candidate'
  },
  {
    id: 'DEMO-003',
    code: 'DEMO_003',
    title: 'Demo 003: Whitefield to Manipal Hospital',
    subtitle: 'Severe Congestion + Ambulance Deviation -> Automatic Recalculation',
    originName: 'Whitefield Main Road',
    originCoordinates: [77.7500, 12.9698],
    destinationName: 'Manipal Hospital (HAL)',
    destinationCoordinates: [77.6483, 12.9582],
    vehicleId: 'AMB-03',
    emergencyId: 'E-DEMO-003',
    type: 'RESPIRATORY_DISTRESS',
    severity: 'HIGH',
    hasDeviation: true,
    hasAutoReroute: true,
    scenarioTag: 'Ambulance Deviation & Auto Reroute'
  },
  {
    id: 'DEMO-004',
    code: 'DEMO_004',
    title: 'Demo 004: Yelahanka to Bowring Hospital',
    subtitle: 'Normal Traffic -> Stable Journey -> No Reroute Required',
    originName: 'Yelahanka Police Station',
    originCoordinates: [77.5963, 13.1007],
    destinationName: 'Bowring & Lady Curzon Hospital',
    destinationCoordinates: [77.6033, 12.9833],
    vehicleId: 'AMB-04',
    emergencyId: 'E-DEMO-004',
    type: 'STROKE',
    severity: 'HIGH',
    hasNormalTraffic: true,
    requiresReroute: false,
    scenarioTag: 'Normal Traffic Baseline'
  },
  {
    id: 'DEMO-005',
    code: 'DEMO_005',
    title: 'Demo 005: Electronic City to St John\'s Hospital',
    subtitle: 'Accident + Heavy Congestion -> Backup Ambulance Recommendation',
    originName: 'Electronic City Phase 1',
    originCoordinates: [77.6766, 12.8452],
    destinationName: 'St John\'s Medical College Hospital',
    destinationCoordinates: [77.6200, 12.9315],
    vehicleId: 'AMB-05',
    backupVehicleId: 'AMB-06',
    emergencyId: 'E-DEMO-005',
    type: 'MULTI_VEHICLE_COLLISION',
    severity: 'CRITICAL',
    hasBackupAmbulance: true,
    scenarioTag: 'Backup Ambulance Dispatch'
  }
];

class DemoService {
  /**
   * Returns metadata and configurations for all 5 demo scenarios
   */
  getScenarios() {
    return DEMO_SCENARIO_CONFIGS.map(sc => ({
      ...sc,
      available: true
    }));
  }

  /**
   * Ensures standard personnel exist in MongoDB
   */
  async ensurePersonnel() {
    const operatorPassword = await bcrypt.hash('Operator123!', 10);
    let operator = await User.findOne({ email: 'operator@swiftcare.local' });
    if (!operator) {
      operator = await User.create({
        name: 'Central Control Operator',
        email: 'operator@swiftcare.local',
        password: operatorPassword,
        role: 'CONTROL_ROOM'
      });
    }

    const adminPassword = await bcrypt.hash('AdminPassword123!', 10);
    let admin = await User.findOne({ email: 'admin@swiftcare.local' });
    if (!admin) {
      admin = await User.create({
        name: 'Chief Systems Administrator',
        email: 'admin@swiftcare.local',
        password: adminPassword,
        role: 'ADMIN'
      });
    }

    const driverPassword = await bcrypt.hash('Driver123!', 10);
    let driver = await User.findOne({ email: 'driver@swiftcare.local' });
    if (!driver) {
      driver = await User.create({
        name: 'Ambulance Officer Ramesh',
        email: 'driver@swiftcare.local',
        password: driverPassword,
        role: 'DRIVER'
      });
    }

    return { operator, admin, driver };
  }

  /**
   * Resets and seeds the complete demo dataset in MongoDB
   */
  async seedDemoScenarios(options = {}) {
    const { clean = true } = options;

    const { operator, driver } = await this.ensurePersonnel();

    if (clean) {
      await Vehicle.deleteMany({ vehicleId: /^AMB-/ });
      await Emergency.deleteMany({ emergencyId: /^E-DEMO-/ });
      await Incident.deleteMany({ incidentId: /^INC-DEMO-/ });
      await Route.deleteMany({ routeId: /^ROUTE-DEMO-/ });
      await Decision.deleteMany({ emergencyId: /^E-DEMO-/ });
      await Prediction.deleteMany({ emergencyId: /^E-DEMO-/ });
      await Trajectory.deleteMany({ vehicleId: /^AMB-/ });
    }

    // --- 1. Seed Fleet: 8 Ambulances across Bengaluru ---
    const vehicleDefs = [
      {
        vehicleId: 'AMB-01',
        registrationNumber: 'KA-01-EA-1001',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Ramesh Gowda',
        driverContact: '+91 98450 11001',
        hospitalName: 'Manipal Hospital (Old Airport Rd)',
        hospitalCode: 'MAN-01',
        speed: 48,
        heading: 42,
        location: { type: 'Point', coordinates: [77.6271, 12.9352] }
      },
      {
        vehicleId: 'AMB-02',
        registrationNumber: 'KA-04-EA-2002',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Suresh Kumar',
        driverContact: '+91 98450 22002',
        hospitalName: 'Victoria Hospital',
        hospitalCode: 'VIC-01',
        speed: 42,
        heading: 175,
        location: { type: 'Point', coordinates: [77.5925, 13.0358] }
      },
      {
        vehicleId: 'AMB-03',
        registrationNumber: 'KA-03-EA-3003',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Priya Sharma',
        driverContact: '+91 98450 33003',
        hospitalName: 'Manipal Hospital (Whitefield)',
        hospitalCode: 'MAN-02',
        speed: 32,
        heading: 260,
        location: { type: 'Point', coordinates: [77.7500, 12.9698] }
      },
      {
        vehicleId: 'AMB-04',
        registrationNumber: 'KA-50-EA-4004',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 1,
        driverName: 'Anil Reddy',
        driverContact: '+91 98450 44004',
        hospitalName: 'Bowring Hospital',
        hospitalCode: 'BOW-01',
        speed: 55,
        heading: 180,
        location: { type: 'Point', coordinates: [77.5963, 13.1007] }
      },
      {
        vehicleId: 'AMB-05',
        registrationNumber: 'KA-51-EA-5005',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Deepak Hegde',
        driverContact: '+91 98450 55005',
        hospitalName: 'St John\'s Hospital',
        hospitalCode: 'STJ-01',
        speed: 25,
        heading: 320,
        location: { type: 'Point', coordinates: [77.6766, 12.8452] }
      },
      {
        vehicleId: 'AMB-06',
        registrationNumber: 'KA-05-EA-6006',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Kavita Rao',
        driverContact: '+91 98450 66006',
        hospitalName: 'St John\'s Hospital (Standby)',
        hospitalCode: 'STJ-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6250, 12.9300] } // Close to St John's for backup dispatch
      },
      {
        vehicleId: 'AMB-07',
        registrationNumber: 'KA-02-EA-7007',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 1,
        driverName: 'Manjunath B',
        driverContact: '+91 98450 77007',
        hospitalName: 'Apollo Hospital (Bannerghatta)',
        hospitalCode: 'APO-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5980, 12.8920] }
      },
      {
        vehicleId: 'AMB-08',
        registrationNumber: 'KA-41-EA-8008',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Kiran Patel',
        driverContact: '+91 98450 88008',
        hospitalName: 'Fortis Hospital (Cunningham Rd)',
        hospitalCode: 'FOR-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5985, 12.9860] }
      }
    ];

    const seededVehicles = {};
    for (const vDef of vehicleDefs) {
      let v = await Vehicle.findOne({ vehicleId: vDef.vehicleId });
      if (!v) {
        v = await Vehicle.create(vDef);
      } else {
        Object.assign(v, vDef);
        await v.save();
      }
      seededVehicles[vDef.vehicleId] = v;
    }

    // --- 2. Seed 5 Primary Emergencies ---
    const emergencyDefs = [
      {
        emergencyId: 'E-DEMO-001',
        title: 'Critical Cardiac Call — Koramangala 4th Block',
        description: '58-year-old male with acute anterior myocardial infarction. Immediate cath-lab transfer required to Manipal Hospital.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6271, 12.9352] },
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
        assignedVehicle: seededVehicles['AMB-01']._id,
        callerContact: '+91 98451 00111',
        callerName: 'Sunita Murthy',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-002',
        title: 'High-Impact Highway Trauma — Hebbal Flyover',
        description: 'Motorcyclist trauma following collision on elevated ramp. Level 1 trauma resuscitation needed at Victoria Hospital.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5925, 13.0358] },
        destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
        assignedVehicle: seededVehicles['AMB-02']._id,
        callerContact: '+91 98452 00222',
        callerName: 'Traffic Warden Hebbal',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-003',
        title: 'Acute Pediatric Respiratory Distress — Whitefield',
        description: 'Severe bronchospasm and hypoxia in pediatric patient requiring advanced pediatric ICU at Manipal.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.7500, 12.9698] },
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
        assignedVehicle: seededVehicles['AMB-03']._id,
        callerContact: '+91 98453 00333',
        callerName: 'Deepa Nair',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-004',
        title: 'Acute Ischemic Stroke — Yelahanka',
        description: 'Sudden onset hemiplegia and aphasia within thrombolytic window. Fast-track stroke unit transfer to Bowring.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5963, 13.1007] },
        destination: { type: 'Point', coordinates: [77.6033, 12.9833] },
        assignedVehicle: seededVehicles['AMB-04']._id,
        callerContact: '+91 98454 00444',
        callerName: 'Kishore Kumar',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-005',
        title: 'Multi-Vehicle Collision — Hosur Rd Expressway',
        description: 'Multi-car pileup near Electronic City toll. Multiple trapped casualties with critical crush injuries.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6766, 12.8452] },
        destination: { type: 'Point', coordinates: [77.6200, 12.9315] },
        assignedVehicle: seededVehicles['AMB-05']._id,
        callerContact: '+91 98455 00555',
        callerName: 'Highway Patrol Officer',
        createdBy: operator._id
      }
    ];

    const seededEmergencies = {};
    for (const eDef of emergencyDefs) {
      let e = await Emergency.findOne({ emergencyId: eDef.emergencyId });
      if (!e) {
        e = await Emergency.create(eDef);
      } else {
        Object.assign(e, eDef);
        await e.save();
      }
      seededEmergencies[eDef.emergencyId] = e;
    }

    // --- 3. Seed Realistic Bengaluru Incidents ---
    const incidentDefs = [
      // Incident for DEMO 001: Accident on Intermediate Ring Road near Domlur
      {
        incidentId: 'INC-DEMO-001',
        type: 'ACCIDENT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Overturned commercial truck blocking 2 out of 3 lanes on Intermediate Ring Road near Domlur Flyover.',
        location: { type: 'Point', coordinates: [77.6395, 12.9510] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-001']._id,
        reportedBy: operator._id
      },
      // Incident for DEMO 002: Road Closure near Mekhri Circle
      {
        incidentId: 'INC-DEMO-002',
        type: 'ROAD_CLOSURE',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Emergency pipeline excavation and water main burst on Palace Road near Mekhri Circle.',
        location: { type: 'Point', coordinates: [77.5850, 13.0020] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-002']._id,
        reportedBy: operator._id
      },
      // Incident for DEMO 003: Severe Congestion on Marathahalli Bridge
      {
        incidentId: 'INC-DEMO-003',
        type: 'TRAFFIC_JAM',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Severe 2.4 km gridlock and broken-down BMTC bus at Marathahalli junction underpass.',
        location: { type: 'Point', coordinates: [77.6850, 12.9560] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-003']._id,
        reportedBy: operator._id
      },
      // Incident for DEMO 005: Heavy Jam on Silk Board Junction
      {
        incidentId: 'INC-DEMO-005',
        type: 'ACCIDENT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Multi-axle container accident at Central Silk Board junction causing standstill traffic toward Madiwala.',
        location: { type: 'Point', coordinates: [77.6320, 12.9180] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-005']._id,
        reportedBy: operator._id
      }
    ];

    for (const incDef of incidentDefs) {
      let inc = await Incident.findOne({ incidentId: incDef.incidentId });
      if (!inc) {
        await Incident.create(incDef);
      } else {
        Object.assign(inc, incDef);
        await inc.save();
      }
    }

    // --- 4. Seed Canonical Routes with Turn-by-Turn Maneuvers ---

    // DEMO-001: Original Congested Route (Via Intermediate Ring Rd with accident)
    const route001Original = {
      routeId: 'ROUTE-DEMO-001-ORIGINAL',
      emergency: seededEmergencies['E-DEMO-001']._id,
      vehicle: seededVehicles['AMB-01']._id,
      origin: { type: 'Point', coordinates: [77.6271, 12.9352] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6271, 12.9352],
          [77.6320, 12.9410],
          [77.6385, 12.9490],
          [77.6395, 12.9510], // Accident bottleneck
          [77.6440, 12.9565],
          [77.6483, 12.9582]
        ]
      },
      distance: 5100,
      duration: 1080, // 18 min due to accident traffic
      provider: 'MOCK',
      routeType: 'PLANNED',
      preference: 'FASTEST',
      status: 'CANCELLED',
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head north on 80 Feet Road toward Sony World Signal',
          distance: 750,
          duration: 110,
          startLocation: [77.6271, 12.9352],
          endLocation: [77.6320, 12.9410]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Intermediate Ring Road (ACCIDENT AHEAD)',
          distance: 1800,
          duration: 650, // Heavy delay
          startLocation: [77.6320, 12.9410],
          endLocation: [77.6395, 12.9510]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Manipal Hospital',
          distance: 2550,
          duration: 320,
          startLocation: [77.6395, 12.9510],
          endLocation: [77.6483, 12.9582]
        }
      ],
      createdBy: operator._id
    };

    // DEMO-001: Active Faster Bypass Route (Via 100ft Road Indiranagar & HAL) -> Saves 6 min (18m -> 12m)
    const route001Active = {
      routeId: 'ROUTE-DEMO-001-ACTIVE',
      emergency: seededEmergencies['E-DEMO-001']._id,
      vehicle: seededVehicles['AMB-01']._id,
      origin: { type: 'Point', coordinates: [77.6271, 12.9352] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6271, 12.9352],
          [77.6340, 12.9450],
          [77.6390, 12.9540],
          [77.6435, 12.9570],
          [77.6483, 12.9582]
        ]
      },
      distance: 4750,
      duration: 720, // 12 min -> 6 MINUTES SAVED!
      provider: 'MOCK',
      routeType: 'ALTERNATIVE',
      preference: 'FASTEST',
      status: 'ACTIVE',
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head north onto 100 Feet Road toward Indiranagar bypass',
          distance: 1200,
          duration: 180,
          startLocation: [77.6271, 12.9352],
          endLocation: [77.6340, 12.9450]
        },
        {
          maneuver: 'KEEP_RIGHT',
          instruction: 'Keep right on Indiranagar 12th Main bypass',
          distance: 1450,
          duration: 220,
          startLocation: [77.6340, 12.9450],
          endLocation: [77.6390, 12.9540]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Old Airport Road clear corridor',
          distance: 1400,
          duration: 220,
          startLocation: [77.6390, 12.9540],
          endLocation: [77.6435, 12.9570]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Manipal Hospital Emergency Gate',
          distance: 700,
          duration: 100,
          startLocation: [77.6435, 12.9570],
          endLocation: [77.6483, 12.9582]
        }
      ],
      createdBy: operator._id
    };

    // Save Routes
    let r1Old = await Route.findOne({ routeId: route001Original.routeId });
    if (!r1Old) {
      r1Old = await Route.create(route001Original);
    } else {
      Object.assign(r1Old, route001Original);
      await r1Old.save();
    }

    let r1New = await Route.findOne({ routeId: route001Active.routeId });
    if (!r1New) {
      r1New = await Route.create(route001Active);
    } else {
      Object.assign(r1New, route001Active);
      await r1New.save();
    }

    // Route for DEMO-002 (Hebbal -> Victoria Hospital)
    const route002 = {
      routeId: 'ROUTE-DEMO-002-ACTIVE',
      emergency: seededEmergencies['E-DEMO-002']._id,
      emergencyId: 'E-DEMO-002',
      vehicle: seededVehicles['AMB-02']._id,
      vehicleId: 'AMB-02',
      origin: { type: 'Point', coordinates: [77.5925, 13.0358] },
      destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
      routeType: 'RECOMMENDED',
      preference: 'FASTEST',
      status: 'ACTIVE',
      distance: 9800,
      duration: 1080,
      trafficDelay: 120,
      path: {
        type: 'LineString',
        coordinates: [
          [77.5925, 13.0358],
          [77.5890, 13.0180],
          [77.5850, 12.9980],
          [77.5810, 12.9820],
          [77.5739, 12.9634]
        ]
      },
      steps: [
        { maneuver: 'DEPART', instruction: 'Head south from Hebbal Flyover service lane', distance: 1500, duration: 150 },
        { maneuver: 'CONTINUE', instruction: 'Continue on Bellary Road toward Palace Grounds', distance: 3500, duration: 320 },
        { maneuver: 'TURN_RIGHT', instruction: 'Turn right onto Palace Road to bypass racecourse detour', distance: 2200, duration: 240 },
        { maneuver: 'CONTINUE', instruction: 'Proceed south on Nrupathunga Road toward KR Market', distance: 1800, duration: 250 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at Victoria Hospital Trauma Entry', distance: 800, duration: 120 }
      ],
      createdBy: operator._id
    };
    await Route.findOneAndUpdate({ routeId: route002.routeId }, route002, { upsert: true, new: true });

    // Route for DEMO-003 (Whitefield -> Manipal Hospital)
    const route003 = {
      routeId: 'ROUTE-DEMO-003-ACTIVE',
      emergency: seededEmergencies['E-DEMO-003']._id,
      emergencyId: 'E-DEMO-003',
      vehicle: seededVehicles['AMB-03']._id,
      vehicleId: 'AMB-03',
      origin: { type: 'Point', coordinates: [77.7500, 12.9698] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      routeType: 'RECOMMENDED',
      preference: 'FASTEST',
      status: 'ACTIVE',
      distance: 14200,
      duration: 1560,
      trafficDelay: 360,
      path: {
        type: 'LineString',
        coordinates: [
          [77.7500, 12.9698],
          [77.7280, 12.9660],
          [77.6980, 12.9610],
          [77.6650, 12.9590],
          [77.6483, 12.9582]
        ]
      },
      steps: [
        { maneuver: 'DEPART', instruction: 'Depart ITPL Main Road heading west toward Marathahalli', distance: 3000, duration: 360 },
        { maneuver: 'CONTINUE', instruction: 'Cross Marathahalli Bridge with V2X preemption', distance: 4200, duration: 440 },
        { maneuver: 'CONTINUE', instruction: 'Follow HAL Old Airport Road express corridor', distance: 5200, duration: 580 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at Manipal Hospital Old Airport Rd', distance: 1800, duration: 180 }
      ],
      createdBy: operator._id
    };
    await Route.findOneAndUpdate({ routeId: route003.routeId }, route003, { upsert: true, new: true });

    // Route for DEMO-004 (Yelahanka -> Bowring Hospital)
    const route004 = {
      routeId: 'ROUTE-DEMO-004-ACTIVE',
      emergency: seededEmergencies['E-DEMO-004']._id,
      emergencyId: 'E-DEMO-004',
      vehicle: seededVehicles['AMB-04']._id,
      vehicleId: 'AMB-04',
      origin: { type: 'Point', coordinates: [77.5963, 13.1007] },
      destination: { type: 'Point', coordinates: [77.6033, 12.9833] },
      routeType: 'ORIGINAL',
      preference: 'FASTEST',
      status: 'ACTIVE',
      distance: 15400,
      duration: 1320,
      trafficDelay: 0,
      path: {
        type: 'LineString',
        coordinates: [
          [77.5963, 13.1007],
          [77.5940, 13.0600],
          [77.5925, 13.0358],
          [77.5980, 13.0050],
          [77.6033, 12.9833]
        ]
      },
      steps: [
        { maneuver: 'DEPART', instruction: 'Depart Yelahanka NH 44 corridor south', distance: 4800, duration: 380 },
        { maneuver: 'CONTINUE', instruction: 'Pass Kodigehalli and Hebbal elevated flyover', distance: 5400, duration: 450 },
        { maneuver: 'CONTINUE', instruction: 'Take Cunningham Road exit toward Shivajinagar', distance: 3600, duration: 340 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at Bowring & Lady Curzon Hospital', distance: 1600, duration: 150 }
      ],
      createdBy: operator._id
    };
    await Route.findOneAndUpdate({ routeId: route004.routeId }, route004, { upsert: true, new: true });

    // Route for DEMO-005 (Electronic City -> St. John's Hospital)
    const route005 = {
      routeId: 'ROUTE-DEMO-005-ACTIVE',
      emergency: seededEmergencies['E-DEMO-005']._id,
      emergencyId: 'E-DEMO-005',
      vehicle: seededVehicles['AMB-05']._id,
      vehicleId: 'AMB-05',
      origin: { type: 'Point', coordinates: [77.6766, 12.8452] },
      destination: { type: 'Point', coordinates: [77.6200, 12.9315] },
      routeType: 'RECOMMENDED',
      preference: 'FASTEST',
      status: 'ACTIVE',
      distance: 12600,
      duration: 1140,
      trafficDelay: 180,
      path: {
        type: 'LineString',
        coordinates: [
          [77.6766, 12.8452],
          [77.6580, 12.8800],
          [77.6400, 12.9050],
          [77.6250, 12.9220],
          [77.6200, 12.9315]
        ]
      },
      steps: [
        { maneuver: 'DEPART', instruction: 'Take Electronic City Elevated Tollway north', distance: 5500, duration: 420 },
        { maneuver: 'CONTINUE', instruction: 'Descend onto Hosur Road toward Silk Board', distance: 3800, duration: 380 },
        { maneuver: 'KEEP_RIGHT', instruction: 'Bypass Silk Board surface interchange via underpass', distance: 2100, duration: 220 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at St. John’s Medical College Hospital', distance: 1200, duration: 120 }
      ],
      createdBy: operator._id
    };
    await Route.findOneAndUpdate({ routeId: route005.routeId }, route005, { upsert: true, new: true });

    // --- 5. Seed Trajectory Points for Live Vehicle AMB-01 ---
    const trajectoryPoints = [
      {
        vehicle: seededVehicles['AMB-01']._id,
        vehicleId: 'AMB-01',
        location: { type: 'Point', coordinates: [77.6271, 12.9352] },
        speed: 38,
        heading: 35,
        source: 'DEVICE',
        timestamp: new Date(Date.now() - 120000)
      },
      {
        vehicle: seededVehicles['AMB-01']._id,
        vehicleId: 'AMB-01',
        location: { type: 'Point', coordinates: [77.6300, 12.9390] },
        speed: 46,
        heading: 38,
        source: 'DEVICE',
        timestamp: new Date(Date.now() - 60000)
      },
      {
        vehicle: seededVehicles['AMB-01']._id,
        vehicleId: 'AMB-01',
        location: { type: 'Point', coordinates: [77.6340, 12.9450] },
        speed: 52,
        heading: 42,
        source: 'DEVICE',
        timestamp: new Date()
      }
    ];

    for (const pt of trajectoryPoints) {
      await Trajectory.create(pt);
    }

    // --- 6. Seed Operational Decisions for DEMO 001 ---
    const decision001 = {
      decisionId: 'DEC-DEMO-001-REROUTE',
      emergency: seededEmergencies['E-DEMO-001']._id,
      emergencyId: 'E-DEMO-001',
      vehicle: seededVehicles['AMB-01']._id,
      vehicleId: 'AMB-01',
      route: r1New._id,
      situationHash: 'sha256-demo001-accident-domlur',
      severity: 'CRITICAL',
      primaryAction: 'REROUTE',
      actions: ['REROUTE'],
      status: 'APPROVED',
      statusHistory: [
        { status: 'PENDING_OPERATOR_ACTION', changedAt: new Date(Date.now() - 180000), reason: 'Accident detected ahead on planned corridor' },
        { status: 'APPROVED', changedAt: new Date(Date.now() - 120000), changedBy: operator._id, reason: 'Approved bypass via 100ft road saving ~6 minutes' }
      ],
      reconciliation: {
        deterministicAction: 'REROUTE',
        geoAgentAction: 'REROUTE',
        agreed: true
      },
      epistemicSummary: {
        observedCount: 4,
        inferredCount: 2,
        derivedCount: 3,
        unknownCount: 0
      },
      timeSavedMinutes: 6,
      reasoning: 'Commercial vehicle rollover on Intermediate Ring Road created a 1.2km gridlock with +8 min delay. Indiranagar 100ft bypass yields a net 6-minute ETA advantage.',
      evaluatedAt: new Date()
    };

    let d1 = await Decision.findOne({ decisionId: decision001.decisionId });
    if (!d1) await Decision.create(decision001);
    else { Object.assign(d1, decision001); await d1.save(); }

    // --- 7. Seed Prediction Records ---
    const pred001 = {
      predictionId: 'PRED-DEMO-001',
      emergency: seededEmergencies['E-DEMO-001']._id,
      emergencyId: 'E-DEMO-001',
      vehicle: seededVehicles['AMB-01']._id,
      vehicleId: 'AMB-01',
      route: r1New._id,
      predictedEta: new Date(Date.now() + 720000),
      baselineEta: new Date(Date.now() + 1080000),
      predictedDurationSeconds: 720,
      baselineDurationSeconds: 1080,
      predictedDelaySeconds: 120,
      predictedDurationMinutes: 12,
      predictedDelayMinutes: 2,
      delayRisk: 'LOW',
      routeRisk: 'LOW',
      confidence: 'HIGH',
      confidenceScore: 0.94,
      rerouteAdvised: true,
      rerouteUrgency: 'HIGH',
      modelVersion: 'v1.3-exponential-traffic-blend',
      evaluatedAt: new Date()
    };

    let p1 = await Prediction.findOne({ predictionId: pred001.predictionId });
    if (!p1) await Prediction.create(pred001);
    else { Object.assign(p1, pred001); await p1.save(); }

    // Emit Real-time Refresh Broadcast
    try {
      realtimeService.emitVehicleLocationUpdated(seededVehicles['AMB-01'].toObject());
      realtimeService.emitRouteUpdated('E-DEMO-001', 'AMB-01', {
        routeId: route001Active.routeId,
        emergencyId: 'E-DEMO-001',
        vehicleId: 'AMB-01',
        timeSavedMinutes: 6,
        status: 'ACTIVE'
      });
    } catch (e) {
      // Non-blocking socket emission
    }

    return {
      success: true,
      message: 'Demo dataset seeded successfully',
      stats: {
        vehiclesCount: Object.keys(seededVehicles).length,
        emergenciesCount: Object.keys(seededEmergencies).length,
        incidentsCount: incidentDefs.length,
        routesCount: 6,
        trajectoriesCount: trajectoryPoints.length
      }
    };
  }

  /**
   * Controlled reset of demo data back to clean state
   */
  async resetDemoData() {
    await Vehicle.deleteMany({ vehicleId: /^AMB-/ });
    await Emergency.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Incident.deleteMany({ incidentId: /^INC-DEMO-/ });
    await Route.deleteMany({ routeId: /^ROUTE-DEMO-/ });
    await Decision.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Prediction.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Trajectory.deleteMany({ vehicleId: /^AMB-/ });

    return {
      success: true,
      message: 'Demo dataset reset cleanly'
    };
  }
}

export default new DemoService();
