/**
 * SwiftCare GeoAgent — Situation & Deviation Analysis API Client
 *
 * Backend routes:
 *   GET /api/analysis/vehicle/:vehicleId   — comprehensive situation analysis
 *   GET /api/deviation/vehicle/:vehicleId  — route deviation calculation
 */

import { get } from './client'
import type { SituationAnalysis, DeviationAnalysis } from './types'

export interface SituationAnalysisResponse {
  success: true
  message: string
  data: SituationAnalysis
}

export interface DeviationAnalysisResponse {
  success: true
  message: string
  data: DeviationAnalysis
}

export const analysisApi = {
  /**
   * Get comprehensive situation analysis for a vehicle (deviation, progress,
   * traffic, incidents, ETA, delay, and evidence list)
   */
  getVehicleSituation(vehicleId: string): Promise<SituationAnalysisResponse> {
    return get<SituationAnalysisResponse>(
      `/analysis/vehicle/${encodeURIComponent(vehicleId)}`,
    )
  },

  /** Safe get vehicle situation that returns null if 404 (e.g. no active route or trajectory) */
  async getVehicleSituationSafe(vehicleId: string): Promise<SituationAnalysis | null> {
    try {
      const res = await this.getVehicleSituation(vehicleId)
      return res?.data ?? null
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  /** Get standalone route deviation analysis for a vehicle */
  getVehicleDeviation(vehicleId: string): Promise<DeviationAnalysisResponse> {
    return get<DeviationAnalysisResponse>(
      `/deviation/vehicle/${encodeURIComponent(vehicleId)}`,
    )
  },
}
