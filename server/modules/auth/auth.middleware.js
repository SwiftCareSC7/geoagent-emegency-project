import { verifyToken } from './jwt.utils.js';
import User from './user.model.js';

// Short-lived in-memory auth cache to avoid a MongoDB round-trip on every single API request.
// Immediately invalidated when an admin updates a user's status or role.
const AUTH_CACHE_TTL_MS = 30_000;
const AUTH_CACHE_MAX_SIZE = 500;
const authUserCache = new Map();

export const invalidateAuthUserCache = (userId) => {
  if (!userId) {
    authUserCache.clear();
    return;
  }
  authUserCache.delete(String(userId));
};

const buildSafeUserObject = (raw) => {
  const obj = { ...raw };
  delete obj.password;
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  if (!obj.status) {
    obj.status = 'APPROVED';
  }
  if (obj.status !== 'APPROVED') {
    obj.permittedWorkspaces = [];
  } else if (!obj.permittedWorkspaces || obj.permittedWorkspaces.length === 0) {
    if (obj.role === 'ADMIN') {
      obj.permittedWorkspaces = ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'];
    } else if (obj.role === 'CONTROL_ROOM') {
      obj.permittedWorkspaces = ['CONTROL_ROOM'];
    } else if (obj.role === 'DRIVER') {
      obj.permittedWorkspaces = ['DRIVER'];
    } else if (obj.role === 'PARAMEDIC') {
      obj.permittedWorkspaces = ['PARAMEDIC'];
    } else {
      obj.permittedWorkspaces = ['CONTROL_ROOM'];
    }
  }
  return obj;
};

const getCachedUser = async (userId) => {
  const key = String(userId);
  const now = Date.now();
  const cached = authUserCache.get(key);
  if (cached && now - cached.cachedAt < AUTH_CACHE_TTL_MS) {
    return cached.user;
  }

  const user = await User.findById(userId)
    .select('name email role status permittedWorkspaces assignedVehicleId requestedRole requestedWorkspaces approvedBy approvedAt createdAt updatedAt')
    .lean();

  if (user) {
    user.id = user._id.toString();
    const safeSnapshot = buildSafeUserObject(user);
    user.toSafeObject = () => ({ ...safeSnapshot });
    if (authUserCache.size >= AUTH_CACHE_MAX_SIZE) {
      const oldestKey = authUserCache.keys().next().value;
      if (oldestKey) authUserCache.delete(oldestKey);
    }
    authUserCache.set(key, { user, cachedAt: now });
  } else {
    authUserCache.delete(key);
  }
  return user;
};

/**
 * Protect routes by requiring a valid JWT in the HTTP-only cookie
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // Read token from cookie or Authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      const error = new Error('Authentication required');
      error.status = 401;
      error.isOperational = true;
      return next(error);
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Find user by id from token payload (projected + 30s TTL cache)
      const user = await getCachedUser(decoded.userId);

      if (!user) {
        const error = new Error('Authentication required');
        error.status = 401;
        error.isOperational = true;
        return next(error);
      }

      // Defense-in-depth: Immediately block tokens from suspended, pending, or rejected accounts
      if (user.status === 'SUSPENDED') {
        const error = new Error('Account has been suspended');
        error.status = 403;
        error.isOperational = true;
        return next(error);
      }

      if (user.status === 'PENDING') {
        const error = new Error('Account registration is pending administrator approval');
        error.status = 403;
        error.isOperational = true;
        return next(error);
      }

      if (user.status === 'REJECTED') {
        const error = new Error('Account registration was rejected');
        error.status = 403;
        error.isOperational = true;
        return next(error);
      }

      if (user.status !== 'APPROVED') {
        const error = new Error('Account is not authorized');
        error.status = 403;
        error.isOperational = true;
        return next(error);
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (err) {
      // Catch specific JWT errors (expired, invalid signature) and mask them
      const error = new Error('Authentication required');
      error.status = 401;
      error.isOperational = true;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
};

// requireRole moved to roleMiddleware.js
