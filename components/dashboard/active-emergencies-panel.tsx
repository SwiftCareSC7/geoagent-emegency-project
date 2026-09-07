'use client'

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Clock,
  Flame,
  HeartPulse,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  Siren,
  Truck,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { Emergency, EmergencyPriority, AssignedVehicleSummary } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActiveEmergenciesPanelProps {
  emergencies: Emergency[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const priorityBadges: Record<
  string,
  { label: string; className: string; pulse?: boolean }
> = {
  CRITICAL: {
    label: 'Critical',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
    pulse: true,
  },
  HIGH: {
    label: 'High Priority',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  LOW: {
    label: 'Low',
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
}

const statusBadges: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending Dispatch',
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  DISPATCHED: {
    label: 'Dispatched',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  AT_SCENE: {
    label: 'On Scene',
    className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
}

const typeIcons: Record<string, typeof Siren> = {
  MEDICAL: HeartPulse,
  CARDIAC: HeartPulse,
  ACCIDENT: Activity,
  TRAUMA: Activity,
  FIRE: Flame,
  POLICE: Shield,
  OTHER: Siren,
}

export function ActiveEmergenciesPanel({
  emergencies,
  loading = false,
  error = null,
  onRetry,
}: ActiveEmergenciesPanelProps) {
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')

  const filterOptions = [
    { key: 'ALL', label: 'All Emergencies' },
    { key: 'CRITICAL', label: 'Critical' },
    { key: 'HIGH', label: 'High' },
    { key: 'MEDIUM', label: 'Medium' },
    { key: 'LOW', label: 'Low' },
  ]

  const filteredEmergencies = emergencies.filter((e) => {
    if (selectedPriority === 'ALL') return true
    return e.priority === selectedPriority
  })

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Panel Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-critical/10 text-critical">
              <Siren className="size-4" />
            </span>
            <h3 className="font-display text-base font-bold text-card-foreground">
              Emergency Incidents Stream
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live emergency calls registry connected to MongoDB emergencies collection
          </p>
        </div>

        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {filteredEmergencies.length} of {emergencies.length} Calls
        </span>
      </div>

      {/* Filter Chips */}
      <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedPriority(opt.key)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              selectedPriority === opt.key
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
                className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/40 p-4"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <AlertCircle className="size-8 text-rose-500" />
            <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              Unable to load emergency stream
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
                Retry Call Sync
              </Button>
            ) : null}
          </div>
        ) : filteredEmergencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <Siren className="size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {emergencies.length === 0
                ? 'No emergency calls found in database'
                : 'No emergency calls match current filter'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {emergencies.length === 0
                ? 'MongoDB emergencies collection is currently empty. Run the database seeder or create emergency records via POST /api/emergencies.'
                : `No active emergencies have priority "${selectedPriority}". Try selecting "All Emergencies".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmergencies.map((e) => {
              const Icon = typeIcons[e.type] || Siren
              const priority = priorityBadges[e.priority] || {
                label: e.priority,
                className: 'bg-muted text-muted-foreground border-border',
              }
              const status = statusBadges[e.status] || {
                label: e.status,
                className: 'bg-muted text-muted-foreground border-border',
              }

              // Parse assigned vehicle info
              const assignedVehicle =
                e.assignedVehicle && typeof e.assignedVehicle === 'object'
                  ? (e.assignedVehicle as AssignedVehicleSummary)
                  : null

              const assignedVehicleId =
                typeof e.assignedVehicle === 'string'
                  ? e.assignedVehicle
                  : assignedVehicle?.vehicleId

              return (
                <article
                  key={e.id || e.emergencyId}
                  className="flex flex-col rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-foreground">
                            {e.emergencyId}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {e.type}
                          </span>
                        </div>
                        {e.description ? (
                          <p className="mt-1 text-xs text-foreground/90 line-clamp-2">
                            {e.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                          priority.className,
                          priority.pulse && 'animate-pulse',
                        )}
                      >
                        {priority.label}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Metadata and Context Row */}
                  <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    {/* Location */}
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">
                        Scene: [
                        {e.location?.coordinates
                          ? `${e.location.coordinates[0].toFixed(4)}, ${e.location.coordinates[1].toFixed(4)}`
                          : 'Coordinates n/a'}
                        ]
                      </span>
                    </div>

                    {/* Destination */}
                    {e.destination ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <Navigation className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          Hospital: [
                          {`${e.destination.coordinates[0].toFixed(4)}, ${e.destination.coordinates[1].toFixed(4)}`}
                          ]
                        </span>
                      </div>
                    ) : null}

                    {/* Assigned Vehicle */}
                    <div className="flex items-center gap-1.5 truncate">
                      <Truck className="size-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">
                        Unit:{' '}
                        {assignedVehicleId ? (
                          <span className="font-semibold text-foreground">
                            {assignedVehicleId}
                            {assignedVehicle?.registrationNumber
                              ? ` (${assignedVehicle.registrationNumber})`
                              : ''}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Caller Info */}
                    {e.callerName ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          Caller: {e.callerName}
                          {e.callerContact ? ` · ${e.callerContact}` : ''}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Action Link to Emergency Detail & Corridor Analysis */}
                  <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Dispatch ID: <span className="font-mono font-medium text-foreground">{e.emergencyId}</span>
                    </span>
                    <Link
                      href={`/emergencies/${encodeURIComponent(e.emergencyId)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
                    >
                      <span>Track & Analyze Corridor</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
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
