import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DriverDashboard } from '@/components/dashboard/driver-dashboard'
import { getDashboard } from '@/lib/api'

export default async function DriverDashboardPage() {
  // Loaded through the API adapter (mock data today; connected to
  // live backend endpoints in subsequent integration phase).
  const data = await getDashboard('AMB-01')
  return (
    <ProtectedRoute>
      <DriverDashboard data={data} />
    </ProtectedRoute>
  )
}
