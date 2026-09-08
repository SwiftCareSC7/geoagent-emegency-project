'use client'

import React, { useState } from 'react'
import {
  BrainCircuit,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  TrafficCone,
  Car,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export type GeoAgentDecisionState =
  | 'NO_ACTION_NEEDED'
  | 'MONITOR'
  | 'REROUTE_RECOMMENDED'
  | 'REROUTE_REQUIRED'
  | 'ROUTE_UPDATED'
  | 'DEVIATION_DETECTED'
  | 'TRAFFIC_WARNING'
  | 'INCIDENT_WARNING'
  | 'BACKUP_RECOMMENDED'
  | 'ARRIVED'

interface DriverGeoAgentPanelProps {
  state?: GeoAgentDecisionState
  likelyCause?: string
  confidence?: number | null // e.g. 0.87 -> 87%
  currentEtaMinutes?: number
  alternativeEtaMinutes?: number
  timeSavedMinutes?: number
  explanation?: string
  evidence?: string[]
  onAcceptReroute?: () => void
  onKeepCurrentRoute?: () => void
  onViewRoute?: () => void
  isAccepting?: boolean
  className?: string
}

export function DriverGeoAgentPanel({
  state = 'REROUTE_RECOMMENDED',
  likelyCause = 'Traffic congestion on planned corridor',
  confidence = 0.87,
  currentEtaMinutes = 15,
  alternativeEtaMinutes = 10,
  timeSavedMinutes = 5,
  explanation = 'Congestion detected ahead on the planned corridor. Alternative Route B has lower estimated delay.',
  evidence = [
    'Route deviation detected (+45m drift from planned LineString)',
    'Traffic density elevated to 84% on Intermediate Ring Road',
    'Incident reported ahead (Accident blocking left lane)',
    'Alternative corridor (Indiranagar 100ft) ETA is 5 min lower'
  ],
  onAcceptReroute,
  onKeepCurrentRoute,
  onViewRoute,
  isAccepting = false,
  className = ''
}: DriverGeoAgentPanelProps) {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)

  // Meta configuration per decision state
  const getStateMeta = (st: GeoAgentDecisionState) => {
    switch (st) {
      case 'REROUTE_RECOMMENDED':
        return {
          title: 'REROUTE RECOMMENDED',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30',
          borderClass: 'border-emerald-500/50',
          icon: <Sparkles className="size-4 animate-pulse text-emerald-400" />
        }
      case 'REROUTE_REQUIRED':
        return {
          title: 'REROUTE REQUIRED',
          badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 ring-1 ring-rose-500/30',
          borderClass: 'border-rose-500/50',
          icon: <AlertTriangle className="size-4 animate-bounce text-rose-400" />
        }
      case 'DEVIATION_DETECTED':
        return {
          title: 'DEVIATION DETECTED',
          badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          borderClass: 'border-amber-500/50',
          icon: <AlertTriangle className="size-4 text-amber-400" />
        }
      case 'NO_ACTION_NEEDED':
        return {
          title: 'NO ACTION NEEDED',
          badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          borderClass: 'border-blue-500/40',
          icon: <ShieldCheck className="size-4 text-blue-400" />
        }
      case 'MONITOR':
        return {
          title: 'MONITORING CORRIDOR',
          badgeClass: 'bg-slate-700/50 text-slate-300 border-slate-600',
          borderClass: 'border-slate-700',
          icon: <Clock className="size-4 text-slate-300" />
        }
      case 'BACKUP_RECOMMENDED':
        return {
          title: 'BACKUP RECOMMENDED',
          badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
          borderClass: 'border-purple-500/50',
          icon: <Car className="size-4 text-purple-400" />
        }
      case 'ARRIVED':
        return {
          title: 'MISSION COMPLETE / ARRIVED',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          borderClass: 'border-emerald-500/40',
          icon: <CheckCircle2 className="size-4 text-emerald-400" />
        }
      default:
        return {
          title: 'GEOAGENT ADVISORY',
          badgeClass: 'bg-slate-700/50 text-slate-300 border-slate-600',
          borderClass: 'border-slate-700',
          icon: <BrainCircuit className="size-4 text-cyan-400" />
        }
    }
  }

  const meta = getStateMeta(state)
  const confidenceText = confidence !== null && confidence !== undefined
    ? `${Math.round(confidence * 100)}%`
    : 'Unavailable'

  const hasRerouteOption = state === 'REROUTE_RECOMMENDED' || state === 'REROUTE_REQUIRED'

  return (
    <section
      className={`rounded-3xl border-2 ${meta.borderClass} bg-slate-900/98 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl text-white ${className}`}
      aria-label="GeoAgent Decision Panel"
    >
      {/* 1. Header Bar: Title + State Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <BrainCircuit className="size-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-widest uppercase text-cyan-400">
              GeoAgent Decision
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Spatial Intelligence & Decision Engine
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black tracking-wide ${meta.badgeClass}`}>
          {meta.icon}
          <span>{meta.title}</span>
        </div>
      </div>

      {/* 2. Primary Metrics Matrix: Cause, Confidence, Current vs Alternative */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Cause */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Likely Cause</span>
          <span className="text-xs font-bold text-white leading-tight block mt-0.5 truncate" title={likelyCause}>
            {likelyCause}
          </span>
        </div>

        {/* Confidence */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Confidence</span>
          <span className="text-sm font-black font-mono text-cyan-400 block mt-0.5">
            {confidenceText}
          </span>
        </div>

        {/* Current Route ETA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Route</span>
          <span className="text-sm font-black font-mono text-rose-400 block mt-0.5">
            {currentEtaMinutes} min
          </span>
        </div>

        {/* Alternative ETA & Time Saved */}
        {hasRerouteOption ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Alternative</span>
              <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                SAVE {timeSavedMinutes} MIN
              </span>
            </div>
            <span className="text-sm font-black font-mono text-white block mt-0.5">
              {alternativeEtaMinutes} min
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Alternative</span>
            <span className="text-xs font-mono text-slate-400 block mt-0.5">
              Not Required
            </span>
          </div>
        )}
      </div>

      {/* 3. "Why?" Decision Explanation */}
      <div className="mt-3 rounded-2xl border border-slate-800/90 bg-slate-950/50 p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-1">
          <span>Why did GeoAgent decide this?</span>
        </p>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          {explanation}
        </p>

        {/* Expandable Supporting Evidence */}
        {evidence && evidence.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setEvidenceExpanded(!evidenceExpanded)}
              className="flex items-center justify-between w-full text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Supporting Evidence ({evidence.length} signals evaluated)</span>
              {evidenceExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {evidenceExpanded && (
              <ul className="mt-2 space-y-1 text-[11px] text-slate-300 font-mono list-disc list-inside">
                {evidence.map((item, idx) => (
                  <li key={idx} className="leading-snug">{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 4. Action Triggers with Large Touch Targets (>= 44px) */}
      {hasRerouteOption && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button
            onClick={onAcceptReroute}
            disabled={isAccepting}
            className="flex-1 min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Check className="size-5 stroke-[3]" />
            <span>{isAccepting ? 'Activating Route...' : `Accept Reroute (Save ${timeSavedMinutes}m)`}</span>
          </Button>

          {onViewRoute && (
            <Button
              variant="outline"
              onClick={onViewRoute}
              className="min-h-[48px] px-4 rounded-2xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs"
            >
              View Route
            </Button>
          )}

          {onKeepCurrentRoute && (
            <Button
              variant="ghost"
              onClick={onKeepCurrentRoute}
              className="min-h-[48px] px-3.5 rounded-2xl text-slate-400 hover:text-white font-bold text-xs"
            >
              <X className="size-4 mr-1" />
              Keep Current
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
