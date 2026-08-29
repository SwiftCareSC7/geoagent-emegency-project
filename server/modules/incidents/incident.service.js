import Incident from './incident.model.js';
import realtimeService from '../realtime/realtime.service.js';

/**
 * Generate a unique incident ID (e.g., INC-0001)
 */
const generateIncidentId = async () => {
  const count = await Incident.countDocuments();
  return `INC-${String(count + 1).padStart(4, '0')}`;
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

