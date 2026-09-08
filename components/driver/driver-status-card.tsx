'use client'

import React from 'react'
import { Clock, Navigation2, Zap, ShieldAlert, Activity } from 'lucide-react'

interface DriverStatusCardProps {
  durationSeconds?: number
  distanceMeters?: number
  preference?: 'FASTEST' | 'SHORTEST'
  trafficDelaySeconds?: number
  speedKmh?: number | null
  destinationName?: string
  className?: string
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0 min'
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hrs}h ${remainingMins}m`
}

function formatDistance(meters?: number): string {
  if (!meters || meters <= 0) return '0.0 km'
  return `${(meters / 1000).toFixed(1)} km`
}

function calculateArrivalTime(durationSeconds?: number): string {
  const now = new Date()
  const arrival = new Date(now.getTime() + (durationSeconds || 0) * 1000)
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function DriverStatusCard({
  durationSeconds = 660,
  distanceMeters = 4850,
  preference = 'FASTEST',
  trafficDelaySeconds = 0,
  speedKmh = null,
  destinationName,
  className = ''
}: DriverStatusCardProps) {
  const arrivalTime = calculateArrivalTime(durationSeconds)
  const etaText = formatDuration(durationSeconds)
  const distText = formatDistance(distanceMeters)

  // Traffic status indicator
  let trafficLabel = 'Normal Flow'
  let trafficBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (trafficDelaySeconds > 300) {
    trafficLabel = 'Heavy Traffic'
    trafficBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  } else if (trafficDelaySeconds > 60) {
    trafficLabel = 'Moderate Delays'
    trafficBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  }

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md text-white ${className}`}>
      {/* Primary Metrics Row */}
      <div className="flex items-center justify-between">
        {/* ETA Column */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Clock className="size-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
              {etaText}
            </div>
            <div className="text-xs text-slate-400">
              Arrival <span className="font-semibold text-slate-200">{arrivalTime}</span>
            </div>
          </div>
        </div>

        {/* Distance Column */}
        <div className="text-right">
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {distText}
          </div>
          <div className="text-xs text-slate-400">
            {speedKmh !== null && speedKmh > 0 ? (
              <span>Speed <strong className="text-emerald-400 font-mono">{Math.round(speedKmh)} km/h</strong></span>
            ) : (
              <span>Remaining Dist</span>
            )}
          </div>
        </div>
      </div>

      {/* Badges & Route Preference Row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs">
        {/* Traffic Condition */}
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${trafficBadgeClass}`}>
          <span className="size-1.5 rounded-full bg-current" />
          <span>Traffic: {trafficLabel}</span>
        </div>

        {/* Route Preference & Destination */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-300">
            {preference === 'FASTEST' ? 'FASTEST' : 'SHORTEST'}
          </span>
          {destinationName && (
            <span className="max-w-[140px] truncate text-[11px] text-slate-400" title={destinationName}>
              to {destinationName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
