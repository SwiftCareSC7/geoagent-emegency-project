'use client'

import {
  AlertCircle,
  Clock,
  Compass,
  CornerDownRight,
  GitBranch,
  Layers,
  MapPin,
  Milestone,
  Navigation,
  Route as RouteIcon,
  ShieldAlert,
} from 'lucide-react'
import type { Route } from '@/lib/api/types'
import { RealInteractiveMap } from '@/components/dashboard/real-interactive-map'
import { cn } from '@/lib/utils'

interface RouteAnalysisPanelProps {
  route?: Route | null
  loading?: boolean
  error?: string | null
}

function formatDistance(meters?: number): string {
  if (typeof meters !== 'number') return 'N/A'
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km (${meters.toLocaleString()} m)`
  }
  return `${meters.toLocaleString()} m`
}

function formatDuration(seconds?: number): string {
  if (typeof seconds !== 'number') return 'N/A'
  const minutes = Math.round(seconds / 60)
  return `${minutes} mins (${seconds} s)`
}

export function RouteAnalysisPanel({ route, loading = false, error = null }: RouteAnalysisPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="h-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 text-rose-500 font-semibold mb-2">
          <AlertCircle className="h-5 w-5" />
          <span>Route Loading Failed</span>
        </div>
        <p className="text-xs text-zinc-500">{error}</p>
      </div>
    )
  }

  if (!route) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold mb-3">
          <RouteIcon className="h-5 w-5 text-zinc-400" />
          <span>Expected Route Corridor</span>
        </div>
        <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No planned route is assigned to this emergency. Route geometry and expected corridor are not generated.
          </p>
        </div>
      </div>
    )
  }

  const verticesCount = route.geometry?.coordinates?.length ?? 0
  const isMockProvider = route.provider === 'MOCK' || !route.provider

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">
              Expected Route Corridor
            </h3>
            <span className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              {route.routeId}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Designated emergency corridor connecting dispatch origin to incident scene
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider attribution badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              isMockProvider
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            )}
          >
            <Milestone className="h-3.5 w-3.5" />
            <span>Provider: {route.provider ? `${route.provider} (Local Simulation)` : 'MOCK (Local Simulation)'}</span>
          </span>

          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
            {route.status}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <Milestone className="h-3.5 w-3.5 text-emerald-500" />
            <span>Total Distance</span>
          </div>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {formatDistance(route.distance)}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Corridor centerline length
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>Expected Travel Time</span>
          </div>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {formatDuration(route.duration)}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Free-flow baseline duration
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
            <span>Route Classification</span>
          </div>
          <p className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
            {route.routeType || 'PLANNED'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Optimal emergency trajectory
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <Layers className="h-3.5 w-3.5 text-purple-500" />
            <span>Geometry Vertices</span>
          </div>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {verticesCount} <span className="text-xs font-normal text-zinc-500">waypoints</span>
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            GeoJSON LineString coords
          </span>
        </div>
      </div>

      {/* Geometry Origin & Destination Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30 text-xs">
        <div className="flex items-start gap-2">
          <CornerDownRight className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Route Origin:</span>
            <p className="font-mono text-zinc-900 dark:text-zinc-100">
              [{route.origin.coordinates[0]?.toFixed(5)}, {route.origin.coordinates[1]?.toFixed(5)}]
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Route Destination:</span>
            <p className="font-mono text-zinc-900 dark:text-zinc-100">
              [{route.destination.coordinates[0]?.toFixed(5)}, {route.destination.coordinates[1]?.toFixed(5)}]
            </p>
          </div>
        </div>
      </div>

      {/* Real Interactive Map View */}
      <div className="mt-4">
        <RealInteractiveMap height="340px" />
      </div>
    </div>
  )
}
