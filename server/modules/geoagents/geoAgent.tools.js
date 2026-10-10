import analysisService from '../analysis/analysis.service.js';
import predictionService from '../analysis/prediction.service.js';
import routingService from '../routes/routing.service.js';
import corridorGreenWaveService from '../routes/corridorGreenWave.service.js';
import trafficService from '../traffic/traffic.service.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import Decision from '../decisions/decision.model.js';
import Incident from '../incidents/incident.model.js';
import { createPoint, calculateDistance, validateCoordinates } from '../../shared/services/geospatial.service.js';
import { geoAgentConstants } from './geoagent.constants.js';
import { sanitizeText } from './geoagent.schemas.js';

const SAFE_SCOPE_MESSAGE = 'Requested resource is outside the current analysis scope';
const SAFE_ARG_MESSAGE = 'Invalid tool argument';

/**
 * Operational tool error — never include stack/DB details in message for model/clients.
 */
export class GeoAgentToolError extends Error {
  constructor(code, message = SAFE_SCOPE_MESSAGE) {
    super(message);
    this.name = 'GeoAgentToolError';
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Declarative Tool Definitions for LLM Function Calling (OpenAI-compatible JSON schema)
 */
export const geoAgentToolDeclarations = [
  {
    name: 'getEmergencyState',
    description: 'Retrieve current operational status, priority, location, and assigned resources for the scoped emergency incident.',
    parameters: {
      type: 'object',
      properties: {
        emergencyId: {
          type: 'string',
          description: 'Must match the current analysis emergency identifier'
        }
      },
      required: ['emergencyId']
    }
  },
  {
    name: 'getVehicleState',
    description: 'Retrieve real-time operational status, telemetry timestamp, and latest coordinates for the scoped emergency vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'Must match the current analysis vehicle identifier'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getRecentTrajectory',
    description: 'Retrieve recent chronological GPS trajectory fixes for the scoped vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'Must match the current analysis vehicle identifier'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of recent trajectory points to return (default: 20)'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getCurrentRoute',
    description: 'Retrieve active planned route corridor details for the scoped vehicle / emergency.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'Must match the current analysis vehicle identifier'
        },
        routeId: {
          type: 'string',
          description: 'Optional route identifier that must belong to the scoped vehicle'
        }
      }
    }
  },
  {
    name: 'getRouteAlternatives',
    description: 'Calculate alternative candidate routes for the scoped emergency using server-authoritative origin and destination (model coordinates are ignored).',
    parameters: {
      type: 'object',
      properties: {
        originLng: { type: 'number', description: 'Ignored; origin comes from scoped mission' },
        originLat: { type: 'number', description: 'Ignored; origin comes from scoped mission' },
        destLng: { type: 'number', description: 'Ignored; destination comes from scoped mission' },
        destLat: { type: 'number', description: 'Ignored; destination comes from scoped mission' }
      }
    }
  },
  {
    name: 'getTrafficAnalysis',
    description: 'Query live traffic near the scoped mission. Coordinates must be near the mission; otherwise use vehicle/emergency location.',
    parameters: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Target longitude near the scoped mission' },
        latitude: { type: 'number', description: 'Target latitude near the scoped mission' }
      }
    }
  },
  {
    name: 'getPrediction',
    description: 'Retrieve quantitative ETA and delay prediction for the scoped emergency vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'Must match the current analysis vehicle identifier'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getNearbyIncidents',
    description: 'Query active road incidents near the scoped mission with a bounded search radius.',
    parameters: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Target longitude near the scoped mission' },
        latitude: { type: 'number', description: 'Target latitude near the scoped mission' },
        radiusMeters: { type: 'number', description: 'Search radius in meters (capped)' }
      }
    }
  },
  {
    name: 'getDecisionHistory',
    description: 'Retrieve historical operational decisions for the scoped emergency only.',
    parameters: {
      type: 'object',
      properties: {
        emergencyId: { type: 'string', description: 'Must match the current analysis emergency identifier' },
        vehicleId: { type: 'string', description: 'Must match the current analysis vehicle identifier if provided' },
        limit: { type: 'number', description: 'Maximum records to return (default: 10)' }
      }
    }
  },
  {
    name: 'getVehicleSituation',
    description: 'Retrieve complete real-time situation analysis for the scoped emergency vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'Must match the current analysis vehicle identifier'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getNearbyAvailableVehicles',
    description: 'Find AVAILABLE backup ambulances near the scoped emergency location using observed telemetry and derived distance/ETA (or UNKNOWN when unavailable).',
    parameters: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Ignored; search center is scoped emergency location' },
        latitude: { type: 'number', description: 'Ignored; search center is scoped emergency location' },
        maxDistanceKm: { type: 'number', description: 'Maximum search radius in kilometers (capped)' }
      }
    }
  },
  {
    name: 'getCorridorGreenWaveStatus',
    description: 'Retrieve V2X traffic signal preemption and corridor green-wave status for the scoped emergency vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'Must match the current analysis vehicle identifier'
        }
      },
      required: ['vehicleId']
    }
  }
];

