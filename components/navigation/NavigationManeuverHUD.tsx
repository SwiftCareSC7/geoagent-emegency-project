'use client'

import React, { useState } from 'react'
import type { NormalizedStep, NavigationState, TrafficCondition } from '@/lib/navigation/types'
import { ManeuverIcon } from './maneuver-icons'
import {
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  LocateFixed,
  Maximize2,
  Gauge,
  Clock,
  Navigation,
  AlertTriangle,
  Radio
} from 'lucide-react'

export interface NavigationManeuverHUDProps {
  currentStep: NormalizedStep | null
  nextStep: NormalizedStep | null
  distanceToNextStepMeters: number
  formattedDistance: string
  isImminentTurn?: boolean
  upcomingSteps?: NormalizedStep[]
  remainingDistanceFormatted?: string
  remainingDurationFormatted?: string
  arrivalTimeFormatted?: string
  routeProgressPercent?: number
  speed?: number | null
  navState?: NavigationState
  trafficCondition?: TrafficCondition
  activeLegNumber?: number
  vehicleCallsign?: string
  isUserPanning?: boolean
  variant?: 'driver' | 'control-room' | 'compact'
  isVoiceActive?: boolean
  onToggleVoice?: () => void
  onRecenter?: () => void
  onRouteOverview?: () => void
  onSelectStep?: (step: NormalizedStep) => void
}

