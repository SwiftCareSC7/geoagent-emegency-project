'use client'

import {
  Activity,
  ArrowUpRight,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Radio,
  RefreshCw,
  Sliders,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'
import type { Trajectory, Vehicle } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VehicleMovementPanelProps {
  vehicle?: Vehicle | null
  latestFix?: Trajectory | null
  history: Trajectory[]
  totalFixes?: number
  loading?: boolean
  error?: string | null
  page?: number
  limit?: number
  onPageChange?: (newPage: number) => void
  onRefresh?: () => void
}

function getCardinalDirection(heading?: number): string {
  if (typeof heading !== 'number') return 'N/A'
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(((heading % 360) / 45)) % 8
  return `${directions[index]} (${Math.round(heading)}°)`
}

function formatIsoTime(isoString?: string): string {
  if (!isoString) return 'N/A'
  try {
    const d = new Date(isoString)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

export function VehicleMovementPanel({
  vehicle,
  latestFix,
  history,
  totalFixes = 0,
  loading = false,
  error = null,
  page = 1,
  limit = 5,
  onPageChange,
  onRefresh,
}: VehicleMovementPanelProps) {
  const totalPages = Math.max(1, Math.ceil(totalFixes / limit))

  if (!vehicle) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold mb-3">
          <Activity className="h-5 w-5 text-zinc-400" />
          <span>Vehicle Movement & Telemetry</span>
        </div>
        <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No vehicle is assigned to this emergency. Trajectory telemetry is unavailable.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">
              Vehicle Movement & Telemetry
            </h3>
            <span className="font-mono text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
              {vehicle.vehicleId}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real GPS fixes recorded via telemetry ingestion pipeline • WGS84 coordinates
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span>Refresh Telemetry</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="my-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          Failed to load trajectory data: {error}
        </div>
      )}

      {/* Latest Fix Metrics Strip */}
      {latestFix ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          {/* Coordinates */}
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span>Latest Position</span>
            </div>
            <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {latestFix.location.coordinates[1]?.toFixed(5)}°N, {latestFix.location.coordinates[0]?.toFixed(5)}°E
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              Source: {latestFix.source || 'SIMULATOR'}
            </span>
          </div>

          {/* Speed */}
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              <Gauge className="h-3.5 w-3.5 text-cyan-500" />
              <span>Current Speed</span>
            </div>
            <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
              {latestFix.speed?.toFixed(1)} <span className="text-xs font-normal text-zinc-500">km/h</span>
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              {latestFix.speed > 0 ? 'Vehicle in transit' : 'Stationary'}
            </span>
          </div>

          {/* Heading */}
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              <Compass className="h-3.5 w-3.5 text-indigo-500" />
              <span>Heading Bearing</span>
            </div>
            <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {getCardinalDirection(latestFix.heading)}
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              True north azimuth
            </span>
          </div>

          {/* Recorded Timestamp */}
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Latest GPS Fix</span>
            </div>
            <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {formatIsoTime(latestFix.timestamp)}
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              Persisted in database
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center my-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No trajectory data is available for this emergency vehicle. Telemetry stream has not ingested any GPS fixes yet.
          </p>
        </div>
      )}

      {/* Trajectory History Table */}
      {history.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Persisted Telemetry Log ({totalFixes} total points recorded)
            </h4>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <span>Page {page} of {totalPages}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/60 dark:bg-zinc-900/90 text-zinc-500 border-b border-zinc-200/60 dark:border-zinc-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">Fix #</th>
                  <th className="px-3.5 py-2.5 font-medium">Timestamp</th>
                  <th className="px-3.5 py-2.5 font-medium">Coordinates [Lng, Lat]</th>
                  <th className="px-3.5 py-2.5 font-medium">Speed</th>
                  <th className="px-3.5 py-2.5 font-medium">Heading</th>
                  <th className="px-3.5 py-2.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-[11px]">
                {history.map((pt, idx) => {
                  const fixNumber = (page - 1) * limit + idx + 1
                  return (
                    <tr key={pt._id || pt.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-3.5 py-2 text-zinc-400">#{fixNumber}</td>
                      <td className="px-3.5 py-2 text-zinc-700 dark:text-zinc-300">
                        {formatIsoTime(pt.timestamp)}
                      </td>
                      <td className="px-3.5 py-2 text-zinc-900 dark:text-zinc-100 font-semibold">
                        [{pt.location.coordinates[0]?.toFixed(5)}, {pt.location.coordinates[1]?.toFixed(5)}]
                      </td>
                      <td className="px-3.5 py-2 text-zinc-700 dark:text-zinc-300">
                        {pt.speed?.toFixed(1)} km/h
                      </td>
                      <td className="px-3.5 py-2 text-zinc-700 dark:text-zinc-300">
                        {getCardinalDirection(pt.heading)}
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {pt.source || 'SIMULATOR'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {onPageChange && totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="h-7 px-2.5 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Telemetry Operational Notice */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-400">
        <Radio className="h-3.5 w-3.5 text-zinc-400" />
        <span>Latest received positions fetched via REST API. Live WebSocket streaming is deferred.</span>
      </div>
    </div>
  )
}