/** Normalize and freeze analysis scope established by the application (never by the model). */
export function normalizeAnalysisScope(scope, { optional = false } = {}) {
  if (!scope || typeof scope !== 'object') {
    if (optional) return null;
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  const emergencyId = typeof scope.emergencyId === 'string' ? scope.emergencyId.trim() : '';
  const vehicleId = typeof scope.vehicleId === 'string' ? scope.vehicleId.trim() : '';
  if (!emergencyId || !vehicleId) {
    if (optional) return null;
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  return Object.freeze({ emergencyId, vehicleId });
}

function assertSafeId(value) {
  if (typeof value !== 'string') {
    throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
  }
  const id = value.trim();
  if (!id || id.length > 64 || /[$\0{}]/.test(id)) {
    throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
  }
  return id;
}

function isObjectIdString(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

function parseFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function pointFromGeoJson(point) {
  if (!point || !Array.isArray(point.coordinates) || point.coordinates.length < 2) return null;
  const [lng, lat] = point.coordinates;
  if (!validateCoordinates([lng, lat])) return null;
  return createPoint(lng, lat);
}

async function loadScopedEmergency(scope) {
  if (!scope || !scope.emergencyId) {
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  const emergency = await Emergency.findOne({
    emergencyId: scope.emergencyId,
    isDeleted: false
  }).populate('assignedVehicle', 'vehicleId registrationNumber status');

  if (!emergency) {
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  return emergency;
}

async function loadScopedVehicle(scope) {
  if (!scope || !scope.vehicleId) {
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  const vehicle = await Vehicle.findOne({
    vehicleId: scope.vehicleId,
    isDeleted: false
  });
  if (!vehicle) {
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  return vehicle;
}

/**
 * Ensure requested emergency id refers to the scoped emergency (friendly id or its ObjectId).
 * Fail closed without revealing whether other emergencies exist.
 */
async function assertEmergencyInScope(requestedId, scope) {
  if (!scope || !scope.emergencyId) {
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  const id = assertSafeId(requestedId || scope.emergencyId);
  if (id === scope.emergencyId) {
    return loadScopedEmergency(scope);
  }
  if (isObjectIdString(id)) {
    const emergency = await Emergency.findOne({ _id: id, isDeleted: false })
      .populate('assignedVehicle', 'vehicleId registrationNumber status');
    if (emergency && emergency.emergencyId === scope.emergencyId) {
      return emergency;
    }
  }
  throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
}

/**
 * Ensure requested vehicle id is the scoped assigned vehicle only.
 * Related vehicles are not inventable — only the mission vehicleId is allowed for vehicle tools.
 */
async function assertVehicleInScope(requestedId, scope) {
  if (!scope || !scope.vehicleId) {
    if (!scope && requestedId) {
      const id = assertSafeId(requestedId);
      const vehicle = await Vehicle.findOne(isObjectIdString(id) ? { _id: id, isDeleted: false } : { vehicleId: id, isDeleted: false });
      if (vehicle) return vehicle;
    }
    throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
  }
  const id = assertSafeId(requestedId || scope.vehicleId);
  if (id === scope.vehicleId) {
    return loadScopedVehicle(scope);
  }
  if (isObjectIdString(id)) {
    const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
    if (vehicle && vehicle.vehicleId === scope.vehicleId) {
      return vehicle;
    }
  }
  throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
}

async function getMissionAnchorPoint(scope, emergency) {
  const emg = emergency || (await loadScopedEmergency(scope));
  const emgPoint = pointFromGeoJson(emg.location);
  if (emgPoint) return { point: emgPoint, source: 'emergency' };

  const vehicle = await loadScopedVehicle(scope);
  const latestTraj = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
  const vehPoint = latestTraj ? pointFromGeoJson(latestTraj.location) : null;
  if (vehPoint) return { point: vehPoint, source: 'vehicle' };

  throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
}

/**
 * Resolve a geo query point: prefer validated model coords only if within mission offset;
 * otherwise use authoritative mission anchor. Never allows unbounded geo escape.
 */
async function resolveMissionGeoPoint(args, scope) {
  const anchor = await getMissionAnchorPoint(scope);
  const lng = parseFiniteNumber(args.longitude ?? args.originLng);
  const lat = parseFiniteNumber(args.latitude ?? args.originLat);

  if (lng !== null && lat !== null && validateCoordinates([lng, lat])) {
    const requested = createPoint(lng, lat);
    const offsetM = calculateDistance(anchor.point, requested).meters;
    if (offsetM <= geoAgentConstants.maxMissionGeoOffsetMeters) {
      return requested;
    }
  }

  return anchor.point;
}

async function resolveScopedRouteEndpoints(scope) {
  const emergency = await loadScopedEmergency(scope);
  const vehicle = await loadScopedVehicle(scope);

  const activeRoute = await Route.findOne({
    vehicle: vehicle._id,
    status: 'ACTIVE'
  }).sort({ createdAt: -1 });

  let origin = activeRoute ? pointFromGeoJson(activeRoute.origin) : null;
  let destination = activeRoute ? pointFromGeoJson(activeRoute.destination) : null;

  if (!origin) origin = pointFromGeoJson(emergency.location);
  if (!destination) destination = pointFromGeoJson(emergency.destination);

  if (!origin || !destination) {
    throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
  }

  return { origin, destination, emergency, vehicle, activeRoute };
}

/**
 * Tool Execution Handlers
 * @param {string} name
 * @param {object} args — UNTRUSTED (model-generated)
 * @param {object} analysisScope — TRUSTED, application-established { emergencyId, vehicleId }
 */
export const executeGeoAgentTool = async (name, args = {}, analysisScope) => {
  const scope = normalizeAnalysisScope(analysisScope, { optional: true });
  const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? args : {};

  const requireScope = () => {
    if (!scope) {
      throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
    }
    return scope;
  };

  switch (name) {
    case 'getEmergencyState': {
      requireScope();
      const emergency = await assertEmergencyInScope(safeArgs.emergencyId, scope);
      const untrustedDescription = emergency.description
        ? sanitizeText(String(emergency.description)).slice(0, 300)
        : null;

      return {
        emergencyId: emergency.emergencyId,
        type: emergency.type,
        priority: emergency.priority,
        status: emergency.status,
        untrustedCallerDescription: untrustedDescription,
        location: emergency.location,
        destination: emergency.destination,
        destinationHospital: emergency.destinationHospital
          ? sanitizeText(String(emergency.destinationHospital)).slice(0, 120)
          : null,
        assignedVehicle: emergency.assignedVehicle ? {
          vehicleId: emergency.assignedVehicle.vehicleId,
          registrationNumber: emergency.assignedVehicle.registrationNumber,
          status: emergency.assignedVehicle.status
        } : null,
        createdAt: emergency.createdAt
      };
    }

    case 'getVehicleState': {
      const vehicle = await assertVehicleInScope(safeArgs.vehicleId, scope);
      const latestTraj = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
      return {
        vehicleId: vehicle.vehicleId,
        registrationNumber: vehicle.registrationNumber,
        type: vehicle.type,
        status: vehicle.status,
        hospitalName: vehicle.hospitalName
          ? sanitizeText(String(vehicle.hospitalName)).slice(0, 120)
          : null,
        location: latestTraj ? latestTraj.location : null,
        locationType: latestTraj ? geoAgentConstants.observationTypes.OBSERVED : geoAgentConstants.observationTypes.UNKNOWN,
        speed: latestTraj ? latestTraj.speed : null,
        heading: latestTraj ? latestTraj.heading : null,
        lastFixAt: latestTraj ? latestTraj.timestamp : null
      };
    }

    case 'getRecentTrajectory': {
      const vehicle = await assertVehicleInScope(safeArgs.vehicleId, scope);
      const safeLimit = clampInt(
        safeArgs.limit,
        20,
        1,
        geoAgentConstants.maxTrajectoryPoints
      );
      const trajectories = await Trajectory.find({ vehicle: vehicle._id })
        .sort({ timestamp: -1 })
        .limit(safeLimit);
      return {
        vehicleId: vehicle.vehicleId,
        count: trajectories.length,
        pointsType: geoAgentConstants.observationTypes.OBSERVED,
        points: trajectories.map((t) => ({
          location: t.location,
          speed: t.speed,
          heading: t.heading,
          timestamp: t.timestamp
        }))
      };
    }

    case 'getCurrentRoute': {
      if (safeArgs.vehicleId) {
        await assertVehicleInScope(safeArgs.vehicleId, scope);
      }
      const vehicle = await loadScopedVehicle(scope);
      const emergency = await loadScopedEmergency(scope);

      let route = null;
      if (safeArgs.routeId) {
        const routeId = assertSafeId(safeArgs.routeId);
        const routeQuery = isObjectIdString(routeId)
          ? { _id: routeId }
          : { routeId };
        route = await Route.findOne(routeQuery);
        if (!route) {
          throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
        }
        const routeVehicleId = route.vehicle ? route.vehicle.toString() : null;
        if (routeVehicleId !== vehicle._id.toString()) {
          throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
        }
        if (route.emergency && route.emergency.toString() !== emergency._id.toString()) {
          throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
        }
      } else {
        route = await Route.findOne({
          vehicle: vehicle._id,
          status: 'ACTIVE'
        }).sort({ createdAt: -1 });
      }

      if (!route) {
        return { found: false, message: 'No active route found' };
      }

      return {
        found: true,
        routeId: route.routeId,
        status: route.status,
        routeType: route.routeType,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        origin: route.origin,
        destination: route.destination,
        provider: route.provider
      };
    }

    case 'getTrafficAnalysis': {
      let point;
      if (scope) {
        point = await resolveMissionGeoPoint(safeArgs, scope);
      } else {
        const lng = parseFiniteNumber(safeArgs.longitude ?? safeArgs.originLng);
        const lat = parseFiniteNumber(safeArgs.latitude ?? safeArgs.originLat);
        if (lng !== null && lat !== null && validateCoordinates([lng, lat])) {
          point = createPoint(lng, lat);
        } else {
          throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
        }
      }
      return await trafficService.getTrafficForLocation(point);
    }

    case 'getDecisionHistory': {
      requireScope();
      if (safeArgs.emergencyId) {
        await assertEmergencyInScope(safeArgs.emergencyId, scope);
      }
      if (safeArgs.vehicleId) {
        await assertVehicleInScope(safeArgs.vehicleId, scope);
      }

      const emergency = await loadScopedEmergency(scope);
      const vehicle = await loadScopedVehicle(scope);
      const safeLimit = clampInt(
        safeArgs.limit,
        10,
        1,
        geoAgentConstants.maxDecisionHistory
      );

      const decisions = await Decision.find({
        emergency: emergency._id,
        vehicle: vehicle._id
      })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate('emergency', 'emergencyId')
        .populate('vehicle', 'vehicleId');

      return {
        count: decisions.length,
        decisions: decisions.map((d) => ({
          decisionId: d.decisionId,
          emergencyId: d.emergency ? d.emergency.emergencyId : null,
          vehicleId: d.vehicle ? d.vehicle.vehicleId : null,
          severity: d.severity,
          primaryAction: d.primaryAction,
          status: d.status,
          reasonCodes: d.reasonCodes,
          rationale: d.rationale ? sanitizeText(String(d.rationale)).slice(0, 500) : null,
          createdAt: d.createdAt
        }))
      };
    }

    case 'getVehicleSituation': {
      requireScope();
      const vehicle = await assertVehicleInScope(safeArgs.vehicleId, scope);
      return await analysisService.getVehicleSituation(vehicle.vehicleId);
    }

    case 'getPrediction': {
      requireScope();
      const vehicle = await assertVehicleInScope(safeArgs.vehicleId, scope);
      return await predictionService.predictForVehicle(vehicle.vehicleId, { triggerDecision: false });
    }

    case 'getAlternativeRoutes':
    case 'getRouteAlternatives': {
      let origin;
      let destination;
      let originSource = 'SCOPED_MISSION';
      let destSource = 'SCOPED_MISSION';
      if (scope) {
        const endpoints = await resolveScopedRouteEndpoints(scope);
        origin = endpoints.origin;
        destination = endpoints.destination;
      } else {
        const oLng = parseFiniteNumber(safeArgs.originLng);
        const oLat = parseFiniteNumber(safeArgs.originLat);
        const dLng = parseFiniteNumber(safeArgs.destLng);
        const dLat = parseFiniteNumber(safeArgs.destLat);
        if (oLng !== null && oLat !== null && dLng !== null && dLat !== null &&
            validateCoordinates([oLng, oLat]) && validateCoordinates([dLng, dLat])) {
          origin = createPoint(oLng, oLat);
          destination = createPoint(dLng, dLat);
          originSource = 'EXPLICIT_COORDINATES';
          destSource = 'EXPLICIT_COORDINATES';
        } else {
          throw new GeoAgentToolError('OUT_OF_SCOPE_RESOURCE', SAFE_SCOPE_MESSAGE);
        }
      }
      const routeResult = await routingService.getRouteWithAlternatives(origin, destination);
      const primary = routeResult.primary;
      const alternatives = routeResult.alternatives || [];

      const candidateRoutes = [
        {
          name: primary.description || 'Primary Corridor',
          distanceMeters: primary.distanceMeters,
          etaMinutes: Math.max(1, Math.round(primary.durationSeconds / 60)),
          traffic: primary.trafficDelaySeconds > 120 ? 'HEAVY' : 'MODERATE',
          incidentExposure: 'EVALUATED',
          description: primary.description
            ? sanitizeText(String(primary.description)).slice(0, 200)
            : 'Current active response corridor',
          metricsType: geoAgentConstants.observationTypes.DERIVED
        },
        ...alternatives.map((alt, idx) => ({
          name: alt.description || `Alternative Route ${idx + 1}`,
          distanceMeters: alt.distanceMeters,
          etaMinutes: Math.max(1, Math.round(alt.durationSeconds / 60)),
          traffic: (alt.trafficDelaySeconds || 0) > 120 ? 'HEAVY' : 'LIGHT',
          incidentExposure: geoAgentConstants.observationTypes.UNKNOWN,
          description: alt.description
            ? sanitizeText(String(alt.description)).slice(0, 200)
            : `Alternative corridor ${idx + 1}`,
          metricsType: geoAgentConstants.observationTypes.DERIVED
        }))
      ];

      return {
        origin: origin.coordinates,
        destination: destination.coordinates,
        originSource: 'SCOPED_MISSION',
        destinationSource: 'SCOPED_MISSION',
        provider: primary.provider,
        candidateRoutes
      };
    }

    case 'getNearbyAvailableVehicles': {
      requireScope();
      const emergency = await loadScopedEmergency(scope);
      const targetPoint = pointFromGeoJson(emergency.location);
      if (!targetPoint) {
        throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
      }

      const requestedRadius = parseFiniteNumber(safeArgs.maxDistanceKm);
      const maxDistanceKm = Math.min(
        geoAgentConstants.backupMaxDistanceKm,
        requestedRadius !== null && requestedRadius > 0
          ? requestedRadius
          : geoAgentConstants.backupMaxDistanceKm
      );
      if (!(maxDistanceKm > 0)) {
        throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
      }

      const availableVehicles = await Vehicle.find({
        status: 'AVAILABLE',
        isDeleted: false,
        vehicleId: { $ne: scope.vehicleId }
      }).limit(geoAgentConstants.backupMaxCandidatesExamined);

      const ranked = [];

      for (const v of availableVehicles) {
        const latestTraj = await Trajectory.findOne({ vehicle: v._id }).sort({ timestamp: -1 });
        const location = latestTraj ? pointFromGeoJson(latestTraj.location) : null;

        let distanceKm = null;
        let distanceType = geoAgentConstants.observationTypes.UNKNOWN;

        if (location) {
          distanceKm = Number(calculateDistance(targetPoint, location).kilometers.toFixed(2));
          distanceType = geoAgentConstants.observationTypes.DERIVED;
          if (distanceKm > maxDistanceKm) {
            continue;
          }
        }

        ranked.push({
          vehicleId: v.vehicleId,
          type: v.type,
          availability: v.status,
          location: location
            ? { lng: location.coordinates[0], lat: location.coordinates[1] }
            : null,
          locationType: location
            ? geoAgentConstants.observationTypes.OBSERVED
            : geoAgentConstants.observationTypes.UNKNOWN,
          distanceKm,
          distanceType,
          etaSeconds: null,
          etaType: geoAgentConstants.observationTypes.UNKNOWN,
          _sortDistance: distanceKm === null ? Number.POSITIVE_INFINITY : distanceKm,
          _locationPoint: location
        });
      }

      ranked.sort((a, b) => a._sortDistance - b._sortDistance);
      const top = ranked.slice(0, geoAgentConstants.backupMaxResults);

      let etaLookups = 0;
      for (const candidate of top) {
        if (!candidate._locationPoint) continue;
        if (etaLookups >= geoAgentConstants.backupMaxEtaLookups) break;
        etaLookups += 1;
        try {
          const route = await routingService.getRoute(candidate._locationPoint, targetPoint);
          if (route && typeof route.durationSeconds === 'number' && Number.isFinite(route.durationSeconds)) {
            candidate.etaSeconds = Math.max(0, Math.round(route.durationSeconds));
            candidate.etaType = geoAgentConstants.observationTypes.DERIVED;
          }
        } catch {
          candidate.etaSeconds = null;
          candidate.etaType = geoAgentConstants.observationTypes.UNKNOWN;
        }
      }

      return {
        targetCoordinates: targetPoint.coordinates,
        targetSource: 'SCOPED_EMERGENCY_LOCATION',
        searchRadiusKm: maxDistanceKm,
        availableCount: top.length,
        candidates: top.map(({ _sortDistance, _locationPoint, ...safe }) => safe)
      };
    }

    case 'getNearbyIncidents': {
      let targetPoint;
      if (scope) {
        targetPoint = await resolveMissionGeoPoint(safeArgs, scope);
      } else {
        const lng = parseFiniteNumber(safeArgs.longitude ?? safeArgs.originLng);
        const lat = parseFiniteNumber(safeArgs.latitude ?? safeArgs.originLat);
        if (lng !== null && lat !== null && validateCoordinates([lng, lat])) {
          targetPoint = createPoint(lng, lat);
        } else {
          throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
        }
      }
      const requestedRadius = parseFiniteNumber(safeArgs.radiusMeters);
      const radiusMeters = Math.min(
        geoAgentConstants.maxIncidentRadiusMeters,
        requestedRadius !== null && requestedRadius > 0
          ? requestedRadius
          : 1000
      );
      if (!(radiusMeters > 0)) {
        throw new GeoAgentToolError('INVALID_TOOL_ARGUMENT', SAFE_ARG_MESSAGE);
      }

      const activeIncidents = await Incident.find({
        status: 'ACTIVE',
        isDeleted: false
      }).limit(geoAgentConstants.maxIncidentsExamined);

      const nearby = [];
      for (const incident of activeIncidents) {
        if (!incident.location || !incident.location.coordinates) continue;
        const distMeters = calculateDistance(targetPoint, incident.location).meters;
        if (distMeters <= radiusMeters) {
          nearby.push({
            incidentId: incident.incidentId,
            type: incident.type,
            severity: incident.severity,
            untrustedDescription: incident.description
              ? sanitizeText(String(incident.description)).slice(0, 300)
              : null,
            distanceMeters: Math.round(distMeters),
            distanceType: geoAgentConstants.observationTypes.DERIVED
          });
        }
      }

      return {
        searchRadiusMeters: radiusMeters,
        incidentsFound: nearby.length,
        incidents: nearby
      };
    }

    case 'getCorridorGreenWaveStatus': {
      const vehicle = await assertVehicleInScope(safeArgs.vehicleId, scope);
      const corridor = await corridorGreenWaveService.analyzeCorridorForVehicle(vehicle.vehicleId, { silent: true });
      return {
        vehicleId: vehicle.vehicleId,
        corridorHealth: corridor.corridorSummary.corridorHealth,
        preemptedCount: corridor.corridorSummary.preemptedCount,
        totalSignals: corridor.corridorSummary.totalSignals,
        civilianAlertedCount: corridor.corridorSummary.civilianAlertedCount,
        timeSavedMinutes: corridor.corridorSummary.timeSavedMinutes,
        preemptionActive: corridor.preemptionActive,
        signals: corridor.v2xSignals
      };
    }

    default:
      throw new GeoAgentToolError('UNKNOWN_TOOL', SAFE_ARG_MESSAGE);
  }
};
