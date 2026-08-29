import mongoose from 'mongoose';
import Emergency from './emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import realtimeService from '../realtime/realtime.service.js';

/**
 * Generate a unique emergency ID (e.g., EMG-0001)
 */
const generateEmergencyId = async () => {
  const count = await Emergency.countDocuments();
  return `EMG-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Create a new emergency
 */
export const createEmergency = async (emergencyData, userId) => {
  const emergencyId = await generateEmergencyId();

  // Enforce server-side control
  const newEmergency = new Emergency({
    ...emergencyData,
    emergencyId,
    createdBy: userId,
    status: 'PENDING',
    isDeleted: false
  });

  await newEmergency.save();

  // Emit Real-Time Event
  try {
    realtimeService.emitEmergencyCreated({
      emergencyId: newEmergency.emergencyId,
      type: newEmergency.type,
      priority: newEmergency.priority,
      status: newEmergency.status,
      location: newEmergency.location,
      destination: newEmergency.destination,
      createdAt: newEmergency.createdAt
    });
  } catch (err) {
    console.error(`[EmergencyService] Real-time event emission error: ${err.message}`);
  }

  return newEmergency;
};

/**
 * Get all active emergencies
 */
export const getEmergencies = async (filters = {}) => {
  const query = { isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.type) query.type = filters.type;

  return await Emergency.find(query).populate('assignedVehicle', 'vehicleId registrationNumber status');
};

/**
 * Get an emergency by ID
 */
export const getEmergencyById = async (emergencyId) => {
  const emergency = await Emergency.findOne({ emergencyId, isDeleted: false })
    .populate('assignedVehicle', 'vehicleId registrationNumber status')
    .populate('createdBy', 'name email');
    
  if (!emergency) {
    const error = new Error('Emergency not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }
  return emergency;
};

/**
 * Update an emergency securely
 */
export const updateEmergency = async (emergencyId, updateData) => {
  const allowedUpdates = [
    'priority',
    'status',
    'description',
    'callerName',
    'callerContact',
    'destination'
  ];

  const filteredUpdates = {};
  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updateData[key];
    }
  });

  const emergency = await Emergency.findOneAndUpdate(
    { emergencyId, isDeleted: false },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );

  if (!emergency) {
    const error = new Error('Emergency not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Emit Real-Time Event
  try {
    realtimeService.emitEmergencyUpdated(emergency.emergencyId, {
      emergencyId: emergency.emergencyId,
      status: emergency.status,
      priority: emergency.priority,
      destination: emergency.destination,
      updatedAt: emergency.updatedAt
    });
  } catch (err) {
    console.error(`[EmergencyService] Real-time event emission error: ${err.message}`);
  }

  return emergency;
};

/**
 * Assign a vehicle to an emergency
 */
export const assignVehicle = async (emergencyId, vehicleId) => {
  const isEmergencyObjectId = typeof emergencyId === 'string' && emergencyId.match(/^[0-9a-fA-F]{24}$/);
  const emgQuery = isEmergencyObjectId ? { _id: emergencyId, isDeleted: false } : { emergencyId, isDeleted: false };
  const emergency = await Emergency.findOne(emgQuery);

  if (!emergency) {
    const error = new Error('Emergency not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  const isVehicleObjectId = typeof vehicleId === 'string' && vehicleId.match(/^[0-9a-fA-F]{24}$/);
  const vehQuery = isVehicleObjectId ? { _id: vehicleId, isDeleted: false } : { vehicleId, isDeleted: false };
  const vehicle = await Vehicle.findOne(vehQuery);

  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  if (vehicle.status !== 'AVAILABLE') {
    const error = new Error('Vehicle is not available for assignment');
    error.status = 400;
    error.isOperational = true;
    throw error;
  }

  // Perform updates
  emergency.assignedVehicle = vehicle._id;
  emergency.status = 'DISPATCHED';
  await emergency.save();

  vehicle.status = 'DISPATCHED';
  await vehicle.save();

  const result = await Emergency.findById(emergency._id).populate(
    'assignedVehicle',
    'vehicleId registrationNumber status'
  );

  // Emit Real-Time Events
  try {
    realtimeService.emitEmergencyUpdated(emergency.emergencyId, {
      emergencyId: emergency.emergencyId,
      status: 'DISPATCHED',
      assignedVehicleId: vehicle.vehicleId
    });

    realtimeService.emitVehicleStatusUpdated(vehicle.vehicleId, {
      vehicleId: vehicle.vehicleId,
      status: 'DISPATCHED',
      assignedEmergencyId: emergency.emergencyId
    });
  } catch (err) {
    console.error(`[EmergencyService] Real-time event emission error: ${err.message}`);
  }

  return result;
};



/**
 * Soft delete an emergency
 */
export const deleteEmergency = async (emergencyId) => {
  const emergency = await Emergency.findOneAndUpdate(
    { emergencyId, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );
  
  if (!emergency) {
    const error = new Error('Emergency not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Emit Real-Time Event
  try {
    realtimeService.emitEmergencyUpdated(emergency.emergencyId, {
      emergencyId: emergency.emergencyId,
      status: 'DELETED',
      isDeleted: true
    });
  } catch (err) {
    console.error(`[EmergencyService] Real-time event emission error: ${err.message}`);
  }

  return emergency;
};

