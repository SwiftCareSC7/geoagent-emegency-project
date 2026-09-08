'use client'

import React from 'react'
import { 
  Radio, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  Wifi, 
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import type { ClearanceSession, ConnectedVehicle, ConnectedVehicleStatus } from '@/lib/api/clearance'

export interface DriverEmergencyClearanceProps {
  session: ClearanceSession | null
  onAdvanceCycle?: () => void
  onResetSession?: () => void
  isAdvancing?: boolean
  className?: string
}

export function DriverEmergencyClearance({
  session,
  onAdvanceCycle,
  onResetSession,
  isAdvancing = false,
  className = '',
}: DriverEmergencyClearanceProps) {
  if (!session) {
    return null
  }

  const { connectedVehicles = [], summary } = session

  const getStatusBadge = (status: ConnectedVehicleStatus) => {
    switch (status) {
      case 'CLEARED':
        return {
          label: 'CLEARED PATH',
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
          icon: CheckCircle2,
          desc: 'Moved to shoulder — lane open'
        }
      case 'GIVING_WAY':
        return {
          label: 'GIVING WAY',
          bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          dot: 'bg-teal-400 animate-pulse',
          icon: ArrowUpRight,
          desc: 'Pulling over to left shoulder'
        }
      case 'ACKNOWLEDGED':
        return {
          label: 'ACKNOWLEDGED',
          bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          dot: 'bg-indigo-400',
          icon: ShieldCheck,
          desc: 'Driver notified, slowing down'
        }
      case 'ALERT_SENT':
        return {
          label: 'ALERT SENT',
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          dot: 'bg-sky-400 animate-ping',
          icon: Wifi,
          desc: 'V2X siren broadcast transmitted'
        }
      default:
        return {
          label: 'DETECTED',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          icon: Radio,
          desc: 'In forward corridor radius'
        }
    }
  }

  const clearedCount = summary?.totalCleared ?? connectedVehicles.filter(v => v.status === 'CLEARED').length
  const totalCount = connectedVehicles.length || 3
  const clearPercent = Math.round((clearedCount / totalCount) * 100)

  return (
    <div
      className={`rounded-2xl border border-teal-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 p-4 shadow-2xl text-white ${className}`}
      aria-label="Emergency Clearance Demo V2X Panel"
    >
      {/* Top Header with mandatory SIMULATED / DEMO V2X disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                Emergency Clearance
              </h3>
              {/* Mandatory Simulated Label */}
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/40">
                SIMULATED CONNECTED VEHICLES (DEMO V2X)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Simulated corridor broadcast alerting forward civilian vehicles to pull over and yield right-of-way.
          </p>
        </div>

        {/* Simulation Cycle Advance Button */}
        {onAdvanceCycle && (
          <button
            type="button"
            onClick={onAdvanceCycle}
            disabled={isAdvancing}
            className="self-start sm:self-auto min-h-[44px] px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 active:bg-teal-500/40 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-400"
            title="Step through V2X clearance simulation sequence"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isAdvancing ? 'animate-spin text-teal-400' : ''}`} />
            <span>{isAdvancing ? 'Advancing Cycle...' : 'Advance V2X Cycle'}</span>
          </button>
        )}
      </div>

      {/* Corridor Clearance Status Bar */}
      <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium">Forward Corridor Clearance</span>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold font-mono text-teal-400">{clearedCount} of {totalCount}</span>
            <span className="text-slate-400">Vehicles Yielded</span>
            <span className="text-[10px] font-bold text-teal-300 bg-teal-500/20 px-1.5 py-0.5 rounded">
              {clearPercent}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(20,184,166,0.6)]"
            style={{ width: `${clearPercent}%` }}
          />
        </div>

        {/* V2X Siren Broadcast Message */}
        <div className="mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-teal-950/40 border border-teal-500/20 text-[11px] text-teal-200">
          <Wifi className="h-3.5 w-3.5 text-teal-400 shrink-0" />
          <span className="font-mono truncate">
            Broadcast Payload: &ldquo;AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER&rdquo;
          </span>
        </div>
      </div>

      {/* List of Simulated Connected Vehicles Ahead */}
      <div className="mt-3 space-y-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
          Connected Vehicles Ahead in Ambulance Corridor
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {connectedVehicles.map((vehicle, idx) => {
            const badge = getStatusBadge(vehicle.status)
            const BadgeIcon = badge.icon

            return (
              <div
                key={vehicle.vehicleId || idx}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Distance and Vehicle ID */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                      <Car className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block font-mono">
                        {vehicle.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {vehicle.vehicleId}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-cyan-400 font-mono">
                      {vehicle.distanceToAmbulanceMeters}m
                    </span>
                    <span className="text-[10px] text-slate-500 block">ahead</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold border ${badge.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                    <BadgeIcon className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    {badge.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
