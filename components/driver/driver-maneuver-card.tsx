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
  if (meters === undefined || meters === null || isNaN(meters)) return ''
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
      <div className={`overflow-hidden rounded-2xl bg-amber-500 text-black shadow-xl ${className}`}>
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-black/15">
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
      <div className={`overflow-hidden rounded-2xl bg-emerald-600 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
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
      <div className={`overflow-hidden rounded-2xl bg-cyan-600 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
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
    <div className={`overflow-hidden rounded-2xl bg-card border-2 border-emerald-500/40 shadow-lg text-card-foreground transition-all ${className}`}>
      <div className="p-4 sm:p-5 space-y-3">
        {/* Top: Maneuver Icon + Dominant Distance & Action */}
        <div className="flex items-center gap-3.5">
          {/* High-visibility Maneuver Icon Box */}
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-950/20">
            {getManeuverIcon(currentStep?.maneuver, 'size-8 text-white stroke-[2.75]')}
          </div>

          {/* Distance + Action Chip */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
                {formattedDist || '138 m'}
              </span>
              {currentStep?.maneuver && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {currentStep.maneuver.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Primary Street Direction */}
            <h2 className="mt-1 text-sm sm:text-base font-extrabold text-foreground leading-snug line-clamp-2">
              {currentStep?.instruction || 'Depart onto 16th Main Road'}
            </h2>
          </div>
        </div>

        {/* Next Step Preview Strip (THEN ...) */}
        {nextStep ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border/80 px-3 py-2 text-xs">
            <span className="font-mono font-black uppercase text-[10px] tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-background border border-border">
              THEN
            </span>
            <span className="truncate font-semibold text-foreground">{nextStep.instruction}</span>
            {typeof nextStep.distance === 'number' && !isNaN(nextStep.distance) && nextStep.distance > 0 && (
              <span className="shrink-0 font-mono font-bold text-muted-foreground ml-auto">
                {formatDistance(nextStep.distance)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border/80 px-3 py-2 text-xs text-muted-foreground">
            <Compass className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">Following optimized green-wave corridor toward destination</span>
          </div>
        )}
      </div>
    </div>
  )
}
