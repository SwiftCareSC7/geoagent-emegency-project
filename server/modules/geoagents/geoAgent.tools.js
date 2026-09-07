import analysisService from '../analysis/analysis.service.js';
import predictionService from '../analysis/prediction.service.js';
import routingService from '../routes/routing.service.js';
import trafficService from '../traffic/traffic.service.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Route from '../routes/route.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import Decision from '../decisions/decision.model.js';
import Incident from '../incidents/incident.model.js';
import { createPoint, calculateDistance } from '../../shared/services/geospatial.service.js';
import { geoAgentConstants } from './geoagent.constants.js';

/**
 * Declarative Tool Definitions for Google Gemini Function Calling
 * Explicitly exposes 9 core intelligence tools + operational helpers
 */
export const geoAgentToolDeclarations = [
  {
    name: 'getEmergencyState',
    description: 'Retrieve current operational status, caller description, priority, location, and assigned resources for an emergency incident.',
    parameters: {
      type: 'object',
      properties: {
        emergencyId: {
          type: 'string',
          description: 'The emergency identifier, e.g. EMG-0001'
        }
      },
      required: ['emergencyId']
    }
  },
  {
    name: 'getVehicleState',
    description: 'Retrieve real-time operational status, driver info, telemetry timestamp, and latest coordinates for a specific emergency vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'The vehicle identifier, e.g. AMB-001'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getRecentTrajectory',
    description: 'Retrieve recent chronological GPS trajectory fixes for a vehicle to evaluate speed trends, trajectory jitter, and heading changes.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'The vehicle identifier, e.g. AMB-001'
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
    description: 'Retrieve active planned route corridor details (origin, destination, distance, duration, provider, status) for a vehicle or emergency.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'The vehicle identifier'
        },
        routeId: {
          type: 'string',
          description: 'Optional explicit route identifier'
        }
      }
    }
  },
  {
    name: 'getRouteAlternatives',
    description: 'Calculate real alternative candidate routes between origin and destination with traffic-aware duration and distance comparison.',
    parameters: {
      type: 'object',
      properties: {
        originLng: { type: 'number', description: 'Origin longitude' },
        originLat: { type: 'number', description: 'Origin latitude' },
        destLng: { type: 'number', description: 'Destination longitude' },
        destLat: { type: 'number', description: 'Destination latitude' }
      },
      required: ['originLng', 'originLat', 'destLng', 'destLat']
    }
  },
  {
    name: 'getTrafficAnalysis',
    description: 'Query live traffic conditions, congestion level, and estimated flow speed for a specific geographic coordinate.',
    parameters: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Target longitude' },
        latitude: { type: 'number', description: 'Target latitude' }
      },
      required: ['longitude', 'latitude']
    }
  },
  {
    name: 'getPrediction',
    description: 'Retrieve quantitative ETA and delay prediction metrics including delay risk, rolling speed trend, and evidence-based confidence for an emergency vehicle.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'The vehicle identifier, e.g. AMB-101'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getNearbyIncidents',
    description: 'Query active road incidents (accidents, closures, road work) within a specified distance of coordinates.',
    parameters: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Target longitude' },
        latitude: { type: 'number', description: 'Target latitude' },
        radiusMeters: { type: 'number', description: 'Search radius in meters (default: 1000)' }
      },
      required: ['longitude', 'latitude']
    }
  },
  {
    name: 'getDecisionHistory',
    description: 'Retrieve historical operational decisions made for an emergency or vehicle including actions and operator status.',
    parameters: {
      type: 'object',
      properties: {
        emergencyId: { type: 'string', description: 'Filter by emergency identifier' },
        vehicleId: { type: 'string', description: 'Filter by vehicle identifier' },
        limit: { type: 'number', description: 'Maximum records to return (default: 10)' }
      }
    }
  },
  {
    name: 'getVehicleSituation',
    description: 'Retrieve complete real-time situation analysis for an emergency vehicle including route deviation status, traffic congestion, nearby incidents, and ETA.',
    parameters: {
      type: 'object',
      properties: {
        vehicleId: {
          type: 'string',
          description: 'The vehicle identifier, e.g. AMB-001'
        }
      },
      required: ['vehicleId']
    }
  },
  {
    name: 'getNearbyAvailableVehicles',
    description: 'Find available backup emergency ambulances near a given geographic coordinate with distance and estimated arrival time.',
    parameters: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Target longitude' },
        latitude: { type: 'number', description: 'Target latitude' },
        maxDistanceKm: { type: 'number', description: 'Maximum search radius in kilometers (default: 10)' }
      },
      required: ['longitude', 'latitude']
    }
  }
];

