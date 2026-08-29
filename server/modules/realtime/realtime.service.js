import { Server as SocketIOServer } from 'socket.io';
import { REALTIME_EVENTS, REALTIME_ROOMS } from './realtime.constants.js';
import { createEventEnvelope } from './realtime.events.js';
import { socketAuthMiddleware, registerSocketHandlers } from './realtime.handlers.js';

class RealtimeService {
  constructor() {
    this.io = null;
  }

  /**
   * Initializes the Socket.IO instance and attaches to the HTTP server
   * @param {Object} httpServer Node.js HTTP server
   * @param {Object} options
   */
  init(httpServer, options = {}) {
    if (this.io) {
      return this.io;
    }

    const clientUrl = options.clientUrl || process.env.CLIENT_URL || 'http://localhost:5173';

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: clientUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE']
      },
      pingTimeout: 20000,
      pingInterval: 25000
    });

    // 1. Handshake Authentication Middleware
    this.io.use(socketAuthMiddleware);

    // 2. Connection event
    this.io.on('connection', (socket) => {
      registerSocketHandlers(socket);
    });

    return this.io;
  }

  /**
   * Safe check for active IO instance
   */
  isReady() {
    return this.io !== null;
  }

  /**
   * Emits an event to one or more rooms
   * @param {String|Array<String>} rooms
   * @param {String} eventName
   * @param {Object} payload
   */
  emitToRooms(rooms, eventName, payload) {
    if (!this.isReady()) return;

    const envelope = createEventEnvelope(eventName, payload);
    const targetRooms = Array.isArray(rooms) ? rooms : [rooms];

    let emitter = this.io;
    for (const room of targetRooms) {
      if (room) {
        emitter = emitter.to(room);
      }
    }

    emitter.emit(eventName, envelope);
  }

  /**
   * Emits vehicle location updated event
   */
  emitVehicleLocationUpdated(vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED, payload);
  }

  /**
   * Emits vehicle status updated event
   */
  emitVehicleStatusUpdated(vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.VEHICLE_STATUS_UPDATED, payload);
  }

  /**
   * Emits trajectory created event
   */
  emitTrajectoryCreated(vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.TRAJECTORY_CREATED, payload);
  }

  /**
   * Emits emergency created event
   */
  emitEmergencyCreated(payload) {
    this.emitToRooms(REALTIME_ROOMS.CONTROL_ROOM, REALTIME_EVENTS.EMERGENCY_CREATED, payload);
  }

  /**
   * Emits emergency updated event
   */
  emitEmergencyUpdated(emergencyId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    this.emitToRooms(rooms, REALTIME_EVENTS.EMERGENCY_UPDATED, payload);
  }

  /**
   * Emits incident created event
   */
  emitIncidentCreated(payload) {
    this.emitToRooms(REALTIME_ROOMS.CONTROL_ROOM, REALTIME_EVENTS.INCIDENT_CREATED, payload);
  }

  /**
   * Emits incident updated event
   */
  emitIncidentUpdated(incidentId, payload) {
    this.emitToRooms(REALTIME_ROOMS.CONTROL_ROOM, REALTIME_EVENTS.INCIDENT_UPDATED, payload);
  }

  /**
   * Emits route updated event
   */
  emitRouteUpdated(emergencyId, vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.ROUTE_UPDATED, payload);
  }

  /**
   * Emits route deviation detected event
   */
  emitRouteDeviation(vehicleId, emergencyId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.ROUTE_DEVIATION_DETECTED, payload);
  }

  /**
   * Emits traffic updated event
   */
  emitTrafficUpdated(payload) {
    this.emitToRooms(REALTIME_ROOMS.CONTROL_ROOM, REALTIME_EVENTS.TRAFFIC_UPDATED, payload);
  }

  /**
   * Emits ETA updated event
   */
  emitEtaUpdated(vehicleId, emergencyId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.ETA_UPDATED, payload);
  }

  /**
   * Emits GeoAgent analysis created event
   */
  emitGeoAgentAnalysis(emergencyId, vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.GEOAGENT_ANALYSIS_CREATED, payload);
  }

  /**
   * Emits decision created event
   */
  emitDecisionCreated(emergencyId, vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.DECISION_CREATED, payload);
  }

  /**
   * Emits decision approved event
   */
  emitDecisionApproved(emergencyId, vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.DECISION_APPROVED, payload);
  }

  /**
   * Emits decision rejected event
   */
  emitDecisionRejected(emergencyId, vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.DECISION_REJECTED, payload);
  }

  /**
   * Emits decision executed event
   */
  emitDecisionExecuted(emergencyId, vehicleId, payload) {
    const rooms = [REALTIME_ROOMS.CONTROL_ROOM];
    if (emergencyId) rooms.push(REALTIME_ROOMS.emergency(emergencyId));
    if (vehicleId) rooms.push(REALTIME_ROOMS.vehicle(vehicleId));
    this.emitToRooms(rooms, REALTIME_EVENTS.DECISION_EXECUTED, payload);
  }
}

export default new RealtimeService();
