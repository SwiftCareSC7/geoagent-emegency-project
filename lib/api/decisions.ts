/**
 * SwiftCare GeoAgent — Authoritative Decision API Client
 *
 * Backend routes:
 *   POST  /api/decisions/analyze          — evaluate decision rules
 *   GET   /api/decisions                  — list decisions with filters
 *   GET   /api/decisions/:id              — get decision by ID
 *   PATCH /api/decisions/:id/approve      — approve decision (operator)
 *   PATCH /api/decisions/:id/reject       — reject decision (operator)
 *   POST  /api/decisions/:id/execute      — execute approved decision
 */

import { get, patch, post } from './client'
import type { Decision } from './types'

export interface DecisionResponse {
  success: true
  message: string
  data: Decision
}

export interface DecisionListResponse {
  success: true
  count: number
  data: Decision[]
}

export const decisionApi = {
  /**
   * Evaluate and create an authoritative decision proposal for an emergency
   */
  analyze(emergencyId: string): Promise<DecisionResponse> {
    return post<DecisionResponse>('/decisions/analyze', { emergencyId })
  },

  /**
   * Get single decision by ID
   */
  get(decisionId: string): Promise<DecisionResponse> {
    return get<DecisionResponse>(`/decisions/${encodeURIComponent(decisionId)}`)
  },

  /**
   * List decisions filtered by emergency or vehicle
   */
  list(filters: { emergencyId?: string; vehicleId?: string; status?: string } = {}): Promise<DecisionListResponse> {
    const params = new URLSearchParams()
    if (filters.emergencyId) params.set('emergencyId', filters.emergencyId)
    if (filters.vehicleId) params.set('vehicleId', filters.vehicleId)
    if (filters.status) params.set('status', filters.status)
    const qs = params.toString()
    return get<DecisionListResponse>(`/decisions${qs ? `?${qs}` : ''}`)
  },

  /**
   * Approve a pending operational decision
   */
  approve(decisionId: string, notes?: string): Promise<DecisionResponse> {
    return patch<DecisionResponse>(`/decisions/${encodeURIComponent(decisionId)}/approve`, { notes })
  },

  /**
   * Reject a pending operational decision
   */
  reject(decisionId: string, reason?: string): Promise<DecisionResponse> {
    return patch<DecisionResponse>(`/decisions/${encodeURIComponent(decisionId)}/reject`, { reason })
  },

  /**
   * Execute an approved decision
   */
  execute(decisionId: string): Promise<DecisionResponse> {
    return post<DecisionResponse>(`/decisions/${encodeURIComponent(decisionId)}/execute`)
  }
}
