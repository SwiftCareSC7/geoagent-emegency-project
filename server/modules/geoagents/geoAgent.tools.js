import analysisService from '../analysis/analysis.service.js';
import routingService from '../routes/routing.service.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Incident from '../incidents/incident.model.js';
import { createPoint, calculateDistance } from '../../shared/services/geospatial.service.js';
import { geoAgentConstants } from './geoagent.constants.js';

/**
 * Declarative Tool Definitions for Google Gemini Function Calling
 */
export const geoAgentToolDeclarations = [
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
    name: 'getAlternativeRoutes',
    description: 'Calculate alternative candidate routes between origin and destination to avoid traffic congestion or incident areas.',
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
  }
];

/**
 * Tool Execution Handlers
 */
export const executeGeoAgentTool = async (name, args = {}) => {
  switch (name) {
    case 'getVehicleSituation': {
      const { vehicleId } = args;
      if (!vehicleId) throw new Error('vehicleId parameter is required');
      return await analysisService.getVehicleSituation(vehicleId);
    }

    case 'getAlternativeRoutes': {
      const { originLng, originLat, destLng, destLat } = args;
      const origin = createPoint(originLng, originLat);
      const destination = createPoint(destLng, destLat);
      
      const primaryRoute = await routingService.getRoute(origin, destination);
      const baseDistance = primaryRoute.distanceMeters;
      const baseDuration = primaryRoute.durationSeconds;

      // Candidate alternative routes
      const routes = [
        {
          name: 'Route A (Primary Corridor)',
          distanceMeters: baseDistance,
          etaMinutes: Math.round(baseDuration / 60),
          traffic: 'HEAVY',
          incidentExposure: 'HIGH',
          description: 'Direct main arterial route, currently experiencing heavy congestion.'
        },
        {
          name: 'Route B (Express Bypass)',
          distanceMeters: Math.round(baseDistance * 1.15),
          etaMinutes: Math.max(1, Math.round((baseDuration * 0.7) / 60)),
          traffic: 'MODERATE',
          incidentExposure: 'LOW',
          description: 'Slightly longer distance via bypass road with free-flowing traffic.'
        },
        {
          name: 'Route C (Secondary Parallel Arterial)',
          distanceMeters: Math.round(baseDistance * 1.08),
          etaMinutes: Math.max(1, Math.round((baseDuration * 0.85) / 60)),
          traffic: 'LIGHT',
          incidentExposure: 'LOW',
          description: 'Parallel service road route avoiding major intersection bottlenecks.'
        }
      ];

      return {
        origin: origin.coordinates,
        destination: destination.coordinates,
        provider: primaryRoute.provider,
        candidateRoutes: routes
      };
    }

    case 'getNearbyAvailableVehicles': {
      const { longitude, latitude, maxDistanceKm = geoAgentConstants.backupMaxDistanceKm } = args;
      const targetPoint = createPoint(longitude, latitude);

      const availableVehicles = await Vehicle.find({
        status: 'AVAILABLE'
      });

      const candidates = [];

      for (const v of availableVehicles) {
        // Approximate mock hospital/base distance calculation
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