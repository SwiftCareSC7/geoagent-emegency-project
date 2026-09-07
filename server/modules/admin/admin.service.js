/**
 * Admin Service — Database Administration & System Observability
 *
 * Provides real database-backed metrics, lightweight latency pings,
 * and sanitized, paginated readers for approved operational collections.
 *
 * Passwords, tokens, API keys, and connection strings are strictly omitted.
 */

import mongoose from 'mongoose';
import User from '../auth/user.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Emergency from '../emergencies/emergency.model.js';
import Incident from '../incidents/incident.model.js';
import Trajectory from '../trajectories/trajectory.model.js';
import Route from '../routes/route.model.js';
import Decision from '../decisions/decision.model.js';
import Prediction from '../analysis/prediction.model.js';
import providerHealthService from '../health/providerHealth.service.js';

class AdminService {
  /**
   * Calculate real system-wide statistics across all active collections.
   *
   * Utilizes estimatedDocumentCount() for massive collections (Trajectory)
   * and filtered counts for operational collections.
   */
  async getSystemStats() {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return {
        databaseConnected: false,
        connectionState: this._getConnectionStateString(mongoose.connection.readyState),
        counts: {
          users: 0,
          vehicles: 0,
          activeVehicles: 0,
          emergencies: 0,
          activeEmergencies: 0,
          incidents: 0,
          activeIncidents: 0,
          trajectories: 0,
          routes: 0,
          decisions: 0,
          pendingDecisions: 0,
          predictions: 0
        },
        recentActivity: {
          emergenciesLast24h: 0,
          decisionsLast24h: 0,
          incidentsLast24h: 0
        },
        timestamp: new Date().toISOString()
      };
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Run parallel queries efficiently
    const [
      userCount,
      vehicleCount,
      activeVehicleCount,
      emergencyCount,
      activeEmergencyCount,
      incidentCount,
      activeIncidentCount,
      trajectoryCount,
      routeCount,
      decisionCount,
      pendingDecisionCount,
      predictionCount,
      emergenciesLast24h,
      decisionsLast24h,
      incidentsLast24h
    ] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments({ isDeleted: false }),
      Vehicle.countDocuments({ isDeleted: false, status: { $in: ['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'AT_SCENE', 'RETURNING'] } }),
      Emergency.countDocuments({ isDeleted: false }),
      Emergency.countDocuments({ isDeleted: false, status: { $in: ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'AT_SCENE'] } }),
      Incident.countDocuments({ isDeleted: false }),
      Incident.countDocuments({ isDeleted: false, status: 'ACTIVE' }),
      // O(1) constant-time estimate for high-frequency time-series GPS points
      Trajectory.estimatedDocumentCount().catch(() => Trajectory.countDocuments()),
      Route.countDocuments(),
      Decision.countDocuments(),
      Decision.countDocuments({ status: 'PENDING_OPERATOR_ACTION' }),
      Prediction.countDocuments(),
      Emergency.countDocuments({ createdAt: { $gte: oneDayAgo }, isDeleted: false }),
      Decision.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Incident.countDocuments({ createdAt: { $gte: oneDayAgo }, isDeleted: false })
    ]);

    return {
      databaseConnected: true,
      connectionState: 'CONNECTED',
      counts: {
        users: userCount,
        vehicles: vehicleCount,
        activeVehicles: activeVehicleCount,
        emergencies: emergencyCount,
        activeEmergencies: activeEmergencyCount,
        incidents: incidentCount,
        activeIncidents: activeIncidentCount,
        trajectories: trajectoryCount,
        routes: routeCount,
        decisions: decisionCount,
        pendingDecisions: pendingDecisionCount,
        predictions: predictionCount
      },
      recentActivity: {
        emergenciesLast24h,
        decisionsLast24h,
        incidentsLast24h
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Safe database health check. Measures live ping latency and returns state.
   * NEVER exposes credentials, Mongo URIs, or passwords.
   */
  async getDatabaseHealth() {
    const readyState = mongoose.connection.readyState;
    const stateString = this._getConnectionStateString(readyState);

    if (readyState !== 1) {
      return {
        status: stateString === 'CONNECTING' ? 'DEGRADED' : 'DISCONNECTED',
        connected: false,
        latencyMs: null,
        readyState: stateString,
        databaseName: mongoose.connection.name || null,
        checkedAt: new Date().toISOString()
      };
    }

    try {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const latencyMs = Date.now() - pingStart;

      const status = latencyMs > 600 ? 'DEGRADED' : 'CONNECTED';

      return {
        status,
        connected: true,
        latencyMs,
        readyState: 'CONNECTED',
        databaseName: mongoose.connection.name || 'primary',
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'DEGRADED',
        connected: false,
        latencyMs: null,
        readyState: 'ERROR',
        databaseName: mongoose.connection.name || null,
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Combines database health with external service provider health
   * (Google Routes, Google Roads, Gemini AI, Socket.IO).
   */
  async getSystemHealthSummary() {
    const dbHealth = await this.getDatabaseHealth();
    let externalProviders = {
      googleRoutes: { status: 'NOT_CONFIGURED', provider: 'google', mode: 'mock' },
      googleRoads: { status: 'NOT_CONFIGURED', provider: 'google', mode: 'mock' },
      geminiAi: { status: 'NOT_CONFIGURED', provider: 'gemini', mode: 'mock' }
    };

    try {
      const report = await providerHealthService.getHealthStatus();
      const provMap = report?.providers || report || {};
      externalProviders = {
        googleRoutes: provMap.googleRoutes || { status: 'NOT_CONFIGURED', provider: 'google', mode: 'mock' },
        googleRoads: provMap.googleRoads || { status: 'NOT_CONFIGURED', provider: 'google', mode: 'mock' },
        geminiAi: provMap.gemini || provMap.geminiAi || { status: 'NOT_CONFIGURED', provider: 'gemini', mode: 'mock' },
        gemini: provMap.gemini || provMap.geminiAi || { status: 'NOT_CONFIGURED', provider: 'gemini', mode: 'mock' }
      };
    } catch (err) {
      // Graceful fallback if provider service is degraded
    }

    return {
      database: dbHealth,
      providers: externalProviders,
      checkedAt: new Date().toISOString()
    };
  }

  // =========================================================================
  // PAGINATED READERS (SANITIZED & PROJECTED)
  // =========================================================================

  /**
   * Users listing (Sanitized: strictly excludes password hash)
   */
  async getUsers({ page, limit, skip, sortOptions, role, search }) {
    const filter = {};
    if (role && ['CONTROL_ROOM', 'ADMIN'].includes(role)) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-password -__v')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Vehicles listing
   */
  async getVehicles({ page, limit, skip, sortOptions, status, type }) {
    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [total, vehicles] = await Promise.all([
      Vehicle.countDocuments(filter),
      Vehicle.find(filter)
        .select('-__v')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = vehicles.map(v => ({
      id: v._id.toString(),
      vehicleId: v.vehicleId,
      registrationNumber: v.registrationNumber,
      type: v.type,
      status: v.status,
      driverName: v.driverName,
      driverContact: v.driverContact || null,
      hospitalName: v.hospitalName || null,
      hospitalCode: v.hospitalCode || null,
      capacity: v.capacity,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Emergencies listing
   */
  async getEmergencies({ page, limit, skip, sortOptions, status, priority, vehicleId }) {
    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.assignedVehicle = vehicleId;
    }

    const [total, emergencies] = await Promise.all([
      Emergency.countDocuments(filter),
      Emergency.find(filter)
        .select('-__v')
        .populate('assignedVehicle', 'vehicleId registrationNumber type status driverName')
        .populate('createdBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = emergencies.map(e => ({
      id: e._id.toString(),
      emergencyId: e.emergencyId,
      type: e.type,
      priority: e.priority,
      status: e.status,
      callerName: e.callerName || null,
      callerContact: e.callerContact || null,
      description: e.description || null,
      location: e.location,
      destination: e.destination || null,
      assignedVehicle: e.assignedVehicle
        ? {
            id: e.assignedVehicle._id.toString(),
            vehicleId: e.assignedVehicle.vehicleId,
            registrationNumber: e.assignedVehicle.registrationNumber,
            type: e.assignedVehicle.type,
            status: e.assignedVehicle.status,
            driverName: e.assignedVehicle.driverName
          }
        : null,
      createdBy: e.createdBy
        ? {
            id: e.createdBy._id.toString(),
            name: e.createdBy.name,
            email: e.createdBy.email,
            role: e.createdBy.role
          }
        : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Incidents listing
   */
  async getIncidents({ page, limit, skip, sortOptions, status, type, severity, emergencyId }) {
    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (emergencyId && mongoose.Types.ObjectId.isValid(emergencyId)) {
      filter.emergency = emergencyId;
    }

    const [total, incidents] = await Promise.all([
      Incident.countDocuments(filter),
      Incident.find(filter)
        .select('-__v')
        .populate('reportedBy', 'name email role')
        .populate('emergency', 'emergencyId type priority status')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = incidents.map(inc => ({
      id: inc._id.toString(),
      incidentId: inc.incidentId,
      type: inc.type,
      severity: inc.severity,
      status: inc.status,
      description: inc.description || null,
      location: inc.location,
      emergency: inc.emergency
        ? {
            id: inc.emergency._id.toString(),
            emergencyId: inc.emergency.emergencyId,
            type: inc.emergency.type,
            priority: inc.emergency.priority,
            status: inc.emergency.status
          }
        : null,
      reportedBy: inc.reportedBy
        ? {
            id: inc.reportedBy._id.toString(),
            name: inc.reportedBy.name,
            email: inc.reportedBy.email,
            role: inc.reportedBy.role
          }
        : null,
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Routes listing
   */
  async getRoutes({ page, limit, skip, sortOptions, emergencyId, vehicleId, provider, status, routeType }) {
    const filter = {};
    if (status) filter.status = status;
    if (routeType) filter.routeType = routeType;
    if (provider) filter.provider = provider.toUpperCase();
    if (emergencyId && mongoose.Types.ObjectId.isValid(emergencyId)) {
      filter.emergency = emergencyId;
    }
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.vehicle = vehicleId;
    }

    const [total, routes] = await Promise.all([
      Route.countDocuments(filter),
      Route.find(filter)
        .select('-__v')
        .populate('emergency', 'emergencyId type priority status')
        .populate('vehicle', 'vehicleId registrationNumber type status')
        .populate('createdBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = routes.map(r => ({
      id: r._id.toString(),
      routeId: r.routeId,
      emergency: r.emergency
        ? {
            id: r.emergency._id.toString(),
            emergencyId: r.emergency.emergencyId,
            type: r.emergency.type,
            priority: r.emergency.priority,
            status: r.emergency.status
          }
        : null,
      vehicle: r.vehicle
        ? {
            id: r.vehicle._id.toString(),
            vehicleId: r.vehicle.vehicleId,
            registrationNumber: r.vehicle.registrationNumber,
            type: r.vehicle.type,
            status: r.vehicle.status
          }
        : null,
      origin: r.origin,
      destination: r.destination,
      distance: r.distance,
      duration: r.duration,
      provider: r.provider,
      routeType: r.routeType,
      status: r.status,
      coordinatesCount: r.geometry?.coordinates?.length || 0,
      createdBy: r.createdBy
        ? {
            id: r.createdBy._id.toString(),
            name: r.createdBy.name,
            email: r.createdBy.email
          }
        : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Trajectories listing (Bounded, high-performance pagination)
   */
  async getTrajectories({ page, limit, skip, sortOptions, vehicleId, startDate, endDate }) {
    const filter = {};
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.vehicle = vehicleId;
    }
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Trajectory is indexed by { vehicle: 1, timestamp: -1 }
    const [total, trajectories] = await Promise.all([
      Trajectory.countDocuments(filter),
      Trajectory.find(filter)
        .select('-__v')
        .populate('vehicle', 'vehicleId registrationNumber type status')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = trajectories.map(t => ({
      id: t._id.toString(),
      vehicle: t.vehicle
        ? {
            id: t.vehicle._id.toString(),
            vehicleId: t.vehicle.vehicleId,
            registrationNumber: t.vehicle.registrationNumber,
            type: t.vehicle.type
          }
        : null,
      location: t.location,
      speed: t.speed,
      heading: t.heading,
      timestamp: t.timestamp,
      source: t.source,
      createdAt: t.createdAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Predictions listing
   */
  async getPredictions({ page, limit, skip, sortOptions, emergencyId, vehicleId, delayRisk, routeRisk }) {
    const filter = {};
    if (delayRisk) filter.delayRisk = delayRisk;
    if (routeRisk) filter.routeRisk = routeRisk;
    if (emergencyId && mongoose.Types.ObjectId.isValid(emergencyId)) {
      filter.emergency = emergencyId;
    }
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.vehicle = vehicleId;
    }

    const [total, predictions] = await Promise.all([
      Prediction.countDocuments(filter),
      Prediction.find(filter)
        .select('-__v')
        .populate('emergency', 'emergencyId type priority status')
        .populate('vehicle', 'vehicleId registrationNumber type status')
        .populate('route', 'routeId distance duration provider')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = predictions.map(p => ({
      id: p._id.toString(),
      emergency: p.emergency
        ? {
            id: p.emergency._id.toString(),
            emergencyId: p.emergency.emergencyId,
            type: p.emergency.type,
            priority: p.emergency.priority,
            status: p.emergency.status
          }
        : null,
      vehicle: p.vehicle
        ? {
            id: p.vehicle._id.toString(),
            vehicleId: p.vehicle.vehicleId,
            registrationNumber: p.vehicle.registrationNumber,
            type: p.vehicle.type
          }
        : null,
      route: p.route
        ? {
            id: p.route._id.toString(),
            routeId: p.route.routeId,
            provider: p.route.provider
          }
        : null,
      predictedEta: p.predictedEta,
      baselineEta: p.baselineEta,
      predictedDurationSeconds: p.predictedDurationSeconds,
      baselineDurationSeconds: p.baselineDurationSeconds,
      predictedDelaySeconds: p.predictedDelaySeconds,
      predictedDelayMinutes: p.predictedDelayMinutes,
      delayRisk: p.delayRisk,
      routeRisk: p.routeRisk,
      confidence: p.confidence,
      confidenceScore: p.confidenceScore,
      rerouteAdvised: p.rerouteAdvised,
      rerouteUrgency: p.rerouteUrgency,
      factors: p.factors || [],
      modelVersion: p.modelVersion,
      trafficSource: p.trafficSource,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Decisions listing
   */
  async getDecisions({ page, limit, skip, sortOptions, emergencyId, vehicleId, status, severity, primaryAction }) {
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (primaryAction) filter.primaryAction = primaryAction;
    if (emergencyId && mongoose.Types.ObjectId.isValid(emergencyId)) {
      filter.emergency = emergencyId;
    }
    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.vehicle = vehicleId;
    }

    const [total, decisions] = await Promise.all([
      Decision.countDocuments(filter),
      Decision.find(filter)
        .select('-__v')
        .populate('emergency', 'emergencyId type priority status')
        .populate('vehicle', 'vehicleId registrationNumber type status')
        .populate('route', 'routeId distance duration provider')
        .populate('approvedBy', 'name email role')
        .populate('rejectedBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = decisions.map(d => ({
      id: d._id.toString(),
      decisionId: d.decisionId,
      emergency: d.emergency
        ? {
            id: d.emergency._id.toString(),
            emergencyId: d.emergency.emergencyId,
            type: d.emergency.type,
            priority: d.emergency.priority,
            status: d.emergency.status
          }
        : null,
      vehicle: d.vehicle
        ? {
            id: d.vehicle._id.toString(),
            vehicleId: d.vehicle.vehicleId,
            registrationNumber: d.vehicle.registrationNumber,
            type: d.vehicle.type
          }
        : null,
      route: d.route
        ? {
            id: d.route._id.toString(),
            routeId: d.route.routeId,
            provider: d.route.provider
          }
        : null,
      severity: d.severity,
      primaryAction: d.primaryAction,
      actions: d.actions,
      backup: d.backup,
      reasonCodes: d.reasonCodes,
      geoAgentRecommendation: d.geoAgentRecommendation,
      inputSnapshot: d.inputSnapshot,
      situationHash: d.situationHash,
      status: d.status,
      approvedBy: d.approvedBy
        ? {
            id: d.approvedBy._id.toString(),
            name: d.approvedBy.name,
            email: d.approvedBy.email,
            role: d.approvedBy.role
          }
        : null,
      approvedAt: d.approvedAt,
      rejectedBy: d.rejectedBy
        ? {
            id: d.rejectedBy._id.toString(),
            name: d.rejectedBy.name,
            email: d.rejectedBy.email,
            role: d.rejectedBy.role
          }
        : null,
      rejectedAt: d.rejectedAt,
      rejectionReason: d.rejectionReason,
      executedAt: d.executedAt,
      executionSummary: d.executionSummary,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  _getConnectionStateString(state) {
    switch (state) {
      case 0: return 'DISCONNECTED';
      case 1: return 'CONNECTED';
      case 2: return 'CONNECTING';
      case 3: return 'DISCONNECTING';
      default: return 'UNKNOWN';
    }
  }
}

export default new AdminService();
