import { verifyToken } from '../auth/jwt.utils.js';
import User from '../auth/user.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import { CLIENT_COMMANDS, REALTIME_ROOMS } from './realtime.constants.js';

/**
 * Self-contained cookie parser for handshake headers
 * @param {String} cookieString
 * @returns {Object} Key-value pair of cookies
 */
export const parseCookie = (cookieString) => {
  if (!cookieString || typeof cookieString !== 'string') return {};
  return cookieString.split(';').reduce((cookies, item) => {
    const [name, ...val] = item.trim().split('=');
    if (name) {
      cookies[name.trim()] = decodeURIComponent(val.join('='));
    }
    return cookies;
  }, {});
};


/**
 * Socket.IO Handshake Authentication Middleware
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = null;

    // 1. Check handshake auth payload
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    
    // 2. Check Authorization header
    if (!token && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // 3. Check HTTP-only cookie in handshake headers
    if (!token && socket.handshake.headers.cookie) {
      const parsedCookies = parseCookie(socket.handshake.headers.cookie);
      token = parsedCookies.token;
    }


    if (!token) {
      const error = new Error('Authentication error: No token provided');
      error.data = { code: 'UNAUTHORIZED' };
      return next(error);
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      const error = new Error('Authentication error: Invalid or expired token');
      error.data = { code: 'INVALID_TOKEN' };
      return next(error);
    }

    // Load user and verify role
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      const error = new Error('Authentication error: User no longer exists');
      error.data = { code: 'USER_NOT_FOUND' };
      return next(error);
    }

    // Status check: Only allow APPROVED accounts (backward compatible default for legacy/mock accounts)
    const effectiveStatus = user.status || 'APPROVED';
    if (effectiveStatus !== 'APPROVED') {
      const error = new Error(`Authentication error: Account status is ${effectiveStatus}`);
      error.data = { code: effectiveStatus === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : effectiveStatus === 'REJECTED' ? 'ACCOUNT_REJECTED' : 'ACCOUNT_PENDING' };
      return next(error);
    }

    // Role check: Allow all authorized operational roles
    if (!['CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'].includes(user.role)) {
      const error = new Error('Authentication error: Insufficient permissions for real-time channel');
      error.data = { code: 'FORBIDDEN' };
      return next(error);
    }

    // Attach safe user identity to socket with workspaces and vehicle assignment
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      permittedWorkspaces: user.permittedWorkspaces || [user.role],
      assignedVehicleId: user.assignedVehicleId || null
    };

    next();
  } catch (error) {
    const authError = new Error('Authentication error: ' + error.message);
    authError.data = { code: 'AUTH_FAILED' };
    next(authError);
  }
};

/**
 * Registers client event listeners with server-side validation
 * @param {Object} socket Connected Socket.IO socket instance
 */
export const registerSocketHandlers = (socket) => {
  // Per-packet authorization middleware: revalidate live account status and permissions on each event
  socket.use(async (packet, next) => {
    try {
      if (!socket.user?.id) return next(new Error('Unauthenticated socket'));
      const freshUser = await User.findById(socket.user.id).select('status permittedWorkspaces assignedVehicleId role');
      const freshStatus = freshUser?.status || 'APPROVED';
      if (!freshUser || freshStatus !== 'APPROVED') {
        socket.emit('error', { message: 'Session revoked or account suspended' });
        socket.disconnect(true);
        return next(new Error('Account not approved or suspended'));
      }
      // Re-sync socket permissions with live database state
      socket.user.permittedWorkspaces = freshUser.permittedWorkspaces || [];
      socket.user.role = freshUser.role;
      socket.user.assignedVehicleId = freshUser.assignedVehicleId || null;
      next();
    } catch (err) {
      next(err);
    }
  });

  const permitted = socket.user?.permittedWorkspaces || [socket.user?.role];

  // Automatically join control room if user has CONTROL_ROOM or ADMIN workspace
  if (permitted.includes('CONTROL_ROOM') || permitted.includes('ADMIN')) {
    socket.join(REALTIME_ROOMS.CONTROL_ROOM);
  }

  // Generic room join handler: { room: 'control-room' | 'emergency:ID' | 'vehicle:ID' }
  socket.on('room:join', async (data, callback) => {
    try {
      const room = typeof data === 'string' ? data : data?.room;
      if (!room || typeof room !== 'string') return;

      const currentPermitted = socket.user?.permittedWorkspaces || [];

      if (room === REALTIME_ROOMS.CONTROL_ROOM) {
        if (!currentPermitted.includes('CONTROL_ROOM') && !currentPermitted.includes('ADMIN')) {
          if (typeof callback === 'function') callback({ success: false, message: 'Forbidden: Insufficient privileges' });
          return;
        }
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
        // Resource ownership check: DRIVER can only subscribe to assigned vehicle
        if (socket.user?.role === 'DRIVER' && socket.user?.assignedVehicleId && socket.user.assignedVehicleId !== vehicleId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Forbidden: Drivers can only subscribe to assigned vehicle' });
          return;
        }
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

  // Client command: Join control room (strictly enforce workspace authorization)
  socket.on(CLIENT_COMMANDS.JOIN_CONTROL_ROOM, (data, callback) => {
    const cb = typeof data === 'function' ? data : (typeof callback === 'function' ? callback : null);
    const currentPermitted = socket.user?.permittedWorkspaces || [];
    if (!currentPermitted.includes('CONTROL_ROOM') && !currentPermitted.includes('ADMIN')) {
      if (cb) cb({ success: false, message: 'Forbidden: Insufficient privileges' });
      return socket.emit('error', { message: 'Forbidden: Insufficient privileges for control room' });
    }
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

  // Client command: Join vehicle room (enforces driver vehicle ownership)
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
      if (socket.user?.role === 'DRIVER' && socket.user?.assignedVehicleId && socket.user.assignedVehicleId !== vehicleId) {
        const errorMsg = 'Forbidden: Drivers can only subscribe to assigned vehicle';
        if (cb) cb({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

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
