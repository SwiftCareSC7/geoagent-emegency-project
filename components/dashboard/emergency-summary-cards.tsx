'use client'

import {
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  Flame,
  Radio,
  Siren,
} from 'lucide-react'
import type { Emergency, Vehicle, Incident } from '@/lib/api/types'
import { StatCard } from './stat-card'

interface EmergencySummaryCardsProps {
  emergencies: Emergency[]
  vehicles: Vehicle[]
  incidents: Incident[]
  loading?: boolean
}

export function EmergencySummaryCards({
  emergencies,
  vehicles,
  incidents,
  loading = false,
}: EmergencySummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex h-28 animate-pulse flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-6 w-12 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  const activeEmergencies = emergencies.filter(
    (e) => !['RESOLVED', 'CANCELLED'].includes(e.status),
  )

  const criticalEmergencies = activeEmergencies.filter(
    (e) => e.priority === 'CRITICAL',
  )

  const dispatchedVehicles = vehicles.filter((v) =>
    ['DISPATCHED', 'EN_ROUTE', 'AT_SCENE', 'TRANSPORTING', 'RETURNING'].includes(
      v.status,
    ),
  )

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE')

  const activeIncidents = incidents.filter((i) => i.status === 'ACTIVE')

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        icon={Siren}
        label="Active Calls"
        value={String(activeEmergencies.length)}
        hint={`${emergencies.length} total in system`}
        tone={activeEmergencies.length > 0 ? 'critical' : 'default'}
      />
      <StatCard
        icon={Flame}
        label="Critical Calls"
        value={String(criticalEmergencies.length)}
        hint={
          criticalEmergencies.length > 0
            ? 'Immediate dispatch priority'
            : 'No critical alerts'
        }
        tone={criticalEmergencies.length > 0 ? 'critical' : 'success'}
      />
      <StatCard
        icon={Ambulance}
        label="Deployed Units"
        value={String(dispatchedVehicles.length)}
        hint={`${vehicles.length} fleet units total`}
        tone={dispatchedVehicles.length > 0 ? 'warning' : 'default'}
      />
      <StatCard
        icon={CheckCircle2}
        label="Fleet Ready"
        value={String(availableVehicles.length)}
        hint={
          availableVehicles.length > 0
            ? 'Available for dispatch'
            : '0 units standing by'
        }
        tone={availableVehicles.length > 0 ? 'success' : 'warning'}
      />
      <StatCard
        icon={AlertTriangle}
        label="Road Hazards"
        value={String(activeIncidents.length)}
        hint={
          activeIncidents.length > 0
            ? 'Active corridor hazards'
            : 'Corridors all clear'
        }
        tone={activeIncidents.length > 0 ? 'warning' : 'default'}
      />
    </div>
  )
}
