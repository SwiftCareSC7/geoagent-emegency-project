import type { Emergency, Vehicle, Incident, Route, Trajectory } from './api/types'

export const DEMO_VEHICLES: Vehicle[] = [
  {
    id: 'veh-demo-01',
    vehicleId: 'AMB-DEMO-01',
    registrationNumber: 'KA-01-DEMO-991',
    type: 'AMBULANCE',
    status: 'EN_ROUTE',
    driverName: 'Kavita Rao',
    driverContact: '+91 98450 11991',
    capacity: 2,
    location: { type: 'Point', coordinates: [77.6175, 12.9755] },
    speed: 38.0,
    heading: 85,
    hospitalName: 'Manipal Hospital HAL Old Airport Rd',
    hospitalCode: 'MH-HAL-01',
  },
  {
    id: 'veh-102',
    vehicleId: 'AMB-102',
    registrationNumber: 'KA-03-EMG-204',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    driverName: 'Rajesh Kumar',
    driverContact: '+91 98765 43211',
    capacity: 1,
    location: { type: 'Point', coordinates: [77.6380, 12.9650] },
    speed: 0,
    heading: 0,
    hospitalName: 'Manipal Hospital HAL Old Airport Rd',
    hospitalCode: 'MH-HAL-01',
  },
  {
    id: 'veh-103',
    vehicleId: 'AMB-103',
    registrationNumber: 'KA-05-MED-309',
    type: 'AMBULANCE',
    status: 'DISPATCHED',
    driverName: 'Suresh Patel',
    driverContact: '+91 98765 43212',
    capacity: 1,
    location: { type: 'Point', coordinates: [77.6200, 12.9750] },
    speed: 35.0,
    heading: 110,
    hospitalName: 'Manipal Hospital HAL Old Airport Rd',
    hospitalCode: 'MH-HAL-01',
  },
]

export const DEMO_EMERGENCIES: Emergency[] = [
  {
    id: 'emg-demo-001',
    emergencyId: 'E-DEMO-001',
    type: 'MEDICAL',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    description: 'Acute myocardial infarction alert near Mayo Hall Junction. Transit corridor to Manipal Hospital Cath Lab.',
    location: { type: 'Point', coordinates: [77.6030, 12.9730] },
    destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
    assignedVehicle: {
      vehicleId: 'AMB-DEMO-01',
      registrationNumber: 'KA-01-DEMO-991',
      status: 'EN_ROUTE',
    },
    callerName: 'Dr. Anand Raman',
    callerContact: '+91 98450 55001',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'emg-demo-002',
    emergencyId: 'EMG-2026-002',
    type: 'ACCIDENT',
    priority: 'HIGH',
    status: 'DISPATCHED',
    description: 'Multi-vehicle collision on 100 Feet Road. Structural traffic delay on planned corridor.',
    location: { type: 'Point', coordinates: [77.6180, 12.9690] },
    destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
    assignedVehicle: {
      vehicleId: 'AMB-103',
      registrationNumber: 'KA-05-MED-309',
      status: 'DISPATCHED',
    },
    callerName: 'Priya Nair',
    callerContact: '+91 98765 44332',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'inc-demo-01',
    incidentId: 'INC-DEMO-01',
    type: 'ACCIDENT',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    description: 'Multi-vehicle crash with structural bottleneck near Trinity Overpass. Free-flow speed reduced to 11 km/h.',
    location: { type: 'Point', coordinates: [77.6180, 12.9690] },
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
]

export const DEMO_ROUTES: Record<string, Route[]> = {
  'E-DEMO-001': [
    {
      id: 'route-demo-01',
      routeId: 'ROUTE-DEMO-01',
      emergency: 'E-DEMO-001',
      vehicle: 'AMB-DEMO-01',
      origin: { type: 'Point', coordinates: [77.6030, 12.9730] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      distance: 5500,
      duration: 600,
      distanceMeters: 5500,
      durationSeconds: 600,
      provider: 'GOOGLE',
      routeType: 'PLANNED',
      status: 'ACTIVE',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6030, 12.9730],
          [77.6065, 12.9725],
          [77.6100, 12.9720],
          [77.6180, 12.9690],
          [77.6300, 12.9640],
          [77.6400, 12.9600],
          [77.6483, 12.9582],
        ],
      },
    },
    {
      id: 'route-demo-alt',
      routeId: 'ROUTE-DEMO-ALT',
      emergency: 'E-DEMO-001',
      vehicle: 'AMB-DEMO-01',
      origin: { type: 'Point', coordinates: [77.6030, 12.9730] },
      destination: { type: 'Point', coordinates: [77.6483, 12.9582] },
      distance: 5200,
      duration: 520,
      distanceMeters: 5200,
      durationSeconds: 520,
      provider: 'GOOGLE',
      routeType: 'ALTERNATIVE',
      status: 'ACTIVE',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.6030, 12.9730],
          [77.6135, 12.9740],
          [77.6215, 12.9750],
          [77.6320, 12.9710],
          [77.6420, 12.9620],
          [77.6483, 12.9582],
        ],
      },
    },
  ],
}

