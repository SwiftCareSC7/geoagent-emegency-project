'use client'

import React from 'react'
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  MapPin,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import type { NavigationStep, NavigationState, ManeuverType } from './types'

interface DriverManeuverCardProps {
  currentStep: NavigationStep | null
  nextStep: NavigationStep | null
  state: NavigationState
  distanceToStepMeters?: number
  destinationName?: string
  className?: string
}

function getManeuverIcon(maneuver?: ManeuverType, className = 'size-8 text-white') {
  switch (maneuver) {
    case 'TURN_LEFT':
      return <CornerUpLeft className={className} />
    case 'TURN_RIGHT':
      return <CornerUpRight className={className} />
    case 'KEEP_LEFT':
      return <ArrowUpLeft className={className} />
    case 'KEEP_RIGHT':
      return <ArrowUpRight className={className} />
    case 'U_TURN':
      return <RotateCcw className={className} />
    case 'ARRIVE':
      return <MapPin className={className} />
    case 'DEPART':
    case 'CONTINUE':
    default:
      return <ArrowUp className={className} />
  }
}

function formatDistance(meters?: number): string {
  if (meters === undefined || meters === null) return ''
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export function DriverManeuverCard({
  currentStep,
  nextStep,
  state,
  distanceToStepMeters,
  destinationName = 'Destination Facility',
  className = ''
}: DriverManeuverCardProps) {
  // Off-route alert state
  if (state === 'OFF_ROUTE' || state === 'REROUTING') {
    return (
      <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-2xl bg-amber-500 text-black shadow-xl ring-2 ring-amber-400 ${className}`}>
        <div className="flex items-center gap-3.5 p-4 sm:p-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-black/15 text-black">
            <RefreshCw className="size-8 animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-black px-2 py-0.5 text-xs font-black uppercase tracking-wider text-amber-400">
                OFF ROUTE
              </span>
              <span className="text-xs font-semibold text-black/80">Recalculating corridor...</span>
            </div>
            <h2 className="mt-1 text-base sm:text-lg font-bold leading-tight">
              Calculating fastest bypass route from current GPS position
            </h2>
          </div>
        </div>
      </div>
    )
  }

  // Arrived state
  if (state === 'ARRIVED') {
    return (
      <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-2xl bg-emerald-600 text-white shadow-xl ring-2 ring-emerald-400 ${className}`}>
        <div className="flex items-center gap-3.5 p-4 sm:p-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
            <CheckCircle2 className="size-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">
              ARRIVED
            </span>
            <h2 className="mt-1 text-lg sm:text-xl font-bold leading-tight">
              Destination reached
            </h2>
            <p className="text-xs text-white/90 truncate">{destinationName}</p>
          </div>
        </div>
      </div>
    )
  }

  // Arriving state (< 500m / 2 min)
  if (state === 'ARRIVING') {
    return (
      <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-2xl bg-cyan-600 text-white shadow-xl ring-2 ring-cyan-400 ${className}`}>
        <div className="flex items-center gap-3.5 p-4 sm:p-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
            <MapPin className="size-8 text-white animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                ARRIVING
              </span>
              <span className="text-xs font-medium text-white/90">Hospital Entrance Ahead</span>
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-bold leading-tight">
              {destinationName}
            </h2>
            <p className="text-xs text-white/80">Prepare emergency patient transfer to triage</p>
          </div>
        </div>
      </div>
    )
  }

  // Active navigation maneuver header
  const stepDist = distanceToStepMeters ?? currentStep?.distance
  const formattedDist = formatDistance(stepDist)

  return (
    <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/60 ${className}`}>
      <div className="flex items-start gap-4 p-4 sm:p-5">
        {/* Maneuver Icon Tile */}
        <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-md">
          {getManeuverIcon(currentStep?.maneuver, 'size-9 text-slate-950 stroke-[2.5]')}
        </div>

        {/* Maneuver & Distance Details */}
        <div className="min-w-0 flex-1">
          {/* Distance to next turn */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              {formattedDist || 'Straight'}
            </span>
            {currentStep?.maneuver && (
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {currentStep.maneuver.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Maneuver Road Instruction */}
          <h2 className="mt-0.5 text-base sm:text-lg font-bold leading-snug text-slate-100 line-clamp-2">
            {currentStep?.instruction || 'Proceed toward destination corridor'}
          </h2>

          {/* Next Maneuver Preview Hint */}
          {nextStep && (
            <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Then:</span>
              <span className="truncate text-slate-300">{nextStep.instruction}</span>
              <span className="shrink-0 text-slate-500 font-mono">({formatDistance(nextStep.distance)})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
