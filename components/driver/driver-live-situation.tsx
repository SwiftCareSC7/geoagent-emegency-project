'use client'

import React from 'react'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Navigation2, 
  Radio, 
  Activity, 
  Gauge, 
  Clock,
  ShieldAlert
} from 'lucide-react'
import type { NavigationState } from './types'

export interface DriverLiveSituationProps {
  navState: NavigationState
  isDeviated?: boolean
  deviationDistance?: number // meters
  trafficLevel?: 'LOW' | 'MODERATE' | 'HEAVY' | 'SEVERE'
  currentSpeed?: number | null // km/h
  speedLimit?: number
  incidentAlert?: string | null
  etaDelayMinutes?: number
  isSimulated?: boolean
  gpsStatus?: 'ACTIVE' | 'STALE' | 'ACQUIRING'
  className?: string
}

export function DriverLiveSituation({
  navState,
  isDeviated = false,
  deviationDistance = 0,
  trafficLevel = 'HEAVY',
  currentSpeed = 18,
  speedLimit = 50,
  incidentAlert = 'Accident reported 650m ahead on Old Airport Rd',
  etaDelayMinutes = 3,
  isSimulated = true,
  gpsStatus = 'ACTIVE',
  className = '',
}: DriverLiveSituationProps) {
  const getTrafficBadge = () => {
    switch (trafficLevel) {
      case 'SEVERE':
        return {
          label: 'Gridlock / Severe',
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          icon: Flame
        }
      case 'HEAVY':
        return {
          label: 'Heavy Traffic',
          bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          icon: AlertTriangle
        }
      case 'MODERATE':
        return {
          label: 'Moderate Traffic',
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: Activity
        }
      default:
        return {
          label: 'Normal Flow',
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2
        }
    }
  }

  const trafficInfo = getTrafficBadge()
  const TrafficIcon = trafficInfo.icon

  return (
    <div
      className={`rounded-2xl border-2 border-border bg-card p-3.5 shadow-md text-card-foreground ${className}`}
      aria-label="Live Situation Panel"
    >
      {/* Header bar with Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-foreground">
            <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span>Live Situation</span>
          </div>
          {isSimulated ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              <Radio className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '4s' }} />
              Simulated Corridor
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Radio className="h-2.5 w-2.5 text-emerald-500" />
              Live Telemetry
            </span>
          )}
        </div>

        {/* GPS status chip */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span className={`inline-block h-2 w-2 rounded-full ${
            gpsStatus === 'ACTIVE' 
              ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
              : 'bg-amber-500'
          }`} />
          <span className="capitalize">{gpsStatus === 'ACTIVE' ? 'GPS Active (1m)' : 'GPS Acquiring'}</span>
        </div>
      </div>

      {/* Grid of 4 key situational metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
        {/* Metric 1: Route Alignment */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDeviated 
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-200' 
            : 'bg-muted/50 border-border text-foreground'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">Trajectory</span>
            <Navigation2 className={`h-3.5 w-3.5 ${isDeviated ? 'text-rose-500 rotate-45 animate-bounce' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-1">
            {isDeviated ? (
              <div>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">Deviated</span>
                <span className="text-[10px] text-muted-foreground">+{Math.round(deviationDistance)}m</span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">On Track</span>
                <span className="text-[10px] text-muted-foreground">Aligned</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric 2: Corridor Traffic */}
        <div className="p-2.5 rounded-xl bg-muted/50 border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">Traffic</span>
            <TrafficIcon className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-1">
            <span className="text-xs font-bold block text-foreground">
              {trafficInfo.label}
            </span>
            <span className="text-[10px] text-muted-foreground">Flow ~{Math.round(currentSpeed || 20)} km/h</span>
          </div>
        </div>

        {/* Metric 3: Active Speed */}
        <div className="p-2.5 rounded-xl bg-muted/50 border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">Ambulance</span>
            <Gauge className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-extrabold text-foreground font-mono">{Math.round(currentSpeed || 0)}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">km/h</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Limit {speedLimit} km/h</span>
          </div>
        </div>

        {/* Metric 4: Delay Impact */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          etaDelayMinutes > 0
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-200'
            : 'bg-muted/50 border-border text-foreground'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">ETA Impact</span>
            <Clock className={`h-3.5 w-3.5 ${etaDelayMinutes > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-1">
            {etaDelayMinutes > 0 ? (
              <div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block font-mono">+{etaDelayMinutes}m Delay</span>
                <span className="text-[10px] text-muted-foreground">Congestion</span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">On Schedule</span>
                <span className="text-[10px] text-muted-foreground">No delay</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incident Alert Banner (if incident present) */}
      {incidentAlert && (
        <div className="mt-2.5 p-2 px-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 animate-pulse" />
          <span className="truncate flex-1 font-medium">{incidentAlert}</span>
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40 shrink-0">
            Hazard
          </span>
        </div>
      )}
    </div>
  )
}