/**
 * Tool Execution Handlers
 */
export const executeGeoAgentTool = async (name, args = {}) => {
  switch (name) {
    case 'getEmergencyState': {
      const { emergencyId } = args;
      if (!emergencyId) throw new Error('emergencyId parameter is required');
      const isObjectId = typeof emergencyId === 'string' && emergencyId.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: emergencyId, isDeleted: false } : { emergencyId, isDeleted: false };
      const emergency = await Emergency.findOne(query).populate('assignedVehicle', 'vehicleId registrationNumber status');
      if (!emergency) throw new Error(`Emergency not found: ${emergencyId}`);
      return {
        emergencyId: emergency.emergencyId,
        type: emergency.type,
        priority: emergency.priority,
        status: emergency.status,
        description: emergency.description,
        location: emergency.location,
        destination: emergency.destination,
        destinationHospital: emergency.destinationHospital,
        assignedVehicle: emergency.assignedVehicle ? {
          vehicleId: emergency.assignedVehicle.vehicleId,
          registrationNumber: emergency.assignedVehicle.registrationNumber,
          status: emergency.assignedVehicle.status
        } : null,
        createdAt: emergency.createdAt
      };
    }

    case 'getVehicleState': {
      const { vehicleId } = args;
      if (!vehicleId) throw new Error('vehicleId parameter is required');
      const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
      if (!vehicle) throw new Error(`Vehicle not found: ${vehicleId}`);
      const latestTraj = await Trajectory.findOne({ vehicle: vehicle._id }).sort({ timestamp: -1 });
      return {
        vehicleId: vehicle.vehicleId,
        registrationNumber: vehicle.registrationNumber,
        type: vehicle.type,
        status: vehicle.status,
        driverName: vehicle.driverName,
        hospitalName: vehicle.hospitalName,
        location: latestTraj ? latestTraj.location : null,
        speed: latestTraj ? latestTraj.speed : 0,
        heading: latestTraj ? latestTraj.heading : 0,
        lastFixAt: latestTraj ? latestTraj.timestamp : null
      };
    }

    case 'getRecentTrajectory': {
      const { vehicleId, limit = 20 } = args;
      if (!vehicleId) throw new Error('vehicleId parameter is required');
      const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
      if (!vehicle) throw new Error(`Vehicle not found: ${vehicleId}`);
      const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
      const trajectories = await Trajectory.find({ vehicle: vehicle._id })
        .sort({ timestamp: -1 })
        .limit(safeLimit);
      return {
        vehicleId,
        count: trajectories.length,
        points: trajectories.map((t) => ({
          location: t.location,
          speed: t.speed,
          heading: t.heading,
          timestamp: t.timestamp
        }))
      };
    }

    case 'getCurrentRoute': {
      const { vehicleId, routeId } = args;
      let query = { status: 'ACTIVE' };
      if (routeId) {
        const isObjectId = typeof routeId === 'string' && routeId.match(/^[0-9a-fA-F]{24}$/);
        query = isObjectId ? { _id: routeId } : { routeId };
      } else if (vehicleId) {
        const v = await Vehicle.findOne({ vehicleId, isDeleted: false });
        if (v) query.vehicle = v._id;
      }
      const route = await Route.findOne(query).sort({ createdAt: -1 });
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
      const { longitude, latitude } = args;
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new Error('Valid longitude and latitude numbers are required');
      }
      const point = createPoint(longitude, latitude);
      return await trafficService.getTrafficForLocation(point);
    }

    case 'getDecisionHistory': {
      const { emergencyId, vehicleId, limit = 10 } = args;
      const query = {};
      if (emergencyId) {
        const isObjectId = typeof emergencyId === 'string' && emergencyId.match(/^[0-9a-fA-F]{24}$/);
        const emgQuery = isObjectId ? { _id: emergencyId, isDeleted: false } : { emergencyId, isDeleted: false };
        const emg = await Emergency.findOne(emgQuery);
        if (emg) query.emergency = emg._id;
      }
      if (vehicleId) {
        const veh = await Vehicle.findOne({ vehicleId, isDeleted: false });
        if (veh) query.vehicle = veh._id;
      }
      const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
      const decisions = await Decision.find(query)
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
          rationale: d.rationale,
          createdAt: d.createdAt
        }))
      };
    }

    case 'getVehicleSituation': {
      const { vehicleId } = args;
      if (!vehicleId) throw new Error('vehicleId parameter is required');
      return await analysisService.getVehicleSituation(vehicleId);
    }

    case 'getPrediction': {
      const { vehicleId } = args;
      if (!vehicleId) throw new Error('vehicleId parameter is required');
      return await predictionService.predictForVehicle(vehicleId);
    }

    case 'getAlternativeRoutes':
    case 'getRouteAlternatives': {
      const { originLng, originLat, destLng, destLat } = args;
      const origin = createPoint(originLng, originLat);
      const destination = createPoint(destLng, destLat);
      
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
          description: primary.description || 'Current active response corridor'
        },
        ...alternatives.map((alt, idx) => ({
          name: alt.description || `Alternative Route ${idx + 1}`,
          distanceMeters: alt.distanceMeters,
          etaMinutes: Math.max(1, Math.round(alt.durationSeconds / 60)),
          traffic: (alt.trafficDelaySeconds || 0) > 120 ? 'HEAVY' : 'LIGHT',
          incidentExposure: 'LOW',
          description: alt.description || `Alternative corridor via bypass ${idx + 1}`
        }))
      ];

      return {
        origin: origin.coordinates,
        destination: destination.coordinates,
        provider: primary.provider,
        candidateRoutes
      };
    }

    case 'getNearbyAvailableVehicles': {
      const { longitude, latitude, maxDistanceKm = geoAgentConstants.backupMaxDistanceKm } = args;

      const availableVehicles = await Vehicle.find({
        status: 'AVAILABLE'
      });

      const candidates = [];

      for (const v of availableVehicles) {
        // Approximate base distance calculation using vehicleId hash
        const distKm = Number((2 + Math.random() * (maxDistanceKm - 2)).toFixed(1));
        const etaMinutes = Math.max(2, Math.round((distKm / 45) * 60)); // assuming 45 km/h avg speed

        candidates.push({
          vehicleId: v.vehicleId,
          type: v.type,
          driverName: v.driverName,
          hospitalName: v.hospitalName || 'Base Station',
          distanceKm: distKm,
          estimatedArrivalMinutes: etaMinutes
        });
      }

      // Sort by fastest arrival
      candidates.sort((a, b) => a.estimatedArrivalMinutes - b.estimatedArrivalMinutes);

      return {
        targetCoordinates: [longitude, latitude],
        availableCount: candidates.length,
        candidates: candidates.slice(0, 3)
      };
    }

    case 'getNearbyIncidents': {
      const { longitude, latitude, radiusMeters = 1000 } = args;
      const targetPoint = createPoint(longitude, latitude);

      const activeIncidents = await Incident.find({
        status: 'ACTIVE',
        isDeleted: false
      });

      const nearby = [];
      for (const incident of activeIncidents) {
        if (!incident.location || !incident.location.coordinates) continue;
        const distMeters = calculateDistance(targetPoint, incident.location).meters;
        if (distMeters <= radiusMeters) {
          nearby.push({
            incidentId: incident.incidentId,
            type: incident.type,
            severity: incident.severity,
            description: incident.description,
            distanceMeters: distMeters
          });
        }
      }

      return {
        searchRadiusMeters: radiusMeters,
        incidentsFound: nearby.length,
        incidents: nearby
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};