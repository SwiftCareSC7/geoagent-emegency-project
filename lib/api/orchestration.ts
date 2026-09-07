/**
 * SwiftCare GeoAgent — Orchestration API Client
 *
 * Backend routes:
 *   POST /api/orchestration/emergencies/:emergencyId/analyze
 *     — Executes end-to-end situation analysis, AI reasoning, and decision workflow
 *       Returns complete 3-tier epistemic breakdown (observed, inferred, unknown).
 */

import { post } from './client'
import type { OrchestrationWorkflowResult } from './types'

export interface OrchestrationResponse {
  success: true
  data: OrchestrationWorkflowResult
}

export const orchestrationApi = {
  /**
   * Execute full mission analysis for an emergency
   * Returns deterministic situation analysis, GeoAgent recommendation,
   * decision rule evaluation, and 3-tier epistemic breakdown.
   */
  analyzeEmergency(emergencyId: string): Promise<OrchestrationResponse> {
    return post<OrchestrationResponse>(
      `/orchestration/emergencies/${encodeURIComponent(emergencyId)}/analyze`,
      {},
    )
  },

  /**
   * Safe execution that returns null on 404 or other operational error
   * instead of throwing, allowing partial UI rendering.
   */
  async analyzeEmergencySafe(emergencyId: string): Promise<OrchestrationWorkflowResult | null> {
    try {
      const res = await this.analyzeEmergency(emergencyId)
      return res?.data ?? null
    } catch {
      return null
    }
  },
}