export const DEMO_TRAJECTORIES: Record<string, Trajectory[]> = {
  'AMB-DEMO-01': [
    { id: 'traj-1', vehicleId: 'AMB-DEMO-01', location: { type: 'Point', coordinates: [77.6030, 12.9730] }, speed: 45, heading: 90, timestamp: new Date(Date.now() - 80000).toISOString(), source: 'SIMULATOR', createdAt: '' },
    { id: 'traj-2', vehicleId: 'AMB-DEMO-01', location: { type: 'Point', coordinates: [77.6065, 12.9725] }, speed: 26, heading: 95, timestamp: new Date(Date.now() - 60000).toISOString(), source: 'SIMULATOR', createdAt: '' },
    { id: 'traj-3', vehicleId: 'AMB-DEMO-01', location: { type: 'Point', coordinates: [77.6100, 12.9720] }, speed: 11, heading: 100, timestamp: new Date(Date.now() - 40000).toISOString(), source: 'SIMULATOR', createdAt: '' },
    { id: 'traj-4', vehicleId: 'AMB-DEMO-01', location: { type: 'Point', coordinates: [77.6135, 12.9740] }, speed: 32, heading: 45, timestamp: new Date(Date.now() - 20000).toISOString(), source: 'SIMULATOR', createdAt: '' },
    { id: 'traj-5', vehicleId: 'AMB-DEMO-01', location: { type: 'Point', coordinates: [77.6175, 12.9755] }, speed: 38, heading: 85, timestamp: new Date().toISOString(), source: 'SIMULATOR', createdAt: '' },
  ],
}

export const DEMO_DEVIATION = {
  status: 'DEVIATED',
  distanceFromRouteMeters: 175,
  bearingDivergenceDegrees: 35,
  isDeviated: true,
  riskLevel: 'HIGH',
  evaluatedAt: new Date().toISOString(),
}

export const DEMO_PREDICTION = {
  predictedArrival: new Date(Date.now() + 10 * 60000).toISOString(),
  predictedDelayMinutes: 8.4,
  delayRisk: 'HIGH',
  routeRisk: 'HIGH',
  confidenceScore: 0.88,
  rerouteAdvised: true,
  recommendedRouteId: 'ROUTE-DEMO-ALT',
  estimatedTimeSavedMinutes: 6.0,
  factors: [
    { factor: 'Trinity Overpass Incident Congestion', impact: '+5.2m', epistemicType: 'OBSERVED' },
    { factor: 'Vehicle Deceleration on Approach', impact: '+3.2m', epistemicType: 'OBSERVED' },
    { factor: 'V2X Green-Wave Corridor Bypass', impact: '-1.6m', epistemicType: 'INFERRED' },
  ],
}

export const DEMO_DECISION = {
  decisionId: 'DEC-DEMO-01',
  emergencyId: 'E-DEMO-001',
  vehicleId: 'AMB-DEMO-01',
  routeId: 'ROUTE-DEMO-01',
  primaryAction: 'REROUTE',
  action: 'REROUTE',
  severity: 'CRITICAL',
  status: 'PENDING_OPERATOR_ACTION',
  reasonCodes: ['CORRIDOR_BLOCKED', 'PREDICTION_CRITICAL_DELAY', 'ALTERNATIVE_ROUTE_AVAILABLE'],
  situationHash: 'cbbd815596b7596e',
  details: {
    summary: 'Reroute to Alternative Bypass ROUTE-DEMO-ALT via 100ft Rd',
    reasoning: [
      'Incident INC-DEMO-01 caused 8.4m predicted delay on primary corridor.',
      'Alternative route ROUTE-DEMO-ALT saves ~6 minutes with V2X signal clearance.',
      'Awaiting control room operator authorization.',
    ],
  },
  evaluatedAt: new Date().toISOString(),
}
