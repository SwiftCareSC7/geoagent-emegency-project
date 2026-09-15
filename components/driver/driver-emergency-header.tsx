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
  Activity,
  Sparkles
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
  const getPriorityBadge = (p: EmergencyPriority) => {
    switch (p) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          icon: <Flame className="size-3 animate-pulse text-white" />,
          classes: 'bg-red-600 text-white border-red-500'
        }
      case 'HIGH':
        return {
          label: 'HIGH',
          icon: <AlertTriangle className="size-3 text-white" />,
          classes: 'bg-amber-600 text-white border-amber-500'
        }
      case 'MEDIUM':
        return {
          label: 'MEDIUM',
          icon: <Activity className="size-3 text-white" />,
          classes: 'bg-blue-600 text-white border-blue-500'
        }
      case 'LOW':
      default:
        return {
          label: 'LOW',
          icon: <ShieldAlert className="size-3 text-white" />,
          classes: 'bg-slate-600 text-slate-200 border-slate-500'
        }
    }
  }

  const priorityMeta = getPriorityBadge(priority)

  return (
    <header className={`w-full bg-slate-900 border-b border-slate-800 ${className}`}>
      <div className="mx-auto px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Unit ID + Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Ambulance Badge */}
          <div className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-white font-black font-mono text-xs tracking-wider">
            <Siren className="size-3.5 animate-spin" style={{ animationDuration: '2s' }} />
            <span>{ambulanceId}</span>
          </div>

          {/* Emergency Status */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${emergencyActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {emergencyActive ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Center: Destination */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center sm:justify-start">
          <div className="size-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <MapPin className="size-3.5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">Destination</p>
            <p className="text-xs font-bold text-white truncate" title={destinationName}>
              {destinationName}
            </p>
          </div>
        </div>

        {/* Demo Scenario Button */}
        {onOpenScenarios && (
          <button
            type="button"
            onClick={onOpenScenarios}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 px-2.5 py-1.5 text-[10px] font-bold text-blue-300 transition-all shrink-0"
            title="Switch Demonstration Scenario"
          >
            <Sparkles className="size-3 text-blue-400" />
            <span className="max-w-[100px] truncate">{scenarioTitle || 'Scenarios'}</span>
          </button>
        )}

        {/* Right: Priority + ETA + Delay */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Priority */}
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-black tracking-wide ${priorityMeta.classes}`}>
            {priorityMeta.icon}
            <span className="hidden sm:inline">{priorityMeta.label}</span>
          </div>

          {/* ETA */}
          <div className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center min-w-[52px]">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">ETA</span>
            <span className="font-mono text-xs font-black text-emerald-400 leading-tight">
              {etaMinutes} min
            </span>
          </div>

          {/* Delay */}
          {delayMinutes > 0 ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-center min-w-[52px]">
              <span className="text-[8px] font-bold uppercase tracking-wider text-red-400 block leading-tight">Delay</span>
              <span className="font-mono text-xs font-black text-red-400 leading-tight">
                +{delayMinutes} min
              </span>
            </div>
          ) : (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-center min-w-[52px]">
              <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 block leading-tight">Delay</span>
              <span className="font-mono text-[10px] font-bold text-emerald-400 leading-tight">
                On Time
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
