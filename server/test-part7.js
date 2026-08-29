import {
  calculateDistance,
  distanceToRoute,
  nearestPointOnRoute,
  calculateBearing,
  calculateRouteLength,
  calculateRouteProgress,
  getRouteBearingAtPoint,
  createPoint
} from './shared/services/geospatial.service.js';
import deviationService from './modules/deviation/deviation.service.js';
import trafficService from './modules/traffic/traffic.service.js';
import analysisService from './modules/analysis/analysis.service.js';

console.log('=== RUNNING PART 7 UNIT & LOGIC TESTS ===\n');

// 1. Test Geospatial Progress & Bearing
const routeLine = {
  type: 'LineString',
  coordinates: [
    [77.5946, 12.9716], // Start: Bengaluru center
    [77.6100, 12.9750], // Midpoint
    [77.6400, 12.9800]  // End
  ]
};

const pointOnStart = createPoint(77.5946, 12.9716);
const progressStart = calculateRouteProgress(pointOnStart, routeLine);
console.log('1. Route Progress at Start:', progressStart);
if (progressStart.progressPercentage !== 0) throw new Error('Progress at start should be 0%');

const pointNearEnd = createPoint(77.6390, 12.9798);
const progressEnd = calculateRouteProgress(pointNearEnd, routeLine);
console.log('2. Route Progress near End:', progressEnd);
if (progressEnd.progressPercentage < 90) throw new Error('Progress near end should be > 90%');

const bearing = getRouteBearingAtPoint(routeLine, pointOnStart);
console.log('3. Route bearing at start:', bearing);
if (typeof bearing !== 'number' || bearing < 0 || bearing > 360) throw new Error('Invalid bearing');

// 2. Test Deviation Engine
// Point directly on route
const onRoutePoint = createPoint(77.6100, 12.9750);
const devOnRoute = deviationService.analyzeDeviation(onRoutePoint, routeLine, [], bearing);
console.log('4. Deviation (On Route):', devOnRoute.status, 'Distance:', devOnRoute.distanceMeters || devOnRoute.distanceFromRouteMeters);
if (devOnRoute.status !== 'ON_ROUTE') throw new Error('Expected ON_ROUTE');

// Point ~150m away (deviated)
const deviatedPoint = createPoint(77.6115, 12.9770);
const devResult = deviationService.analyzeDeviation(deviatedPoint, routeLine, [], 180);
console.log('5. Deviation (Deviated point):', devResult.status, 'Distance:', devResult.distanceFromRouteMeters, 'BearingDiff:', devResult.bearingDifferenceDegrees);
if (devResult.status !== 'DEVIATED' && devResult.status !== 'CRITICAL_DEVIATION') {
  throw new Error(`Expected DEVIATED or CRITICAL_DEVIATION, got ${devResult.status}`);
}

// Point far away (>300m) (critical deviation)
const farPoint = createPoint(77.6200, 12.9900);
const devCritical = deviationService.analyzeDeviation(farPoint, routeLine, [], 0);
console.log('6. Deviation (Far point):', devCritical.status, 'Distance:', devCritical.distanceFromRouteMeters);
if (devCritical.status !== 'CRITICAL_DEVIATION') throw new Error('Expected CRITICAL_DEVIATION');

// GPS Jitter handling
const jitteryTrajs = [
  { location: createPoint(77.6115, 12.9770), speed: 20, heading: 45 },
  { location: createPoint(77.6100, 12.9750), speed: 20, heading: 45 },
  { location: createPoint(77.6120, 12.9780), speed: 20, heading: 45 }
];
const devJitter = deviationService.analyzeDeviation(deviatedPoint, routeLine, jitteryTrajs, 45);
console.log('7. GPS Stability with jitter:', devJitter.gpsStability, 'Confidence:', devJitter.confidence);

// 3. Test Traffic Service
const trafficLoc = await trafficService.getTrafficForLocation(onRoutePoint);
console.log('8. Traffic for location:', trafficLoc);
if (!trafficLoc.level || !trafficLoc.speedKmh) throw new Error('Invalid traffic data');

const trafficRoute = await trafficService.getTrafficForRoute(routeLine);
console.log('9. Traffic for route:', trafficRoute);
if (!trafficRoute.level || !trafficRoute.speedKmh) throw new Error('Invalid route traffic data');

// 4. Test ETA & Delay Engine
const etaTest1 = analysisService.calculateETAAndDelay(5000, 30, trafficLoc, 600);
console.log('10. ETA calculation (Normal):', etaTest1);
if (etaTest1.status !== 'AVAILABLE' || typeof etaTest1.currentMinutes !== 'number') throw new Error('Invalid ETA');

// Zero speed guard
const etaZeroSpeed = analysisService.calculateETAAndDelay(5000, 0, { speedKmh: 0 }, 600);
console.log('11. ETA calculation (Zero speed guard):', etaZeroSpeed);
if (!isFinite(etaZeroSpeed.currentMinutes) || isNaN(etaZeroSpeed.currentMinutes)) throw new Error('Zero speed resulted in non-finite ETA');

// Time saved vs delay
const etaFaster = analysisService.calculateETAAndDelay(1000, 60, { speedKmh: 60 }, 1200);
console.log('12. ETA calculation (Faster arrival):', etaFaster);
if (etaFaster.delayMinutes !== 0 || etaFaster.timeSavedMinutes <= 0) throw new Error('Faster arrival should have delay=0 and positive timeSaved');

// 5. Test Evidence Builder
const evidence = analysisService.buildEvidenceList(
  { status: 'DEVIATED', gpsStability: 'STABLE' },
  { level: 'HEAVY' },
  [{ type: 'ACCIDENT' }],
  10
);
console.log('13. Evidence list:', evidence);
if (!evidence.includes('ROUTE_DEVIATION') || !evidence.includes('HEAVY_TRAFFIC') || !evidence.includes('ACCIDENT_NEAR_ROUTE') || !evidence.includes('LOW_VEHICLE_SPEED')) {
  throw new Error('Evidence list missing expected items');
}

console.log('\n=== ALL PART 7 UNIT & LOGIC TESTS PASSED SUCCESSFULLY! ===');
