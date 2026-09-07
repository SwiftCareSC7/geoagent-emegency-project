/**
 * SwiftCare GeoAgent — Incidents API
 *
 * Backend routes:
 *   GET    /api/incidents              — list incidents
 *   POST   /api/incidents              — create incident
 *   GET    /api/incidents/:incidentId  — get incident
 *   PATCH  /api/incidents/:incidentId  — update incident
 *   DELETE /api/incidents/:incidentId  — soft delete (ADMIN only)
 */

import { get, post, patch, del } from './client'
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  CreateIncidentPayload,
  UpdateIncidentPayload,
} from './types'

interface IncidentListResponse {
  success: true
  count?: number
  data: Incident[]
}

interface IncidentResponse {
  success: true
  data: Incident
}

interface IncidentDeleteResponse {
  success: true
  message: string
}

export const incidentApi = {
  /** List all active road incidents, optionally filtering by status, severity, and type */
  list(params?: {
    status?: IncidentStatus | string
    severity?: IncidentSeverity | string
    type?: IncidentType | string
  }): Promise<IncidentListResponse> {
    return get<IncidentListResponse>('/incidents', params)
  },

  /** Get a single incident by ID */
  get(incidentId: string): Promise<IncidentResponse> {
    return get<IncidentResponse>(
      `/incidents/${encodeURIComponent(incidentId)}`,
    )
  },

  /** Report a new road incident */
  create(data: CreateIncidentPayload): Promise<IncidentResponse> {
    return post<IncidentResponse>('/incidents', data)
  },

  /** Update an incident */
  update(
    incidentId: string,
    data: UpdateIncidentPayload,
  ): Promise<IncidentResponse> {
    return patch<IncidentResponse>(
      `/incidents/${encodeURIComponent(incidentId)}`,
      data,
    )
  },

  /** Soft delete an incident (ADMIN only) */
  delete(incidentId: string): Promise<IncidentDeleteResponse> {
    return del<IncidentDeleteResponse>(
      `/incidents/${encodeURIComponent(incidentId)}`,
    )
  },
}