export function NavigationManeuverHUD({
  currentStep,
  nextStep,
  distanceToNextStepMeters,
  formattedDistance,
  isImminentTurn = false,
  upcomingSteps = [],
  remainingDistanceFormatted = '0 km',
  remainingDurationFormatted = '0 min',
  arrivalTimeFormatted = '--:--',
  routeProgressPercent = 0,
  speed,
  navState = 'NAVIGATING',
  trafficCondition = 'LIGHT',
  activeLegNumber = 1,
  vehicleCallsign = 'AMB-001',
  isUserPanning = false,
  variant = 'driver',
  isVoiceActive = false,
  onToggleVoice,
  onRecenter,
  onRouteOverview,
  onSelectStep
}: NavigationManeuverHUDProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isArrival = navState === 'ARRIVING' || navState === 'ARRIVED'

  const trafficBadgeColor = {
    LIGHT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    MODERATE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    HEAVY: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    SEVERE: 'bg-red-500/15 text-red-300 border-red-500/30',
    UNKNOWN: 'bg-slate-700/30 text-slate-300 border-slate-600/30'
  }[trafficCondition]

  return (
    <div className="pointer-events-none absolute inset-0 z-[450] flex flex-col justify-between p-3 sm:p-4">
      {/* 1. TOP MANEUVER HUD CARD */}
      <div className="pointer-events-auto flex flex-col items-start w-full max-w-sm sm:max-w-md">
        <div className="w-full rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Top Bar: Leg & Speed */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wide flex items-center gap-1 ${
                  activeLegNumber === 1
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <span className={`size-1.5 rounded-full ${activeLegNumber === 1 ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                {vehicleCallsign} · {activeLegNumber === 1 ? 'LEG 1' : 'LEG 2'}
              </span>

              {speed != null && (
                <span className="flex items-center gap-1 font-mono font-bold text-slate-300 text-[11px]">
                  <Gauge className="size-3 text-cyan-400" />
                  {Math.round(speed)} km/h
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${trafficBadgeColor}`}>
                {trafficCondition}
              </span>

              {onToggleVoice && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={isVoiceActive ? 'Mute navigation voice' : 'Unmute navigation voice'}
                >
                  {isVoiceActive ? (
                    <Volume2 className="size-3 text-emerald-400" />
                  ) : (
                    <VolumeX className="size-3 text-slate-500" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
                aria-label={isCollapsed ? 'Expand maneuver card' : 'Collapse maneuver card'}
              >
                {isCollapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
              </button>
            </div>
          </div>

          {/* Primary Maneuver Details */}
          {!isCollapsed && (
            <div className="p-3">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Maneuver Icon & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`size-11 rounded-xl flex items-center justify-center shadow-lg shrink-0 border ${
                      isArrival
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-300/30'
                        : isImminentTurn
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-300/30 animate-pulse'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-400/30'
                    }`}
                  >
                    <ManeuverIcon maneuver={currentStep?.maneuver} className="size-6 text-white" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                        {formattedDistance}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                        {currentStep?.maneuver?.replace('_', ' ') || 'CONTINUE'}
                      </span>
                    </div>

                    <h3 className="mt-0.5 text-xs sm:text-sm font-bold text-slate-100 leading-snug line-clamp-1">
                      {currentStep?.instruction || 'Continue on priority emergency route'}
                    </h3>

                    {currentStep?.streetName && (
                      <p className="text-[10px] font-medium text-slate-400 line-clamp-1">
                        onto {currentStep.streetName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expand Button */}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold tracking-wider text-slate-300 hover:text-white uppercase shrink-0 transition-colors cursor-pointer"
                >
                  {isDrawerOpen ? 'CLOSE' : 'STEPS'}
                </button>
              </div>

              {/* Next Turn Preview */}
              {nextStep && !isDrawerOpen && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">THEN</span>
                  <ManeuverIcon maneuver={nextStep.maneuver} className="size-3 text-slate-400" />
                  <span className="line-clamp-1 text-slate-300 font-medium">
                    {nextStep.instruction} ({Math.round(nextStep.distanceMeters)}m)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expandable Steps Drawer */}
          {isDrawerOpen && (
            <div className="max-h-56 overflow-y-auto border-t border-slate-800 bg-slate-950/90 p-2.5 divide-y divide-slate-800/60 custom-scrollbar">
              <div className="pb-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Route Maneuvers</span>
                <span className="text-emerald-400 font-mono font-normal">
                  {upcomingSteps.length} upcoming
                </span>
              </div>

              {/* Current Turn */}
              {currentStep && (
                <div className="py-1.5 flex items-center gap-2.5 text-[11px] bg-emerald-950/20 px-2 rounded-lg border border-emerald-500/20">
                  <div className="size-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ManeuverIcon maneuver={currentStep.maneuver} className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white line-clamp-1">{currentStep.instruction}</span>
                      <span className="text-emerald-400 font-mono font-bold text-[10px] shrink-0 ml-2">{formattedDistance}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {upcomingSteps.map((step, idx) => (
                <button
                  key={step.stepIndex || idx}
                  type="button"
                  onClick={() => onSelectStep?.(step)}
                  className="w-full py-1.5 flex items-center gap-2.5 text-left hover:bg-slate-900/60 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="size-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    <ManeuverIcon maneuver={step.maneuver} className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200 text-[11px] line-clamp-1">{step.instruction}</span>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-2">{Math.round(step.distanceMeters)}m</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM INFO BAR */}
      <div className="pointer-events-auto flex flex-col items-center w-full gap-2">
        {/* Return to Vehicle Button */}
        {isUserPanning && onRecenter && (
          <button
            type="button"
            onClick={onRecenter}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-2xl border border-blue-400 backdrop-blur-xl animate-bounce tracking-wide transition-all cursor-pointer"
            aria-label="Return to live vehicle location"
          >
            <LocateFixed className="size-3.5 text-cyan-300" />
            <span>RETURN TO VEHICLE</span>
          </button>
        )}

        {/* Bottom Stats Strip */}
        <div className="w-full max-w-sm sm:max-w-md rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl backdrop-blur-xl p-2.5">
          <div className="flex items-center justify-between">
            {/* ETA & Distance */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight leading-none">
                {remainingDurationFormatted}
              </span>
              <span className="text-[11px] font-bold text-slate-300 font-mono">
                {remainingDistanceFormatted}
              </span>
              <span className="text-[10px] font-medium text-slate-500 hidden sm:inline">
                Arrive {arrivalTimeFormatted}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {onRouteOverview && (
                <button
                  type="button"
                  onClick={onRouteOverview}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Route Overview"
                  aria-label="Fit entire route"
                >
                  <Maximize2 className="size-3.5" />
                </button>
              )}

              {onRecenter && (
                <button
                  type="button"
                  onClick={onRecenter}
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-colors cursor-pointer"
                  title="Recenter Camera"
                  aria-label="Recenter on vehicle"
                >
                  <LocateFixed className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Route Progress Bar */}
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(2, Math.min(100, routeProgressPercent))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
