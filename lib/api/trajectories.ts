/**
 * SwiftCare GeoAgent — Trajectories API
 *
 * Backend routes:
 *   POST /api/trajectories                    — ingest GPS telemetry point
 *   GET  /api/trajectories/:vehicleId          — paginated history
 *   GET  /api/trajectories/:vehicleId/latest   — most recent GPS fix
 *   GET  /api/trajectories/:vehicleId/recent   — recent trajectory points
 */

import { get, post } from './client'
import type {
  Trajectory,
  IngestTrajectoryPayload,
  PaginatedResponse,
} from './types'

interface TrajectoryResponse {
  success: true
  data: Trajectory
}

interface TrajectoryListResponse {
  success: true
  data: Trajectory[]
}

export const trajectoryApi = {
  /** Get paginated trajectory history for a vehicle */
  getHistory(
    vehicleId: string,
    params?: { limit?: number; page?: number },
  ): Promise<PaginatedResponse<Trajectory>> {
    return get<PaginatedResponse<Trajectory>>(
      `/trajectories/${encodeURIComponent(vehicleId)}`,
      params,
    )
  },

  /** Get the most recent GPS fix for a vehicle */
  getLatest(vehicleId: string): Promise<TrajectoryResponse> {
    return get<TrajectoryResponse>(
      `/trajectories/${encodeURIComponent(vehicleId)}/latest`,
    )
  },

  /** Get recent trajectory points for a vehicle */
  getRecent(vehicleId: string): Promise<TrajectoryListResponse> {
    return get<TrajectoryListResponse>(
      `/trajectories/${encodeURIComponent(vehicleId)}/recent`,
    )
  },

  /** Ingest a new GPS telemetry point */
  ingest(data: IngestTrajectoryPayload): Promise<TrajectoryResponse> {
    return post<TrajectoryResponse>('/trajectories', data)
  },
}
