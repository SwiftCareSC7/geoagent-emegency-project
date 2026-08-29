import Vehicle from './vehicle.model.js';
import realtimeService from '../realtime/realtime.service.js';

/**
 * Create a new emergency vehicle
 */
export const createVehicle = async (vehicleData) => {
  const { vehicleId, registrationNumber } = vehicleData;

  // Prevent creation of vehicles with duplicate vehicleId
  const existingId = await Vehicle.findOne({ vehicleId });
  if (existingId) {
    const error = new Error('Vehicle ID already exists');
    error.status = 409;
    error.isOperational = true;
    throw error;
  }

  // Prevent creation of vehicles with duplicate registration number
  const existingReg = await Vehicle.findOne({ registrationNumber: registrationNumber.toUpperCase() });
  if (existingReg) {
    const error = new Error('Registration number already exists');
    error.status = 409;
    error.isOperational = true;
    throw error;
  }

  // Enforce creation rules (strip out malicious createdAt/updatedAt if present)
  delete vehicleData.createdAt;
  delete vehicleData.updatedAt;

  const newVehicle = new Vehicle(vehicleData);
  await newVehicle.save();

  return newVehicle;
};

/**
 * Get all emergency vehicles
 */
export const getVehicles = async () => {
  return await Vehicle.find({});
};

/**
 * Get an emergency vehicle by vehicleId
 */
export const getVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }
  return vehicle;
};

/**
 * Update an emergency vehicle securely
 */
export const updateVehicle = async (vehicleId, updateData) => {
  // Explicit allowlist of fields that can be updated
  const allowedUpdates = [
    'status',
    'driverName',
    'driverContact',
    'hospitalName',
    'hospitalCode',
    'capacity'
  ];

  const filteredUpdates = {};
  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updateData[key];
    }
  });

  const vehicle = await Vehicle.findOneAndUpdate(
    { vehicleId },
    { $set: filteredUpdates },
    { new: true, runValidators: true } // Returns updated doc, runs enum/type validators
  );

  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  // Emit Real-Time Event if status changed
  if (filteredUpdates.status) {
    try {
      realtimeService.emitVehicleStatusUpdated(vehicle.vehicleId, {
        vehicleId: vehicle.vehicleId,
        status: vehicle.status,
        updatedAt: vehicle.updatedAt
      });
    } catch (err) {
      console.error(`[VehicleService] Real-time event emission error: ${err.message}`);
    }
  }

  return vehicle;
};


/**
 * Delete an emergency vehicle
 */
export const deleteVehicle = async (vehicleId) => {
  const vehicle = await Vehicle.findOneAndDelete({ vehicleId });
  
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.isOperational = true;
    throw error;
  }

  return vehicle;
};
