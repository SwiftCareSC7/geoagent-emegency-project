/**
 * SwiftCare GeoAgent — Emergency Clearance API Client (Demo V2X / Simulated Connected Vehicles)
 *
 * Backend endpoints:
 *   GET  /api/clearance/vehicle/:vehicleId       — get active clearance session
 *   POST /api/clearance/vehicle/:vehicleId/cycle — advance simulated clearance step
 *   POST /api/clearance/vehicle/:vehicleId/reset — reset clearance session
 */

import { get, post } from './client'

export type ConnectedVehicleStatus =
  | 'DETECTED'
  | 'ALERT_PENDING'
  | 'ALERT_SENT'
  | 'ACKNOWLEDGED'
  | 'GIVING_WAY'
  | 'CLEARED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'

export interface ConnectedVehicle {
  vehicleId: string
  label: string
  coordinates: [number, number]
  distanceToAmbulanceMeters: number
  status: ConnectedVehicleStatus
  alertMessage: string
  alertSentAt?: string | null
  acknowledgedAt?: string | null
  givingWayAt?: string | null
  clearedAt?: string | null
}

export interface ClearanceSession {
  clearanceId: string
  emergencyId?: string | null
  vehicleId: string
  routeId?: string | null
  isSimulated: true
  simulationCorridor: string
  connectedVehicles: ConnectedVehicle[]
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  summary: {
    totalDetected: number
    totalAlerted: number
    totalGivingWay: number
    totalCleared: number
  }
  createdAt?: string
  updatedAt?: string
}

export const clearanceApi = {
  /** Get active clearance session for an ambulance */
  getForVehicle(vehicleId: string): Promise<{ success: boolean; data: ClearanceSession }> {
    return get<{ success: boolean; data: ClearanceSession }>(`/clearance/vehicle/${encodeURIComponent(vehicleId)}`)
  },

  /** Advance clearance simulation cycle */
  advanceCycle(
    vehicleId: string,
    cycleStep: number = 1
  ): Promise<{ success: boolean; message: string; data: ClearanceSession }> {
    return post<{ success: boolean; message: string; data: ClearanceSession }>(
      `/clearance/vehicle/${encodeURIComponent(vehicleId)}/cycle`,
      { cycleStep }
    )
  },

  /** Reset clearance session */
  reset(vehicleId: string): Promise<{ success: boolean; message: string; data: ClearanceSession }> {
    return post<{ success: boolean; message: string; data: ClearanceSession }>(
      `/clearance/vehicle/${encodeURIComponent(vehicleId)}/reset`,
      {}
    )
  }
}
