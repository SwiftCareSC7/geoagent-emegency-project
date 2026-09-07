/**
 * SwiftCare GeoAgent — Vehicles API
 *
 * Backend routes:
 *   GET    /api/vehicles             — list vehicles (optionally filter by status)
 *   POST   /api/vehicles             — create vehicle (ADMIN only)
 *   GET    /api/vehicles/:vehicleId  — get single vehicle
 *   PATCH  /api/vehicles/:vehicleId  — update vehicle
 *   DELETE /api/vehicles/:vehicleId  — soft delete (ADMIN only)
 */

import { get, post, patch, del } from './client'
import type {
  Vehicle,
  VehicleStatus,
  CreateVehiclePayload,
  UpdateVehiclePayload,
} from './types'

interface VehicleListResponse {
  success: true
  count?: number
  data: Vehicle[]
}

interface VehicleResponse {
  success: true
  data: Vehicle
}

interface VehicleDeleteResponse {
  success: true
  message: string
}

export const vehicleApi = {
  /** List all active vehicles, optionally filtering by status */
  list(params?: { status?: VehicleStatus | string }): Promise<VehicleListResponse> {
    return get<VehicleListResponse>('/vehicles', params)
  },

  /** Get a single vehicle by its business ID (e.g. "AMB-101") */
  get(vehicleId: string): Promise<VehicleResponse> {
    return get<VehicleResponse>(`/vehicles/${encodeURIComponent(vehicleId)}`)
  },

  /** Register a new vehicle (ADMIN only) */
  create(data: CreateVehiclePayload): Promise<VehicleResponse> {
    return post<VehicleResponse>('/vehicles', data)
  },

  /** Update vehicle status, driver, or capacity */
  update(
    vehicleId: string,
    data: UpdateVehiclePayload,
  ): Promise<VehicleResponse> {
    return patch<VehicleResponse>(
      `/vehicles/${encodeURIComponent(vehicleId)}`,
      data,
    )
  },

  /** Soft delete a vehicle (ADMIN only) */
  delete(vehicleId: string): Promise<VehicleDeleteResponse> {
    return del<VehicleDeleteResponse>(
      `/vehicles/${encodeURIComponent(vehicleId)}`,
    )
  },
}
