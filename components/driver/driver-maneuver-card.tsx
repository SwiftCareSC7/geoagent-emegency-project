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

function getManeuverIcon(maneuver?: ManeuverType, className = 'size-7 text-white') {
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
      <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-xl bg-amber-500 text-black shadow-xl ${className}`}>
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black/15">
            <RefreshCw className="size-6 animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                OFF ROUTE
              </span>
            </div>
            <p className="mt-0.5 text-sm font-bold leading-tight">
              Recalculating fastest bypass from current position
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Arrived state
  if (state === 'ARRIVED') {
    return (
      <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-xl bg-emerald-600 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
              ARRIVED
            </span>
            <p className="mt-0.5 text-sm font-bold leading-tight">
              {destinationName}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Arriving state
  if (state === 'ARRIVING') {
    return (
      <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-xl bg-cyan-600 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <MapPin className="size-6 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
              ARRIVING
            </span>
            <p className="mt-0.5 text-sm font-bold leading-tight">
              {destinationName}
            </p>
            <p className="text-[11px] text-white/80">Prepare patient transfer</p>
          </div>
        </div>
      </div>
    )
  }

  // Active navigation maneuver
  const stepDist = distanceToStepMeters ?? currentStep?.distance
  const formattedDist = formatDistance(stepDist)

  return (
    <div className={`mx-3 sm:mx-4 mt-2 overflow-hidden rounded-xl bg-slate-900 shadow-xl border border-slate-800 ${className}`}>
      <div className="flex items-start gap-3 p-3 sm:p-4">
        {/* Maneuver Icon */}
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-md">
          {getManeuverIcon(currentStep?.maneuver, 'size-7 text-white stroke-[2.5]')}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          {/* Distance + Action */}
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
              {formattedDist || 'Straight'}
            </span>
            {currentStep?.maneuver && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {currentStep.maneuver.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Instruction */}
          <h2 className="mt-0.5 text-sm sm:text-base font-bold leading-snug text-slate-100 line-clamp-2">
            {currentStep?.instruction || 'Proceed toward destination'}
          </h2>

          {/* Next Step Preview */}
          {nextStep && (
            <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Then</span>
              <span className="truncate text-slate-300">{nextStep.instruction}</span>
              <span className="shrink-0 text-slate-500 font-mono">({formatDistance(nextStep.distance)})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
