import { DriverDashboard } from '@/components/dashboard/driver-dashboard'
import { getDashboard } from '@/lib/api'

export default async function DriverDashboardPage() {
  // Loaded through the API adapter (mock data today; swap for
  // GET /api/dashboard/AMB-01 when a backend is available).
  const data = await getDashboard('AMB-01')
  return <DriverDashboard data={data} />
}
