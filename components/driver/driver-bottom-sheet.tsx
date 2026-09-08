'use client'

import React, { useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Navigation,
  AlertTriangle,
  Radio,
  XCircle,
  LocateFixed,
  List,
  Clock,
  MapPin,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NavigationStep, ManeuverType } from './types'

interface DriverBottomSheetProps {
  durationSeconds?: number
  distanceMeters?: number
  preference?: 'FASTEST' | 'SHORTEST'
  trafficDelaySeconds?: number
  destinationName?: string
  destinationAddress?: string
  steps?: NavigationStep[]
  onRecenter: () => void
  onReportIncident: () => void
  onRequestHelp: () => void
  onEndNavigation: () => void
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
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function calculateArrivalTime(durationSeconds?: number): string {
  const now = new Date()
  const arrival = new Date(now.getTime() + (durationSeconds || 0) * 1000)
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getStepIcon(maneuver: ManeuverType) {
  switch (maneuver) {
    case 'TURN_LEFT':
      return <CornerUpLeft className="size-4 text-emerald-400" />
    case 'TURN_RIGHT':
      return <CornerUpRight className="size-4 text-emerald-400" />
    case 'KEEP_LEFT':
      return <ArrowUpLeft className="size-4 text-emerald-400" />
    case 'KEEP_RIGHT':
      return <ArrowUpRight className="size-4 text-emerald-400" />
    case 'U_TURN':
      return <RotateCcw className="size-4 text-emerald-400" />
    case 'ARRIVE':
      return <MapPin className="size-4 text-rose-400" />
    default:
      return <ArrowUp className="size-4 text-emerald-400" />
  }
}

export function DriverBottomSheet({
  durationSeconds = 660,
  distanceMeters = 4850,
  preference = 'FASTEST',
  trafficDelaySeconds = 0,
  destinationName = 'Destination',
  destinationAddress,
  steps = [],
  onRecenter,
  onReportIncident,
  onRequestHelp,
  onEndNavigation,
  className = ''
}: DriverBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const arrivalTime = calculateArrivalTime(durationSeconds)
  const etaText = formatDuration(durationSeconds)
  const distText = formatDistance(distanceMeters)

  return (
    <div
      className={`rounded-t-3xl border-t border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-all duration-300 text-white ${
        isExpanded ? 'max-h-[85vh]' : 'max-h-[220px]'
      } flex flex-col ${className}`}
    >
      {/* Handle bar & Expand Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-pointer touch-manipulation hover:bg-white/5 active:bg-white/10"
        aria-label={isExpanded ? 'Collapse navigation details' : 'Expand navigation details'}
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-600/80" />
        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {isExpanded ? (
            <>
              <ChevronDown className="size-3.5" />
              <span>Hide Turn Details</span>
            </>
          ) : (
            <>
              <ChevronUp className="size-3.5" />
              <span>Show Route Maneuvers</span>
            </>
          )}
        </div>
      </button>

      {/* Persistent Summary Row */}
      <div className="px-4 sm:px-6 pt-1 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
              {etaText}
            </span>
            <span className="text-slate-400 font-mono text-sm sm:text-base">
              · {distText}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <span>ETA: <strong className="text-slate-200">{arrivalTime}</strong></span>
            <span className="size-1 rounded-full bg-slate-600" />
            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400">
              {preference}
            </span>
          </div>
        </div>

        {/* Re-center button on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRecenter}
          className="min-h-[44px] min-w-[44px] rounded-xl border-slate-700 bg-slate-800/90 text-white hover:bg-slate-700 active:scale-95 touch-manipulation"
          title="Re-center GPS map"
        >
          <LocateFixed className="size-5 text-emerald-400" />
          <span className="hidden sm:inline ml-1.5 text-xs">Re-center</span>
        </Button>
      </div>

      {/* Expanded Content Area (Scrollable) */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 border-t border-slate-800">
          {/* Destination Header */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="size-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-100">{destinationName}</div>
                {destinationAddress && (
                  <div className="text-xs text-slate-400 truncate mt-0.5">{destinationAddress}</div>
                )}
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Maneuvers List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <List className="size-3.5 text-emerald-400" />
                <span>Upcoming Maneuvers ({steps.length})</span>
              </h3>
            </div>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                    {getStepIcon(step.maneuver)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200">{step.instruction}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {formatDistance(step.distance)} · {Math.max(1, Math.round(step.duration / 60))} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Driver Quick Action Buttons Bar (Large Touch Targets >= 44px) */}
      <div className="border-t border-slate-800/90 px-4 sm:px-6 py-3 bg-slate-950/80">
        <div className="grid grid-cols-4 gap-2">
          {/* 1. RE-CENTER */}
          <Button
            variant="outline"
            onClick={onRecenter}
            className="min-h-[46px] rounded-xl border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold touch-manipulation"
          >
            <LocateFixed className="size-4 text-emerald-400 shrink-0" />
            <span>Re-center</span>
          </Button>

          {/* 2. REPORT INCIDENT */}
          <Button
            variant="outline"
            onClick={onReportIncident}
            className="min-h-[46px] rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold touch-manipulation"
          >
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span>Hazard</span>
          </Button>

          {/* 3. REQUEST HELP */}
          <Button
            variant="outline"
            onClick={onRequestHelp}
            className="min-h-[46px] rounded-xl border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold touch-manipulation"
          >
            <Radio className="size-4 text-rose-400 shrink-0" />
            <span>Radio Dispatch</span>
          </Button>

          {/* 4. END NAVIGATION */}
          <Button
            variant="destructive"
            onClick={onEndNavigation}
            className="min-h-[46px] rounded-xl bg-rose-700 hover:bg-rose-800 text-white active:scale-95 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold touch-manipulation"
          >
            <XCircle className="size-4 shrink-0" />
            <span>End Run</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
