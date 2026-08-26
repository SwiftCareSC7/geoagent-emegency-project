import * as vehicleService from './vehicle.service.js';

/**
 * Handle vehicle creation
 */
export const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.createVehicle(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle listing all vehicles
 */
export const getVehicles = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.getVehicles();
    
    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles.map(v => v.toSafeObject())
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle getting a specific vehicle
 */
export const getVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await vehicleService.getVehicleById(vehicleId);
    
    res.status(200).json({
      success: true,
      data: vehicle.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle updating a specific vehicle
 */
export const updateVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await vehicleService.updateVehicle(vehicleId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle deleting a specific vehicle
 */
export const deleteVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    await vehicleService.deleteVehicle(vehicleId);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
