export const dynamic = 'force-dynamic'
export const revalidate = 0

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { MultiEmergencyOverview } from '@/components/control-room/multi-emergency-overview'

export default function ControlRoomOverviewPage() {
  return (
    <ProtectedRoute allowedRoles={['CONTROL_ROOM', 'ADMIN']}>
      <MultiEmergencyOverview />
    </ProtectedRoute>
  )
}
