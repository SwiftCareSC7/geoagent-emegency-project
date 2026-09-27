'use client'

import React, { useMemo } from 'react'
import {
  AlertTriangle,
  Compass,
  Gauge,
  Layers,
  MapPin,
  Milestone,
  Radio,
  Route as RouteIcon,
  ShieldAlert,
  Siren,
  Truck,
  Wifi,
  WifiOff
} from 'lucide-react'
import type {
  Emergency,
  Vehicle,
  Route,
  Trajectory,
  SituationAnalysis,
  PredictionResult,
  Decision
} from '@/lib/api/types'
import { ControlRoomMap } from '@/components/map/control-room-map'
import { cn } from '@/lib/utils'

interface EmergencyMissionMapProps {
  emergency?: Emergency | null
  vehicle?: Vehicle | null
  route?: Route | null
  latestTrajectory?: Trajectory | null
  situationAnalysis?: SituationAnalysis | null
  prediction?: PredictionResult | null
  decision?: Decision | null
  loading?: boolean
  className?: string
}

export function EmergencyMissionMap({
  emergency,
  vehicle,
  route,
  latestTrajectory,
  situationAnalysis,
  prediction,
  decision,
  loading = false,
  className = '',
}: EmergencyMissionMapProps) {
  // Edge-case detection
  const hasVehicle = Boolean(vehicle || emergency?.assignedVehicle)
  const vehicleId =
    vehicle?.vehicleId ||
    (emergency?.assignedVehicle && typeof emergency.assignedVehicle === 'object' && 'vehicleId' in emergency.assignedVehicle
      ? (emergency.assignedVehicle as any).vehicleId
      : typeof emergency?.assignedVehicle === 'string'
      ? emergency.assignedVehicle
      : null)

  const hasRoute = Boolean(route && route.geometry?.coordinates?.length)
  const hasTelemetry = Boolean(latestTrajectory?.location?.coordinates || vehicle?.location?.coordinates)

  const speed = latestTrajectory?.speed ?? vehicle?.speed ?? null
  const heading = latestTrajectory?.heading ?? vehicle?.heading ?? null

  const vehicleStatus = vehicle?.status || 'EN_ROUTE'
  const isDeviated =
    situationAnalysis?.deviation?.status === 'WARNING' ||
    situationAnalysis?.deviation?.status === 'CRITICAL_DEVIATION' ||
    (situationAnalysis?.deviation as any)?.status === 'DEVIATED' ||
    (situationAnalysis?.deviation as any)?.isDeviated === true

  const incidents = useMemo(() => {
    if (!situationAnalysis?.incidents) return []
    return situationAnalysis.incidents.map((i: any) => ({
      id: i.id || i.incidentId || `inc-${Math.random()}`,
      incidentId: i.incidentId || i.id || 'INC',
      type: i.type || 'ACCIDENT',
      severity: i.severity || 'HIGH',
      status: (i.status as any) || 'ACTIVE',
      description: i.description,
      location: i.location,
      source: i.source,
      createdAt: i.createdAt
    }))
  }, [situationAnalysis])

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-border bg-card p-4 sm:p-6 shadow-md transition-all text-card-foreground space-y-4',
        className
      )}
    >
      {/* Title & Mission Status Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <RouteIcon className="h-5 w-5" />
              <h3 className="font-bold text-base text-foreground tracking-tight">
                Mission Operational Map & Corridor Tracking
              </h3>
            </div>

            {emergency && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-full font-bold bg-muted border border-border text-foreground">
                {emergency.emergencyId}
              </span>
            )}

            {emergency?.priority && (
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border',
                  emergency.priority === 'CRITICAL'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : emergency.priority === 'HIGH'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                )}
              >
                {emergency.priority}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Live geographic visualization of active ambulance unit, planned route corridor, detour options, and hazard points.
          </p>
        </div>

        {/* Dynamic Telemetry / Status Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {hasVehicle ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
              <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground block leading-tight">
                  Assigned Unit
                </span>
                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                  {vehicleId}
                </span>
              </div>
              {speed !== null && (
                <div className="pl-2 border-l border-blue-500/20 flex items-center gap-1 font-mono font-semibold text-foreground">
                  <Gauge className="h-3 w-3 text-muted-foreground" />
                  <span>{Math.round(speed)} km/h</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>No Vehicle Assigned</span>
            </div>
          )}

          {isDeviated && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Corridor Deviation Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Edge-Case Warning Ribbons */}
      <div className="space-y-2">
        {!hasVehicle && (
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Unit Assignment Pending:</strong> No emergency vehicle has been linked to mission{' '}
              <span className="font-mono">{emergency?.emergencyId}</span>. The map will display the incident location and nearest available corridor.
            </span>
          </div>
        )}

        {!hasRoute && (
          <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2.5">
            <RouteIcon className="h-4 w-4 shrink-0 text-blue-500" />
            <span>
              <strong>Planned Corridor Pending:</strong> Authoritative route geometry has not yet been computed for this emergency. Showing base map and vehicle location.
            </span>
          </div>
        )}

        {hasVehicle && !hasTelemetry && (
          <div className="p-3 rounded-xl border border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <strong>Telemetry Offline:</strong> Awaiting live GPS telemetry packets from unit {vehicleId}. Displaying last known destination coordinates.
            </span>
          </div>
        )}
      </div>

      {/* Main Interactive Map Component */}
      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted/40 shadow-inner">
        <ControlRoomMap
          initialEmergencies={emergency ? [emergency] : []}
          initialVehicles={vehicle ? [vehicle] : []}
          initialIncidents={incidents}
          selectedEmergencyId={emergency?.emergencyId || null}
          height="540px"
        />
      </div>

      {/* Route Color Semantics Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-6 rounded-full bg-blue-600 dark:bg-blue-500 shadow-sm" />
            <span className="text-foreground">Planned / Active Corridor (Blue)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-6 rounded-full bg-purple-600 dark:bg-purple-500 border border-dashed border-white/50 shadow-sm" />
            <span className="text-foreground">Recommended Alternative Detour (Purple)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-6 rounded-full bg-amber-500 shadow-sm" />
            <span className="text-foreground">Recorded GPS Trajectory (Orange)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-ping" />
            <span className="text-foreground">Corridor Incidents (Red)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-foreground">Google Maps Platform</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Live Traffic Layer Active</span>
        </div>
      </div>
    </div>
  )
}
