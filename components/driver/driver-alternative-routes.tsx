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

import { ROUTE_SEMANTICS } from '@/lib/routing-constants'

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
      className={`rounded-2xl border-2 border-border bg-card p-5 shadow-xl text-card-foreground transition-all ${className}`}
      aria-label="Route Comparison Panel"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <GitCompare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Corridor Reroute Analysis
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                <Sparkles className="h-2.5 w-2.5" />
                AI Evaluated Detour
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              GeoAgent evaluated real road-network geometry to bypass corridor delay.
            </p>
          </div>
        </div>

        {/* Big Time Saved Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 shadow-xs">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-extrabold tracking-tight">SAVE {savedMin} MIN</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
        {/* Route A: 🔵 Planned / Active Corridor */}
        <div className="p-4 rounded-xl bg-blue-500/5 dark:bg-blue-950/20 border-2 border-blue-500/40 relative overflow-hidden flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/40 flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-600 inline-block" />
              Route A — Active Corridor
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 font-mono">
              Congestion Delay
            </span>
          </div>

          <div className="space-y-1.5 my-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Estimated Duration:</span>
              <span className="text-xl font-black text-foreground font-mono">{currentDurationMin} min</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Road Distance:</span>
              <span className="text-sm font-semibold text-foreground font-mono">{currentDistanceKm} km</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Traffic Penalty:</span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                +{currentRoute.trafficDelaySeconds ? Math.round(currentRoute.trafficDelaySeconds / 60) : 3} min delay
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground border-t border-border/80 pt-2 mt-1">
            Impacted by congestion bottleneck along Old Airport Road.
          </p>
        </div>

        {/* Route B: 🟣 Recommended Alternative Detour */}
        <div className="p-4 rounded-xl bg-purple-500/5 dark:bg-purple-950/20 border-2 border-purple-500/60 relative overflow-hidden flex flex-col justify-between shadow-md shadow-purple-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/50 flex items-center gap-1">
              <span className="size-2 rounded-full bg-purple-600 inline-block" />
              Route B — Recommended Alternative
            </span>
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
              Save {savedMin}m
            </span>
          </div>

          <div className="space-y-1.5 my-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground font-medium">Estimated Duration:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">{altDurationMin} min</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">(-{savedMin}m)</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Road Distance:</span>
              <span className="text-sm font-semibold text-foreground font-mono">{altDistanceKm} km</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Corridor Clearance:</span>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">Simulated V2X Active</span>
            </div>
          </div>

          <p className="text-[11px] text-purple-800 dark:text-purple-200 border-t border-purple-500/20 pt-2 mt-1">
            {alternativeRoute.description || 'Bypasses bottleneck via Indiranagar 100ft road corridor.'}
          </p>
        </div>
      </div>

      {/* Action Buttons: High Contrast CTA Buttons */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onAcceptReroute}
          disabled={isAccepting}
          className="w-full sm:flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-xs tracking-wider uppercase transition-all duration-150 shadow-md shadow-purple-600/25 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          aria-label="Switch to Route B Recommended Alternative"
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>UPDATING ACTIVE ROUTE...</span>
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4 fill-current" />
              <span>SWITCH TO ALTERNATIVE ROUTE B (SAVE {savedMin} MIN)</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {onRejectReroute && (
          <button
            type="button"
            onClick={onRejectReroute}
            disabled={isAccepting}
            className="w-full sm:w-auto min-h-[48px] px-4 py-3 rounded-xl border border-border bg-muted/80 hover:bg-muted text-foreground font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
            aria-label="Keep current Route A"
          >
            Keep Route A
          </button>
        )}
      </div>
    </div>
  )
}
