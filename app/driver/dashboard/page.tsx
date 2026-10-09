
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { DriverDashboard } from '@/components/dashboard/driver-dashboard'
import { getDashboard } from '@/lib/dashboard-api'

export default async function DriverDashboardPage() {
  // Loaded through the API adapter (mock data today; connected to
  // live backend endpoints in subsequent integration phase).
  const data = await getDashboard('AMB-01')
  return (
    <>
      <DriverDashboard data={data} />
    </>
  )
}
