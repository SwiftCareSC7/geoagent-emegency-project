'use client'

import React from 'react'
import {
  Siren,
  MapPin,
  Clock,
  AlertTriangle,
  Flame,
  HeartPulse,
  Car,
  ShieldAlert,
  Activity
} from 'lucide-react'

export type EmergencyPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface DriverEmergencyHeaderProps {
  ambulanceId?: string
  destinationName?: string
  destinationAddress?: string
  priority?: EmergencyPriority
  etaMinutes?: number
  delayMinutes?: number
  emergencyActive?: boolean
  scenarioTitle?: string
  onOpenScenarios?: () => void
  className?: string
}

export function DriverEmergencyHeader({
  ambulanceId = 'AMB-01',
  destinationName = 'Manipal Hospital',
  destinationAddress = '98 HAL Old Airport Rd, Bengaluru',
  priority = 'CRITICAL',
  etaMinutes = 12,
  delayMinutes = 3,
  emergencyActive = true,
  scenarioTitle,
  onOpenScenarios,
  className = ''
}: DriverEmergencyHeaderProps) {
  // Visual & text styling for Priority
  const getPriorityBadge = (p: EmergencyPriority) => {
    switch (p) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL PRIORITY',
          icon: <Flame className="size-4 animate-pulse text-white" />,
          classes: 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/40 ring-2 ring-rose-400/40'
        }
      case 'HIGH':
        return {
          label: 'HIGH PRIORITY',
          icon: <AlertTriangle className="size-4 text-white" />,
          classes: 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
        }
      case 'MEDIUM':
        return {
          label: 'MEDIUM PRIORITY',
          icon: <Activity className="size-4 text-white" />,
          classes: 'bg-blue-600 text-white border-blue-500'
        }
      case 'LOW':
      default:
        return {
          label: 'LOW PRIORITY',
          icon: <ShieldAlert className="size-4 text-white" />,
          classes: 'bg-slate-700 text-slate-200 border-slate-600'
        }
    }
  }

  const priorityMeta = getPriorityBadge(priority)

  return (
    <header className={`w-full bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl shadow-2xl ${className}`}>
      <div className="mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* 1. Unit & Emergency State */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-rose-600 px-3.5 py-1.5 text-white font-black font-mono text-sm tracking-wider shadow-md shadow-rose-900/50">
            <Siren className="size-5 animate-spin" style={{ animationDuration: '2s' }} />
            <span>{ambulanceId}</span>
          </div>

          <div className="hidden sm:flex flex-col">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-400">
              <span className="size-2 rounded-full bg-rose-500 animate-ping" />
              {emergencyActive ? 'Emergency Active' : 'Standby'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Rapid Response Protocol
            </span>
          </div>
        </div>

        {/* 2. Destination Hospital (Prominent & Clear) */}
        <div className="flex items-center gap-2.5 max-w-xs sm:max-w-md">
          <div className="size-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <MapPin className="size-5 text-cyan-400" />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Destination</p>
            <p className="text-sm font-black text-white truncate" title={destinationName}>
              {destinationName}
            </p>
          </div>
        </div>

        {/* 3. Metrics: Priority + Current ETA + Delay */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Priority Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide ${priorityMeta.classes}`}>
            {priorityMeta.icon}
            <span>{priorityMeta.label}</span>
          </div>

          {/* Live ETA */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ETA</span>
            <span className="font-mono text-sm font-black text-emerald-400">
              {etaMinutes} min
            </span>
          </div>

          {/* Delay Warning */}
          {delayMinutes > 0 ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-center animate-pulse">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Delay</span>
              <span className="font-mono text-sm font-black text-rose-400">
                +{delayMinutes} min
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Delay</span>
              <span className="font-mono text-sm font-black text-emerald-400">
                On Schedule
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
