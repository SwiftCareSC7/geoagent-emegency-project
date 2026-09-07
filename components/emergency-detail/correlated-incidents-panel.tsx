'use client'

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Flame,
  Milestone,
  Shield,
  Siren,
  TrafficCone,
  Truck,
} from 'lucide-react'
import type { CorrelatedIncident, Incident } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface CorrelatedIncidentsPanelProps {
  correlatedIncidents?: CorrelatedIncident[]
  linkedIncidents?: Incident[]
  loading?: boolean
}

const severityBadges: Record<
  string,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: 'Critical Severity',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold',
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

function getIncidentIcon(type: string) {
  switch (type) {
    case 'ACCIDENT':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'ROAD_CLOSURE':
      return <TrafficCone className="h-4 w-4 text-rose-500" />
    case 'TRAFFIC_JAM':
      return <Truck className="h-4 w-4 text-amber-500" />
    case 'FIRE':
      return <Flame className="h-4 w-4 text-rose-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-zinc-400" />
  }
}

export function CorrelatedIncidentsPanel({
  correlatedIncidents = [],
  linkedIncidents = [],
  loading = false,
}: CorrelatedIncidentsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm animate-pulse">
        <div className="h-6 w-52 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
      </div>
    )
  }

  const hasCorrelated = correlatedIncidents.length > 0
  const hasLinked = linkedIncidents.length > 0

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <TrafficCone className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">
              Corridor Hazards & Road Incidents
            </h3>
            <span className="font-mono text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
              {correlatedIncidents.length} active
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Incidents within 500m of the response corridor centerline or 2,000m of vehicle location
          </p>
        </div>
      </div>

      {!hasCorrelated && !hasLinked ? (
        <div className="p-8 text-center my-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No road incidents or active obstructions currently intersect this response corridor.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 my-3">
          {correlatedIncidents.map((inc) => {
            const sevMeta = severityBadges[inc.severity] || severityBadges.LOW
            return (
              <div key={inc.incidentId || inc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 mt-0.5">
                    {getIncidentIcon(inc.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {inc.incidentId}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
                          sevMeta.className,
                        )}
                      >
                        {sevMeta.label}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {inc.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {inc.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                        {inc.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Distance offsets */}
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-[11px] font-mono shrink-0">
                  <div className="text-zinc-500">
                    Dist to Vehicle:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {Math.round(inc.distanceFromVehicleMeters)} m
                    </span>
                  </div>
                  <div className="text-zinc-500">
                    Dist to Route:{' '}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {Math.round(inc.distanceFromRouteMeters)} m
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
