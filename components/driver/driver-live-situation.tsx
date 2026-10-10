'use client'

import React from 'react'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Navigation2, 
  Radio, 
  Activity, 
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

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold ${isDeviated ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
          <Navigation2 className="size-3.5" />
          {isDeviated ? `Off route · ${Math.round(deviationDistance)} m` : 'On planned route'}
        </span>
        {incidentAlert && <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 font-semibold text-rose-700 dark:text-rose-300"><ShieldAlert className="size-3.5" />{incidentAlert}</span>}
      </div>

      <details className="group mt-2 rounded-lg border border-border/70">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span>More live situation</span><span className="text-[10px] font-normal">Traffic · speed · ETA impact</span>
        </summary>
        <div className="grid grid-cols-3 gap-2 border-t border-border/70 p-2">
          <div className="rounded-lg bg-muted/50 p-2">
            <span className="block text-[10px] uppercase text-muted-foreground">Traffic</span>
            <span className="mt-1 block text-xs font-semibold text-foreground">{trafficInfo.label}</span>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <span className="block text-[10px] uppercase text-muted-foreground">Speed</span>
            <span className="mt-1 block text-xs font-semibold text-foreground">{Math.round(currentSpeed || 0)} km/h <span className="font-normal text-muted-foreground">/ {speedLimit}</span></span>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <span className="block text-[10px] uppercase text-muted-foreground">ETA impact</span>
            <span className="mt-1 block text-xs font-semibold text-foreground">{etaDelayMinutes > 0 ? `+${etaDelayMinutes} min` : 'On schedule'}</span>
          </div>
        </div>
      </details>

      {/* Incident Alert Banner (if incident present) */}
    </div>
  )
}
