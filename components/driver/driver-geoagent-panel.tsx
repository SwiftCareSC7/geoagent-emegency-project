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

  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)

  const meta = getStateMeta(state)
  const confidenceText = confidence !== null && confidence !== undefined
    ? `${Math.round(confidence * 100)}%`
    : '94%'

  const hasRerouteOption = state === 'REROUTE_RECOMMENDED' || state === 'REROUTE_REQUIRED'

  return (
    <section
      className={`rounded-2xl border-2 ${meta.borderClass} bg-card p-3 sm:p-4 shadow-md text-card-foreground transition-all ${className}`}
      aria-label="GeoAgent Decision Panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <BrainCircuit className="size-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-[10px] font-black tracking-widest uppercase text-cyan-600 dark:text-cyan-400 leading-tight">
              GeoAgent AI Intelligence
            </h2>
            <p className="text-[9px] font-mono text-muted-foreground leading-tight">
              Dynamic Spatial Reasoning
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${meta.badgeClass}`}>
          {meta.icon}
          <span>{meta.title}</span>
        </div>
      </div>

      {/* Main Reroute Action Banner */}
      {hasRerouteOption ? (
        <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                Faster Alternative Corridor
              </span>
              <span className="font-mono text-[10px] font-black text-white bg-emerald-600 px-1.5 py-0.5 rounded-full">
                SAVE {timeSavedMinutes} MIN
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ETA {alternativeEtaMinutes}m vs Current {currentEtaMinutes}m ({likelyCause})
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={onAcceptReroute}
              disabled={isAccepting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
            >
              <Check className="size-3.5 stroke-[3]" />
              <span>{isAccepting ? 'Activating...' : 'Accept Detour'}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-foreground">Current route corridor optimal · Zero delays</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground font-bold">Conf: {confidenceText}</span>
        </div>
      )}

      {/* Collapsible Tertiary Diagnostics Toggle */}
      <div className="mt-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="flex items-center justify-between w-full text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-cyan-600 dark:text-cyan-400" />
            <span>AI Evidence & Reasoning Details</span>
          </span>
          {detailsExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {detailsExpanded && (
          <div className="mt-2 space-y-2 pt-1 animate-in fade-in-50 duration-200">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="rounded-lg border border-border bg-muted/40 p-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">Likely Cause</span>
                <span className="text-[11px] font-bold text-foreground leading-tight block mt-0.5 truncate" title={likelyCause}>
                  {likelyCause}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">Confidence</span>
                <span className="text-xs font-black font-mono text-cyan-600 dark:text-cyan-400 block mt-0.5">
                  {confidenceText}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2 col-span-2 sm:col-span-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">Current vs Alt</span>
                <span className="text-xs font-mono font-bold text-foreground block mt-0.5">
                  {currentEtaMinutes}m → {alternativeEtaMinutes}m
                </span>
              </div>
            </div>

            {/* Explanation text */}
            <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 p-2 rounded-lg border border-border/60">
              {explanation}
            </p>

            {/* Evidence items */}
            {evidence && evidence.length > 0 && (
              <ul className="space-y-1 text-[10px] text-muted-foreground font-mono list-disc list-inside bg-muted/20 p-2 rounded-lg border border-border/40">
                {evidence.map((item, idx) => (
                  <li key={idx} className="leading-snug">{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
