/**
 * Admin Controller
 *
 * Handles admin HTTP requests, executes query validation,
 * invokes admin service methods, and produces structured audit logs.
 *
 * Never logs credentials, tokens, or raw sensitive payloads.
 */

import adminService from './admin.service.js';
import { validatePaginationAndSort, sanitizeSearchString } from './admin.validation.js';

function auditLog(req, resource, durationMs, statusCode = 200) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'ADMIN_OPERATIONAL_READ',
      endpoint: req.originalUrl,
      method: req.method,
      userId: req.user?.id || req.user?._id?.toString() || 'unknown',
      userEmail: req.user?.email || 'unknown',
      resource,
      durationMs,
      statusCode
    };
    console.log(JSON.stringify(logEntry));
  } catch (err) {
    // Non-blocking logger
  }
}

class AdminController {
  async getStats(req, res, next) {
    const start = Date.now();
    try {
      const stats = await adminService.getSystemStats();
      auditLog(req, 'stats', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      auditLog(req, 'stats', Date.now() - start, 500);
      next(error);
    }
  }

  async getHealth(req, res, next) {
    const start = Date.now();
    try {
      const health = await adminService.getDatabaseHealth();
      auditLog(req, 'health', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      auditLog(req, 'health', Date.now() - start, 500);
      next(error);
    }
  }

  async getProviders(req, res, next) {
    const start = Date.now();
    try {
      const summary = await adminService.getSystemHealthSummary();
      auditLog(req, 'providers', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      auditLog(req, 'providers', Date.now() - start, 500);
      next(error);
    }
  }

  async getPredictionAnalytics(req, res, next) {
    const start = Date.now();
    try {
      const analytics = await adminService.getPredictionAnalytics();
      auditLog(req, 'prediction-analytics', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      auditLog(req, 'prediction-analytics', Date.now() - start, 500);
      next(error);
    }
  }

  async getUsers(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'users');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getUsers({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        role: req.query.role,
        search: sanitizeSearchString(req.query.search)
      });

      auditLog(req, 'users', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'users', Date.now() - start, 500);
      next(error);
    }
  }

  async getVehicles(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'vehicles');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getVehicles({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        status: req.query.status,
        type: req.query.type
      });

      auditLog(req, 'vehicles', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'vehicles', Date.now() - start, 500);
      next(error);
    }
  }

  async getEmergencies(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'emergencies');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getEmergencies({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        status: req.query.status,
        priority: req.query.priority,
        vehicleId: req.query.vehicleId
      });

      auditLog(req, 'emergencies', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'emergencies', Date.now() - start, 500);
      next(error);
    }
  }

  async getIncidents(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'incidents');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getIncidents({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        status: req.query.status,
        type: req.query.type,
        severity: req.query.severity,
        emergencyId: req.query.emergencyId
      });

      auditLog(req, 'incidents', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'incidents', Date.now() - start, 500);
      next(error);
    }
  }

  async getRoutes(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'routes');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getRoutes({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        emergencyId: req.query.emergencyId,
        vehicleId: req.query.vehicleId,
        provider: req.query.provider,
        status: req.query.status,
        routeType: req.query.routeType
      });

      auditLog(req, 'routes', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'routes', Date.now() - start, 500);
      next(error);
    }
  }

  async getTrajectories(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'trajectories');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getTrajectories({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        vehicleId: req.query.vehicleId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

      auditLog(req, 'trajectories', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'trajectories', Date.now() - start, 500);
      next(error);
    }
  }

  async getPredictions(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'predictions');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getPredictions({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        emergencyId: req.query.emergencyId,
        vehicleId: req.query.vehicleId,
        delayRisk: req.query.delayRisk,
        routeRisk: req.query.routeRisk
      });

      auditLog(req, 'predictions', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'predictions', Date.now() - start, 500);
      next(error);
    }
  }

  async getDecisions(req, res, next) {
    const start = Date.now();
    try {
      const validation = validatePaginationAndSort(req.query, 'decisions');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      const result = await adminService.getDecisions({
        page: validation.page,
        limit: validation.limit,
        skip: validation.skip,
        sortOptions: validation.sortOptions,
        emergencyId: req.query.emergencyId,
        vehicleId: req.query.vehicleId,
        status: req.query.status,
        severity: req.query.severity,
        primaryAction: req.query.primaryAction
      });

      auditLog(req, 'decisions', Date.now() - start, 200);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      auditLog(req, 'decisions', Date.now() - start, 500);
      next(error);
    }
  }
}

export default new AdminController();
