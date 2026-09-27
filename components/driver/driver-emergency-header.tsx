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
  Sparkles,
  Route as RouteIcon,
  Radio,
  PhoneCall,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  navigationMode?: 'EMERGENCY_MISSION' | 'MANUAL_ROUTE'
  onSelectEmergencyMission?: () => void
  isRoutePlannerVisible?: boolean
  onToggleRoutePlanner?: () => void
  gpsMode?: 'LIVE_GPS' | 'SIMULATION'
  onToggleGpsMode?: () => void
  onOpenPriorityRadio?: () => void
  onOpenTelemetry?: () => void
  smsButtonNode?: React.ReactNode
  isLoadingRoute?: boolean
  onEndNavigation?: () => void
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
  navigationMode = 'EMERGENCY_MISSION',
  onSelectEmergencyMission,
  isRoutePlannerVisible = false,
  onToggleRoutePlanner,
  gpsMode = 'SIMULATION',
  onToggleGpsMode,
  onOpenPriorityRadio,
  onOpenTelemetry,
  smsButtonNode,
  isLoadingRoute = false,
  onEndNavigation,
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
    <header className={`w-full bg-card/95 border-b border-border shadow-xs backdrop-blur-md ${className}`}>
      <div className="px-3 sm:px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Unit ID + Active Status + Destination */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Ambulance Badge */}
          <div className="flex items-center gap-1.5 rounded-xl bg-red-600 px-2.5 py-1 text-white font-black font-mono text-xs tracking-wider shadow-xs">
            <Siren className="size-3.5 animate-spin" style={{ animationDuration: '2s' }} />
            <span>{ambulanceId}</span>
          </div>

          {/* Emergency Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border">
            <span className={`size-1.5 rounded-full ${emergencyActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              {emergencyActive ? 'ACTIVE DISPATCH' : 'STANDBY'}
            </span>
          </div>

          {/* Destination */}
          <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-xs truncate">
            <MapPin className="size-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-xs font-bold text-foreground truncate" title={destinationName}>
              {destinationName}
            </span>
          </div>
        </div>

        {/* Center: Scenario Switcher + Mission Mode Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Demo Scenario Selector */}
          {onOpenScenarios && (
            <button
              type="button"
              onClick={onOpenScenarios}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-300 transition-all shrink-0 cursor-pointer"
              title="Switch Demonstration Scenario"
            >
              <Sparkles className="size-3 text-blue-500 dark:text-blue-400" />
              <span className="max-w-[120px] truncate">{scenarioTitle || 'Scenario 1'}</span>
            </button>
          )}

          {/* Mode Toggles */}
          {onSelectEmergencyMission && (
            <button
              type="button"
              onClick={onSelectEmergencyMission}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                navigationMode === 'EMERGENCY_MISSION' && !isRoutePlannerVisible
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Siren className="size-3" />
              <span className="hidden md:inline">Emergency Mission</span>
            </button>
          )}

          {onToggleRoutePlanner && (
            <button
              type="button"
              onClick={onToggleRoutePlanner}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isRoutePlannerVisible || navigationMode === 'MANUAL_ROUTE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <RouteIcon className="size-3" />
              <span>Route Planner</span>
            </button>
          )}

          {/* Live GPS / Simulation Toggle */}
          {onToggleGpsMode && (
            <button
              type="button"
              onClick={onToggleGpsMode}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gpsMode === 'LIVE_GPS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              title={gpsMode === 'LIVE_GPS' ? 'Tracking real device GPS' : 'Running corridor simulation'}
            >
              <Radio className={`size-3 ${gpsMode === 'LIVE_GPS' ? 'text-white animate-pulse' : 'text-muted-foreground'}`} />
              <span className="hidden sm:inline">{gpsMode === 'LIVE_GPS' ? 'GPS Live' : 'Simulated GPS'}</span>
            </button>
          )}
        </div>

        {/* Right: ETA + Priority + Quick Operator Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Priority */}
          <div className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black tracking-wide ${priorityMeta.classes}`}>
            {priorityMeta.icon}
            <span>{priorityMeta.label}</span>
          </div>

          {/* Connected ETA Chip */}
          <div className="rounded-lg border border-border bg-muted/60 px-2.5 py-0.5 text-center min-w-[50px]">
            <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">ETA</span>
            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {etaMinutes}m
            </span>
          </div>

          {/* SMS Button Slot */}
          {smsButtonNode}

          {/* Priority Radio Button */}
          {onOpenPriorityRadio && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onOpenPriorityRadio}
              className="h-8 px-2.5 text-xs font-bold gap-1 shadow-xs cursor-pointer"
              title="Open direct priority radio channel"
            >
              <PhoneCall className="size-3" />
              <span className="hidden sm:inline">Priority Radio</span>
            </Button>
          )}

          {/* Telemetry / Audit Log Button */}
          {onOpenTelemetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenTelemetry}
              className="h-8 px-2.5 text-xs font-bold gap-1 border-border text-foreground hover:bg-muted cursor-pointer"
              title="View corridor telemetry & audit log"
            >
              <Activity className="size-3 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden md:inline">Telemetry & Audit</span>
            </Button>
          )}

          {isLoadingRoute && (
            <span className="flex items-center gap-1 text-[10px] text-cyan-500 font-bold animate-pulse">
              <RefreshCw className="size-3 animate-spin" />
            </span>
          )}

          {navigationMode === 'MANUAL_ROUTE' && onEndNavigation && (
            <button
              type="button"
              onClick={onEndNavigation}
              className="h-8 px-2 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-600 dark:text-red-400 font-bold border border-red-500/30 text-[10px] cursor-pointer"
            >
              End
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
