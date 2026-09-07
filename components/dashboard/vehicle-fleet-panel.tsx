'use client'

import {
  AlertCircle,
  Ambulance,
  Building2,
  Phone,
  RefreshCw,
  Shield,
  Truck,
  User,
} from 'lucide-react'
import { useState } from 'react'
import type { Vehicle, VehicleStatus } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VehicleFleetPanelProps {
  vehicles: Vehicle[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const statusBadges: Record<
  string,
  { label: string; className: string }
> = {
  AVAILABLE: {
    label: 'Available',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  DISPATCHED: {
    label: 'Dispatched',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  EN_ROUTE: {
    label: 'En Route',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  AT_SCENE: {
    label: 'At Scene',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  RETURNING: {
    label: 'Returning',
    className: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  },
  OFFLINE: {
    label: 'Offline',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  TRANSPORTING: {
    label: 'Transporting',
    className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
}

const typeIcons: Record<string, typeof Ambulance> = {
  AMBULANCE: Ambulance,
  FIRE_ENGINE: Truck,
  FIRE_TRUCK: Truck,
  POLICE: Shield,
  RESCUE: Truck,
}

export function VehicleFleetPanel({
  vehicles,
  loading = false,
  error = null,
  onRetry,
}: VehicleFleetPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  const filterOptions = [
    { key: 'ALL', label: 'All Fleet' },
    { key: 'AVAILABLE', label: 'Available' },
    { key: 'DISPATCHED', label: 'Dispatched' },
    { key: 'EN_ROUTE', label: 'En Route' },
    { key: 'AT_SCENE', label: 'At Scene' },
    { key: 'MAINTENANCE', label: 'Maintenance' },
  ]

  const filteredVehicles = vehicles.filter((v) => {
    if (selectedStatus === 'ALL') return true
    return v.status === selectedStatus
  })

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Panel Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Ambulance className="size-4" />
            </span>
            <h3 className="font-display text-base font-bold text-card-foreground">
              Emergency Fleet Status
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live fleet registry connected to MongoDB vehicles collection
          </p>
        </div>

        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {filteredVehicles.length} of {vehicles.length} Units
        </span>
      </div>

      {/* Filter Chips */}
      <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedStatus(opt.key)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              selectedStatus === opt.key
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/40 p-3"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <AlertCircle className="size-8 text-rose-500" />
            <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              Unable to load fleet units
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            {onRetry ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-3 gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Retry Fleet Sync
              </Button>
            ) : null}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <Ambulance className="size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {vehicles.length === 0
                ? 'No vehicles found in database'
                : 'No vehicles match current filter'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {vehicles.length === 0
                ? 'MongoDB vehicles collection is currently empty. Run the database seeder or add new emergency response vehicles.'
                : `No units currently have status "${selectedStatus}". Try selecting "All Fleet".`}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredVehicles.map((v) => {
              const Icon = typeIcons[v.type] || Ambulance
              const badge = statusBadges[v.status] || {
                label: v.status,
                className: 'bg-muted text-muted-foreground border-border',
              }
              return (
                <article
                  key={v.id || v.vehicleId}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/50 p-3.5 transition-all hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-bold text-foreground">
                            {v.vehicleId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({v.registrationNumber})
                          </span>
                        </div>
                        <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
                          {v.type} · Capacity: {v.capacity}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3 text-muted-foreground/70" />
                      {v.driverName || 'Unassigned'}
                    </span>
                    {v.driverContact ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3 text-muted-foreground/70" />
                        {v.driverContact}
                      </span>
                    ) : null}
                    {v.hospitalName ? (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3 text-muted-foreground/70" />
                        {v.hospitalName}
                      </span>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
