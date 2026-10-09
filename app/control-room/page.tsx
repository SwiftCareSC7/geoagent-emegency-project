
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { ControlRoomDashboard } from '@/components/dashboard/control-room-dashboard'
import { getDashboard } from '@/lib/dashboard-api'

export default async function ControlRoomPage() {
  const data = await getDashboard('AMB-01').catch(() => undefined)
  return (
    <>
      <ControlRoomDashboard initialData={data} />
    </>
  )
}
