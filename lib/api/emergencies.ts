/**
 * SwiftCare GeoAgent — Emergencies API
 *
 * Backend routes:
 *   GET   /api/emergencies                       — list emergencies
 *   POST  /api/emergencies                       — create emergency
 *   GET   /api/emergencies/:emergencyId           — get emergency
 *   PATCH /api/emergencies/:emergencyId           — update emergency
 *   PATCH /api/emergencies/:emergencyId/assign    — assign vehicle
 *   GET   /api/emergencies/:emergencyId/routes    — get routes for emergency
 *   GET   /api/emergencies/:emergencyId/decisions — get decisions for emergency
 */

import { get, post, patch } from './client'
import type {
  Emergency,
  CreateEmergencyPayload,
  UpdateEmergencyPayload,
  Route,
  Decision,
} from './types'

interface EmergencyListResponse {
  success: true
  data: Emergency[]
}

interface EmergencyResponse {
  success: true
  data: Emergency
}

interface EmergencyRoutesResponse {
  success: true
  data: Route[]
}

interface EmergencyDecisionsResponse {
  success: true
  data: Decision[]
}

export const emergencyApi = {
  /** List all active emergencies, optionally filtering by status and priority */
  list(params?: {
    status?: string
    priority?: string
  }): Promise<EmergencyListResponse> {
    return get<EmergencyListResponse>('/emergencies', params)
  },

  /** Get a single emergency by its ID (e.g. "EMG-0001") */
  get(emergencyId: string): Promise<EmergencyResponse> {
    return get<EmergencyResponse>(
      `/emergencies/${encodeURIComponent(emergencyId)}`,
    )
  },

  /** Create a new emergency call record */
  create(data: CreateEmergencyPayload): Promise<EmergencyResponse> {
    return post<EmergencyResponse>('/emergencies', data)
  },

  /** Update an emergency (priority, status, description, destination) */
  update(
    emergencyId: string,
    data: UpdateEmergencyPayload,
  ): Promise<EmergencyResponse> {
    return patch<EmergencyResponse>(
      `/emergencies/${encodeURIComponent(emergencyId)}`,
      data,
    )
  },

  /** Assign a vehicle to an emergency */
  assignVehicle(
    emergencyId: string,
    vehicleId: string,
  ): Promise<EmergencyResponse> {
    return patch<EmergencyResponse>(
      `/emergencies/${encodeURIComponent(emergencyId)}/assign`,
      { vehicleId },
    )
  },

  /** Get all routes associated with an emergency */
  getRoutes(emergencyId: string): Promise<EmergencyRoutesResponse> {
    return get<EmergencyRoutesResponse>(
      `/emergencies/${encodeURIComponent(emergencyId)}/routes`,
    )
  },

  /** Get all decisions associated with an emergency */
  getDecisions(emergencyId: string): Promise<EmergencyDecisionsResponse> {
    return get<EmergencyDecisionsResponse>(
      `/emergencies/${encodeURIComponent(emergencyId)}/decisions`,
    )
  },
}
