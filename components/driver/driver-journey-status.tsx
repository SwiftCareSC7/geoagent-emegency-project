'use client'

import React from 'react'
import {
  Navigation,
  MapPin,
  Building2,
  CheckCircle2,
  ArrowDown,
  ArrowRight,
  Clock,
  Car,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import type { EmergencyStage, RouteLeg } from './types'

interface DriverJourneyStatusProps {
  ambulanceId?: string
  currentLocationName?: string
  emergencyLocationName?: string
  emergencyCoordinates?: [number, number]
  destinationName?: string
  destinationCoordinates?: [number, number]
  activeLegNumber?: number // 1 or 2
  currentStage?: EmergencyStage
  legs?: RouteLeg[]
  onSelectLeg?: (legNumber: number) => void
  onAdvanceStage?: () => void
  isSimulating?: boolean
  className?: string
}

export function DriverJourneyStatus({
  ambulanceId = 'AMB-01',
  currentLocationName = 'Current Location',
  emergencyLocationName = 'Emergency Scene',
  emergencyCoordinates,
  destinationName = 'Hospital ER',
  destinationCoordinates,
  activeLegNumber = 1,
  currentStage = 'HEADING_TO_EMERGENCY',
  legs = [],
  onSelectLeg,
  onAdvanceStage,
  isSimulating = false,
  className = ''
}: DriverJourneyStatusProps) {
  const leg1 = legs.find((l) => l.legNumber === 1)
  const leg2 = legs.find((l) => l.legNumber === 2)

  const isLeg1Active = activeLegNumber === 1
  const isLeg2Active = activeLegNumber === 2

  // Stage display configuration
  const stageConfig: Record<
    EmergencyStage,
    { label: string; badgeColor: string; textColor: string; icon: React.ReactNode }
  > = {
    HEADING_TO_EMERGENCY: {
      label: 'HEADING TO EMERGENCY',
      badgeColor: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
      textColor: 'text-blue-400',
      icon: <Car className="h-3.5 w-3.5 animate-pulse text-blue-400" />
    },
    AT_EMERGENCY: {
      label: 'AT EMERGENCY SCENE',
      badgeColor: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
      textColor: 'text-amber-400',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
    },
    TRANSPORTING_TO_HOSPITAL: {
      label: 'TRANSPORTING TO HOSPITAL',
      badgeColor: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
      textColor: 'text-emerald-400',
      icon: <Navigation className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
    },
    ARRIVING_AT_HOSPITAL: {
      label: 'ARRIVING AT HOSPITAL',
      badgeColor: 'bg-teal-500/20 border-teal-500/50 text-teal-400',
      textColor: 'text-teal-400',
      icon: <Building2 className="h-3.5 w-3.5 animate-bounce text-teal-400" />
    },
    ARRIVED: {
      label: 'JOURNEY COMPLETED',
      badgeColor: 'bg-slate-500/20 border-slate-500/50 text-slate-400',
      textColor: 'text-slate-400',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
    }
  }

  const currentStageInfo = stageConfig[currentStage] || stageConfig.HEADING_TO_EMERGENCY

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/95 p-3 sm:p-4 text-white shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Header with Active Stage Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 font-black text-xs font-mono">
            {ambulanceId}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Emergency Response Journey
            </span>
            <span className="text-xs font-extrabold text-white">2-Leg Active Corridor</span>
          </div>
        </div>

        {/* Current Stage Indicator */}
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${currentStageInfo.badgeColor}`}
        >
          {currentStageInfo.icon}
          <span>{currentStageInfo.label}</span>
        </div>
      </div>

      {/* 3 Distinct Locations & 2 Legs Visual Pipeline */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* LEG 1: Current -> Emergency (BLUE) */}
        <button
          type="button"
          onClick={() => onSelectLeg?.(1)}
          className={`group text-left rounded-xl p-3 border transition-all ${
            isLeg1Active
              ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30 shadow-lg shadow-blue-950/50'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-80'
          }`}
          aria-label="View Leg 1: Current Location to Emergency"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isLeg1Active
                    ? 'bg-blue-500 animate-ping'
                    : currentStage === 'TRANSPORTING_TO_HOSPITAL' || currentStage === 'ARRIVED'
                    ? 'bg-emerald-500'
                    : 'bg-blue-400'
                }`}
              />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                LEG 1 • TO EMERGENCY
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isLeg1Active
                  ? 'bg-blue-600 text-white'
                  : currentStage === 'TRANSPORTING_TO_HOSPITAL' || currentStage === 'ARRIVED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentStage === 'TRANSPORTING_TO_HOSPITAL' || currentStage === 'ARRIVED'
                ? '✓ COMPLETED'
                : isLeg1Active
                ? 'ACTIVE LEG'
                : 'PLANNED'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Car className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="font-semibold truncate">{currentLocationName}</span>
            </div>
            <div className="pl-4 text-[10px] text-slate-500 flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-blue-500/60" />
              <span>{leg1 ? `${(leg1.distanceMeters / 1000).toFixed(1)} km • ${Math.round(leg1.durationSeconds / 60)} min` : '2.8 km • 6 min'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white">
              <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="font-bold truncate">{emergencyLocationName}</span>
            </div>
          </div>
        </button>

        {/* LEG 2: Emergency -> Hospital (GREEN) */}
        <button
          type="button"
          onClick={() => onSelectLeg?.(2)}
          className={`group text-left rounded-xl p-3 border transition-all ${
            isLeg2Active
              ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-80'
          }`}
          aria-label="View Leg 2: Emergency to Hospital Destination"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isLeg2Active ? 'bg-emerald-500 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                LEG 2 • TO HOSPITAL
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isLeg2Active
                  ? 'bg-emerald-600 text-white'
                  : currentStage === 'ARRIVED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentStage === 'ARRIVED'
                ? '✓ COMPLETED'
                : isLeg2Active
                ? 'ACTIVE LEG'
                : 'PLANNED'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="font-semibold truncate">{emergencyLocationName}</span>
            </div>
            <div className="pl-4 text-[10px] text-slate-500 flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-emerald-500/60" />
              <span>{leg2 ? `${(leg2.distanceMeters / 1000).toFixed(1)} km • ${Math.round(leg2.durationSeconds / 60)} min` : '4.2 km • 10 min'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white">
              <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold truncate">{destinationName}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Stage Progression Trigger (Driver Cockpit Quick Action) */}
      {onAdvanceStage && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            {isLeg1Active
              ? 'Approaching emergency patient location'
              : 'En route with patient to tertiary emergency bay'}
          </span>
          <button
            type="button"
            onClick={onAdvanceStage}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition-colors border border-slate-700"
          >
            <span>Advance Stage</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
