import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ControlRoomDashboard } from '@/components/dashboard/control-room-dashboard'
import { getDashboard } from '@/lib/dashboard-api'

export default async function ControlRoomPage() {
  const data = await getDashboard('AMB-01').catch(() => undefined)
  return (
    <ProtectedRoute allowedRoles={['CONTROL_ROOM', 'ADMIN']}>
      <ControlRoomDashboard initialData={data} />
    </ProtectedRoute>
  )
}
