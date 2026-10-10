import * as emergencyService from './emergency.service.js';
import communicationService from '../communication/communication.service.js';

/**
 * Handle emergency creation
 */
export const createEmergency = async (req, res, next) => {
  try {
    const emergency = await emergencyService.createEmergency(req.body, req.user._id);
    
    res.status(201).json({
      success: true,
      message: 'Emergency created successfully',
      data: emergency.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle listing all active emergencies
 */
export const getEmergencies = async (req, res, next) => {
  try {
    const { status, priority, type } = req.query;
    const filters = { status, priority, type };
    
    const emergencies = await emergencyService.getEmergencies(filters);
    
    res.status(200).json({
      success: true,
      count: emergencies.length,
      data: emergencies.map(e => e.toSafeObject())
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle getting a specific emergency
 */
export const getEmergency = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const emergency = await emergencyService.getEmergencyById(emergencyId);
    
    res.status(200).json({
      success: true,
      data: emergency.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle updating an emergency
 */
export const updateEmergency = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const emergency = await emergencyService.updateEmergency(emergencyId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Emergency updated successfully',
      data: emergency.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle assigning a vehicle
 */
export const assignVehicle = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const { vehicleId } = req.body;
    
    const emergency = await emergencyService.assignVehicle(emergencyId, vehicleId);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle assigned successfully',
      data: emergency.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle soft-deleting an emergency
 */
export const deleteEmergency = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    await emergencyService.deleteEmergency(emergencyId);
    
    res.status(200).json({
      success: true,
      message: 'Emergency deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle sending emergency status SMS via MSG91
 */
export const sendEmergencyStatusSms = async (req, res, next) => {
  const start = Date.now();
  try {
    const { emergencyId } = req.params;
    const { recipientMobile } = req.body || {};

    const result = await communicationService.sendEmergencyStatusSms(
      emergencyId,
      req.user,
      { recipientMobile }
    );

    // Audit log
    console.log(`[Audit] USER=${req.user._id || req.user.id} ROLE=${req.user.role} ACTION=send_status_sms EMERGENCY=${emergencyId} STATUS=${result.status} DURATION=${Date.now() - start}ms`);

    res.status(200).json({
      success: true,
      message: result.message,
      status: result.status,
      provider: result.provider,
      messageId: result.messageId,
      recipient: result.recipient,
      data: result.data
    });
  } catch (error) {
    console.error(`[Audit] USER=${req.user?._id || req.user?.id} ROLE=${req.user?.role} ACTION=send_status_sms_failed EMERGENCY=${req.params.emergencyId} ERROR="${error.message}" DURATION=${Date.now() - start}ms`);
    next(error);
  }
};

/**
 * Handle getting emergency communication/SMS status
 */
export const getEmergencySmsStatus = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const status = await communicationService.getEmergencySmsStatus(emergencyId);
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};
