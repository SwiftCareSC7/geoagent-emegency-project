'use client'

import {
  Activity,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Flame,
  HeartPulse,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  Siren,
  Truck,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { Emergency, AssignedVehicleSummary } from '@/lib/api/types'
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
  const [showAllEmergencies, setShowAllEmergencies] = useState(false)

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

  const priorityRank: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  }
  const prioritizedEmergencies = [...filteredEmergencies].sort((a, b) => {
    const priorityDifference = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4)
    if (priorityDifference !== 0) return priorityDifference
    const aUpdatedAt = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bUpdatedAt = Date.parse(b.updatedAt || b.createdAt || '') || 0
    return bUpdatedAt - aUpdatedAt
  })

  const displayedEmergencies = showAllEmergencies
    ? prioritizedEmergencies
    : prioritizedEmergencies.slice(0, 3)
  const remainingCount = Math.max(0, filteredEmergencies.length - displayedEmergencies.length)

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all text-card-foreground">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-critical/10 text-critical">
            <Siren className="size-3.5" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold leading-tight text-card-foreground">
              Emergency Incidents Stream
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Live emergency calls registry
            </p>
          </div>
        </div>

        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {filteredEmergencies.length} / {emergencies.length} Calls
        </span>
      </div>

      {/* Filter Chips */}
      <div className="mt-2.5 flex flex-wrap gap-1 border-b border-border/70 pb-2.5">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setSelectedPriority(opt.key)
              setShowAllEmergencies(false)
            }}
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
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
      <div className="mt-2.5">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border border-border/60 bg-muted/40 p-3"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 p-4 text-center">
            <AlertCircle className="size-6 text-rose-500" />
            <p className="mt-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
              Unable to load emergency stream
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{error}</p>
            {onRetry ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2.5 h-7 gap-1.5 text-xs"
              >
                <RefreshCw className="size-3" />
                Retry Call Sync
              </Button>
            ) : null}
          </div>
        ) : filteredEmergencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-5 text-center">
            <Siren className="size-6 text-muted-foreground/50" />
            <p className="mt-1.5 text-xs font-semibold text-foreground">
              {emergencies.length === 0
                ? 'No emergency calls found in database'
                : 'No emergency calls match current filter'}
            </p>
            <p className="mt-0.5 max-w-sm text-[11px] text-muted-foreground">
              {emergencies.length === 0
                ? 'MongoDB emergencies collection is currently empty.'
                : `No active emergencies have priority "${selectedPriority}".`}
            </p>
          </div>
        ) : (
          <>
            <div className={cn(
              'space-y-2',
              showAllEmergencies && 'max-h-[min(55vh,30rem)] overflow-y-auto pr-1',
            )}>
              {displayedEmergencies.map((e) => {
                const Icon = typeIcons[e.type] || Siren
                const priority = priorityBadges[e.priority] || {
                  label: e.priority,
                  className: 'bg-muted text-muted-foreground border-border',
                }
                const status = statusBadges[e.status] || {
                  label: e.status,
                  className: 'bg-muted text-muted-foreground border-border',
                }

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
                    className="flex flex-col rounded-lg border border-border/80 bg-background/50 p-3 transition-all hover:border-primary/40 hover:bg-background"
                  >
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-display text-xs font-bold text-foreground">
                              {e.emergencyId}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {e.type}
                            </span>
                          </div>
                          {e.description ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-foreground/85">
                              {e.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {((e as any).isSimulated || e.emergencyId.startsWith('E-DEMO-')) && (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            SIMULATED
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                            priority.className,
                            priority.pulse && 'animate-pulse',
                          )}
                        >
                          {priority.label}
                        </span>
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                        {e.communication?.lastSmsStatus && e.communication.lastSmsStatus !== 'READY' && (
                          <span
                            className={cn(
                              'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-mono font-bold',
                              e.communication.lastSmsStatus === 'SUBMITTED' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                              e.communication.lastSmsStatus === 'DELIVERED' && 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
                              e.communication.lastSmsStatus === 'FAILED' && 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
                              e.communication.lastSmsStatus === 'SENDING' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                            )}
                          >
                            <Phone className="size-2.5" />
                            <span>SMS: {e.communication.lastSmsStatus}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact Metadata + Action Row */}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Truck className="size-3 shrink-0 text-muted-foreground/70" />
                          {assignedVehicleId ? (
                            <span className="font-semibold text-foreground">
                              {assignedVehicleId}
                            </span>
                          ) : (
                            <span className="italic">Unassigned</span>
                          )}
                        </span>
                        {e.location?.coordinates ? (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                            <span>
                              {e.location.coordinates[0].toFixed(3)}, {e.location.coordinates[1].toFixed(3)}
                            </span>
                          </span>
                        ) : null}
                        {e.callerName ? (
                          <span className="inline-flex items-center gap-1 truncate">
                            <User className="size-3 shrink-0 text-muted-foreground/70" />
                            <span className="max-w-[140px] truncate">{e.callerName}</span>
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href={`/emergencies/${encodeURIComponent(e.emergencyId)}`}
                        className="group inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        <span>Track Corridor</span>
                        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>

            {filteredEmergencies.length > 3 && (
              <button
                type="button"
                aria-expanded={showAllEmergencies}
                onClick={() => setShowAllEmergencies((expanded) => !expanded)}
                className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {showAllEmergencies ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {showAllEmergencies ? 'Show fewer' : `Show ${remainingCount} more incidents`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
