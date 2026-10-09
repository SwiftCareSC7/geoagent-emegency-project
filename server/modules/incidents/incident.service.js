import Incident from './incident.model.js';
import Route from '../routes/route.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import routeService from '../routes/route.service.js';
import realtimeService from '../realtime/realtime.service.js';
import { distanceToRoute } from '../../shared/services/geospatial.service.js';

/**
 * Generate a unique incident ID (e.g., INC-0001)
 */
const generateIncidentId = async () => {
  const latest = await Incident.findOne({}, { incidentId: 1 }).sort({ createdAt: -1 });
  let nextNum = 1;
  if (latest && latest.incidentId) {
    const match = latest.incidentId.match(/INC-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  let candidate = `INC-${String(nextNum).padStart(4, '0')}`;
  while (await Incident.exists({ incidentId: candidate })) {
    nextNum++;
    candidate = `INC-${String(nextNum).padStart(4, '0')}`;
  }
  return candidate;
};

/**
 * Create a new incident
 */
export const createIncident = async (incidentData, userId) => {
  const incidentId = await generateIncidentId();

  const newIncident = new Incident({
    ...incidentData,
    incidentId,
    reportedBy: userId,
    status: 'ACTIVE',
    isDeleted: false
  });

  await newIncident.save();

  // Trigger re-routes for affected vehicles if incident is ACTIVE
  if (newIncident.status === 'ACTIVE') {
    await this.triggerReroutesForIncident(newIncident);
  }

  // Emit Real-Time Event
  try {
    realtimeService.emitIncidentCreated({
      incidentId: newIncident.incidentId,
      type: newIncident.type,
      severity: newIncident.severity,
      status: newIncident.status,
      description: newIncident.description,
      location: newIncident.location,
      createdAt: newIncident.createdAt
    });
  } catch (err) {
    console.error(`[IncidentService] Real-time event emission error: ${err.message}`);
  }

  return newIncident;
};

/**
 * Get all active incidents
 */
export const getIncidents = async (filters = {}) => {
  const query = { isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.severity) query.severity = filters.severity;
  if (filters.type) query.type = filters.type;

  return await Incident.find(query).populate('emergency', 'emergencyId status');
};

/**
 * Get an incident by ID
 */
export const getIncidentById = async (incidentId) => {
  const incident = await Incident.findOne({ incidentId, isDeleted: false })
    .populate('reportedBy', 'name email')
    .populate('emergency', 'emergencyId status');
    
  if (!incident) {
    const error = new Error('Incident not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }
  return incident;
};

/**
 * Update an incident securely
 */
export const updateIncident = async (incidentId, updateData) => {
  const allowedUpdates = [
    'severity',
    'status',
    'description',
    'location'
  ];

  const filteredUpdates = {};
  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updateData[key];
    }
  });

  const incident = await Incident.findOneAndUpdate(
    { incidentId, isDeleted: false },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );

  if (!incident) {
    const error = new Error('Incident not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Emit Real-Time Event
  try {
    realtimeService.emitIncidentUpdated(incident.incidentId, {
      incidentId: incident.incidentId,
      status: incident.status,
      severity: incident.severity,
      description: incident.description,
      updatedAt: incident.updatedAt
    });
  } catch (err) {
    console.error(`[IncidentService] Real-time event emission error: ${err.message}`);
  }

  return incident;
};

/**
 * Soft delete an incident
 */
export const deleteIncident = async (incidentId) => {
  const incident = await Incident.findOneAndUpdate(
    { incidentId, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );
  
  if (!incident) {
    const error = new Error('Incident not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Emit Real-Time Event
  try {
    realtimeService.emitIncidentUpdated(incident.incidentId, {
      incidentId: incident.incidentId,
      status: 'DELETED',
      isDeleted: true
    });
  } catch (err) {
    console.error(`[IncidentService] Real-time event emission error: ${err.message}`);
  }

  return incident;
};

/**
 * Find routes affected by an incident and trigger re-routes
 * @param {Object} incident Incident object with location
 * @returns {Promise<Array>} List of vehicles that were re-routed
 */
export const triggerReroutesForIncident = async (incident) => {
  const proximityRadiusMeters = parseFloat(process.env.INCIDENT_PROXIMITY_RADIUS_METERS) || 500;
  
  // Find all active routes
  const activeRoutes = await Route.find({ status: 'ACTIVE' }).populate('vehicle');
  
  const affectedVehicles = [];
  
  for (const route of activeRoutes) {
    if (!route.vehicle) continue;
    
    // Calculate distance from incident to route
    const distanceFromRoute = distanceToRoute(incident.location, route.geometry);
    
    if (distanceFromRoute <= proximityRadiusMeters) {
      try {
        console.log(`[IncidentService] Triggering re-route for vehicle ${route.vehicle.vehicleId} due to incident ${incident.incidentId} within ${distanceFromRoute.toFixed(0)}m of route`);
        
        const updatedRoute = await routeService.recalculateRouteFromCurrentPosition(
          route.vehicle.vehicleId,
          route.routeId,
          {
            reason: `Automatic re-route due to nearby incident (${incident.incidentId}, ${incident.type}, ${distanceFromRoute.toFixed(0)}m from route)`,
            preference: 'FASTEST'
          }
        );
        
        affectedVehicles.push({
          vehicleId: route.vehicle.vehicleId,
          routeId: route.routeId,
          distanceFromRouteMeters: distanceFromRoute,
          newDistanceMeters: updatedRoute.distance,
          newDurationSeconds: updatedRoute.duration
        });
      } catch (rerouteErr) {
        console.error(`[IncidentService] Failed to re-route vehicle ${route.vehicle.vehicleId}: ${rerouteErr.message}`);
      }
    }
  }
  
  return affectedVehicles;
};

