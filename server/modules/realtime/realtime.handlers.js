import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import { CLIENT_COMMANDS, REALTIME_ROOMS } from './realtime.constants.js';

/**
 * Registers client event listeners with server-side validation
 * @param {Object} socket Connected Socket.IO socket instance
 */
export const registerSocketHandlers = (socket) => {
  // No authentication: every client receives the control-room feed.
  socket.join(REALTIME_ROOMS.CONTROL_ROOM);

  // Generic room join handler: { room: 'control-room' | 'emergency:ID' | 'vehicle:ID' }
  socket.on('room:join', async (data, callback) => {
    try {
      const room = typeof data === 'string' ? data : data?.room;
      if (!room || typeof room !== 'string') return;

      if (room === REALTIME_ROOMS.CONTROL_ROOM) {
        socket.join(room);
        if (typeof callback === 'function') callback({ success: true, room });
        socket.emit('joined', { room });
      } else if (room.startsWith('emergency:')) {
        const emergencyId = room.replace('emergency:', '');
        const emergency = await Emergency.findOne({ emergencyId, isDeleted: false });
        if (emergency) {
          socket.join(room);
          if (typeof callback === 'function') callback({ success: true, room });
          socket.emit('joined', { room });
        } else {
          if (typeof callback === 'function') callback({ success: false, message: 'Emergency not found' });
        }
      } else if (room.startsWith('vehicle:')) {
        const vehicleId = room.replace('vehicle:', '');
        const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
        if (vehicle) {
          socket.join(room);
          if (typeof callback === 'function') callback({ success: true, room });
          socket.emit('joined', { room });
        } else {
          if (typeof callback === 'function') callback({ success: false, message: 'Vehicle not found' });
        }
      }
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, message: err.message });
    }
  });

  // Generic room leave handler: { room: '...' }
  socket.on('room:leave', (data, callback) => {
    const room = typeof data === 'string' ? data : data?.room;
    if (room && typeof room === 'string') {
      socket.leave(room);
      if (typeof callback === 'function') callback({ success: true, room });
      socket.emit('left', { room });
    }
  });

  // Client command: Join control room
  socket.on(CLIENT_COMMANDS.JOIN_CONTROL_ROOM, (data, callback) => {
    const cb = typeof data === 'function' ? data : (typeof callback === 'function' ? callback : null);
    socket.join(REALTIME_ROOMS.CONTROL_ROOM);
    if (cb) cb({ success: true, room: REALTIME_ROOMS.CONTROL_ROOM });
    socket.emit('joined', { room: REALTIME_ROOMS.CONTROL_ROOM });
  });

  // Client command: Leave control room
  socket.on(CLIENT_COMMANDS.LEAVE_CONTROL_ROOM, () => {
    socket.leave(REALTIME_ROOMS.CONTROL_ROOM);
    socket.emit('left', { room: REALTIME_ROOMS.CONTROL_ROOM });
  });

  // Client command: Join emergency room
  socket.on(CLIENT_COMMANDS.JOIN_EMERGENCY, async (data, callback) => {
    const cb = typeof data === 'function' ? data : (typeof callback === 'function' ? callback : null);
    try {
      const emergencyId = typeof data === 'string' ? data : (data && typeof data === 'object' && data.emergencyId);
      if (!emergencyId) {
        const errorMsg = 'Invalid emergencyId provided';
        if (cb) cb({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const emergency = await Emergency.findOne({ emergencyId, isDeleted: false });
      if (!emergency) {
        const errorMsg = 'Emergency not found';
        if (cb) cb({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const roomName = REALTIME_ROOMS.emergency(emergencyId);
      socket.join(roomName);
      if (cb) cb({ success: true, room: roomName });
      socket.emit('joined', { room: roomName });
    } catch (err) {
      if (cb) cb({ success: false, message: err.message });
      socket.emit('error', { message: 'Failed to join emergency room' });
    }
  });

  // Client command: Leave emergency room
  socket.on(CLIENT_COMMANDS.LEAVE_EMERGENCY, (data, callback) => {
    const cb = typeof data === 'function' ? data : (typeof callback === 'function' ? callback : null);
    const emergencyId = typeof data === 'string' ? data : (data && typeof data === 'object' && data.emergencyId);
    if (emergencyId) {
      const roomName = REALTIME_ROOMS.emergency(emergencyId);
      socket.leave(roomName);
      if (cb) cb({ success: true, room: roomName });
      socket.emit('left', { room: roomName });
    }
  });

  // Client command: Join vehicle room
  socket.on(CLIENT_COMMANDS.JOIN_VEHICLE, async (data, callback) => {
    const cb = typeof data === 'function' ? data : (typeof callback === 'function' ? callback : null);
    try {
      const vehicleId = typeof data === 'string' ? data : (data && typeof data === 'object' && data.vehicleId);
      if (!vehicleId) {
        const errorMsg = 'Invalid vehicleId provided';
        if (cb) cb({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      // Resource ownership check: DRIVER can only subscribe to assigned vehicle

      const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
      if (!vehicle) {
        const errorMsg = 'Vehicle not found';
        if (cb) cb({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const roomName = REALTIME_ROOMS.vehicle(vehicleId);
      socket.join(roomName);
      if (cb) cb({ success: true, room: roomName });
      socket.emit('joined', { room: roomName });
    } catch (err) {
      if (cb) cb({ success: false, message: err.message });
      socket.emit('error', { message: 'Failed to join vehicle room' });
    }
  });

  // Client command: Leave vehicle room
  socket.on(CLIENT_COMMANDS.LEAVE_VEHICLE, (data, callback) => {
    const vehicleId = typeof data === 'string' ? data : (data && data.vehicleId);
    if (vehicleId) {
      const roomName = REALTIME_ROOMS.vehicle(vehicleId);
      socket.leave(roomName);
      if (callback) callback({ success: true, room: roomName });
      socket.emit('left', { room: roomName });
    }
  });

  // Connection disconnect cleanup
  socket.on('disconnect', (reason) => {
    // Socket.IO automatically cleans up room memberships upon disconnection
  });
};
