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
  activeLegNumber?: number
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

  const stageConfig: Record<
    EmergencyStage,
    { label: string; badgeColor: string; icon: React.ReactNode }
  > = {
    HEADING_TO_EMERGENCY: {
      label: 'HEADING TO EMERGENCY',
      badgeColor: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      icon: <Car className="h-3 w-3 animate-pulse text-blue-400" />
    },
    AT_EMERGENCY: {
      label: 'AT EMERGENCY SCENE',
      badgeColor: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      icon: <AlertTriangle className="h-3 w-3 text-amber-400" />
    },
    TRANSPORTING_TO_HOSPITAL: {
      label: 'TRANSPORTING TO HOSPITAL',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      icon: <Navigation className="h-3 w-3 animate-pulse text-emerald-400" />
    },
    ARRIVING_AT_HOSPITAL: {
      label: 'ARRIVING AT HOSPITAL',
      badgeColor: 'bg-teal-500/15 border-teal-500/30 text-teal-400',
      icon: <Building2 className="h-3 w-3 animate-bounce text-teal-400" />
    },
    ARRIVED: {
      label: 'JOURNEY COMPLETED',
      badgeColor: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />
    }
  }

  const currentStageInfo = stageConfig[currentStage] || stageConfig.HEADING_TO_EMERGENCY

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 items-center justify-center rounded bg-red-600/20 border border-red-500/30 px-1.5 text-red-400 font-black text-[10px] font-mono">
            {ambulanceId}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            2-Leg Emergency Corridor
          </span>
        </div>

        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide ${currentStageInfo.badgeColor}`}
        >
          {currentStageInfo.icon}
          <span>{currentStageInfo.label}</span>
        </div>
      </div>

      {/* Legs */}
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* LEG 1 */}
        <button
          type="button"
          onClick={() => onSelectLeg?.(1)}
          className={`group text-left rounded-lg p-2.5 border transition-all ${
            isLeg1Active
              ? 'bg-blue-950/40 border-blue-500/50 ring-1 ring-blue-500/20'
              : 'bg-slate-950/50 border-slate-800/60 hover:border-slate-700 opacity-80'
          }`}
          aria-label="View Leg 1: Current Location to Emergency"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  isLeg1Active
                    ? 'bg-blue-500 animate-ping'
                    : currentStage === 'TRANSPORTING_TO_HOSPITAL' || currentStage === 'ARRIVED'
                    ? 'bg-emerald-500'
                    : 'bg-blue-400'
                }`}
              />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-400">
                LEG 1 · TO EMERGENCY
              </span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                isLeg1Active
                  ? 'bg-blue-600 text-white'
                  : currentStage === 'TRANSPORTING_TO_HOSPITAL' || currentStage === 'ARRIVED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentStage === 'TRANSPORTING_TO_HOSPITAL' || currentStage === 'ARRIVED'
                ? 'COMPLETED'
                : isLeg1Active
                ? 'ACTIVE'
                : 'PLANNED'}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <Car className="h-3 w-3 text-blue-400 shrink-0" />
              <span className="font-semibold truncate">{currentLocationName}</span>
            </div>
            <div className="pl-4 text-[9px] text-slate-500 flex items-center gap-1">
              <ArrowDown className="h-2.5 w-2.5 text-blue-500/50" />
              <span>{leg1 ? `${(leg1.distanceMeters / 1000).toFixed(1)} km · ${Math.round(leg1.durationSeconds / 60)} min` : '2.8 km · 6 min'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white">
              <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
              <span className="font-bold truncate">{emergencyLocationName}</span>
            </div>
          </div>
        </button>

        {/* LEG 2 */}
        <button
          type="button"
          onClick={() => onSelectLeg?.(2)}
          className={`group text-left rounded-lg p-2.5 border transition-all ${
            isLeg2Active
              ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/50 border-slate-800/60 hover:border-slate-700 opacity-80'
          }`}
          aria-label="View Leg 2: Emergency to Hospital Destination"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  isLeg2Active ? 'bg-emerald-500 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                LEG 2 · TO HOSPITAL
              </span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                isLeg2Active
                  ? 'bg-emerald-600 text-white'
                  : currentStage === 'ARRIVED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentStage === 'ARRIVED'
                ? 'COMPLETED'
                : isLeg2Active
                ? 'ACTIVE'
                : 'PLANNED'}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
              <span className="font-semibold truncate">{emergencyLocationName}</span>
            </div>
            <div className="pl-4 text-[9px] text-slate-500 flex items-center gap-1">
              <ArrowDown className="h-2.5 w-2.5 text-emerald-500/50" />
              <span>{leg2 ? `${(leg2.distanceMeters / 1000).toFixed(1)} km · ${Math.round(leg2.durationSeconds / 60)} min` : '4.2 km · 10 min'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white">
              <Building2 className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="font-bold truncate">{destinationName}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Stage Advance */}
      {onAdvanceStage && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            {isLeg1Active
              ? 'Approaching emergency patient location'
              : 'En route with patient to hospital'}
          </span>
          <button
            type="button"
            onClick={onAdvanceStage}
            className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 transition-colors border border-slate-700"
          >
            <span>Advance</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
