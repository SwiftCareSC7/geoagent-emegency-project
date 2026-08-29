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

    // Role check: Only CONTROL_ROOM and ADMIN allowed
    if (!['CONTROL_ROOM', 'ADMIN'].includes(user.role)) {
      const error = new Error('Authentication error: Insufficient permissions for real-time channel');
      error.data = { code: 'FORBIDDEN' };
      return next(error);
    }

    // Attach safe user identity to socket
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
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
  // Automatically join control room if user is CONTROL_ROOM or ADMIN
  socket.join(REALTIME_ROOMS.CONTROL_ROOM);

  // Client command: Join control room
  socket.on(CLIENT_COMMANDS.JOIN_CONTROL_ROOM, () => {
    socket.join(REALTIME_ROOMS.CONTROL_ROOM);
    socket.emit('joined', { room: REALTIME_ROOMS.CONTROL_ROOM });
  });

  // Client command: Leave control room
  socket.on(CLIENT_COMMANDS.LEAVE_CONTROL_ROOM, () => {
    socket.leave(REALTIME_ROOMS.CONTROL_ROOM);
    socket.emit('left', { room: REALTIME_ROOMS.CONTROL_ROOM });
  });

  // Client command: Join emergency room
  socket.on(CLIENT_COMMANDS.JOIN_EMERGENCY, async (data, callback) => {
    try {
      const emergencyId = typeof data === 'string' ? data : (data && data.emergencyId);
      if (!emergencyId) {
        const errorMsg = 'Invalid emergencyId provided';
        if (callback) callback({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const emergency = await Emergency.findOne({ emergencyId, isDeleted: false });
      if (!emergency) {
        const errorMsg = 'Emergency not found';
        if (callback) callback({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const roomName = REALTIME_ROOMS.emergency(emergencyId);
      socket.join(roomName);
      if (callback) callback({ success: true, room: roomName });
      socket.emit('joined', { room: roomName });
    } catch (err) {
      if (callback) callback({ success: false, message: err.message });
      socket.emit('error', { message: 'Failed to join emergency room' });
    }
  });

  // Client command: Leave emergency room
  socket.on(CLIENT_COMMANDS.LEAVE_EMERGENCY, (data, callback) => {
    const emergencyId = typeof data === 'string' ? data : (data && data.emergencyId);
    if (emergencyId) {
      const roomName = REALTIME_ROOMS.emergency(emergencyId);
      socket.leave(roomName);
      if (callback) callback({ success: true, room: roomName });
      socket.emit('left', { room: roomName });
    }
  });

  // Client command: Join vehicle room
  socket.on(CLIENT_COMMANDS.JOIN_VEHICLE, async (data, callback) => {
    try {
      const vehicleId = typeof data === 'string' ? data : (data && data.vehicleId);
      if (!vehicleId) {
        const errorMsg = 'Invalid vehicleId provided';
        if (callback) callback({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
      if (!vehicle) {
        const errorMsg = 'Vehicle not found';
        if (callback) callback({ success: false, message: errorMsg });
        return socket.emit('error', { message: errorMsg });
      }

      const roomName = REALTIME_ROOMS.vehicle(vehicleId);
      socket.join(roomName);
      if (callback) callback({ success: true, room: roomName });
      socket.emit('joined', { room: roomName });
    } catch (err) {
      if (callback) callback({ success: false, message: err.message });
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
