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
  confidence?: number | null
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
  evidence = [],
  onAcceptReroute,
  onKeepCurrentRoute,
  onViewRoute,
  isAccepting = false,
  className = ''
}: DriverGeoAgentPanelProps) {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)

  const getStateMeta = (st: GeoAgentDecisionState) => {
    switch (st) {
      case 'REROUTE_RECOMMENDED':
        return {
          title: 'REROUTE RECOMMENDED',
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          borderClass: 'border-emerald-500/40',
          icon: <Sparkles className="size-3.5 text-emerald-400" />
        }
      case 'REROUTE_REQUIRED':
        return {
          title: 'REROUTE REQUIRED',
          badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
          borderClass: 'border-red-500/40',
          icon: <AlertTriangle className="size-3.5 text-red-400" />
        }
      case 'DEVIATION_DETECTED':
        return {
          title: 'DEVIATION DETECTED',
          badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          borderClass: 'border-amber-500/40',
          icon: <AlertTriangle className="size-3.5 text-amber-400" />
        }
      case 'NO_ACTION_NEEDED':
        return {
          title: 'NO ACTION NEEDED',
          badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          borderClass: 'border-blue-500/30',
          icon: <ShieldCheck className="size-3.5 text-blue-400" />
        }
      case 'MONITOR':
        return {
          title: 'MONITORING',
          badgeClass: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
          borderClass: 'border-slate-700',
          icon: <Clock className="size-3.5 text-slate-300" />
        }
      case 'BACKUP_RECOMMENDED':
        return {
          title: 'BACKUP RECOMMENDED',
          badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          borderClass: 'border-purple-500/40',
          icon: <Car className="size-3.5 text-purple-400" />
        }
      case 'ARRIVED':
        return {
          title: 'MISSION COMPLETE',
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          borderClass: 'border-emerald-500/30',
          icon: <CheckCircle2 className="size-3.5 text-emerald-400" />
        }
      default:
        return {
          title: 'GEOAGENT ADVISORY',
          badgeClass: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
          borderClass: 'border-slate-700',
          icon: <BrainCircuit className="size-3.5 text-cyan-400" />
        }
    }
  }

  const meta = getStateMeta(state)
  const confidenceText = confidence !== null && confidence !== undefined
    ? `${Math.round(confidence * 100)}%`
    : 'N/A'

  const hasRerouteOption = state === 'REROUTE_RECOMMENDED' || state === 'REROUTE_REQUIRED'

  return (
    <section
      className={`rounded-xl border ${meta.borderClass} bg-slate-900/95 p-3 sm:p-4 shadow-xl text-white ${className}`}
      aria-label="GeoAgent Decision Panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <BrainCircuit className="size-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-[10px] font-black tracking-widest uppercase text-cyan-400 leading-tight">
              GeoAgent Decision
            </h2>
            <p className="text-[9px] font-mono text-slate-500 leading-tight">
              Spatial Intelligence Engine
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black tracking-wide ${meta.badgeClass}`}>
          {meta.icon}
          <span>{meta.title}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Cause */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 col-span-2 sm:col-span-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">Likely Cause</span>
          <span className="text-[11px] font-bold text-white leading-tight block mt-0.5 truncate" title={likelyCause}>
            {likelyCause}
          </span>
        </div>

        {/* Confidence */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">Confidence</span>
          <span className="text-sm font-black font-mono text-cyan-400 block mt-0.5">
            {confidenceText}
          </span>
        </div>

        {/* Current ETA */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">Current Route</span>
          <span className="text-sm font-black font-mono text-red-400 block mt-0.5">
            {currentEtaMinutes} min
          </span>
        </div>

        {/* Alternative */}
        {hasRerouteOption ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Alternative</span>
              <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">
                SAVE {timeSavedMinutes} MIN
              </span>
            </div>
            <span className="text-sm font-black font-mono text-white block mt-0.5">
              {alternativeEtaMinutes} min
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 col-span-2 sm:col-span-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">Alternative</span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              Not Required
            </span>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="mt-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
          Why did GeoAgent decide this?
        </p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {explanation}
        </p>

        {/* Evidence */}
        {evidence && evidence.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setEvidenceExpanded(!evidenceExpanded)}
              className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Supporting Evidence ({evidence.length})</span>
              {evidenceExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>

            {evidenceExpanded && (
              <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-300 font-mono list-disc list-inside">
                {evidence.map((item, idx) => (
                  <li key={idx} className="leading-snug">{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {hasRerouteOption && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={onAcceptReroute}
            disabled={isAccepting}
            className="flex-1 min-h-[40px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Check className="size-4 stroke-[3]" />
            <span>{isAccepting ? 'Activating...' : `Accept Reroute (Save ${timeSavedMinutes}m)`}</span>
          </Button>

          {onViewRoute && (
            <Button
              variant="outline"
              onClick={onViewRoute}
              className="min-h-[40px] px-3 rounded-lg border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-[11px]"
            >
              View Route
            </Button>
          )}

          {onKeepCurrentRoute && (
            <Button
              variant="ghost"
              onClick={onKeepCurrentRoute}
              className="min-h-[40px] px-2.5 rounded-lg text-slate-400 hover:text-white font-bold text-[11px]"
            >
              <X className="size-3.5 mr-1" />
              Keep Current
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
