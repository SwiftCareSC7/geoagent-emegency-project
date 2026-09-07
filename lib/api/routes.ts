/**
 * SwiftCare GeoAgent — Routes API Client
 *
 * Backend routes:
 *   GET  /api/routes                           — list routes with filters/pagination
 *   GET  /api/routes/:routeId                  — single route by ID
 *   GET  /api/routes/:routeId/analysis         — situation analysis for route
 *   GET  /api/emergencies/:emergencyId/routes  — routes for specific emergency
 *   POST /api/routes                           — create a new route
 */

import { get, post } from './client'
import type {
  Route,
  RouteType,
  RouteStatus,
  CreateRoutePayload,
  SituationAnalysis,
} from './types'

export interface RouteListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RouteListResponse {
  success: true
  data: Route[]
  meta: RouteListMeta
}

export interface RouteSingleResponse {
  success: true
  data: Route
}

export interface RouteAnalysisResponse {
  success: true
  message: string
  data: SituationAnalysis
}

export interface RouteQueryFilters extends Record<string, string | number | undefined> {
  emergencyId?: string
  vehicleId?: string
  routeType?: RouteType
  status?: RouteStatus
  page?: number
  limit?: number
}

export const routeApi = {
  /** Get routes with optional filters */
  list(filters?: RouteQueryFilters): Promise<RouteListResponse> {
    return get<RouteListResponse>('/routes', filters)
  },

  /** Get a single route by ID (business routeId or Mongo _id) */
  get(routeId: string): Promise<RouteSingleResponse> {
    return get<RouteSingleResponse>(`/routes/${encodeURIComponent(routeId)}`)
  },

  /** Get situation analysis for a specific route */
  getAnalysis(routeId: string): Promise<RouteAnalysisResponse> {
    return get<RouteAnalysisResponse>(`/routes/${encodeURIComponent(routeId)}/analysis`)
  },

  /** Get routes for a specific emergency */
  getForEmergency(
    emergencyId: string,
    params?: { routeType?: RouteType; status?: RouteStatus; page?: number; limit?: number },
  ): Promise<RouteListResponse> {
    return get<RouteListResponse>(
      `/emergencies/${encodeURIComponent(emergencyId)}/routes`,
      params as Record<string, string | number | undefined>,
    )
  },

  /** Create a new route */
  create(payload: CreateRoutePayload): Promise<RouteSingleResponse> {
    return post<RouteSingleResponse>('/routes', payload)
  },
}
