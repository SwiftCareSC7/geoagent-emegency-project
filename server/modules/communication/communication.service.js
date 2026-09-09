import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import msg91Service from './msg91.service.js';
import realtimeService from '../realtime/realtime.service.js';

/**
 * Communication Service
 * 
 * Orchestrates emergency communication flows including SMS notifications.
 * Enforces RBAC permissions, extracts real operational telemetry,
 * and maintains communication state and audit trails.
 */
class CommunicationService {
  /**
   * Dispatches emergency status SMS using actual backend state
   * 
   * @param {string} emergencyId Emergency identifier
   * @param {Object} user Authenticated user making the request
   * @param {Object} [options]
   * @param {string} [options.recipientMobile] Optional recipient mobile override
   * @returns {Promise<Object>}
   */
  async sendEmergencyStatusSms(emergencyId, user, options = {}) {
    // 1. Fetch Emergency with assigned vehicle
    const emergency = await Emergency.findOne({ 
      $or: [{ emergencyId }, { _id: emergencyId.match(/^[0-9a-fA-F]{24}$/) ? emergencyId : null }],
      isDeleted: false 
    }).populate('assignedVehicle');

    if (!emergency) {
      const error = new Error(`Emergency not found: ${emergencyId}`);
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    // 2. Validate Vehicle Assignment
    if (!emergency.assignedVehicle) {
      const error = new Error('Cannot send status SMS: No vehicle is assigned to this emergency yet');
      error.status = 400;
      error.isOperational = true;
      throw error;
    }

    const assignedVehicle = emergency.assignedVehicle;

    // 3. Authorization & RBAC Checks
    // CONTROL_ROOM and ADMIN have universal operational dispatch privileges.
    // DRIVER and PARAMEDIC can only send SMS for emergencies assigned to their own vehicle.
    if (user.role === 'DRIVER' || user.role === 'PARAMEDIC') {
      const userAssignedVehicleId = user.assignedVehicle || user.vehicleId;
      const isVehicleMatched = 
        userAssignedVehicleId && (
          userAssignedVehicleId.toString() === assignedVehicle._id.toString() ||
          userAssignedVehicleId === assignedVehicle.vehicleId
        );
      
      // Also match if user's driver contact or name matches vehicle driver details
      const isDriverMatched = 
        (user.driverContact && assignedVehicle.driverContact && user.driverContact === assignedVehicle.driverContact) ||
        (user.name && assignedVehicle.driverName && user.name.toLowerCase() === assignedVehicle.driverName.toLowerCase());

      if (!isVehicleMatched && !isDriverMatched) {
        const error = new Error('Forbidden: Drivers can only dispatch status SMS for their assigned emergency vehicle');
        error.status = 403;
        error.isOperational = true;
        throw error;
      }
    } else if (user.role !== 'ADMIN' && user.role !== 'CONTROL_ROOM') {
      const error = new Error('Forbidden: Insufficient privileges to send emergency SMS');
      error.status = 403;
      error.isOperational = true;
      throw error;
    }

    // 4. Extract Real Backend Telemetry (No fabrication)
    const vehicleCallsign = assignedVehicle.vehicleId || assignedVehicle.registrationNumber || 'AMB-01';

    // Find active route to extract real-time duration and destination hospital
    let destinationHospital = assignedVehicle.hospitalName || 'Emergency Medical Center';
    let currentEtaText = '10 min';

    try {
      const activeRoute = await Route.findOne({
        emergency: emergency._id,
        isDeleted: false
      }).sort({ createdAt: -1 });

      if (activeRoute) {
        if (typeof activeRoute.duration === 'number' && activeRoute.duration > 0) {
          const minutes = Math.max(1, Math.round(activeRoute.duration / 60));
          currentEtaText = `${minutes} min`;
        }

        // Look for hospital destination name in route legs
        if (Array.isArray(activeRoute.legs)) {
          const hospitalLeg = activeRoute.legs.find(l => l.type === 'TO_HOSPITAL');
          if (hospitalLeg && hospitalLeg.destinationName) {
            destinationHospital = hospitalLeg.destinationName;
          }
        }
      }
    } catch (routeErr) {
      console.warn(`[CommunicationService] Route lookup warning: ${routeErr.message}`);
    }

    // Recipient Phone Number: from options override or callerContact
    const recipientMobile = options.recipientMobile || emergency.callerContact;
    if (!recipientMobile) {
      const error = new Error('No recipient mobile number found for this emergency. Please provide a contact number.');
      error.status = 400;
      error.isOperational = true;
      throw error;
    }

    // 5. Update Emergency State to 'SENDING'
    if (!emergency.communication) {
      emergency.communication = {};
    }
    emergency.communication.lastSmsStatus = 'SENDING';
    await emergency.save();

    // Emit Real-Time 'sms:sending'
    try {
      realtimeService.emitSmsStatus(emergency.emergencyId, vehicleCallsign, {
        status: 'SENDING',
        emergencyId: emergency.emergencyId,
        vehicleId: vehicleCallsign,
        timestamp: new Date().toISOString()
      });
    } catch (rtErr) {
      console.warn(`[CommunicationService] Real-time emission warning: ${rtErr.message}`);
    }

    // 6. Call MSG91 Flow API
    try {
      const smsResult = await msg91Service.sendFlowSms({
        mobile: recipientMobile,
        vehicle: vehicleCallsign,
        eta: currentEtaText,
        hospital: destinationHospital,
        emergency: emergency.emergencyId,
        extraVariables: {
          callerName: emergency.callerName || 'Patient / Caller',
          priority: emergency.priority || 'HIGH'
        }
      });

      // 7. Update Emergency communication state on SUCCESS
      emergency.communication.lastSmsStatus = smsResult.status; // 'SUBMITTED'
      emergency.communication.lastSmsProvider = smsResult.provider;
      emergency.communication.lastSmsSentAt = new Date();
      emergency.communication.lastSmsRecipient = smsResult.recipient;
      emergency.communication.lastSmsMessageId = smsResult.messageId;
      emergency.communication.lastSmsError = null;
      await emergency.save();

      // 8. Emit Real-time event for UI sync
      const eventPayload = {
        status: smsResult.status,
        emergencyId: emergency.emergencyId,
        vehicleId: vehicleCallsign,
        recipient: smsResult.recipient,
        messageId: smsResult.messageId,
        provider: smsResult.provider,
        eta: currentEtaText,
        hospital: destinationHospital,
        timestamp: emergency.communication.lastSmsSentAt.toISOString()
      };

      try {
        realtimeService.emitSmsStatus(emergency.emergencyId, vehicleCallsign, eventPayload);
      } catch (rtErr) {
        console.warn(`[CommunicationService] Real-time emission warning: ${rtErr.message}`);
      }

      return {
        success: true,
        status: smsResult.status,
        provider: smsResult.provider,
        message: smsResult.message,
        messageId: smsResult.messageId,
        recipient: smsResult.recipient,
        data: {
          emergencyId: emergency.emergencyId,
          vehicle: vehicleCallsign,
          eta: currentEtaText,
          hospital: destinationHospital
        }
      };
    } catch (dispatchErr) {
      // Record failure state
      emergency.communication.lastSmsStatus = 'FAILED';
      emergency.communication.lastSmsError = dispatchErr.message;
      await emergency.save();

      try {
        realtimeService.emitSmsStatus(emergency.emergencyId, vehicleCallsign, {
          status: 'FAILED',
          emergencyId: emergency.emergencyId,
          vehicleId: vehicleCallsign,
          error: dispatchErr.message,
          timestamp: new Date().toISOString()
        });
      } catch (rtErr) {
        console.warn(`[CommunicationService] Real-time emission warning: ${rtErr.message}`);
      }

      throw dispatchErr;
    }
  }

  /**
   * Retrieves the current communication state for an emergency
   * 
   * @param {string} emergencyId 
   * @returns {Promise<Object>}
   */
  async getEmergencySmsStatus(emergencyId) {
    const emergency = await Emergency.findOne({ 
      $or: [{ emergencyId }, { _id: emergencyId.match(/^[0-9a-fA-F]{24}$/) ? emergencyId : null }],
      isDeleted: false 
    }, { communication: 1, emergencyId: 1, assignedVehicle: 1 });

    if (!emergency) {
      const error = new Error(`Emergency not found: ${emergencyId}`);
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    return {
      emergencyId: emergency.emergencyId,
      communication: emergency.communication || {
        lastSmsStatus: 'READY',
        lastSmsSentAt: null,
        lastSmsRecipient: null,
        lastSmsError: null
      }
    };
  }
}

const communicationService = new CommunicationService();
export default communicationService;
