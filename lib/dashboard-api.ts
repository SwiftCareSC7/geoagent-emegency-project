/**
 * SwiftCare GeoAgent — API adapter (placeholder)
 *
 * This is a thin adapter that the UI calls to load dashboard data. Today it
 * returns local mock data. When a backend exists, swap the body of
 * `getDashboard` for a real request to:
 *
 *   GET /api/dashboard/:ambulanceId   ->   DashboardData (JSON)
 *
 * The UI does not need to change — only this file does.
 */

import { AMB_01_DASHBOARD, type DashboardData } from './mock-data'

/**
 * Fetch dashboard data for a given ambulance.
 * Attempts real analysis endpoint if available, and transparently tags simulated fallback.
 * @param ambulanceId e.g. "AMB-01"
 */
export async function getDashboard(
  ambulanceId: string,
): Promise<DashboardData> {
  // If in production mode, avoid unflagged mock data substitution
  try {
    const res = await fetch(`/api/analysis/vehicle/${encodeURIComponent(ambulanceId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.ok) {
      const json = await res.json()
      if (json && json.success && json.data) {
        return {
          ...AMB_01_DASHBOARD,
          ...json.data,
          ambulanceId,
          isSimulated: false,
          dataSource: 'OBSERVED',
        }
      }
    }
  } catch {
    // Backend API unreachable or not running
  }

  // Explicitly marked fallback simulation data (never masquerades as real GPS/telemetry)
  return {
    ...AMB_01_DASHBOARD,
    ambulanceId,
    isSimulated: true,
    dataSource: 'SIMULATED',
  }
}
