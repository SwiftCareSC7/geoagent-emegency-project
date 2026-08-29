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

const USE_MOCK = true

/**
 * Fetch dashboard data for a given ambulance.
 * @param ambulanceId e.g. "AMB-01"
 */
export async function getDashboard(
  ambulanceId: string,
): Promise<DashboardData> {
  if (USE_MOCK) {
    // Simulate a small network delay so loading states behave realistically.
    await new Promise((resolve) => setTimeout(resolve, 250))
    return { ...AMB_01_DASHBOARD, ambulanceId }
  }

  // --- Real implementation (enable when the backend is ready) -------------
  // const res = await fetch(`/api/dashboard/${ambulanceId}`, {
  //   headers: { Accept: 'application/json' },
  //   cache: 'no-store',
  // })
  // if (!res.ok) {
  //   throw new Error(`Failed to load dashboard for ${ambulanceId}`)
  // }
  // return (await res.json()) as DashboardData

  return AMB_01_DASHBOARD
}
