'use client'

import React from 'react'
import { 
  GitCompare, 
  Clock, 
  Navigation, 
  TrendingDown, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Loader2
} from 'lucide-react'
import type { RoutePlan } from './types'

export interface DriverAlternativeRoutesProps {
  currentRoute: RoutePlan | null
  alternativeRoute?: RoutePlan['alternative'] | null
  timeSavedMinutes?: number
  isAccepting?: boolean
  onAcceptReroute: () => void
  onRejectReroute?: () => void
  className?: string
}

export function DriverAlternativeRoutes({
  currentRoute,
  alternativeRoute,
  timeSavedMinutes = 5,
  isAccepting = false,
  onAcceptReroute,
  onRejectReroute,
  className = '',
}: DriverAlternativeRoutesProps) {
  if (!currentRoute || !alternativeRoute) {
    return null
  }

  const currentDurationMin = Math.round(currentRoute.durationSeconds / 60)
  const currentDistanceKm = (currentRoute.distanceMeters / 1000).toFixed(1)

  const altDurationMin = Math.round(alternativeRoute.durationSeconds / 60)
  const altDistanceKm = (alternativeRoute.distanceMeters / 1000).toFixed(1)

  const savedMin = timeSavedMinutes > 0 
    ? timeSavedMinutes 
    : Math.max(1, currentDurationMin - altDurationMin)

  return (
    <div
      className={`rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-4 shadow-2xl text-white ${className}`}
      aria-label="Route Comparison Panel"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <GitCompare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Route Comparison
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="h-2.5 w-2.5" />
                AI Evaluated
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              GeoAgent discovered an unobstructed transit corridor
            </p>
          </div>
        </div>

        {/* Big Time Saved Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-extrabold tracking-tight">SAVE {savedMin} MIN</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {/* Route A: Current Route */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-rose-400" />
              Route A — Current
            </span>
            <span className="text-[11px] font-medium text-rose-400 font-mono">Degraded</span>
          </div>

          <div className="space-y-1.5 my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Estimated Duration:</span>
              <span className="text-lg font-black text-rose-200 font-mono">{currentDurationMin} min</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Distance:</span>
              <span className="text-sm font-semibold text-slate-300 font-mono">{currentDistanceKm} km</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Traffic Penalty:</span>
              <span className="text-xs font-semibold text-rose-400 font-mono">
                +{currentRoute.trafficDelaySeconds ? Math.round(currentRoute.trafficDelaySeconds / 60) : 3} min delay
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-1">
            Impacted by congestion and reported collision bottleneck.
          </p>
        </div>

        {/* Route B: Recommended Alternative */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border-2 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Route B — GeoAgent Recommended
            </span>
            <span className="text-[11px] font-bold text-emerald-400 font-mono">Faster</span>
          </div>

          <div className="space-y-1.5 my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-300 font-medium">Estimated Duration:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-emerald-400 font-mono">{altDurationMin} min</span>
                <span className="text-xs font-bold text-emerald-500">(-{savedMin}m)</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-300">Distance:</span>
              <span className="text-sm font-semibold text-white font-mono">{altDistanceKm} km</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-300">Corridor Clearance:</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">Simulated V2X Active</span>
            </div>
          </div>

          <p className="text-[11px] text-emerald-200/80 border-t border-emerald-900/40 pt-2 mt-1">
            {alternativeRoute.description || 'Bypasses bottleneck via Indiranagar 100ft arterial corridor.'}
          </p>
        </div>
      </div>

      {/* Action Buttons: Big Touch Target Reroute Button */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={onAcceptReroute}
          disabled={isAccepting}
          className="w-full sm:flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-white font-extrabold text-sm tracking-wider uppercase transition-all duration-150 shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-400"
          aria-label="Accept and switch to Route B"
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>UPDATING ACTIVE ROUTE...</span>
            </>
          ) : (
            <>
              <Navigation className="h-5 w-5 fill-current" />
              <span>REROUTE TO ROUTE B (SAVE {savedMin} MIN)</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {onRejectReroute && (
          <button
            type="button"
            onClick={onRejectReroute}
            disabled={isAccepting}
            className="w-full sm:w-auto min-h-[48px] px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-40"
            aria-label="Keep current Route A"
          >
            Keep Route A
          </button>
        )}
      </div>
    </div>
  )
}
