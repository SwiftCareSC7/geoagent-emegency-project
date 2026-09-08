/**
 * SwiftCare GeoAgent — Admin API Client
 *
 * Backend routes:
 *   GET /api/admin/stats          — Real system counts and recent activity
 *   GET /api/admin/health         — Live database ping latency & connection state
 *   GET /api/admin/providers      — External provider statuses
 *   GET /api/admin/users          — Paginated, sanitized users (no passwords)
 *   GET /api/admin/vehicles       — Paginated vehicles
 *   GET /api/admin/emergencies    — Paginated emergencies
 *   GET /api/admin/incidents      — Paginated incidents
 *   GET /api/admin/routes         — Paginated routes
 *   GET /api/admin/trajectories   — Paginated trajectory points
 *   GET /api/admin/predictions    — Paginated prediction snapshots
 *   GET /api/admin/decisions      — Paginated decision lifecycle audit trail
 */

import { get, post } from './client'
import type {
  AdminSystemStats,
  AdminDatabaseHealth,
  AdminSystemHealthSummary,
  AdminPaginatedResponse,
  AdminQueryParams,
  User,
  Vehicle,
  Emergency,
  Incident,
  Route,
  PredictionResult,
  Decision
} from './types'

export const adminApi = {
  /** Retrieve real-time operational counts and 24h activity */
  getStats(): Promise<{ success: boolean; data: AdminSystemStats }> {
    return get<{ success: boolean; data: AdminSystemStats }>('/admin/stats')
  },

  /** Ping MongoDB and retrieve connection status & latency (ms) */
  getHealth(): Promise<{ success: boolean; data: AdminDatabaseHealth }> {
    return get<{ success: boolean; data: AdminDatabaseHealth }>('/admin/health')
  },

  /** Retrieve full system & provider health summary */
  getProviders(): Promise<{ success: boolean; data: AdminSystemHealthSummary }> {
    return get<{ success: boolean; data: AdminSystemHealthSummary }>('/admin/providers')
  },

  /** List users (sanitized, password hashes never returned) */
  getUsers(params?: AdminQueryParams): Promise<AdminPaginatedResponse<User>> {
    return get<AdminPaginatedResponse<User>>('/admin/users', params)
  },

  /** List vehicles with pagination & filtering */
  getVehicles(params?: AdminQueryParams): Promise<AdminPaginatedResponse<Vehicle>> {
    return get<AdminPaginatedResponse<Vehicle>>('/admin/vehicles', params)
  },

  /** List emergencies with populated vehicle & user details */
  getEmergencies(params?: AdminQueryParams): Promise<AdminPaginatedResponse<Emergency>> {
    return get<AdminPaginatedResponse<Emergency>>('/admin/emergencies', params)
  },

  /** List incidents with reportedBy and emergency details */
  getIncidents(params?: AdminQueryParams): Promise<AdminPaginatedResponse<Incident>> {
    return get<AdminPaginatedResponse<Incident>>('/admin/incidents', params)
  },

  /** List routes */
  getRoutes(params?: AdminQueryParams): Promise<AdminPaginatedResponse<Route>> {
    return get<AdminPaginatedResponse<Route>>('/admin/routes', params)
  },

  /** List trajectory GPS points (bounded pagination) */
  getTrajectories(params?: AdminQueryParams): Promise<AdminPaginatedResponse<any>> {
    return get<AdminPaginatedResponse<any>>('/admin/trajectories', params)
  },

  /** List AI/deterministic prediction snapshots */
  getPredictions(params?: AdminQueryParams): Promise<AdminPaginatedResponse<PredictionResult>> {
    return get<AdminPaginatedResponse<PredictionResult>>('/admin/predictions', params)
  },

  /** List operational decision lifecycle audit records */
  getDecisions(params?: AdminQueryParams): Promise<AdminPaginatedResponse<Decision>> {
    return get<AdminPaginatedResponse<Decision>>('/admin/decisions', params)
  },

  /** Retrieve prediction validation analytics and model governance metrics */
  getPredictionAnalytics(): Promise<{ success: boolean; data: any }> {
    return get<{ success: boolean; data: any }>('/admin/prediction-analytics')
  },

  /** Get list of 5 canonical demo scenarios */
  getDemoScenarios(): Promise<{ success: boolean; data: any[] }> {
    return get<{ success: boolean; data: any[] }>('/admin/demo/scenarios')
  },

  /** Seed database with 5 canonical demo scenarios */
  seedDemoScenarios(): Promise<{ success: boolean; message: string; data: any }> {
    return post<{ success: boolean; message: string; data: any }>('/admin/demo/seed', {})
  },

  /** Reset database demo records */
  resetDemoScenarios(): Promise<{ success: boolean; message: string; data: any }> {
    return post<{ success: boolean; message: string; data: any }>('/admin/demo/reset', {})
  }
}
