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
    LIGHT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    MODERATE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    HEAVY: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    SEVERE: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    UNKNOWN: 'bg-slate-700/30 text-slate-300 border-slate-600/40'
  }[trafficCondition]

  return (
    <div className="pointer-events-none absolute inset-0 z-[450] flex flex-col justify-between p-3 sm:p-4">
      {/* 1. TOP MANEUVER HUD CARD */}
      <div className="pointer-events-auto flex flex-col items-start w-full max-w-sm sm:max-w-md">
        <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200">
          {/* Top Bar: Call-sign, Leg & Telemetry Controls */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px]">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wide flex items-center gap-1.5 ${
                  activeLegNumber === 1
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                <span
                  className={`size-2 rounded-full animate-ping ${
                    activeLegNumber === 1 ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}
                />
                {vehicleCallsign} · {activeLegNumber === 1 ? 'LEG 1: TO SCENE' : 'LEG 2: TO HOSPITAL'}
              </span>

              {speed != null && (
                <span className="flex items-center gap-1 font-mono font-bold text-slate-300 text-xs">
                  <Gauge className="size-3 text-cyan-400" />
                  {Math.round(speed)} km/h
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Traffic Indicator */}
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${trafficBadgeColor}`}>
                {trafficCondition} Traffic
              </span>

              {/* Voice Toggle */}
              {onToggleVoice && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label={isVoiceActive ? 'Mute navigation voice' : 'Unmute navigation voice'}
                  title={isVoiceActive ? 'Voice active' : 'Voice muted'}
                >
                  {isVoiceActive ? (
                    <Volume2 className="size-3.5 text-emerald-400" />
                  ) : (
                    <VolumeX className="size-3.5 text-slate-400" />
                  )}
                </button>
              )}

              {/* Collapse/Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label={isCollapsed ? 'Expand maneuver card' : 'Collapse maneuver card'}
              >
                {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Primary Maneuver Details */}
          {!isCollapsed && (
            <div className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Maneuver Icon Box & Next Turn */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`size-12 rounded-xl flex items-center justify-center shadow-lg shrink-0 border ${
                      isArrival
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-300/40 shadow-emerald-950/50'
                        : isImminentTurn
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-300/40 shadow-amber-950/50 animate-pulse'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-400/40 shadow-blue-950/50'
                    }`}
                  >
                    <ManeuverIcon maneuver={currentStep?.maneuver} className="size-7 text-white" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white tracking-tight leading-none">
                        {formattedDistance}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {currentStep?.maneuver?.replace('_', ' ') || 'CONTINUE'}
                      </span>
                    </div>

                    <h3 className="mt-1 text-sm font-bold text-slate-100 leading-snug line-clamp-1">
                      {currentStep?.instruction || 'Continue on priority emergency route'}
                    </h3>

                    {currentStep?.streetName && (
                      <p className="text-[11px] font-medium text-slate-400 line-clamp-1">
                        onto {currentStep.streetName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: EXPAND Button */}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold tracking-wider text-slate-200 hover:text-white uppercase shrink-0 transition-colors cursor-pointer"
                >
                  {isDrawerOpen ? 'CLOSE' : 'EXPAND'}
                </button>
              </div>

              {/* Next Maneuver Preview ("Then: ...") */}
              {nextStep && !isDrawerOpen && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">THEN</span>
                  <ManeuverIcon maneuver={nextStep.maneuver} className="size-3.5 text-slate-300" />
                  <span className="line-clamp-1 text-slate-300 font-medium">
                    {nextStep.instruction} ({Math.round(nextStep.distanceMeters)}m)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expandable Step-by-Step Drawer */}
          {isDrawerOpen && (
            <div className="max-h-64 overflow-y-auto border-t border-slate-800 bg-slate-950/90 p-3 divide-y divide-slate-800/60">
              <div className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Route Maneuvers Timeline</span>
                <span className="text-emerald-400 font-mono font-normal">
                  {upcomingSteps.length} upcoming turns
                </span>
              </div>

              {/* Current Turn Highlight */}
              {currentStep && (
                <div className="py-2 flex items-center gap-3 text-xs bg-emerald-950/20 px-2 rounded-lg border border-emerald-500/30">
                  <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ManeuverIcon maneuver={currentStep.maneuver} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] line-clamp-1">
                        {currentStep.instruction}
                      </span>
                      <span className="text-emerald-400 font-mono font-bold text-[10px] shrink-0 ml-2">
                        {formattedDistance}
                      </span>
                    </div>
                    {currentStep.streetName && (
                      <span className="text-[10px] text-slate-400 block">{currentStep.streetName}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Upcoming Turns */}
              {upcomingSteps.map((step, idx) => (
                <button
                  key={step.stepIndex || idx}
                  type="button"
                  onClick={() => onSelectStep?.(step)}
                  className="w-full py-2 flex items-center gap-3 text-left hover:bg-slate-900/60 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="size-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    <ManeuverIcon maneuver={step.maneuver} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200 text-[11px] line-clamp-1">
                        {step.instruction}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-2">
                        {Math.round(step.distanceMeters)}m
                      </span>
                    </div>
                    {step.streetName && (
                      <span className="text-[10px] text-slate-400 block">{step.streetName}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM INFO & CAMERA CONTROLS BAR */}
      <div className="pointer-events-auto flex flex-col items-center w-full gap-2.5">
        {/* Floating "RETURN TO VEHICLE" button if user panned away */}
        {isUserPanning && onRecenter && (
          <button
            type="button"
            onClick={onRecenter}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-2xl border-2 border-white/80 backdrop-blur-xl animate-bounce tracking-wide transition-all cursor-pointer"
            aria-label="Return to live vehicle location"
          >
            <LocateFixed className="size-4 text-cyan-300 animate-spin" />
            <span>RETURN TO VEHICLE</span>
          </button>
        )}

        {/* Bottom Navigation Stats Strip */}
        <div className="w-full max-w-sm sm:max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-xl p-3">
          <div className="flex items-center justify-between">
            {/* ETA & Remaining Distance */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight leading-none">
                {remainingDurationFormatted}
              </span>
              <span className="text-xs font-bold text-slate-300 font-mono">
                {remainingDistanceFormatted}
              </span>
              <span className="text-xs font-medium text-slate-400">
                Arrive {arrivalTimeFormatted}
              </span>
            </div>

            {/* Quick Actions: Recenter & Route Overview */}
            <div className="flex items-center gap-1.5">
              {onRouteOverview && (
                <button
                  type="button"
                  onClick={onRouteOverview}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Route Overview (fit all)"
                  aria-label="Fit entire route"
                >
                  <Maximize2 className="size-4" />
                </button>
              )}

              {onRecenter && (
                <button
                  type="button"
                  onClick={onRecenter}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-colors cursor-pointer"
                  title="Recenter Camera"
                  aria-label="Recenter on vehicle"
                >
                  <LocateFixed className="size-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Route Progress Bar */}
          <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(2, Math.min(100, routeProgressPercent))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
