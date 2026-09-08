import crypto from 'crypto';
import ClearanceSession from './clearance.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import Emergency from '../emergencies/emergency.model.js';
import realtimeService from '../realtime/realtime.service.js';
import { REALTIME_ROOMS } from '../realtime/realtime.constants.js';

class ClearanceService {
  /**
   * Generates plausible connected vehicle presets along Bengaluru corridors
   */
  generatePresetVehicles(originCoords = [77.6271, 12.9352]) {
    const [lng, lat] = originCoords;
    return [
      {
        vehicleId: 'CIV-KA-01-9482',
        label: 'Silver Sedan (CIV-01)',
        coordinates: [lng + 0.0018, lat + 0.0022],
        distanceToAmbulanceMeters: 180,
        status: 'ALERT_SENT',
        alertMessage: 'Emergency vehicle approaching. Please give way.',
        alertSentAt: new Date(Date.now() - 15000),
        acknowledgedAt: new Date(Date.now() - 10000),
        givingWayAt: null,
        clearedAt: null
      },
      {
        vehicleId: 'CIV-KA-05-3310',
        label: 'Blue Hatchback (CIV-02)',
        coordinates: [lng + 0.0034, lat + 0.0041],
        distanceToAmbulanceMeters: 340,
        status: 'ACKNOWLEDGED',
        alertMessage: 'Emergency vehicle approaching. Please give way.',
        alertSentAt: new Date(Date.now() - 12000),
        acknowledgedAt: new Date(Date.now() - 8000),
        givingWayAt: null,
        clearedAt: null
      },
      {
        vehicleId: 'CIV-KA-53-8821',
        label: 'Delivery Van (CIV-03)',
        coordinates: [lng + 0.0052, lat + 0.0065],
        distanceToAmbulanceMeters: 510,
        status: 'GIVING_WAY',
        alertMessage: 'Emergency vehicle approaching. Please give way.',
        alertSentAt: new Date(Date.now() - 20000),
        acknowledgedAt: new Date(Date.now() - 15000),
        givingWayAt: new Date(Date.now() - 5000),
        clearedAt: null
      }
    ];
  }

  /**
   * Retrieve active clearance session for a vehicle or create an initialized session
   */
  async getClearanceForVehicle(vehicleId) {
    let session = await ClearanceSession.findOne({
      vehicleId,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    if (!session) {
      const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
      const activeRoute = vehicle
        ? await Route.findOne({ vehicle: vehicle._id, status: 'ACTIVE' }).sort({ createdAt: -1 })
        : null;

      const origin = activeRoute?.origin?.coordinates || vehicle?.currentLocation?.coordinates || [77.6271, 12.9352];
      const vehicles = this.generatePresetVehicles(origin);

      const clearanceId = `CLR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      session = await ClearanceSession.create({
        clearanceId,
        emergency: activeRoute?.emergency || null,
        emergencyId: activeRoute?.emergencyId || null,
        vehicle: vehicle?._id || null,
        vehicleId,
        route: activeRoute?._id || null,
        routeId: activeRoute?.routeId || null,
        isSimulated: true,
        simulationCorridor: 'Bengaluru Emergency Corridor',
        connectedVehicles: vehicles,
        status: 'ACTIVE',
        summary: {
          totalDetected: vehicles.length,
          totalAlerted: vehicles.filter(v => ['ALERT_SENT', 'ACKNOWLEDGED', 'GIVING_WAY', 'CLEARED'].includes(v.status)).length,
          totalGivingWay: vehicles.filter(v => v.status === 'GIVING_WAY').length,
          totalCleared: vehicles.filter(v => v.status === 'CLEARED').length
        }
      });
    }

    return session;
  }

  /**
   * Advance simulated clearance cycle (step: 1, 2, 3, 4)
   */
  async advanceClearanceCycle(vehicleId, cycleStep = 1) {
    const session = await this.getClearanceForVehicle(vehicleId);

    const now = new Date();
    const updatedVehicles = session.connectedVehicles.map((v, index) => {
      const vObj = v.toObject ? v.toObject() : { ...v };

      // Cycle progression logic based on index and step
      if (cycleStep === 1) {
        // Step 1: All alerted
        vObj.status = 'ALERT_SENT';
        vObj.alertSentAt = vObj.alertSentAt || now;
      } else if (cycleStep === 2) {
        // Step 2: First two acknowledge, third gives way
        if (index === 0) {
          vObj.status = 'ACKNOWLEDGED';
          vObj.acknowledgedAt = now;
        } else if (index === 1) {
          vObj.status = 'ACKNOWLEDGED';
          vObj.acknowledgedAt = now;
        } else {
          vObj.status = 'ALERT_SENT';
        }
      } else if (cycleStep === 3) {
        // Step 3: Vehicles move over / give way
        if (index === 0) {
          vObj.status = 'GIVING_WAY';
          vObj.givingWayAt = now;
        } else if (index === 1) {
          vObj.status = 'GIVING_WAY';
          vObj.givingWayAt = now;
        } else {
          vObj.status = 'ACKNOWLEDGED';
          vObj.acknowledgedAt = now;
        }
      } else if (cycleStep >= 4) {
        // Step 4: Closest cleared, others giving way
        if (index === 0) {
          vObj.status = 'CLEARED';
          vObj.clearedAt = now;
        } else {
          vObj.status = 'GIVING_WAY';
          vObj.givingWayAt = now;
        }
      }

      // Distance counts down as ambulance approaches
      vObj.distanceToAmbulanceMeters = Math.max(30, vObj.distanceToAmbulanceMeters - 35);
      return vObj;
    });

    session.connectedVehicles = updatedVehicles;
    session.summary = {
      totalDetected: updatedVehicles.length,
      totalAlerted: updatedVehicles.filter(v => ['ALERT_SENT', 'ACKNOWLEDGED', 'GIVING_WAY', 'CLEARED'].includes(v.status)).length,
      totalGivingWay: updatedVehicles.filter(v => v.status === 'GIVING_WAY').length,
      totalCleared: updatedVehicles.filter(v => v.status === 'CLEARED').length
    };

    await session.save();

    // Broadcast over Socket.IO to vehicle and control room
    try {
      const payload = {
        clearanceId: session.clearanceId,
        vehicleId,
        isSimulated: true,
        summary: session.summary,
        connectedVehicles: session.connectedVehicles,
        timestamp: now.toISOString()
      };

      const rooms = [
        REALTIME_ROOMS.CONTROL_ROOM,
        REALTIME_ROOMS.vehicle(vehicleId)
      ];

      if (session.emergencyId) {
        rooms.push(REALTIME_ROOMS.emergency(session.emergencyId));
      }

      realtimeService.emitToRooms(rooms, 'clearance.status_updated', payload);
    } catch (err) {
      console.error(`[ClearanceService] Socket emission error: ${err.message}`);
    }

    return session;
  }

  /**
   * Reset clearance session for a vehicle back to initial detected state
   */
  async resetClearance(vehicleId) {
    await ClearanceSession.deleteMany({ vehicleId });
    return this.getClearanceForVehicle(vehicleId);
  }
}

export const clearanceService = new ClearanceService();
export default clearanceService;
