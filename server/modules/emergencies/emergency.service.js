import mongoose from 'mongoose';
import Emergency from './emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';

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

  return emergency;
};

/**
 * Assign a vehicle to an emergency
 */
export const assignVehicle = async (emergencyId, vehicleId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const emergency = await Emergency.findOne({ emergencyId, isDeleted: false }).session(session);
    if (!emergency) {
      const error = new Error('Emergency not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    const vehicle = await Vehicle.findOne({ vehicleId }).session(session);
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
    await emergency.save({ session });

    vehicle.status = 'DISPATCHED';
    await vehicle.save({ session });

    await session.commitTransaction();
    session.endSession();

    return await Emergency.findById(emergency._id).populate('assignedVehicle', 'vehicleId registrationNumber status');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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

  return emergency;
};
