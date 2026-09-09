/**
 * SwiftCare GeoAgent — Canonical Demonstration Scenarios Service (Comprehensive 25+ Dataset)
 *
 * Implements realistic multi-leg emergency journeys across Bengaluru
 * using real Mongoose models, genuine persistence in MongoDB, and Socket.IO broadcast.
 *
 * Multi-Leg Structure:
 *   Leg 1: Current Location -> Emergency Location (BLUE)
 *   Leg 2: Emergency Location -> Hospital Destination (GREEN)
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
import ClearanceSession from '../clearance/clearance.model.js';
import realtimeService from '../realtime/realtime.service.js';
import { CANONICAL_ROAD_CORRIDORS } from '../routes/canonicalRoadCorridors.js';

export const DEMO_SCENARIO_CONFIGS = [
  {
    id: 'DEMO-001',
    code: 'DEMO_001',
    title: 'Demo 001: Koramangala to Manipal Hospital',
    subtitle: 'Heavy Traffic + Accident Ahead -> Indiranagar Reroute (Save 6 min)',
    originName: 'Koramangala 80ft Road Depot',
    originCoordinates: [77.6271, 12.9352],
    emergencyName: 'Koramangala 4th Block Apartment',
    emergencyCoordinates: [77.6320, 12.9410],
    destinationName: 'Manipal Hospital (HAL Old Airport Rd)',
    destinationCoordinates: [77.6483, 12.9582],
    vehicleId: 'AMB-01',
    emergencyId: 'E-DEMO-001',
    type: 'MEDICAL',
    priority: 'CRITICAL',
    hasAccident: true,
    hasReroute: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Accident Ahead & Dynamic Reroute'
  },
  {
    id: 'DEMO-002',
    code: 'DEMO_002',
    title: 'Demo 002: Hebbal to Victoria Hospital',
    subtitle: 'Moderate Traffic + Road Closure -> Alternative Palace Rd Bypass',
    originName: 'Hebbal Flyover Service Lane',
    originCoordinates: [77.5925, 13.0358],
    emergencyName: 'RT Nagar Main Post Office',
    emergencyCoordinates: [77.5890, 13.0180],
    destinationName: 'Victoria Hospital (City Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-02',
    emergencyId: 'E-DEMO-002',
    type: 'ACCIDENT',
    priority: 'CRITICAL',
    hasRoadClosure: true,
    hasAlternative: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 4,
    scenarioTag: 'Road Closure & Bypass Candidate'
  },
  {
    id: 'DEMO-003',
    code: 'DEMO_003',
    title: 'Demo 003: Whitefield to Sakra World Hospital',
    subtitle: 'Severe Congestion + Ambulance Deviation -> Automatic Recalculation',
    originName: 'Whitefield ITPL Main Gate',
    originCoordinates: [77.7500, 12.9698],
    emergencyName: 'Kundalahalli Gate Tech Park',
    emergencyCoordinates: [77.7120, 12.9650],
    destinationName: 'Sakra World Hospital (Bellandur)',
    destinationCoordinates: [77.6890, 12.9288],
    vehicleId: 'AMB-03',
    emergencyId: 'E-DEMO-003',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasDeviation: true,
    hasAutoReroute: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 7,
    scenarioTag: 'Ambulance Deviation & Auto Reroute'
  },
  {
    id: 'DEMO-004',
    code: 'DEMO_004',
    title: 'Demo 004: Yelahanka to Bowring Hospital',
    subtitle: 'Normal Traffic -> Stable Corridor -> No Reroute Required',
    originName: 'Yelahanka Police Station',
    originCoordinates: [77.5963, 13.1007],
    emergencyName: 'Sahakar Nagar Residential Block',
    emergencyCoordinates: [77.5900, 13.0600],
    destinationName: 'Bowring & Lady Curzon Hospital',
    destinationCoordinates: [77.6033, 12.9833],
    vehicleId: 'AMB-04',
    emergencyId: 'E-DEMO-004',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasNormalTraffic: true,
    requiresReroute: false,
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Normal Traffic Baseline'
  },
  {
    id: 'DEMO-005',
    code: 'DEMO_005',
    title: 'Demo 005: Electronic City to St John\'s Hospital',
    subtitle: 'Accident + Heavy Congestion -> Backup Ambulance Recommendation',
    originName: 'Electronic City Phase 1 Toll',
    originCoordinates: [77.6766, 12.8452],
    emergencyName: 'Bommanahalli Junction Underpass',
    emergencyCoordinates: [77.6400, 12.9050],
    destinationName: 'St John\'s Medical College Hospital',
    destinationCoordinates: [77.6200, 12.9315],
    vehicleId: 'AMB-05',
    backupVehicleId: 'AMB-06',
    emergencyId: 'E-DEMO-005',
    type: 'ACCIDENT',
    priority: 'CRITICAL',
    hasBackupAmbulance: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 8,
    scenarioTag: 'Backup Ambulance Dispatch'
  },
  {
    id: 'DEMO-006',
    code: 'DEMO_006',
    title: 'Demo 006: Indiranagar to Manipal Hospital',
    subtitle: 'Pediatric Seizure -> Old Madras Rd Bypass -> Save 5 min',
    originName: '100ft Road Indiranagar',
    originCoordinates: [77.6412, 12.9784],
    emergencyName: 'CMH Road Metro Station',
    emergencyCoordinates: [77.6440, 12.9780],
    destinationName: 'Manipal Hospital (HAL Old Airport Rd)',
    destinationCoordinates: [77.6483, 12.9582],
    vehicleId: 'AMB-07',
    emergencyId: 'E-DEMO-006',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasReroute: true,
    expectedTimeSavedMinutes: 5,
    scenarioTag: 'Pediatric Emergency & Priority Corridor'
  },
  {
    id: 'DEMO-007',
    code: 'DEMO_007',
    title: 'Demo 007: HSR Layout to St John\'s Hospital',
    subtitle: 'Severe Asthma -> Silk Board Waterlogging -> Deviation Detected',
    originName: 'HSR Layout Sector 1 BDA',
    originCoordinates: [77.6389, 12.9116],
    emergencyName: 'HSR 27th Main Commercial St',
    emergencyCoordinates: [77.6450, 12.9100],
    destinationName: 'St John\'s Medical College Hospital',
    destinationCoordinates: [77.6200, 12.9315],
    vehicleId: 'AMB-09',
    emergencyId: 'E-DEMO-007',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasDeviation: true,
    hasReroute: true,
    expectedTimeSavedMinutes: 4,
    scenarioTag: 'Waterlogging & Route Recalculation'
  },
  {
    id: 'DEMO-008',
    code: 'DEMO_008',
    title: 'Demo 008: Marathahalli to Sakra World Hospital',
    subtitle: 'Industrial Burn Trauma -> Flyover Truck Breakdown -> Outer Ring Rd Bypass',
    originName: 'Marathahalli Bridge',
    originCoordinates: [77.7011, 12.9592],
    emergencyName: 'Spice Garden Compound',
    emergencyCoordinates: [77.7050, 12.9550],
    destinationName: 'Sakra World Hospital (Bellandur)',
    destinationCoordinates: [77.6890, 12.9288],
    vehicleId: 'AMB-10',
    emergencyId: 'E-DEMO-008',
    type: 'ACCIDENT',
    priority: 'CRITICAL',
    hasReroute: true,
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Burn Trauma & Flyover Bypass'
  },
  {
    id: 'DEMO-009',
    code: 'DEMO_009',
    title: 'Demo 009: Jayanagar to Victoria Hospital',
    subtitle: 'Diabetic Coma -> Stable Arterial Flow -> No Reroute',
    originName: 'Jayanagar 4th Block Complex',
    originCoordinates: [77.5833, 12.9298],
    emergencyName: 'South End Circle Metro',
    emergencyCoordinates: [77.5800, 12.9350],
    destinationName: 'Victoria Hospital (City Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-11',
    emergencyId: 'E-DEMO-009',
    type: 'MEDICAL',
    priority: 'MEDIUM',
    hasNormalTraffic: true,
    requiresReroute: false,
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Stable South Bengaluru Corridor'
  },
  {
    id: 'DEMO-010',
    code: 'DEMO_010',
    title: 'Demo 010: JP Nagar to Fortis Hospital',
    subtitle: 'Fall with Head Trauma -> Sarakki Lake Lane Blockage -> Save 4 min',
    originName: 'JP Nagar 6th Phase Circle',
    originCoordinates: [77.5855, 12.9063],
    emergencyName: 'Sarakki Lake Ring Road',
    emergencyCoordinates: [77.5880, 12.9020],
    destinationName: 'Fortis Hospital (Bannerghatta Rd)',
    destinationCoordinates: [77.5980, 12.8920],
    vehicleId: 'AMB-12',
    emergencyId: 'E-DEMO-010',
    type: 'ACCIDENT',
    priority: 'HIGH',
    hasReroute: true,
    expectedTimeSavedMinutes: 4,
    scenarioTag: 'Head Trauma & Local Arterial Bypass'
  },
  {
    id: 'DEMO-011',
    code: 'DEMO_011',
    title: 'Demo 011: Rajajinagar to Bangalore Baptist Hospital',
    subtitle: 'Cardiac Arrhythmia -> Clean Flyover Transit -> No Reroute',
    originName: 'Rajajinagar 1st Block Metro',
    originCoordinates: [77.5550, 12.9980],
    emergencyName: 'Navrang Theatre Circle',
    emergencyCoordinates: [77.5580, 12.9960],
    destinationName: 'Bangalore Baptist Hospital (Hebbal)',
    destinationCoordinates: [77.5855, 13.0310],
    vehicleId: 'AMB-13',
    emergencyId: 'E-DEMO-011',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasNormalTraffic: true,
    requiresReroute: false,
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Smooth North-West Corridor'
  },
  {
    id: 'DEMO-012',
    code: 'DEMO_012',
    title: 'Demo 012: Malleshwaram to Ramaiah Memorial Hospital',
    subtitle: 'Obstetric Hemorrhage -> Market Blockade -> Backup Ambulance Recommended',
    originName: 'Malleshwaram 8th Cross',
    originCoordinates: [77.5710, 12.9980],
    emergencyName: 'Margosa Road Clinic',
    emergencyCoordinates: [77.5700, 13.0030],
    destinationName: 'Ramaiah Memorial Hospital (MSR Nagar)',
    destinationCoordinates: [77.5684, 13.0305],
    vehicleId: 'AMB-08',
    backupVehicleId: 'AMB-13',
    emergencyId: 'E-DEMO-012',
    type: 'MEDICAL',
    priority: 'CRITICAL',
    hasBackupAmbulance: true,
    expectedTimeSavedMinutes: 9,
    scenarioTag: 'Obstetric Emergency & Standby Re-allocation'
  },
  {
    id: 'DEMO-013',
    code: 'DEMO_013',
    title: 'Demo 013: Banashankari to Sagar Hospitals',
    subtitle: 'Aortic Dissection -> 100ft Ring Rd Bypass -> Save 5 min',
    originName: 'Banashankari BDA Complex',
    originCoordinates: [77.5560, 12.9250],
    emergencyName: 'Banashankari 2nd Stage Junction',
    emergencyCoordinates: [77.5600, 12.9300],
    destinationName: 'Sagar Hospitals (Banashankari)',
    destinationCoordinates: [77.5560, 12.9250],
    vehicleId: 'AMB-17',
    emergencyId: 'E-DEMO-013',
    type: 'MEDICAL',
    priority: 'CRITICAL',
    hasReroute: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 5,
    scenarioTag: 'Aortic Dissection & Emergency Clearance'
  },
  {
    id: 'DEMO-014',
    code: 'DEMO_014',
    title: 'Demo 014: BTM Layout to Jayadeva Cardiology',
    subtitle: 'Gym Cardiac Arrest -> Central Silk Board Bypass -> Save 7 min',
    originName: 'BTM 2nd Stage Udupi Garden',
    originCoordinates: [77.6100, 12.9150],
    emergencyName: 'BTM 16th Main Fitness Center',
    emergencyCoordinates: [77.6120, 12.9180],
    destinationName: 'Jayadeva Institute of Cardiovascular Sciences',
    destinationCoordinates: [77.5980, 12.9180],
    vehicleId: 'AMB-18',
    emergencyId: 'E-DEMO-014',
    type: 'MEDICAL',
    priority: 'CRITICAL',
    hasReroute: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 7,
    scenarioTag: 'Cardiac Arrest & Silk Board Bypass'
  },
  {
    id: 'DEMO-015',
    code: 'DEMO_015',
    title: 'Demo 015: Vijayanagar to Victoria Hospital',
    subtitle: 'Pedestrian Crowd Collision -> Mysore Rd Flyover Green Wave',
    originName: 'Vijayanagar Club',
    originCoordinates: [77.5380, 12.9710],
    emergencyName: 'Vijayanagar Tollgate',
    emergencyCoordinates: [77.5350, 12.9730],
    destinationName: 'Victoria Hospital (City Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-19',
    emergencyId: 'E-DEMO-015',
    type: 'ACCIDENT',
    priority: 'CRITICAL',
    hasClearance: true,
    hasReroute: true,
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Mass Casualty & Flyover Transit'
  },
  {
    id: 'DEMO-016',
    code: 'DEMO_016',
    title: 'Demo 016: Kalyan Nagar to Specialist Hospital',
    subtitle: 'Severe Pancreatitis -> Ring Road Flow -> Optimal Corridor',
    originName: 'Kalyan Nagar HRBR Layout',
    originCoordinates: [77.6480, 13.0180],
    emergencyName: 'Kammanahalli Main Road Clinic',
    emergencyCoordinates: [77.6420, 13.0120],
    destinationName: 'Specialist Hospital Kalyan Nagar',
    destinationCoordinates: [77.6480, 13.0180],
    vehicleId: 'AMB-20',
    emergencyId: 'E-DEMO-016',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasNormalTraffic: true,
    requiresReroute: false,
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Optimal North-East Corridor'
  },
  {
    id: 'DEMO-017',
    code: 'DEMO_017',
    title: 'Demo 017: Kengeri to BGS Gleneagles Global Hospital',
    subtitle: 'Metro Construction Collapse -> Mysore Rd Expressway Bypass',
    originName: 'Kengeri Satellite Town',
    originCoordinates: [77.4850, 12.9150],
    emergencyName: 'Kengeri Metro Pier Site',
    emergencyCoordinates: [77.4900, 12.9100],
    destinationName: 'BGS Gleneagles Global Hospital',
    destinationCoordinates: [77.4950, 12.8950],
    vehicleId: 'AMB-21',
    emergencyId: 'E-DEMO-017',
    type: 'ACCIDENT',
    priority: 'CRITICAL',
    hasReroute: true,
    hasClearance: true,
    expectedTimeSavedMinutes: 8,
    scenarioTag: 'Industrial Collapse & Trauma Priority'
  },
  {
    id: 'DEMO-018',
    code: 'DEMO_018',
    title: 'Demo 018: Sarjapur Road to Columbia Asia Hospital',
    subtitle: 'Severe Asthma in Pregnancy -> Wipro Gate Congestion Bypass',
    originName: 'Sarjapur Wipro Gate',
    originCoordinates: [77.6820, 12.9080],
    emergencyName: 'Kaikondrahalli Lake Enclave',
    emergencyCoordinates: [77.6850, 12.9120],
    destinationName: 'Columbia Asia Hospital Sarjapur',
    destinationCoordinates: [77.6750, 12.9200],
    vehicleId: 'AMB-24',
    emergencyId: 'E-DEMO-018',
    type: 'MEDICAL',
    priority: 'HIGH',
    hasDeviation: true,
    hasReroute: true,
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Pregnancy Emergency & Smart Recalculation'
  }
];

class DemoService {
  /**
   * Returns metadata and configurations for all demo scenarios
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
   * Complete reset of demo records
   */
  async resetDemoData() {
    await Vehicle.deleteMany({ vehicleId: /^AMB-/ });
    await Emergency.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Incident.deleteMany({ incidentId: /^INC-DEMO-/ });
    await Route.deleteMany({ routeId: /^ROUTE-DEMO-/ });
    await Decision.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Prediction.deleteMany({ emergencyId: /^E-DEMO-/ });
    await Trajectory.deleteMany({ vehicleId: /^AMB-/ });
    await ClearanceSession.deleteMany({ clearanceId: /^CLR-DEMO-/ });
    return { success: true, message: 'All demo scenario records cleanly removed from MongoDB.' };
  }

  /**
   * Resets and seeds the complete 25+ demo dataset in MongoDB
   */
  async seedDemoScenarios(options = {}) {
    const { clean = true } = options;
    const { operator, driver } = await this.ensurePersonnel();

    if (clean) {
      await this.resetDemoData();
    }

    // =========================================================================
    // 1. FLEET: 16 AMBULANCES (Part 40 requirement: 15+ Ambulances)
    // =========================================================================
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
        speed: 46,
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
        hospitalName: 'Sakra World Hospital',
        hospitalCode: 'SAK-01',
        speed: 34,
        heading: 250,
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
        hospitalName: 'St John\'s Hospital (Standby Bay)',
        hospitalCode: 'STJ-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6250, 12.9300] }
      },
      {
        vehicleId: 'AMB-07',
        registrationNumber: 'KA-02-EA-7007',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 1,
        driverName: 'Manjunath B',
        driverContact: '+91 98450 77007',
        hospitalName: 'Manipal Hospital',
        hospitalCode: 'MAN-01',
        speed: 38,
        heading: 120,
        location: { type: 'Point', coordinates: [77.6412, 12.9784] }
      },
      {
        vehicleId: 'AMB-08',
        registrationNumber: 'KA-41-EA-8008',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Kiran Patel',
        driverContact: '+91 98450 88008',
        hospitalName: 'Ramaiah Memorial Hospital (Standby)',
        hospitalCode: 'RMH-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5684, 13.0305] }
      },
      {
        vehicleId: 'AMB-09',
        registrationNumber: 'KA-01-EA-9009',
        type: 'AMBULANCE',
        status: 'AT_SCENE',
        capacity: 2,
        driverName: 'Shweta Singh',
        driverContact: '+91 98450 99009',
        hospitalName: 'St John\'s Hospital',
        hospitalCode: 'STJ-01',
        speed: 0,
        heading: 90,
        location: { type: 'Point', coordinates: [77.6389, 12.9116] }
      },
      {
        vehicleId: 'AMB-10',
        registrationNumber: 'KA-03-EA-1010',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Imran Khan',
        driverContact: '+91 98450 10100',
        hospitalName: 'Sakra World Hospital',
        hospitalCode: 'SAK-01',
        speed: 48,
        heading: 210,
        location: { type: 'Point', coordinates: [77.7011, 12.9592] }
      },
      {
        vehicleId: 'AMB-11',
        registrationNumber: 'KA-05-EA-1111',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 1,
        driverName: 'Rajeshwari N',
        driverContact: '+91 98450 11110',
        hospitalName: 'Victoria Hospital',
        hospitalCode: 'VIC-01',
        speed: 38,
        heading: 350,
        location: { type: 'Point', coordinates: [77.5833, 12.9298] }
      },
      {
        vehicleId: 'AMB-12',
        registrationNumber: 'KA-05-EA-1212',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 2,
        driverName: 'Arun Kumar',
        driverContact: '+91 98450 12120',
        hospitalName: 'Fortis Hospital (Bannerghatta)',
        hospitalCode: 'APO-01',
        speed: 40,
        heading: 190,
        location: { type: 'Point', coordinates: [77.5855, 12.9063] }
      },
      {
        vehicleId: 'AMB-13',
        registrationNumber: 'KA-02-EA-1313',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Preeti Deshmukh',
        driverContact: '+91 98450 13130',
        hospitalName: 'Bangalore Baptist Hospital',
        hospitalCode: 'BBH-01',
        speed: 52,
        heading: 30,
        location: { type: 'Point', coordinates: [77.5550, 12.9980] }
      },
      {
        vehicleId: 'AMB-14',
        registrationNumber: 'KA-04-EA-1414',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 1,
        driverName: 'Venkatesh Prasad',
        driverContact: '+91 98450 14140',
        hospitalName: 'Bowring Hospital (Standby)',
        hospitalCode: 'BOW-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6033, 12.9833] }
      },
      {
        vehicleId: 'AMB-15',
        registrationNumber: 'KA-02-EA-1515',
        type: 'AMBULANCE',
        status: 'MAINTENANCE',
        capacity: 2,
        driverName: 'Ganesh Pai',
        driverContact: '+91 98450 15150',
        hospitalName: 'Peenya Fleet Service Station',
        hospitalCode: 'DEPOT-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5180, 13.0280] }
      },
      {
        vehicleId: 'AMB-16',
        registrationNumber: 'KA-51-EA-1616',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Mohammed Zeeshan',
        driverContact: '+91 98450 16160',
        hospitalName: 'Sakra World Hospital',
        hospitalCode: 'SAK-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6890, 12.9288] }
      },
      {
        vehicleId: 'AMB-17',
        registrationNumber: 'KA-05-EA-1717',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Raghavendra Rao',
        driverContact: '+91 98450 17170',
        hospitalName: 'Sagar Hospitals Banashankari',
        hospitalCode: 'SAG-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5560, 12.9250] }
      },
      {
        vehicleId: 'AMB-18',
        registrationNumber: 'KA-01-EA-1818',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Manjunath Gowda',
        driverContact: '+91 98450 18180',
        hospitalName: 'Jayadeva Institute of Cardiology',
        hospitalCode: 'JAY-01',
        speed: 44,
        heading: 75,
        location: { type: 'Point', coordinates: [77.6100, 12.9150] }
      },
      {
        vehicleId: 'AMB-19',
        registrationNumber: 'KA-02-EA-1919',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 1,
        driverName: 'Santosh Patil',
        driverContact: '+91 98450 19190',
        hospitalName: 'Victoria Hospital (City Market)',
        hospitalCode: 'VIC-01',
        speed: 36,
        heading: 85,
        location: { type: 'Point', coordinates: [77.5380, 12.9710] }
      },
      {
        vehicleId: 'AMB-20',
        registrationNumber: 'KA-04-EA-2020',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Naveen Kumar',
        driverContact: '+91 98450 20200',
        hospitalName: 'Specialist Hospital Kalyan Nagar',
        hospitalCode: 'SPE-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6480, 13.0180] }
      },
      {
        vehicleId: 'AMB-21',
        registrationNumber: 'KA-41-EA-2121',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Harish Babu',
        driverContact: '+91 98450 21210',
        hospitalName: 'BGS Gleneagles Global Hospital',
        hospitalCode: 'BGS-01',
        speed: 50,
        heading: 60,
        location: { type: 'Point', coordinates: [77.4850, 12.9150] }
      },
      {
        vehicleId: 'AMB-22',
        registrationNumber: 'KA-02-EA-2222',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 1,
        driverName: 'Prashanth Hegde',
        driverContact: '+91 98450 22220',
        hospitalName: 'Sparsh Hospital Yeshwanthpur',
        hospitalCode: 'SPA-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5500, 13.0220] }
      },
      {
        vehicleId: 'AMB-23',
        registrationNumber: 'KA-53-EA-2323',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 2,
        driverName: 'Vinayaka Prasad',
        driverContact: '+91 98450 23230',
        hospitalName: 'Manipal Hospital Whitefield',
        hospitalCode: 'MAN-02',
        speed: 35,
        heading: 140,
        location: { type: 'Point', coordinates: [77.6960, 13.0020] }
      },
      {
        vehicleId: 'AMB-24',
        registrationNumber: 'KA-51-EA-2424',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Karthik Swamy',
        driverContact: '+91 98450 24240',
        hospitalName: 'Columbia Asia Hospital Sarjapur',
        hospitalCode: 'COL-01',
        speed: 42,
        heading: 310,
        location: { type: 'Point', coordinates: [77.6820, 12.9080] }
      },
      {
        vehicleId: 'AMB-25',
        registrationNumber: 'KA-05-EA-2525',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Chetan Murthy',
        driverContact: '+91 98450 25250',
        hospitalName: 'KIMS Hospital Basavanagudi',
        hospitalCode: 'KIM-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5740, 12.9420] }
      },
      {
        vehicleId: 'AMB-26',
        registrationNumber: 'KA-04-EA-2626',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 1,
        driverName: 'Mohammed Farhan',
        driverContact: '+91 98450 26260',
        hospitalName: 'Bowring Hospital',
        hospitalCode: 'BOW-01',
        speed: 38,
        heading: 195,
        location: { type: 'Point', coordinates: [77.6120, 12.9980] }
      },
      {
        vehicleId: 'AMB-27',
        registrationNumber: 'KA-01-EA-2727',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 2,
        driverName: 'Divakar Naik',
        driverContact: '+91 98450 27270',
        hospitalName: 'Command Hospital Air Force',
        hospitalCode: 'CMD-01',
        speed: 40,
        heading: 260,
        location: { type: 'Point', coordinates: [77.6480, 12.9550] }
      },
      {
        vehicleId: 'AMB-28',
        registrationNumber: 'KA-41-EA-2828',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Lokesh Gowda',
        driverContact: '+91 98450 28280',
        hospitalName: 'Fortis Hospital Rajajinagar',
        hospitalCode: 'FOR-02',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5080, 12.9620] }
      },
      {
        vehicleId: 'AMB-29',
        registrationNumber: 'KA-53-EA-2929',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Sridhar Reddy',
        driverContact: '+91 98450 29290',
        hospitalName: 'Rainbow Children\'s Hospital',
        hospitalCode: 'RAI-01',
        speed: 45,
        heading: 230,
        location: { type: 'Point', coordinates: [77.6950, 12.9850] }
      },
      {
        vehicleId: 'AMB-30',
        registrationNumber: 'KA-03-EA-3030',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Sunil Thomas',
        driverContact: '+91 98450 30300',
        hospitalName: 'Aster CMI Hospital',
        hospitalCode: 'AST-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6400, 13.0100] }
      },
      {
        vehicleId: 'AMB-31',
        registrationNumber: 'KA-04-EA-3131',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 1,
        driverName: 'Jagdish Chandra',
        driverContact: '+91 98450 31310',
        hospitalName: 'Bangalore Baptist Hospital',
        hospitalCode: 'BBH-01',
        speed: 46,
        heading: 15,
        location: { type: 'Point', coordinates: [77.5920, 13.0250] }
      },
      {
        vehicleId: 'AMB-32',
        registrationNumber: 'KA-51-EA-3232',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 2,
        driverName: 'Arvind Shenoy',
        driverContact: '+91 98450 32320',
        hospitalName: 'Narayana Institute of Cardiac Sciences',
        hospitalCode: 'NAR-01',
        speed: 52,
        heading: 340,
        location: { type: 'Point', coordinates: [77.6880, 12.8420] }
      },
      {
        vehicleId: 'AMB-33',
        registrationNumber: 'KA-50-EA-3333',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Bhaskar Rao',
        driverContact: '+91 98450 33330',
        hospitalName: 'Aster CMI Hospital (Hebbal)',
        hospitalCode: 'AST-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.6180, 13.0480] }
      },
      {
        vehicleId: 'AMB-34',
        registrationNumber: 'KA-05-EA-3434',
        type: 'AMBULANCE',
        status: 'DISPATCHED',
        capacity: 2,
        driverName: 'Guruprasad N',
        driverContact: '+91 98450 34340',
        hospitalName: 'Apollo Hospitals Bannerghatta',
        hospitalCode: 'APO-01',
        speed: 38,
        heading: 110,
        location: { type: 'Point', coordinates: [77.5650, 12.9050] }
      },
      {
        vehicleId: 'AMB-35',
        registrationNumber: 'KA-03-EA-3535',
        type: 'AMBULANCE',
        status: 'EN_ROUTE',
        capacity: 1,
        driverName: 'Rakesh Verma',
        driverContact: '+91 98450 35350',
        hospitalName: 'Vydehi Hospital Whitefield',
        hospitalCode: 'VYD-01',
        speed: 48,
        heading: 80,
        location: { type: 'Point', coordinates: [77.7180, 12.9660] }
      },
      {
        vehicleId: 'AMB-36',
        registrationNumber: 'KA-02-EA-3636',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capacity: 2,
        driverName: 'Nagesh K',
        driverContact: '+91 98450 36360',
        hospitalName: 'Victoria Hospital (Standby)',
        hospitalCode: 'VIC-01',
        speed: 0,
        heading: 0,
        location: { type: 'Point', coordinates: [77.5450, 12.9780] }
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

    // =========================================================================
    // 2. EMERGENCIES: 25 REALISTIC JOURNEYS (Part 39 requirement: 20+ Journeys)
    // =========================================================================
    const emergencyDefs = [
      {
        emergencyId: 'E-DEMO-001',
        description: 'Acute ST-elevation myocardial infarction in 58M. Urgent cath-lab code at Manipal Hospital.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6320, 12.9410] }, // Emergency spot
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] }, // Manipal
        assignedVehicle: seededVehicles['AMB-01']._id,
        callerContact: '+91 98451 00111',
        callerName: 'Sunita Murthy',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-002',
        description: 'High-speed motorbike rollover with traumatic brain injury. Level 1 trauma resuscitation at Victoria.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5890, 13.0180] },
        destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
        assignedVehicle: seededVehicles['AMB-02']._id,
        callerContact: '+91 98452 00222',
        callerName: 'Traffic Inspector Hebbal',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-003',
        description: 'Severe pediatric asthma with cyanosis and impending respiratory failure. Pediatric ICU transfer.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.7120, 12.9650] },
        destination: { type: 'Point', coordinates: [77.6890, 12.9288] },
        assignedVehicle: seededVehicles['AMB-03']._id,
        callerContact: '+91 98453 00333',
        callerName: 'Deepa Nair',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-004',
        description: 'Acute neurological stroke with dense hemiplegia within 2-hour window. Fast-track stroke unit.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5900, 13.0600] },
        destination: { type: 'Point', coordinates: [77.6033, 12.9833] },
        assignedVehicle: seededVehicles['AMB-04']._id,
        callerContact: '+91 98454 00444',
        callerName: 'Kishore Kumar',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-005',
        description: 'Multi-car pileup on expressway underpass. Trapped casualties with severe crush trauma.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6400, 12.9050] },
        destination: { type: 'Point', coordinates: [77.6200, 12.9315] },
        assignedVehicle: seededVehicles['AMB-05']._id,
        callerContact: '+91 98455 00555',
        callerName: 'Highway Patrol Officer',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-006',
        description: 'Status epilepticus in 6-year-old child with non-terminating generalized tonic-clonic convulsions.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6440, 12.9780] },
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
        assignedVehicle: seededVehicles['AMB-07']._id,
        callerContact: '+91 98456 00666',
        callerName: 'Ananya Roy',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-007',
        description: 'Acute severe bronchospasm in chronic COPD patient with oxygen saturation at 78%.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'AT_SCENE',
        location: { type: 'Point', coordinates: [77.6450, 12.9100] },
        destination: { type: 'Point', coordinates: [77.6200, 12.9315] },
        assignedVehicle: seededVehicles['AMB-09']._id,
        callerContact: '+91 98457 00777',
        callerName: 'Vikas Rao',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-008',
        description: 'Electrical flash burn injury across face, torso and airway in factory worker.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        location: { type: 'Point', coordinates: [77.7050, 12.9550] },
        destination: { type: 'Point', coordinates: [77.6890, 12.9288] },
        assignedVehicle: seededVehicles['AMB-10']._id,
        callerContact: '+91 98458 00888',
        callerName: 'Factory Safety Officer',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-009',
        description: 'Diabetic ketoacidosis with severe dehydration and altered sensorium.',
        type: 'MEDICAL',
        priority: 'MEDIUM',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5800, 12.9350] },
        destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
        assignedVehicle: seededVehicles['AMB-11']._id,
        callerContact: '+91 98459 00999',
        callerName: 'Lakshmi Narayan',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-010',
        description: 'Elderly patient fall from stairs with displaced hip fracture and severe hypotension.',
        type: 'ACCIDENT',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5880, 12.9020] },
        destination: { type: 'Point', coordinates: [77.5980, 12.8920] },
        assignedVehicle: seededVehicles['AMB-12']._id,
        callerContact: '+91 98460 01010',
        callerName: 'Dr. Sudhir K',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-011',
        description: 'Ventricular tachycardia with hemodynamic compromise requiring emergency synchronized cardioversion.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5580, 12.9960] },
        destination: { type: 'Point', coordinates: [77.5855, 13.0310] },
        assignedVehicle: seededVehicles['AMB-13']._id,
        callerContact: '+91 98461 01111',
        callerName: 'Meera Deshpande',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-012',
        description: 'Postpartum hemorrhage with uterine atony following home delivery. Hemoglobin critically low.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5700, 13.0030] },
        destination: { type: 'Point', coordinates: [77.5684, 13.0305] },
        assignedVehicle: seededVehicles['AMB-08']._id,
        callerContact: '+91 98462 01212',
        callerName: 'Staff Nurse Geeta',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-013',
        description: 'Crush injury of right lower limb trapped in construction machinery.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6960, 13.0020] },
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
        assignedVehicle: seededVehicles['AMB-01']._id,
        callerContact: '+91 98463 01313',
        callerName: 'Site Supervisor Murugan',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-014',
        description: 'Severe radiating substernal chest pressure with diaphoresis in 49F.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6780, 12.9230] },
        destination: { type: 'Point', coordinates: [77.6890, 12.9288] },
        assignedVehicle: seededVehicles['AMB-16']._id,
        callerContact: '+91 98464 01414',
        callerName: 'Raghavan Iyer',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-015',
        description: 'Two-wheeler skid injury on broken bitumen road with suspected clavicle fracture.',
        type: 'ACCIDENT',
        priority: 'MEDIUM',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6820, 12.9080] },
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
        assignedVehicle: seededVehicles['AMB-07']._id,
        callerContact: '+91 98465 01515',
        callerName: 'Traffic Constable Sarjapur',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-016',
        description: 'Accidental corrosive acid inhalation in electroplating workshop.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5210, 13.0250] },
        destination: { type: 'Point', coordinates: [77.5684, 13.0305] },
        assignedVehicle: seededVehicles['AMB-13']._id,
        callerContact: '+91 98466 01616',
        callerName: 'Workshop Manager Anand',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-017',
        description: 'Open compound tib-fib fracture following bus footboard fall.',
        type: 'ACCIDENT',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        location: { type: 'Point', coordinates: [77.4850, 12.9150] },
        destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
        assignedVehicle: seededVehicles['AMB-02']._id,
        callerContact: '+91 98467 01717',
        callerName: 'BMTC Depot In-charge',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-018',
        description: 'Severe food-borne anaphylactic reaction with stridor and facial angioedema.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6400, 13.0300] },
        destination: { type: 'Point', coordinates: [77.6033, 12.9833] },
        assignedVehicle: seededVehicles['AMB-04']._id,
        callerContact: '+91 98468 01818',
        callerName: 'Dr. Shalini K',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-019',
        description: 'Hypoglycemic coma in type 1 diabetic with blood glucose at 28 mg/dL.',
        type: 'MEDICAL',
        priority: 'LOW',
        status: 'IN_PROGRESS',
        location: { type: 'Point', coordinates: [77.6950, 12.9850] },
        destination: { type: 'Point', coordinates: [77.6890, 12.9288] },
        assignedVehicle: seededVehicles['AMB-10']._id,
        callerContact: '+91 98469 01919',
        callerName: 'Tech Park Medic',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-020',
        description: 'Deep mechanical arm laceration with arterial pulsatile bleeding.',
        type: 'ACCIDENT',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        location: { type: 'Point', coordinates: [77.6150, 13.0500] },
        destination: { type: 'Point', coordinates: [77.5906, 13.0560] },
        assignedVehicle: seededVehicles['AMB-02']._id,
        callerContact: '+91 98470 02020',
        callerName: 'Facility Lead Manyata',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-021',
        description: 'Malignant hypertensive crisis with severe occipital headache and blurring of vision.',
        type: 'MEDICAL',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        location: { type: 'Point', coordinates: [77.5680, 12.9250] },
        destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
        assignedVehicle: seededVehicles['AMB-11']._id,
        callerContact: '+91 98471 02121',
        callerName: 'Family Physician Dr. Varma',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-022',
        description: 'Vasovagal syncope with recovery, under cardiac observation.',
        type: 'MEDICAL',
        priority: 'LOW',
        status: 'RESOLVED',
        location: { type: 'Point', coordinates: [77.6100, 12.9150] },
        destination: { type: 'Point', coordinates: [77.6200, 12.9315] },
        assignedVehicle: seededVehicles['AMB-05']._id,
        callerContact: '+91 98472 02222',
        callerName: 'Security Guard BTM',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-023',
        description: 'Dehydration and heat exhaustion on campus grounds.',
        type: 'MEDICAL',
        priority: 'LOW',
        status: 'RESOLVED',
        location: { type: 'Point', coordinates: [77.6420, 12.9550] },
        destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
        assignedVehicle: seededVehicles['AMB-01']._id,
        callerContact: '+91 98473 02323',
        callerName: 'Campus Receptionist EGL',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-024',
        description: 'Suspected appendicitis with localized right iliac fossa rebound tenderness.',
        type: 'MEDICAL',
        priority: 'MEDIUM',
        status: 'CANCELLED',
        location: { type: 'Point', coordinates: [77.6060, 12.9730] },
        destination: { type: 'Point', coordinates: [77.6033, 12.9833] },
        assignedVehicle: seededVehicles['AMB-04']._id,
        callerContact: '+91 98474 02424',
        callerName: 'Brigade Rd Resident',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-025',
        description: 'Heavy industrial press crush injury with polytrauma. Direct trauma-OT transfer.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'RESOLVED',
        location: { type: 'Point', coordinates: [77.6880, 12.8050] },
        destination: { type: 'Point', coordinates: [77.6912, 12.8123] },
        assignedVehicle: seededVehicles['AMB-05']._id,
        callerContact: '+91 98475 02525',
        callerName: 'NH City ER Triage',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-026',
        description: 'Acute thoracic aortic dissection with ripping back pain and syncope in Banashankari.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5600, 12.9300] },
        destination: { type: 'Point', coordinates: [77.5560, 12.9250] },
        assignedVehicle: seededVehicles['AMB-17']._id,
        callerContact: '+91 98476 02626',
        callerName: 'Dr. Ramesh Bellary',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-027',
        description: 'Out-of-hospital cardiac arrest in gym facility near BTM 2nd Stage Udupi Garden.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6120, 12.9180] },
        destination: { type: 'Point', coordinates: [77.5980, 12.9180] },
        assignedVehicle: seededVehicles['AMB-18']._id,
        callerContact: '+91 98477 02727',
        callerName: 'Gym Manager Vinod',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-028',
        description: 'Multiple pedestrian collision caused by brake failure at Vijayanagar Tollgate.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5350, 12.9730] },
        destination: { type: 'Point', coordinates: [77.5739, 12.9634] },
        assignedVehicle: seededVehicles['AMB-19']._id,
        callerContact: '+91 98478 02828',
        callerName: 'Traffic Constable Vijayanagar',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-029',
        description: 'Severe acute pancreatitis with systemic inflammatory response near Kalyan Nagar HRBR.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6420, 13.0120] },
        destination: { type: 'Point', coordinates: [77.6480, 13.0180] },
        assignedVehicle: seededVehicles['AMB-20']._id,
        callerContact: '+91 98479 02929',
        callerName: 'Kammanahalli Clinic Doctor',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-030',
        description: 'Heavy concrete block collapse onto construction laborer at Kengeri metro expansion.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.4900, 12.9100] },
        destination: { type: 'Point', coordinates: [77.4950, 12.8950] },
        assignedVehicle: seededVehicles['AMB-21']._id,
        callerContact: '+91 98480 03030',
        callerName: 'BMRCL Safety Engineer',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-031',
        description: 'Ischemic stroke with sudden onset expressive aphasia and right hemiplegia at Yeshwanthpur.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5480, 13.0200] },
        destination: { type: 'Point', coordinates: [77.5500, 13.0220] },
        assignedVehicle: seededVehicles['AMB-22']._id,
        callerContact: '+91 98481 03131',
        callerName: 'Station Superintendent IR',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-032',
        description: 'Tanker leak causing toxic ammonia inhalation with chemical pneumonitis near KR Puram.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6980, 13.0040] },
        destination: { type: 'Point', coordinates: [77.6960, 13.0020] },
        assignedVehicle: seededVehicles['AMB-23']._id,
        callerContact: '+91 98482 03232',
        callerName: 'Fire Officer KR Puram',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-033',
        description: 'High-speed car rollover on Sarjapur Outer Ring Road junction with bilateral femur fractures.',
        type: 'ACCIDENT',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6850, 12.9120] },
        destination: { type: 'Point', coordinates: [77.6750, 12.9200] },
        assignedVehicle: seededVehicles['AMB-24']._id,
        callerContact: '+91 98483 03333',
        callerName: 'Sarjapur Patrol',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-034',
        description: 'Hypovolemic shock following ruptured ectopic pregnancy near Basavanagudi National College.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'PENDING',
        location: { type: 'Point', coordinates: [77.5720, 12.9400] },
        destination: { type: 'Point', coordinates: [77.5740, 12.9420] },
        assignedVehicle: seededVehicles['AMB-25']._id,
        callerContact: '+91 98484 03434',
        callerName: 'Dr. Savitha Murthy',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-035',
        description: 'Pediatric scald burn injury covering 35% BSA with hot cooking oil near Fraser Town Coles Park.',
        type: 'ACCIDENT',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6100, 12.9960] },
        destination: { type: 'Point', coordinates: [77.6033, 12.9833] },
        assignedVehicle: seededVehicles['AMB-26']._id,
        callerContact: '+91 98485 03535',
        callerName: 'Resident Coles Road',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-036',
        description: 'Blunt chest trauma with suspected hemothorax following scooter collision near Domlur flyover.',
        type: 'ACCIDENT',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6450, 12.9530] },
        destination: { type: 'Point', coordinates: [77.6480, 12.9550] },
        assignedVehicle: seededVehicles['AMB-27']._id,
        callerContact: '+91 98486 03636',
        callerName: 'Traffic Constable Domlur',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-037',
        description: 'Industrial conveyor entanglement with traumatic arm injury at Nagarbhavi small scale unit.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5050, 12.9600] },
        destination: { type: 'Point', coordinates: [77.5080, 12.9620] },
        assignedVehicle: seededVehicles['AMB-28']._id,
        callerContact: '+91 98487 03737',
        callerName: 'Factory Owner Nagarbhavi',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-038',
        description: 'Status asthmaticus refractory to inhaled bronchodilators in pregnant woman at Mahadevapura.',
        type: 'MEDICAL',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6930, 12.9820] },
        destination: { type: 'Point', coordinates: [77.6950, 12.9850] },
        assignedVehicle: seededVehicles['AMB-29']._id,
        callerContact: '+91 98488 03838',
        callerName: 'Dr. Chaitra Rao',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-039',
        description: 'High-voltage electrical line contact with exit wound and ventricular ectopics at Banaswadi.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'PENDING',
        location: { type: 'Point', coordinates: [77.6380, 13.0080] },
        destination: { type: 'Point', coordinates: [77.6400, 13.0100] },
        assignedVehicle: seededVehicles['AMB-30']._id,
        callerContact: '+91 98489 03939',
        callerName: 'BESCOM Line Inspector',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-040',
        description: 'Acute massive pulmonary embolism with severe hypoxemia and hemodynamic instability at RT Nagar.',
        type: 'MEDICAL',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.5900, 13.0220] },
        destination: { type: 'Point', coordinates: [77.5855, 13.0310] },
        assignedVehicle: seededVehicles['AMB-31']._id,
        callerContact: '+91 98490 04040',
        callerName: 'RT Nagar Clinic Chief',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-041',
        description: 'Multi-vehicle collision on Electronic City Phase 2 expressway ramp with extrication needed.',
        type: 'ACCIDENT',
        priority: 'CRITICAL',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6850, 12.8400] },
        destination: { type: 'Point', coordinates: [77.6880, 12.8420] },
        assignedVehicle: seededVehicles['AMB-32']._id,
        callerContact: '+91 98491 04141',
        callerName: 'Expressway Toll Authority',
        createdBy: operator._id
      },
      {
        emergencyId: 'E-DEMO-042',
        description: 'Severe traumatic head injury from two-wheeler skid near Manyata Tech Park Gate 1.',
        type: 'ACCIDENT',
        priority: 'HIGH',
        status: 'DISPATCHED',
        location: { type: 'Point', coordinates: [77.6160, 13.0450] },
        destination: { type: 'Point', coordinates: [77.6180, 13.0480] },
        assignedVehicle: seededVehicles['AMB-33']._id,
        callerContact: '+91 98492 04242',
        callerName: 'Manyata Security Desk',
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

    // =========================================================================
    // 3. INCIDENTS: 20 REALISTIC HAZARDS ACROSS BENGALURU (Part 42 requirement)
    // =========================================================================
    const incidentDefs = [
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
      {
        incidentId: 'INC-DEMO-003',
        type: 'HEAVY_TRAFFIC',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Severe 2.4 km gridlock and broken-down BMTC bus at Marathahalli junction underpass.',
        location: { type: 'Point', coordinates: [77.6850, 12.9560] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-003']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-004',
        type: 'ACCIDENT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Multi-axle container collision at Central Silk Board junction causing standstill traffic toward Madiwala.',
        location: { type: 'Point', coordinates: [77.6320, 12.9180] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-005']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-005',
        type: 'LANE_BLOCKAGE',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Fallen roadside tree branches blocking left corridor lane on Indiranagar 100ft Road.',
        location: { type: 'Point', coordinates: [77.6420, 12.9720] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-006']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-006',
        type: 'HEAVY_TRAFFIC',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Flash waterlogging and flooded underpass near HSR Layout 14th Main.',
        location: { type: 'Point', coordinates: [77.6380, 12.9130] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-007']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-007',
        type: 'VEHICLE_BREAKDOWN',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Broken-down heavy dumper on elevated flyover heading toward Bellandur.',
        location: { type: 'Point', coordinates: [77.6980, 12.9500] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-008']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-008',
        type: 'ROAD_WORK',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Metro line barricade repair on Bannerghatta Road near JP Nagar 3rd Phase.',
        location: { type: 'Point', coordinates: [77.5920, 12.9000] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-010']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-009',
        type: 'HEAVY_TRAFFIC',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Heavy market festival crowd spillover near Malleshwaram 8th Cross circle.',
        location: { type: 'Point', coordinates: [77.5710, 13.0010] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-012']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-010',
        type: 'ROAD_WORK',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Tin Factory KR Puram expansion work with major lane restriction on highway approach.',
        location: { type: 'Point', coordinates: [77.6750, 12.9980] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-013']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-011',
        type: 'ROAD_WORK',
        severity: 'LOW',
        status: 'ACTIVE',
        description: 'Bitumen resurfacing on Sarjapur road near Carmelaram railway gate.',
        location: { type: 'Point', coordinates: [77.6900, 12.9150] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-015']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-012',
        type: 'VEHICLE_BREAKDOWN',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Overheated passenger auto blocking Hennur service lane.',
        location: { type: 'Point', coordinates: [77.6350, 13.0250] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-018']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-013',
        type: 'HEAVY_TRAFFIC',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'IT corridor shift change congestion along Mahadevapura ring road.',
        location: { type: 'Point', coordinates: [77.6920, 12.9800] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-019']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-014',
        type: 'ACCIDENT',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Two-car rear end collision near Manyata Tech Park Gate 2.',
        location: { type: 'Point', coordinates: [77.6100, 13.0480] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-020']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-015',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Cleared earlier minor fender bender near Yelahanka bypass.',
        location: { type: 'Point', coordinates: [77.5950, 13.0900] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-004']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-016',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'South End Jayanagar arterial lane cleared of temporary delivery van stoppage.',
        location: { type: 'Point', coordinates: [77.5810, 12.9320] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-009']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-017',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Navrang Rajajinagar corridor running smooth with green wave active.',
        location: { type: 'Point', coordinates: [77.5560, 12.9970] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-011']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-018',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Bellandur Green Glen access road clear with optimal vehicle flow.',
        location: { type: 'Point', coordinates: [77.6760, 12.9240] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-014']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-019',
        type: 'ROAD_WORK',
        severity: 'LOW',
        status: 'ACTIVE',
        description: 'Peenya Industrial Ring Road drain cover installation in progress.',
        location: { type: 'Point', coordinates: [77.5250, 13.0220] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-016']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-020',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Hosur highway clear near Bommasandra industrial gate.',
        location: { type: 'Point', coordinates: [77.6900, 12.8100] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-025']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-021',
        type: 'ROAD_CLOSURE',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Pipeline burst flooding underpass near Banashankari 2nd stage signal.',
        location: { type: 'Point', coordinates: [77.5580, 12.9280] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-026']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-022',
        type: 'ACCIDENT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Overturned sand tipper lorry at BTM Udupi Garden signal blocking 2 lanes.',
        location: { type: 'Point', coordinates: [77.6110, 12.9160] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-027']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-023',
        type: 'HEAVY_TRAFFIC',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Massive standstill on Mysore Road approaching tollgate due to signal outage.',
        location: { type: 'Point', coordinates: [77.5360, 12.9720] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-028']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-024',
        type: 'LANE_BLOCKAGE',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Tree branch collapse blocking one lane on Kalyan Nagar Ring Road service lane.',
        location: { type: 'Point', coordinates: [77.6450, 13.0150] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-029']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-025',
        type: 'ROAD_WORK',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Crane deployment for metro pier segment at Kengeri Satellite town road.',
        location: { type: 'Point', coordinates: [77.4880, 12.9120] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-030']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-026',
        type: 'VEHICLE_BREAKDOWN',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Broken-down intercity bus near Yeshwanthpur flyover approach.',
        location: { type: 'Point', coordinates: [77.5490, 13.0210] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-031']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-027',
        type: 'ACCIDENT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Chemical tanker collision causing hazmat containment perimeter near KR Puram.',
        location: { type: 'Point', coordinates: [77.6970, 13.0030] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-032']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-028',
        type: 'HEAVY_TRAFFIC',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Choke point on Sarjapur road due to school bus breakdown near Kaikondrahalli.',
        location: { type: 'Point', coordinates: [77.6840, 12.9100] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-033']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-029',
        type: 'ROAD_WORK',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Stormwater drain desilting on Gandhi Bazaar main road Basavanagudi.',
        location: { type: 'Point', coordinates: [77.5730, 12.9410] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-034']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-030',
        type: 'LANE_BLOCKAGE',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Religious festival pandal restricting vehicular movement in Fraser Town.',
        location: { type: 'Point', coordinates: [77.6110, 12.9970] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-035']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-031',
        type: 'VEHICLE_BREAKDOWN',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Cement mixer stalled on Domlur intermediate ring road flyover ramp.',
        location: { type: 'Point', coordinates: [77.6460, 12.9540] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-036']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-032',
        type: 'ROAD_CLOSURE',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Culvert reconstruction blocking through-traffic on Nagarbhavi main road.',
        location: { type: 'Point', coordinates: [77.5060, 12.9610] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-037']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-033',
        type: 'HEAVY_TRAFFIC',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Ring road underpass bottleneck near Mahadevapura railway bridge.',
        location: { type: 'Point', coordinates: [77.6940, 12.9830] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-038']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-034',
        type: 'ROAD_WORK',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        description: 'Optical fiber trenching on Banaswadi 100ft road near sub-registrar office.',
        location: { type: 'Point', coordinates: [77.6390, 13.0090] },
        source: 'AUTOMATED_SYSTEM',
        emergency: seededEmergencies['E-DEMO-039']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-035',
        type: 'ACCIDENT',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Auto-rickshaw and bike crash causing queue on RT Nagar main road.',
        location: { type: 'Point', coordinates: [77.5910, 13.0230] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-040']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-036',
        type: 'ACCIDENT',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        description: 'Three-vehicle collision on Electronic City expressway flyover descent.',
        location: { type: 'Point', coordinates: [77.6860, 12.8410] },
        source: 'TRAFFIC_POLICE',
        emergency: seededEmergencies['E-DEMO-041']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-037',
        type: 'HEAVY_TRAFFIC',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Severe peak hour congestion at Manyata Tech Park Gate 1 signal.',
        location: { type: 'Point', coordinates: [77.6170, 13.0460] },
        source: 'SENSOR',
        emergency: seededEmergencies['E-DEMO-042']._id,
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-038',
        type: 'ROAD_WORK',
        severity: 'LOW',
        status: 'ACTIVE',
        description: 'White-topping work on Kumaraswamy Layout 50ft road.',
        location: { type: 'Point', coordinates: [77.5640, 12.9040] },
        source: 'AUTOMATED_SYSTEM',
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-039',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Cleared earlier vehicle stoppage on Brookefield main road.',
        location: { type: 'Point', coordinates: [77.7170, 12.9650] },
        source: 'TRAFFIC_POLICE',
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-040',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Magadi Road tollgate corridor free-flowing with clear lanes.',
        location: { type: 'Point', coordinates: [77.5440, 12.9770] },
        source: 'SENSOR',
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-041',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Hebbal flyover central spine clear with rapid green wave transit.',
        location: { type: 'Point', coordinates: [77.5930, 13.0360] },
        source: 'AUTOMATED_SYSTEM',
        reportedBy: operator._id
      },
      {
        incidentId: 'INC-DEMO-042',
        type: 'OTHER',
        severity: 'LOW',
        status: 'RESOLVED',
        description: 'Old Airport Road Manipal approach running clear with priority corridor active.',
        location: { type: 'Point', coordinates: [77.6470, 12.9570] },
        source: 'TRAFFIC_POLICE',
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

    // =========================================================================
    // 4. MULTI-LEG ROUTES: 30+ ROUTE RECORDS (Part 3 & 5 requirements)
    //    Leg 1: Current -> Emergency (BLUE)
    //    Leg 2: Emergency -> Hospital (GREEN)
    // =========================================================================
    const routeDefs = [];

    // --- SCENARIO 001: Koramangala -> Manipal Hospital ---
    // Leg 1: Ambulance (80ft Depot) -> Emergency (Koramangala 4th Block)
    // Leg 2: Emergency -> Manipal Hospital (Old Airport Rd)
    const koraCorridor = CANONICAL_ROAD_CORRIDORS.KORAMANGALA_DEPOT_TO_EMERGENCY.primary;
    const manipalCorridor = CANONICAL_ROAD_CORRIDORS.EMERGENCY_TO_MANIPAL.primary;
    const manipalAltCorridor = CANONICAL_ROAD_CORRIDORS.EMERGENCY_TO_MANIPAL.alternative;

    // --- SCENARIO 001: Koramangala -> Manipal Hospital ---
    // Leg 1: Ambulance (80ft Depot) -> Emergency (Koramangala 4th Block)
    // Leg 2: Emergency -> Manipal Hospital (Old Airport Rd)
    const leg001_1 = {
      legNumber: 1,
      type: 'TO_EMERGENCY',
      title: 'Leg 1: To Emergency Location',
      originName: 'Koramangala 80ft Depot',
      destinationName: 'Koramangala 4th Block Emergency',
      origin: { type: 'Point', coordinates: koraCorridor.coordinates[0] },
      destination: { type: 'Point', coordinates: koraCorridor.coordinates[koraCorridor.coordinates.length - 1] },
      geometry: {
        type: 'LineString',
        coordinates: koraCorridor.coordinates
      },
      polyline: koraCorridor.polyline,
      distance: koraCorridor.distance || 950,
      duration: koraCorridor.duration || 140,
      status: 'ACTIVE',
      steps: koraCorridor.steps || [
        { maneuver: 'DEPART', instruction: 'Head north on 80ft Road toward 4th Block', distance: 450, duration: 60 },
        { maneuver: 'TURN_RIGHT', instruction: 'Turn right into 4th Block residential gate', distance: 500, duration: 80 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at patient location', distance: 0, duration: 0 }
      ]
    };

    // Leg 2 Congested: Emergency -> Manipal via Intermediate Ring Rd (Accident Bottleneck!)
    const leg001_2_congested = {
      legNumber: 2,
      type: 'TO_HOSPITAL',
      title: 'Leg 2: To Hospital (Congested Corridor)',
      originName: 'Koramangala 4th Block Emergency',
      destinationName: 'Manipal Hospital (Old Airport Rd)',
      origin: { type: 'Point', coordinates: manipalAltCorridor.coordinates[0] },
      destination: { type: 'Point', coordinates: manipalAltCorridor.coordinates[manipalAltCorridor.coordinates.length - 1] },
      geometry: {
        type: 'LineString',
        coordinates: manipalAltCorridor.coordinates
      },
      polyline: manipalAltCorridor.polyline,
      distance: manipalAltCorridor.distance || 4200,
      duration: (manipalAltCorridor.duration || 600) + 360, // 16 min delay
      trafficDelay: 360,
      status: 'PLANNED',
      steps: manipalAltCorridor.steps || [
        { maneuver: 'DEPART', instruction: 'Head northeast toward Intermediate Ring Road', distance: 800, duration: 120 },
        { maneuver: 'CONTINUE', instruction: 'Continue on Intermediate Ring Road (ACCIDENT DELAY +6m)', distance: 2200, duration: 620 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at Manipal Hospital Emergency Bay', distance: 1200, duration: 220 }
      ]
    };

    // Leg 2 Recommended: Emergency -> Manipal via Indiranagar 100ft Bypass (SAVES 6 MIN!)
    const leg001_2_recommended = {
      legNumber: 2,
      type: 'TO_HOSPITAL',
      title: 'Leg 2: To Hospital (Indiranagar Bypass Corridor)',
      originName: 'Koramangala 4th Block Emergency',
      destinationName: 'Manipal Hospital (Old Airport Rd)',
      origin: { type: 'Point', coordinates: manipalCorridor.coordinates[0] },
      destination: { type: 'Point', coordinates: manipalCorridor.coordinates[manipalCorridor.coordinates.length - 1] },
      geometry: {
        type: 'LineString',
        coordinates: manipalCorridor.coordinates
      },
      polyline: manipalCorridor.polyline,
      distance: manipalCorridor.distance || 3800,
      duration: manipalCorridor.duration || 540, // 9 min -> Saves 7 min!
      trafficDelay: 30,
      status: 'ACTIVE',
      steps: manipalCorridor.steps || [
        { maneuver: 'DEPART', instruction: 'Depart emergency scene toward Indiranagar 100ft corridor', distance: 600, duration: 80 },
        { maneuver: 'CONTINUE', instruction: 'Proceed north on 100ft road bypass with green light corridor', distance: 2100, duration: 280 },
        { maneuver: 'TURN_RIGHT', instruction: 'Turn right onto Old Airport Road clear lane', distance: 1100, duration: 180 },
        { maneuver: 'ARRIVE', instruction: 'Arrive at Manipal Hospital Trauma Gate', distance: 0, duration: 0 }
      ]
    };

    // Original Degraded Route for DEMO-001
    routeDefs.push({
      routeId: 'ROUTE-DEMO-001-ORIGINAL',
      emergency: seededEmergencies['E-DEMO-001']._id,
      vehicle: seededVehicles['AMB-01']._id,
      origin: { type: 'Point', coordinates: leg001_1.origin.coordinates },
      destination: { type: 'Point', coordinates: leg001_2_congested.destination.coordinates },
      emergencyLocation: { type: 'Point', coordinates: leg001_1.destination.coordinates },
      hospitalLocation: { type: 'Point', coordinates: leg001_2_congested.destination.coordinates },
      legs: [leg001_1, leg001_2_congested],
      activeLegIndex: 0,
      geometry: {
        type: 'LineString',
        coordinates: [
          ...leg001_1.geometry.coordinates,
          ...leg001_2_congested.geometry.coordinates.slice(1)
        ]
      },
      distance: leg001_1.distance + leg001_2_congested.distance,
      duration: leg001_1.duration + leg001_2_congested.duration,
      provider: 'OSRM',
      routeType: 'PLANNED',
      preference: 'FASTEST',
      status: 'CANCELLED',
      steps: [...leg001_1.steps, ...leg001_2_congested.steps],
      createdBy: operator._id
    });

    // Active GeoAgent Recommended Route for DEMO-001 (Bypass on Leg 2)
    routeDefs.push({
      routeId: 'ROUTE-DEMO-001-ACTIVE',
      emergency: seededEmergencies['E-DEMO-001']._id,
      vehicle: seededVehicles['AMB-01']._id,
      origin: { type: 'Point', coordinates: leg001_1.origin.coordinates },
      destination: { type: 'Point', coordinates: leg001_2_recommended.destination.coordinates },
      emergencyLocation: { type: 'Point', coordinates: leg001_1.destination.coordinates },
      hospitalLocation: { type: 'Point', coordinates: leg001_2_recommended.destination.coordinates },
      legs: [leg001_1, leg001_2_recommended],
      activeLegIndex: 0,
      geometry: {
        type: 'LineString',
        coordinates: [
          ...leg001_1.geometry.coordinates,
          ...leg001_2_recommended.geometry.coordinates.slice(1)
        ]
      },
      distance: leg001_1.distance + leg001_2_recommended.distance,
      duration: leg001_1.duration + leg001_2_recommended.duration,
      provider: 'OSRM',
      routeType: 'RECOMMENDED',
      preference: 'FASTEST',
      status: 'ACTIVE',
      steps: [...leg001_1.steps, ...leg001_2_recommended.steps],
      alternative: {
        affectedLegNumber: 2,
        geometry: leg001_2_congested.geometry,
        distanceMeters: leg001_2_congested.distance,
        durationSeconds: leg001_2_congested.duration,
        preference: 'FASTEST',
        description: 'Original bottleneck route via Intermediate Ring Rd (+6m delay)'
      },
      createdBy: operator._id
    });

    // Scenario corridor mappings for realistic road geometry
    const scenarioCorridorMap = {
      2: { leg1: CANONICAL_ROAD_CORRIDORS.HEBBAL_TO_VICTORIA_LEG1.primary, leg2: CANONICAL_ROAD_CORRIDORS.HEBBAL_TO_VICTORIA_LEG2.primary, alt: CANONICAL_ROAD_CORRIDORS.HEBBAL_TO_VICTORIA_LEG2.alternative },
      3: { leg1: CANONICAL_ROAD_CORRIDORS.WHITEFIELD_TO_SAKRA_LEG1.primary, leg2: CANONICAL_ROAD_CORRIDORS.WHITEFIELD_TO_SAKRA_LEG2.primary, alt: CANONICAL_ROAD_CORRIDORS.WHITEFIELD_TO_SAKRA_LEG2.alternative },
      4: { leg1: CANONICAL_ROAD_CORRIDORS.YELAHANKA_TO_BOWRING_LEG1.primary, leg2: CANONICAL_ROAD_CORRIDORS.YELAHANKA_TO_BOWRING_LEG2.primary, alt: CANONICAL_ROAD_CORRIDORS.YELAHANKA_TO_BOWRING_LEG2.alternative },
      5: { leg1: CANONICAL_ROAD_CORRIDORS.ECITY_TO_STJOHNS_LEG1.primary, leg2: CANONICAL_ROAD_CORRIDORS.ECITY_TO_STJOHNS_LEG2.primary, alt: CANONICAL_ROAD_CORRIDORS.ECITY_TO_STJOHNS_LEG2.alternative }
    };

    // Seed Multi-Leg Routes for Scenarios 2 through 18
    for (let i = 2; i <= 18; i++) {
      const pad = String(i).padStart(3, '0');
      const scConfig = DEMO_SCENARIO_CONFIGS.find(s => s.id === `DEMO-${pad}`) || DEMO_SCENARIO_CONFIGS[1];
      const emgDoc = seededEmergencies[scConfig.emergencyId] || seededEmergencies['E-DEMO-002'];
      const vehDoc = seededVehicles[scConfig.vehicleId] || seededVehicles['AMB-02'];

      const cycleKey = ((i - 2) % 4) + 2;
      const activeCorridor = scenarioCorridorMap[i] || scenarioCorridorMap[cycleKey];

      const leg1Coords = activeCorridor.leg1.coordinates;
      const leg2Coords = activeCorridor.leg2.coordinates;

      const leg1Obj = {
        legNumber: 1,
        type: 'TO_EMERGENCY',
        title: `Leg 1: ${scConfig.originName} -> ${scConfig.emergencyName}`,
        originName: scConfig.originName,
        destinationName: scConfig.emergencyName,
        origin: { type: 'Point', coordinates: leg1Coords[0] },
        destination: { type: 'Point', coordinates: leg1Coords[leg1Coords.length - 1] },
        geometry: { type: 'LineString', coordinates: leg1Coords },
        distance: activeCorridor.leg1.distance || (2800 + i * 200),
        duration: activeCorridor.leg1.duration || (320 + i * 30),
        status: i === 7 ? 'COMPLETED' : 'ACTIVE',
        steps: activeCorridor.leg1.steps || [
          { maneuver: 'DEPART', instruction: `Head toward ${scConfig.emergencyName}`, distance: 1200, duration: 150 },
          { maneuver: 'CONTINUE', instruction: 'Follow main corridor lane', distance: 1600, duration: 200 },
          { maneuver: 'ARRIVE', instruction: `Arrive at emergency site: ${scConfig.emergencyName}`, distance: 0, duration: 0 }
        ]
      };

      const leg2Obj = {
        legNumber: 2,
        type: 'TO_HOSPITAL',
        title: `Leg 2: ${scConfig.emergencyName} -> ${scConfig.destinationName}`,
        originName: scConfig.emergencyName,
        destinationName: scConfig.destinationName,
        origin: { type: 'Point', coordinates: leg2Coords[0] },
        destination: { type: 'Point', coordinates: leg2Coords[leg2Coords.length - 1] },
        geometry: { type: 'LineString', coordinates: leg2Coords },
        distance: activeCorridor.leg2.distance || (5200 + i * 400),
        duration: activeCorridor.leg2.duration || (640 + i * 60),
        status: i === 7 ? 'ACTIVE' : 'PLANNED',
        steps: activeCorridor.leg2.steps || [
          { maneuver: 'DEPART', instruction: `Depart scene toward ${scConfig.destinationName}`, distance: 1500, duration: 180 },
          { maneuver: 'CONTINUE', instruction: 'Proceed via arterial hospital green wave', distance: 3200, duration: 380 },
          { maneuver: 'ARRIVE', instruction: `Arrive at ${scConfig.destinationName} Emergency Bay`, distance: 500, duration: 80 }
        ]
      };

      routeDefs.push({
        routeId: `ROUTE-DEMO-${pad}-ACTIVE`,
        emergency: emgDoc._id,
        vehicle: vehDoc._id,
        origin: { type: 'Point', coordinates: leg1Coords[0] },
        destination: { type: 'Point', coordinates: leg2Coords[leg2Coords.length - 1] },
        emergencyLocation: { type: 'Point', coordinates: leg1Coords[leg1Coords.length - 1] },
        hospitalLocation: { type: 'Point', coordinates: leg2Coords[leg2Coords.length - 1] },
        legs: [leg1Obj, leg2Obj],
        activeLegIndex: i === 7 ? 1 : 0,
        geometry: {
          type: 'LineString',
          coordinates: [...leg1Coords, ...leg2Coords.slice(1)]
        },
        distance: leg1Obj.distance + leg2Obj.distance,
        duration: leg1Obj.duration + leg2Obj.duration,
        provider: 'OSRM',
        routeType: 'RECOMMENDED',
        preference: 'FASTEST',
        status: 'ACTIVE',
        steps: [...leg1Obj.steps, ...leg2Obj.steps],
        alternative: (scConfig.hasReroute || scConfig.hasAlternative) && activeCorridor.alt ? {
          affectedLegNumber: 2,
          geometry: {
            type: 'LineString',
            coordinates: activeCorridor.alt.coordinates
          },
          distanceMeters: activeCorridor.alt.distance,
          durationSeconds: activeCorridor.alt.duration + 360,
          preference: 'FASTEST',
          description: `Slower congested corridor (+${scConfig.expectedTimeSavedMinutes || 4} min delay)`
        } : null,
        createdBy: operator._id
      });
    }

    // Additional routes for remaining emergencies to exceed 50+ total routes
    const defaultCorridor = CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.primary;
    for (let j = 19; j <= 42; j++) {
      const pad = String(j).padStart(3, '0');
      const emg = seededEmergencies[`E-DEMO-${pad}`];
      if (emg) {
        routeDefs.push({
          routeId: `ROUTE-DEMO-${pad}-ACTIVE`,
          emergency: emg._id,
          vehicle: emg.assignedVehicle || seededVehicles['AMB-01']._id,
          origin: { type: 'Point', coordinates: defaultCorridor.coordinates[0] },
          destination: { type: 'Point', coordinates: defaultCorridor.coordinates[defaultCorridor.coordinates.length - 1] },
          emergencyLocation: emg.location,
          hospitalLocation: emg.destination || emg.location,
          legs: [
            {
              legNumber: 1,
              type: 'TO_EMERGENCY',
              title: 'Leg 1: En-Route',
              origin: { type: 'Point', coordinates: defaultCorridor.coordinates[0] },
              destination: { type: 'Point', coordinates: defaultCorridor.coordinates[Math.floor(defaultCorridor.coordinates.length / 2)] },
              geometry: { type: 'LineString', coordinates: defaultCorridor.coordinates.slice(0, Math.floor(defaultCorridor.coordinates.length / 2) + 1) },
              distance: Math.round(defaultCorridor.distance / 2),
              duration: Math.round(defaultCorridor.duration / 2),
              status: 'COMPLETED',
              steps: defaultCorridor.steps ? defaultCorridor.steps.slice(0, Math.ceil(defaultCorridor.steps.length / 2)) : [{ maneuver: 'ARRIVE', instruction: 'Arrive at location', distance: 0, duration: 0 }]
            },
            {
              legNumber: 2,
              type: 'TO_HOSPITAL',
              title: 'Leg 2: Transfer',
              origin: { type: 'Point', coordinates: defaultCorridor.coordinates[Math.floor(defaultCorridor.coordinates.length / 2)] },
              destination: { type: 'Point', coordinates: defaultCorridor.coordinates[defaultCorridor.coordinates.length - 1] },
              geometry: { type: 'LineString', coordinates: defaultCorridor.coordinates.slice(Math.floor(defaultCorridor.coordinates.length / 2)) },
              distance: Math.round(defaultCorridor.distance / 2),
              duration: Math.round(defaultCorridor.duration / 2),
              status: 'ACTIVE',
              steps: defaultCorridor.steps ? defaultCorridor.steps.slice(Math.floor(defaultCorridor.steps.length / 2)) : [{ maneuver: 'ARRIVE', instruction: 'Arrive at destination', distance: 0, duration: 0 }]
            }
          ],
          activeLegIndex: 1,
          geometry: {
            type: 'LineString',
            coordinates: defaultCorridor.coordinates
          },
          distance: defaultCorridor.distance,
          duration: defaultCorridor.duration,
          provider: 'OSRM',
          routeType: 'CURRENT',
          preference: 'FASTEST',
          status: 'ACTIVE',
          steps: defaultCorridor.steps || [
            { maneuver: 'DEPART', instruction: 'Depart scene', distance: 1000, duration: 120 },
            { maneuver: 'ARRIVE', instruction: 'Arrive at hospital', distance: 0, duration: 0 }
          ],
          createdBy: operator._id
        });
      }
    }

    for (const rDef of routeDefs) {
      await Route.findOneAndUpdate({ routeId: rDef.routeId }, rDef, { upsert: true, new: true });
    }

    // =========================================================================
    // 5. SIMULATED CONNECTED VEHICLES (Part 55: 10+ Connected Vehicles CV-001 to CV-010)
    //    Persisted in ClearanceSession with demo V2X statuses
    // =========================================================================
    const clearanceSessions = [
      {
        clearanceId: 'CLR-DEMO-001',
        vehicleId: 'AMB-01',
        emergencyId: 'E-DEMO-001',
        isSimulated: true,
        simulationCorridor: 'Koramangala - Indiranagar - Old Airport Rd',
        connectedVehicles: [
          {
            vehicleId: 'CV-001',
            label: 'KA-01-AB-9482',
            coordinates: [77.6360, 12.9460],
            distanceToAmbulanceMeters: 180,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 60000),
            acknowledgedAt: new Date(Date.now() - 45000),
            clearedAt: new Date(Date.now() - 15000)
          },
          {
            vehicleId: 'CV-002',
            label: 'KA-05-CD-3310',
            coordinates: [77.6385, 12.9520],
            distanceToAmbulanceMeters: 340,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 40000),
            acknowledgedAt: new Date(Date.now() - 25000),
            givingWayAt: new Date(Date.now() - 10000)
          },
          {
            vehicleId: 'CV-003',
            label: 'KA-53-EF-8821',
            coordinates: [77.6410, 12.9550],
            distanceToAmbulanceMeters: 490,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 15000)
          }
        ],
        status: 'ACTIVE',
        summary: {
          totalDetected: 3,
          totalAlerted: 3,
          totalGivingWay: 1,
          totalCleared: 1
        }
      },
      {
        clearanceId: 'CLR-DEMO-002',
        vehicleId: 'AMB-02',
        emergencyId: 'E-DEMO-002',
        isSimulated: true,
        simulationCorridor: 'Hebbal - Bellary Rd - Victoria Hospital',
        connectedVehicles: [
          {
            vehicleId: 'CV-004',
            label: 'KA-04-GH-1199',
            coordinates: [77.5870, 13.0100],
            distanceToAmbulanceMeters: 220,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 50000),
            acknowledgedAt: new Date(Date.now() - 35000),
            clearedAt: new Date(Date.now() - 10000)
          },
          {
            vehicleId: 'CV-005',
            label: 'KA-50-IJ-4422',
            coordinates: [77.5840, 12.9950],
            distanceToAmbulanceMeters: 410,
            status: 'ACKNOWLEDGED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 20000),
            acknowledgedAt: new Date(Date.now() - 5000)
          }
        ],
        status: 'ACTIVE',
        summary: {
          totalDetected: 2,
          totalAlerted: 2,
          totalGivingWay: 0,
          totalCleared: 1
        }
      },
      {
        clearanceId: 'CLR-DEMO-003',
        vehicleId: 'AMB-03',
        emergencyId: 'E-DEMO-003',
        isSimulated: true,
        simulationCorridor: 'Whitefield - Kundalahalli - Sakra World Hospital',
        connectedVehicles: [
          {
            vehicleId: 'CV-006',
            label: 'KA-03-KL-7733',
            coordinates: [77.7200, 12.9660],
            distanceToAmbulanceMeters: 190,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 60000),
            acknowledgedAt: new Date(Date.now() - 40000),
            clearedAt: new Date(Date.now() - 10000)
          },
          {
            vehicleId: 'CV-007',
            label: 'KA-03-MN-2255',
            coordinates: [77.7050, 12.9620],
            distanceToAmbulanceMeters: 360,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 30000),
            acknowledgedAt: new Date(Date.now() - 20000),
            givingWayAt: new Date(Date.now() - 5000)
          },
          {
            vehicleId: 'CV-008',
            label: 'KA-51-OP-6611',
            coordinates: [77.6950, 12.9450],
            distanceToAmbulanceMeters: 520,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 15000)
          }
        ],
        status: 'ACTIVE',
        summary: {
          totalDetected: 3,
          totalAlerted: 3,
          totalGivingWay: 1,
          totalCleared: 1
        }
      },
      {
        clearanceId: 'CLR-DEMO-005',
        vehicleId: 'AMB-05',
        emergencyId: 'E-DEMO-005',
        isSimulated: true,
        simulationCorridor: 'Electronic City - Hosur Rd - St John\'s',
        connectedVehicles: [
          {
            vehicleId: 'CV-009',
            label: 'KA-51-QR-9900',
            coordinates: [77.6600, 12.8700],
            distanceToAmbulanceMeters: 280,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 35000),
            acknowledgedAt: new Date(Date.now() - 20000),
            givingWayAt: new Date(Date.now() - 5000)
          },
          {
            vehicleId: 'CV-010',
            label: 'KA-01-ST-3388',
            coordinates: [77.6500, 12.8900],
            distanceToAmbulanceMeters: 480,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 10000)
          }
        ],
        status: 'ACTIVE',
        summary: {
          totalDetected: 2,
          totalAlerted: 2,
          totalGivingWay: 1,
          totalCleared: 0
        }
      },
      {
        clearanceId: 'CLR-DEMO-006',
        vehicleId: 'AMB-07',
        emergencyId: 'E-DEMO-006',
        isSimulated: true,
        simulationCorridor: 'Indiranagar 100ft Rd - Old Airport Rd',
        connectedVehicles: [
          {
            vehicleId: 'CV-011',
            label: 'KA-03-UV-4455',
            coordinates: [77.6430, 12.9760],
            distanceToAmbulanceMeters: 210,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 45000),
            acknowledgedAt: new Date(Date.now() - 30000),
            clearedAt: new Date(Date.now() - 10000)
          },
          {
            vehicleId: 'CV-012',
            label: 'KA-04-WX-7788',
            coordinates: [77.6450, 12.9710],
            distanceToAmbulanceMeters: 380,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 25000),
            acknowledgedAt: new Date(Date.now() - 15000),
            givingWayAt: new Date(Date.now() - 5000)
          },
          {
            vehicleId: 'CV-013',
            label: 'KA-01-YZ-1122',
            coordinates: [77.6465, 12.9650],
            distanceToAmbulanceMeters: 510,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 12000)
          }
        ],
        status: 'ACTIVE',
        summary: { totalDetected: 3, totalAlerted: 3, totalGivingWay: 1, totalCleared: 1 }
      },
      {
        clearanceId: 'CLR-DEMO-007',
        vehicleId: 'AMB-09',
        emergencyId: 'E-DEMO-007',
        isSimulated: true,
        simulationCorridor: 'HSR 27th Main - Silk Board Junction',
        connectedVehicles: [
          {
            vehicleId: 'CV-014',
            label: 'KA-51-AA-3344',
            coordinates: [77.6410, 12.9140],
            distanceToAmbulanceMeters: 260,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 50000),
            acknowledgedAt: new Date(Date.now() - 35000),
            clearedAt: new Date(Date.now() - 15000)
          },
          {
            vehicleId: 'CV-015',
            label: 'KA-05-BB-5566',
            coordinates: [77.6350, 12.9180],
            distanceToAmbulanceMeters: 420,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 30000),
            acknowledgedAt: new Date(Date.now() - 20000),
            givingWayAt: new Date(Date.now() - 5000)
          },
          {
            vehicleId: 'CV-016',
            label: 'KA-02-CC-7788',
            coordinates: [77.6280, 12.9220],
            distanceToAmbulanceMeters: 550,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 15000)
          }
        ],
        status: 'ACTIVE',
        summary: { totalDetected: 3, totalAlerted: 3, totalGivingWay: 1, totalCleared: 1 }
      },
      {
        clearanceId: 'CLR-DEMO-010',
        vehicleId: 'AMB-10',
        emergencyId: 'E-DEMO-008',
        isSimulated: true,
        simulationCorridor: 'Marathahalli Bridge - Outer Ring Road - Sakra',
        connectedVehicles: [
          {
            vehicleId: 'CV-017',
            label: 'KA-03-DD-9900',
            coordinates: [77.7020, 12.9570],
            distanceToAmbulanceMeters: 200,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 40000),
            acknowledgedAt: new Date(Date.now() - 25000),
            clearedAt: new Date(Date.now() - 10000)
          },
          {
            vehicleId: 'CV-018',
            label: 'KA-53-EE-1133',
            coordinates: [77.6970, 12.9480],
            distanceToAmbulanceMeters: 390,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 20000),
            acknowledgedAt: new Date(Date.now() - 10000),
            givingWayAt: new Date(Date.now() - 3000)
          },
          {
            vehicleId: 'CV-019',
            label: 'KA-50-FF-2244',
            coordinates: [77.6920, 12.9380],
            distanceToAmbulanceMeters: 540,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 8000)
          }
        ],
        status: 'ACTIVE',
        summary: { totalDetected: 3, totalAlerted: 3, totalGivingWay: 1, totalCleared: 1 }
      },
      {
        clearanceId: 'CLR-DEMO-013',
        vehicleId: 'AMB-17',
        emergencyId: 'E-DEMO-013',
        isSimulated: true,
        simulationCorridor: 'Banashankari 100ft Ring Road - Sagar Hospital',
        connectedVehicles: [
          {
            vehicleId: 'CV-020',
            label: 'KA-05-GG-5577',
            coordinates: [77.5580, 12.9270],
            distanceToAmbulanceMeters: 170,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 45000),
            acknowledgedAt: new Date(Date.now() - 30000),
            clearedAt: new Date(Date.now() - 12000)
          },
          {
            vehicleId: 'CV-021',
            label: 'KA-41-HH-6688',
            coordinates: [77.5570, 12.9260],
            distanceToAmbulanceMeters: 310,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 22000),
            acknowledgedAt: new Date(Date.now() - 15000),
            givingWayAt: new Date(Date.now() - 4000)
          },
          {
            vehicleId: 'CV-022',
            label: 'KA-02-II-7799',
            coordinates: [77.5565, 12.9255],
            distanceToAmbulanceMeters: 450,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 10000)
          },
          {
            vehicleId: 'CV-023',
            label: 'KA-04-JJ-8800',
            coordinates: [77.5562, 12.9252],
            distanceToAmbulanceMeters: 580,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 5000)
          }
        ],
        status: 'ACTIVE',
        summary: { totalDetected: 4, totalAlerted: 4, totalGivingWay: 1, totalCleared: 1 }
      },
      {
        clearanceId: 'CLR-DEMO-014',
        vehicleId: 'AMB-18',
        emergencyId: 'E-DEMO-014',
        isSimulated: true,
        simulationCorridor: 'BTM 2nd Stage - Bannerghatta Rd - Jayadeva',
        connectedVehicles: [
          {
            vehicleId: 'CV-024',
            label: 'KA-01-KK-1212',
            coordinates: [77.6080, 12.9160],
            distanceToAmbulanceMeters: 230,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 50000),
            acknowledgedAt: new Date(Date.now() - 32000),
            clearedAt: new Date(Date.now() - 15000)
          },
          {
            vehicleId: 'CV-025',
            label: 'KA-03-LL-3434',
            coordinates: [77.6030, 12.9170],
            distanceToAmbulanceMeters: 370,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 25000),
            acknowledgedAt: new Date(Date.now() - 15000),
            givingWayAt: new Date(Date.now() - 5000)
          },
          {
            vehicleId: 'CV-026',
            label: 'KA-05-MM-5656',
            coordinates: [77.6000, 12.9175],
            distanceToAmbulanceMeters: 490,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 10000)
          }
        ],
        status: 'ACTIVE',
        summary: { totalDetected: 3, totalAlerted: 3, totalGivingWay: 1, totalCleared: 1 }
      },
      {
        clearanceId: 'CLR-DEMO-017',
        vehicleId: 'AMB-21',
        emergencyId: 'E-DEMO-017',
        isSimulated: true,
        simulationCorridor: 'Kengeri Satellite Town - Mysore Rd - BGS Global',
        connectedVehicles: [
          {
            vehicleId: 'CV-027',
            label: 'KA-41-NN-7878',
            coordinates: [77.4880, 12.9120],
            distanceToAmbulanceMeters: 220,
            status: 'CLEARED',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 40000),
            acknowledgedAt: new Date(Date.now() - 28000),
            clearedAt: new Date(Date.now() - 12000)
          },
          {
            vehicleId: 'CV-028',
            label: 'KA-02-OO-9090',
            coordinates: [77.4910, 12.9060],
            distanceToAmbulanceMeters: 360,
            status: 'GIVING_WAY',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 22000),
            acknowledgedAt: new Date(Date.now() - 12000),
            givingWayAt: new Date(Date.now() - 4000)
          },
          {
            vehicleId: 'CV-029',
            label: 'KA-04-PP-1313',
            coordinates: [77.4930, 12.9010],
            distanceToAmbulanceMeters: 480,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 12000)
          },
          {
            vehicleId: 'CV-030',
            label: 'KA-51-QQ-2424',
            coordinates: [77.4945, 12.8970],
            distanceToAmbulanceMeters: 600,
            status: 'ALERT_SENT',
            alertMessage: 'AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER',
            alertSentAt: new Date(Date.now() - 5000)
          }
        ],
        status: 'ACTIVE',
        summary: { totalDetected: 4, totalAlerted: 4, totalGivingWay: 1, totalCleared: 1 }
      }
    ];

    for (const cDef of clearanceSessions) {
      await ClearanceSession.findOneAndUpdate({ clearanceId: cDef.clearanceId }, cDef, { upsert: true, new: true });
    }

    // =========================================================================
    // 6. TRAJECTORY HISTORIES (Part 46: Realistic Sequential Multi-Point Traces)
    // =========================================================================
    const now = Date.now();
    const trajectoryDefs = [];

    // AMB-01 Trace (6 sequential points along Koramangala 80ft corridor)
    const amb01Trace = [
      { coords: [77.6250, 12.9320], heading: 40, speed: 42, tOffset: -600 },
      { coords: [77.6258, 12.9332], heading: 42, speed: 45, tOffset: -480 },
      { coords: [77.6264, 12.9340], heading: 44, speed: 46, tOffset: -360 },
      { coords: [77.6271, 12.9352], heading: 45, speed: 48, tOffset: -240 },
      { coords: [77.6285, 12.9370], heading: 48, speed: 46, tOffset: -120 },
      { coords: [77.6300, 12.9390], heading: 50, speed: 44, tOffset: 0 }
    ];

    for (const pt of amb01Trace) {
      trajectoryDefs.push({
        vehicle: seededVehicles['AMB-01']._id,
        vehicleId: 'AMB-01',
        emergency: seededEmergencies['E-DEMO-001']._id,
        location: { type: 'Point', coordinates: pt.coords },
        speed: pt.speed,
        heading: pt.heading,
        accuracy: 4,
        timestamp: new Date(now + pt.tOffset * 1000)
      });
    }

    // AMB-02 Trace (Hebbal to RT Nagar)
    const amb02Trace = [
      { coords: [77.5940, 13.0450], heading: 175, speed: 52, tOffset: -480 },
      { coords: [77.5932, 13.0400], heading: 175, speed: 48, tOffset: -360 },
      { coords: [77.5925, 13.0358], heading: 175, speed: 45, tOffset: -240 },
      { coords: [77.5910, 13.0280], heading: 176, speed: 42, tOffset: -120 },
      { coords: [77.5895, 13.0210], heading: 178, speed: 40, tOffset: 0 }
    ];

    for (const pt of amb02Trace) {
      trajectoryDefs.push({
        vehicle: seededVehicles['AMB-02']._id,
        vehicleId: 'AMB-02',
        emergency: seededEmergencies['E-DEMO-002']._id,
        location: { type: 'Point', coordinates: pt.coords },
        speed: pt.speed,
        heading: pt.heading,
        accuracy: 4,
        timestamp: new Date(now + pt.tOffset * 1000)
      });
    }

    // AMB-03 Trace (Whitefield)
    const amb03Trace = [
      { coords: [77.7550, 12.9710], heading: 255, speed: 38, tOffset: -360 },
      { coords: [77.7500, 12.9698], heading: 258, speed: 34, tOffset: -240 },
      { coords: [77.7420, 12.9680], heading: 260, speed: 30, tOffset: -120 },
      { coords: [77.7300, 12.9665], heading: 262, speed: 28, tOffset: 0 }
    ];

    for (const pt of amb03Trace) {
      trajectoryDefs.push({
        vehicle: seededVehicles['AMB-03']._id,
        vehicleId: 'AMB-03',
        emergency: seededEmergencies['E-DEMO-003']._id,
        location: { type: 'Point', coordinates: pt.coords },
        speed: pt.speed,
        heading: pt.heading,
        accuracy: 5,
        timestamp: new Date(now + pt.tOffset * 1000)
      });
    }

    // AMB-05 Trace (Electronic City Toll)
    const amb05Trace = [
      { coords: [77.6820, 12.8350], heading: 320, speed: 45, tOffset: -400 },
      { coords: [77.6766, 12.8452], heading: 320, speed: 35, tOffset: -240 },
      { coords: [77.6710, 12.8550], heading: 320, speed: 25, tOffset: -120 },
      { coords: [77.6650, 12.8650], heading: 322, speed: 20, tOffset: 0 }
    ];

    for (const pt of amb05Trace) {
      trajectoryDefs.push({
        vehicle: seededVehicles['AMB-05']._id,
        vehicleId: 'AMB-05',
        emergency: seededEmergencies['E-DEMO-005']._id,
        location: { type: 'Point', coordinates: pt.coords },
        speed: pt.speed,
        heading: pt.heading,
        accuracy: 4,
        timestamp: new Date(now + pt.tOffset * 1000)
      });
    }

    // Additional sequential traces across the fleet to generate 250+ breadcrumbs
    const fleetTraceConfigs = [
      { vId: 'AMB-04', eId: 'E-DEMO-004', start: [77.5963, 13.1007], dest: [77.5900, 13.0600], speed: 52, heading: 180 },
      { vId: 'AMB-07', eId: 'E-DEMO-006', start: [77.6412, 12.9784], dest: [77.6483, 12.9582], speed: 38, heading: 130 },
      { vId: 'AMB-09', eId: 'E-DEMO-007', start: [77.6389, 12.9116], dest: [77.6200, 12.9315], speed: 34, heading: 290 },
      { vId: 'AMB-10', eId: 'E-DEMO-008', start: [77.7011, 12.9592], dest: [77.6890, 12.9288], speed: 46, heading: 215 },
      { vId: 'AMB-11', eId: 'E-DEMO-009', start: [77.5833, 12.9298], dest: [77.5739, 12.9634], speed: 40, heading: 345 },
      { vId: 'AMB-12', eId: 'E-DEMO-010', start: [77.5855, 12.9063], dest: [77.5980, 12.8920], speed: 42, heading: 140 },
      { vId: 'AMB-13', eId: 'E-DEMO-011', start: [77.5550, 12.9980], dest: [77.5855, 13.0310], speed: 48, heading: 40 },
      { vId: 'AMB-17', eId: 'E-DEMO-013', start: [77.5560, 12.9250], dest: [77.5600, 12.9300], speed: 35, heading: 60 },
      { vId: 'AMB-18', eId: 'E-DEMO-014', start: [77.6100, 12.9150], dest: [77.5980, 12.9180], speed: 45, heading: 280 },
      { vId: 'AMB-19', eId: 'E-DEMO-015', start: [77.5380, 12.9710], dest: [77.5739, 12.9634], speed: 38, heading: 85 },
      { vId: 'AMB-21', eId: 'E-DEMO-017', start: [77.4850, 12.9150], dest: [77.4950, 12.8950], speed: 50, heading: 145 },
      { vId: 'AMB-23', eId: 'E-DEMO-032', start: [77.6960, 13.0020], dest: [77.6750, 12.9980], speed: 36, heading: 260 },
      { vId: 'AMB-24', eId: 'E-DEMO-018', start: [77.6820, 12.9080], dest: [77.6750, 12.9200], speed: 42, heading: 325 },
      { vId: 'AMB-26', eId: 'E-DEMO-035', start: [77.6120, 12.9980], dest: [77.6033, 12.9833], speed: 38, heading: 200 },
      { vId: 'AMB-27', eId: 'E-DEMO-036', start: [77.6480, 12.9550], dest: [77.6033, 12.9833], speed: 40, heading: 310 },
      { vId: 'AMB-29', eId: 'E-DEMO-038', start: [77.6950, 12.9850], dest: [77.6483, 12.9582], speed: 44, heading: 220 },
      { vId: 'AMB-31', eId: 'E-DEMO-040', start: [77.5920, 13.0250], dest: [77.5855, 13.0310], speed: 42, heading: 330 },
      { vId: 'AMB-32', eId: 'E-DEMO-041', start: [77.6880, 12.8420], dest: [77.6200, 12.9315], speed: 54, heading: 335 },
      { vId: 'AMB-34', eId: 'E-DEMO-034', start: [77.5650, 12.9050], dest: [77.5980, 12.8920], speed: 38, heading: 110 },
      { vId: 'AMB-35', eId: 'E-DEMO-033', start: [77.7180, 12.9660], dest: [77.6890, 12.9288], speed: 46, heading: 235 }
    ];

    for (const cfg of fleetTraceConfigs) {
      const veh = seededVehicles[cfg.vId];
      const emg = seededEmergencies[cfg.eId];
      if (!veh) continue;
      const numSteps = 10;
      for (let s = 0; s < numSteps; s++) {
        const ratio = s / (numSteps - 1);
        const lng = cfg.start[0] + (cfg.dest[0] - cfg.start[0]) * ratio + (Math.random() - 0.5) * 0.0008;
        const lat = cfg.start[1] + (cfg.dest[1] - cfg.start[1]) * ratio + (Math.random() - 0.5) * 0.0008;
        trajectoryDefs.push({
          vehicle: veh._id,
          vehicleId: cfg.vId,
          emergency: emg?._id || seededEmergencies['E-DEMO-001']._id,
          location: { type: 'Point', coordinates: [lng, lat] },
          speed: Math.max(15, cfg.speed + (Math.random() - 0.5) * 10),
          heading: (cfg.heading + (Math.random() - 0.5) * 10 + 360) % 360,
          accuracy: 4,
          timestamp: new Date(now - (numSteps - s) * 45 * 1000)
        });
      }
    }

    await Trajectory.insertMany(trajectoryDefs);

    // =========================================================================
    // 7. PREDICTIONS & DECISIONS (Parts 51 & 52)
    // =========================================================================
    const decisionDefs = [
      {
        decisionId: 'DEC-DEMO-001',
        emergency: seededEmergencies['E-DEMO-001']._id,
        vehicle: seededVehicles['AMB-01']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE', 'ALERT_CONTROL_ROOM'],
        reasonCodes: ['CONGESTION_SPIKE', 'COLLISION_BOTTLENECK'],
        geoAgentRecommendation: {
          action: 'REROUTE',
          confidence: 0.94,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'CRITICAL',
          emergencyStatus: 'IN_PROGRESS',
          trafficLevel: 'HEAVY',
          delayMinutes: 6,
          correlatedIncidentIds: ['INC-DEMO-001']
        },
        situationHash: 'hash-demo-001-reroute',
        status: 'PENDING_OPERATOR_ACTION',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-002',
        emergency: seededEmergencies['E-DEMO-002']._id,
        vehicle: seededVehicles['AMB-02']._id,
        severity: 'HIGH',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['ROAD_CLOSURE_DETECTED'],
        geoAgentRecommendation: {
          action: 'REROUTE',
          confidence: 0.91,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'HIGH',
          emergencyStatus: 'IN_PROGRESS',
          trafficLevel: 'MODERATE',
          delayMinutes: 4,
          correlatedIncidentIds: ['INC-DEMO-002']
        },
        situationHash: 'hash-demo-002-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-003',
        emergency: seededEmergencies['E-DEMO-003']._id,
        vehicle: seededVehicles['AMB-03']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['DEVIATION_DETECTED', 'CONGESTION_AVOIDANCE'],
        geoAgentRecommendation: {
          action: 'REROUTE',
          confidence: 0.88,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'CRITICAL',
          deviationStatus: 'DEVIATED',
          deviationDistanceMeters: 92,
          trafficLevel: 'SEVERE',
          delayMinutes: 7
        },
        situationHash: 'hash-demo-003-reroute',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-004',
        emergency: seededEmergencies['E-DEMO-004']._id,
        vehicle: seededVehicles['AMB-04']._id,
        severity: 'NORMAL',
        primaryAction: 'CONTINUE',
        actions: ['CONTINUE'],
        reasonCodes: ['ROUTE_OPTIMAL', 'CORRIDOR_CLEAR'],
        geoAgentRecommendation: {
          action: 'CONTINUE',
          confidence: 0.96,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'MEDIUM',
          trafficLevel: 'NORMAL',
          delayMinutes: 0
        },
        situationHash: 'hash-demo-004-continue',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-005',
        emergency: seededEmergencies['E-DEMO-005']._id,
        vehicle: seededVehicles['AMB-05']._id,
        severity: 'CRITICAL',
        primaryAction: 'CONSIDER_BACKUP',
        actions: ['CONSIDER_BACKUP', 'ALERT_CONTROL_ROOM'],
        reasonCodes: ['SEVERE_DELAY_RISK', 'PATIENT_CRITICALITY'],
        geoAgentRecommendation: {
          action: 'CONSIDER_BACKUP',
          confidence: 0.92,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'CRITICAL',
          trafficLevel: 'SEVERE',
          delayMinutes: 14,
          correlatedIncidentIds: ['INC-DEMO-004']
        },
        situationHash: 'hash-demo-005-backup',
        status: 'PENDING_OPERATOR_ACTION',
        backup: {
          recommended: true,
          candidateVehicleId: 'AMB-06',
          backupEtaMinutes: 4,
          currentEtaMinutes: 18
        }
      },
      {
        decisionId: 'DEC-DEMO-006',
        emergency: seededEmergencies['E-DEMO-006']._id,
        vehicle: seededVehicles['AMB-07']._id,
        severity: 'HIGH',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['FALLEN_TREE_OBSTRUCTION', 'PEDIATRIC_SEIZURE_URGENCY'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.93, fallback: false },
        inputSnapshot: { emergencyPriority: 'HIGH', trafficLevel: 'HEAVY', delayMinutes: 5 },
        situationHash: 'hash-demo-006-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-007',
        emergency: seededEmergencies['E-DEMO-007']._id,
        vehicle: seededVehicles['AMB-09']._id,
        severity: 'HIGH',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['WATERLOGGING_BYPASS', 'DEVIATION_CORRECTION'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.9, fallback: false },
        inputSnapshot: { emergencyPriority: 'HIGH', trafficLevel: 'HEAVY', delayMinutes: 4 },
        situationHash: 'hash-demo-007-reroute',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-008',
        emergency: seededEmergencies['E-DEMO-008']._id,
        vehicle: seededVehicles['AMB-10']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE', 'V2X_CLEARANCE_ACTIVE'],
        reasonCodes: ['FLYOVER_TRUCK_BREAKDOWN', 'CRITICAL_BURN_TRAUMA'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.95, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'SEVERE', delayMinutes: 6 },
        situationHash: 'hash-demo-008-reroute',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-009',
        emergency: seededEmergencies['E-DEMO-009']._id,
        vehicle: seededVehicles['AMB-11']._id,
        severity: 'NORMAL',
        primaryAction: 'NO_ACTION',
        actions: ['NO_ACTION'],
        reasonCodes: ['ON_SCHEDULE', 'ARTERIAL_CLEAR'],
        geoAgentRecommendation: {
          action: 'NO_ACTION',
          confidence: 0.95,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'LOW',
          trafficLevel: 'LIGHT',
          delayMinutes: 0
        },
        situationHash: 'hash-demo-009-noaction',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-010',
        emergency: seededEmergencies['E-DEMO-010']._id,
        vehicle: seededVehicles['AMB-12']._id,
        severity: 'HIGH',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['SARAKKI_RING_ROAD_BYPASS'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.89, fallback: false },
        inputSnapshot: { emergencyPriority: 'HIGH', trafficLevel: 'HEAVY', delayMinutes: 4 },
        situationHash: 'hash-demo-010-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-011',
        emergency: seededEmergencies['E-DEMO-011']._id,
        vehicle: seededVehicles['AMB-13']._id,
        severity: 'NORMAL',
        primaryAction: 'CONTINUE',
        actions: ['CONTINUE'],
        reasonCodes: ['FLYOVER_TRANSIT_OPTIMAL'],
        geoAgentRecommendation: { action: 'CONTINUE', confidence: 0.94, fallback: false },
        inputSnapshot: { emergencyPriority: 'HIGH', trafficLevel: 'MODERATE', delayMinutes: 0 },
        situationHash: 'hash-demo-011-continue',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-012',
        emergency: seededEmergencies['E-DEMO-012']._id,
        vehicle: seededVehicles['AMB-08']._id,
        severity: 'CRITICAL',
        primaryAction: 'CONSIDER_BACKUP',
        actions: ['CONSIDER_BACKUP'],
        reasonCodes: ['MARKET_OBSTRUCTION', 'PEDIATRIC_OBSTETRIC_URGENCY'],
        geoAgentRecommendation: {
          action: 'CONSIDER_BACKUP',
          confidence: 0.89,
          fallback: false
        },
        inputSnapshot: {
          emergencyPriority: 'CRITICAL',
          trafficLevel: 'HEAVY',
          delayMinutes: 9,
          correlatedIncidentIds: ['INC-DEMO-009']
        },
        situationHash: 'hash-demo-012-backup',
        status: 'PENDING_OPERATOR_ACTION',
        backup: {
          recommended: true,
          candidateVehicleId: 'AMB-13',
          backupEtaMinutes: 5,
          currentEtaMinutes: 14
        }
      },
      {
        decisionId: 'DEC-DEMO-013',
        emergency: seededEmergencies['E-DEMO-013']._id,
        vehicle: seededVehicles['AMB-17']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE', 'V2X_CLEARANCE_ACTIVE'],
        reasonCodes: ['AORTIC_DISSECTION_CRITICAL', 'RING_ROAD_BYPASS'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.96, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'HEAVY', delayMinutes: 5 },
        situationHash: 'hash-demo-013-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-014',
        emergency: seededEmergencies['E-DEMO-014']._id,
        vehicle: seededVehicles['AMB-18']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE', 'V2X_CLEARANCE_ACTIVE'],
        reasonCodes: ['CARDIAC_ARREST_IMMEDIATE_CATH_LAB', 'SILK_BOARD_BYPASS'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.97, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'SEVERE', delayMinutes: 7 },
        situationHash: 'hash-demo-014-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-015',
        emergency: seededEmergencies['E-DEMO-015']._id,
        vehicle: seededVehicles['AMB-19']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['TOLLGATE_GRIDLOCK_AVOIDANCE', 'MYSORE_RD_FLYOVER_PRIORITY'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.92, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'HEAVY', delayMinutes: 6 },
        situationHash: 'hash-demo-015-reroute',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-016',
        emergency: seededEmergencies['E-DEMO-016']._id,
        vehicle: seededVehicles['AMB-20']._id,
        severity: 'NORMAL',
        primaryAction: 'CONTINUE',
        actions: ['CONTINUE'],
        reasonCodes: ['ARTERIAL_GREEN_WAVE_OPTIMAL'],
        geoAgentRecommendation: { action: 'CONTINUE', confidence: 0.95, fallback: false },
        inputSnapshot: { emergencyPriority: 'HIGH', trafficLevel: 'LIGHT', delayMinutes: 0 },
        situationHash: 'hash-demo-016-continue',
        status: 'EXECUTED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-017',
        emergency: seededEmergencies['E-DEMO-017']._id,
        vehicle: seededVehicles['AMB-21']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE', 'V2X_CLEARANCE_ACTIVE'],
        reasonCodes: ['CONSTRUCTION_COLLAPSE_BYPASS', 'EXPRESSWAY_PRIORITY'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.94, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'SEVERE', delayMinutes: 8 },
        situationHash: 'hash-demo-017-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-018',
        emergency: seededEmergencies['E-DEMO-018']._id,
        vehicle: seededVehicles['AMB-24']._id,
        severity: 'HIGH',
        primaryAction: 'REROUTE',
        actions: ['REROUTE'],
        reasonCodes: ['WIPRO_GATE_CONGESTION_BYPASS', 'DEVIATION_ALERT'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.91, fallback: false },
        inputSnapshot: { emergencyPriority: 'HIGH', trafficLevel: 'HEAVY', delayMinutes: 6 },
        situationHash: 'hash-demo-018-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      },
      {
        decisionId: 'DEC-DEMO-019',
        emergency: seededEmergencies['E-DEMO-032']._id,
        vehicle: seededVehicles['AMB-23']._id,
        severity: 'CRITICAL',
        primaryAction: 'CONSIDER_BACKUP',
        actions: ['CONSIDER_BACKUP', 'ALERT_CONTROL_ROOM'],
        reasonCodes: ['TOXIC_HAZMAT_PERIMETER', 'TIN_FACTORY_CONSTRUCTION_DELAY'],
        geoAgentRecommendation: { action: 'CONSIDER_BACKUP', confidence: 0.93, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'SEVERE', delayMinutes: 12 },
        situationHash: 'hash-demo-019-backup',
        status: 'PENDING_OPERATOR_ACTION',
        backup: { recommended: true, candidateVehicleId: 'AMB-03', backupEtaMinutes: 4, currentEtaMinutes: 16 }
      },
      {
        decisionId: 'DEC-DEMO-020',
        emergency: seededEmergencies['E-DEMO-041']._id,
        vehicle: seededVehicles['AMB-32']._id,
        severity: 'CRITICAL',
        primaryAction: 'REROUTE',
        actions: ['REROUTE', 'V2X_CLEARANCE_ACTIVE'],
        reasonCodes: ['EXPRESSWAY_RAMP_PILEUP', 'FAST_TRACK_CARDIAC_TRAUMA'],
        geoAgentRecommendation: { action: 'REROUTE', confidence: 0.96, fallback: false },
        inputSnapshot: { emergencyPriority: 'CRITICAL', trafficLevel: 'SEVERE', delayMinutes: 10 },
        situationHash: 'hash-demo-020-reroute',
        status: 'APPROVED',
        backup: { recommended: false }
      }
    ];

    for (const dDef of decisionDefs) {
      await Decision.findOneAndUpdate(
        { decisionId: dDef.decisionId },
        dDef,
        { upsert: true, new: true }
      );
    }

    // Counts verification
    const vCount = await Vehicle.countDocuments({ vehicleId: /^AMB-/ });
    const eCount = await Emergency.countDocuments({ emergencyId: /^E-DEMO-/ });
    const iCount = await Incident.countDocuments({ incidentId: /^INC-DEMO-/ });
    const rCount = await Route.countDocuments({ routeId: /^ROUTE-DEMO-/ });
    const tCount = await Trajectory.countDocuments();
    const cCount = await ClearanceSession.countDocuments({ clearanceId: /^CLR-DEMO-/ });
    const dCount = await Decision.countDocuments({ decisionId: /^DEC-DEMO-/ });

    return {
      success: true,
      message: 'Comprehensive 25+ demo dataset successfully seeded in MongoDB.',
      stats: {
        vehiclesCount: vCount,
        emergenciesCount: eCount,
        incidentsCount: iCount,
        routesCount: rCount,
        trajectoriesCount: tCount,
        clearanceSessionsCount: cCount,
        decisionsCount: dCount
      }
    };
  }
}

const demoService = new DemoService();
export default demoService;
