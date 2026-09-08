'use client'

import React from 'react'
import { DashboardTopbar } from './dashboard-topbar'
import { DriverNavigation } from '@/components/driver/driver-navigation'
import type { DashboardData } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth/context'

interface DriverDashboardProps {
  data?: DashboardData
}

export function DriverDashboard({ data }: DriverDashboardProps) {
  const { user } = useAuth()
  const ambulanceId = data?.ambulanceId || 'AMB-01'
  const driverName = user?.name || data?.driverName || 'Officer'

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-950">
      {/* Top Header */}
      <DashboardTopbar
        ambulanceId={ambulanceId}
        driverName={driverName}
        emergencyActive={data?.emergencyActive ?? true}
      />

      {/* Main Fullscreen Navigation Canvas */}
      <main className="flex-1 relative w-full h-[calc(100vh-4rem)] overflow-hidden">
        <DriverNavigation
          ambulanceId={ambulanceId}
          initialEmergency={data?.destination ? {
            assignedHospital: data.destination,
            address: data.destinationFull || 'Bengaluru Corridor'
          } : undefined}
        />
      </main>
    </div>
  )
}
