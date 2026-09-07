import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { EmergencyDetailView } from '@/components/emergency-detail/emergency-detail-view'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'

interface EmergencyDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EmergencyDetailPage({ params }: EmergencyDetailPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardTopbar
          ambulanceId="CONTROL-CENTER"
          driverName="Central Command Operator"
          emergencyActive={true}
          lastRefreshed={new Date().toLocaleTimeString()}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
          <EmergencyDetailView emergencyId={decodedId} />
        </main>
      </div>
    </ProtectedRoute>
  )
}
