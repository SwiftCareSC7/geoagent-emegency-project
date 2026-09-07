'use client'

import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Car,
  CloudLightning,
  Construction,
  Flame,
  MapPin,
  PartyPopper,
  Radio,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { useState } from 'react'
import type { Incident, IncidentSeverity } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RoadIncidentsPanelProps {
  incidents: Incident[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const severityBadges: Record<
  string,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: 'Critical Hazard',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
  },
  HIGH: {
    label: 'High Severity',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  MEDIUM: {
    label: 'Medium Severity',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  LOW: {
    label: 'Low Severity',
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
}

const statusBadges: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  DISMISSED: {
    label: 'Dismissed',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
}

const typeIcons: Record<string, typeof AlertTriangle> = {
  ACCIDENT: AlertOctagon,
  ROAD_CLOSURE: ShieldAlert,
  ROAD_WORK: Construction,
  TRAFFIC_JAM: Car,
  FIRE: Flame,
  WEATHER: CloudLightning,
  PUBLIC_EVENT: PartyPopper,
  OTHER: AlertTriangle,
}

export function RoadIncidentsPanel({
  incidents,
  loading = false,
  error = null,
  onRetry,
}: RoadIncidentsPanelProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL')

  const filterOptions = [
    { key: 'ALL', label: 'All Hazards' },
    { key: 'CRITICAL', label: 'Critical' },
    { key: 'HIGH', label: 'High' },
    { key: 'MEDIUM', label: 'Medium' },
    { key: 'LOW', label: 'Low' },
  ]

  const filteredIncidents = incidents.filter((inc) => {
    if (selectedSeverity === 'ALL') return true
    return inc.severity === selectedSeverity
  })

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Panel Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="size-4" />
            </span>
            <h3 className="font-display text-base font-bold text-card-foreground">
              Corridor Hazards & Road Incidents
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Active traffic disruptions registered in MongoDB incidents collection
          </p>
        </div>

        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {filteredIncidents.length} of {incidents.length} Hazards
        </span>
      </div>

      {/* Filter Chips */}
      <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedSeverity(opt.key)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              selectedSeverity === opt.key
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
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border/60 bg-muted/40 p-4"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <AlertCircle className="size-8 text-rose-500" />
            <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              Unable to load road incidents
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
                Retry Hazard Sync
              </Button>
            ) : null}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <AlertTriangle className="size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {incidents.length === 0
                ? 'No active road incidents found'
                : 'No incidents match current filter'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {incidents.length === 0
                ? 'MongoDB incidents collection is currently clear. No road closures, accidents, or construction works reported.'
                : `No hazards currently have severity "${selectedSeverity}". Try selecting "All Hazards".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((inc) => {
              const Icon = typeIcons[inc.type] || AlertTriangle
              const severity = severityBadges[inc.severity] || {
                label: inc.severity,
                className: 'bg-muted text-muted-foreground border-border',
              }
              const status = statusBadges[inc.status] || {
                label: inc.status,
                className: 'bg-muted text-muted-foreground border-border',
              }

              return (
                <article
                  key={inc.id || inc.incidentId}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-foreground">
                            {inc.incidentId}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {inc.type.replace('_', ' ')}
                          </span>
                        </div>
                        {inc.description ? (
                          <p className="mt-1 text-xs text-foreground/90">
                            {inc.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                          severity.className,
                        )}
                      >
                        {severity.label}
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

                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted-foreground/70" />
                      <span>
                        Coords: [
                        {inc.location?.coordinates
                          ? `${inc.location.coordinates[0].toFixed(4)}, ${inc.location.coordinates[1].toFixed(4)}`
                          : 'Coordinates n/a'}
                        ]
                      </span>
                    </div>
                    {inc.source ? (
                      <div className="flex items-center gap-1.5">
                        <Radio className="size-3.5 text-muted-foreground/70" />
                        <span>Source: {inc.source.replace('_', ' ')}</span>
                      </div>
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
