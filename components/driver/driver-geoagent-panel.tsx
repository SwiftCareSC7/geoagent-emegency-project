'use client'

import React, { useState } from 'react'
import {
  BrainCircuit,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Car,
  Check,
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

  const meta = getStateMeta(state)
  const confidenceText = confidence !== null && confidence !== undefined
    ? `${Math.round(confidence * 100)}%`
    : 'Not provided'

  const hasRerouteOption = state === 'REROUTE_RECOMMENDED' || state === 'REROUTE_REQUIRED'

  return (
    <section
      className={`rounded-xl border ${meta.borderClass} bg-card p-3 sm:p-4 text-card-foreground ${className}`}
      aria-label="GeoAgent Decision Panel"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BrainCircuit className="size-4 text-purple-700 dark:text-purple-300" />
            </div>
            <div>
            <h2 className="text-xs font-bold tracking-wide uppercase text-purple-700 dark:text-purple-300 leading-tight">
              GeoAgent
            </h2>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.badgeClass}`}>
            {meta.icon}<span>{hasRerouteOption ? 'GEOAGENT RECOMMENDS REROUTE' : meta.title}</span>
          </span>
          <p className="mt-1.5 text-xs font-medium text-foreground">{likelyCause}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hasRerouteOption
              ? `Estimated ETA ${alternativeEtaMinutes} min, compared with ${currentEtaMinutes} min on the current route.`
              : explanation}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-expanded={detailsExpanded}
            onClick={() => setDetailsExpanded((open) => !open)}
            className="min-h-11 gap-1.5 px-3 text-xs"
          >
            <span>{detailsExpanded ? 'HIDE WHY' : 'VIEW WHY'}</span>
            <ChevronDown className={`size-3.5 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
          </Button>
          {hasRerouteOption && (
            <Button size="sm" onClick={onAcceptReroute} disabled={isAccepting} className="min-h-11 gap-1.5 bg-emerald-700 px-3 text-xs text-white hover:bg-emerald-800">
              <Check className="size-3.5" />
              <span>{isAccepting ? 'Activating…' : 'Accept route'}</span>
            </Button>
          )}
        </div>
      </div>

      {detailsExpanded && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{explanation}</p>
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="GeoAgent recommendation rationale">
            {[
              { title: 'Observation', text: evidence[0] || `Route state: ${state.replace(/_/g, ' ')}` },
              { title: 'Inference', text: likelyCause },
              { title: 'Alternative', text: hasRerouteOption ? `Alternative ETA ${alternativeEtaMinutes} min` : 'No route change proposed' },
              { title: 'Decision', text: hasRerouteOption ? 'Advisory only; route acceptance remains an explicit driver action.' : 'Continue monitoring current route.' },
              { title: 'Expected outcome', text: hasRerouteOption ? `Estimated ${timeSavedMinutes} min saved, based on the supplied route estimates.` : 'Maintain current route and monitor conditions.' },
              { title: 'Confidence', text: confidenceText },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-2 rounded-lg bg-muted/50 p-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-200">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{step.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-foreground">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {evidence.length > 1 && (
            <details className="mt-3 rounded-lg border border-border/70 px-3">
              <summary className="min-h-10 cursor-pointer py-2 text-xs font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Evidence ({evidence.length})</summary>
              <ul className="space-y-1 pb-3 text-xs text-muted-foreground">
                {evidence.slice(1).map((item, idx) => <li key={`${idx}-${item}`}>{item}</li>)}
              </ul>
            </details>
          )}
          {onViewRoute && <button type="button" onClick={onViewRoute} className="mt-3 min-h-10 rounded-lg px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">Compare routes</button>}
        </div>
      )}
    </section>
  )
}
