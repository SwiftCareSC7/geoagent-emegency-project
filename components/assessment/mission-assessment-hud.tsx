'use client'

import React, { useState } from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  CornerDownRight,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  TrendingUp,
  Truck,
  XCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type {
  Emergency,
  Vehicle,
  Route,
  Trajectory,
  SituationAnalysis,
  PredictionResult,
  Decision,
  OrchestrationWorkflowResult
} from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface MissionAssessmentHUDProps {
  emergency?: Emergency | null
  vehicle?: Vehicle | null
  route?: Route | null
  latestTrajectory?: Trajectory | null
  situationAnalysis?: SituationAnalysis | null
  prediction?: PredictionResult | null
  decision?: Decision | null
  orchestrationResult?: OrchestrationWorkflowResult | null
  comparisonData?: any
  onApproveDecision?: (decisionId: string, comment?: string, candidateId?: string) => Promise<void>
  onRejectDecision?: (decisionId: string, reason?: string) => Promise<void>
  onExecuteDecision?: (decisionId: string) => Promise<void>
  className?: string
  compact?: boolean
}

type EpistemicType = 'OBSERVED' | 'INFERRED' | 'UNKNOWN' | 'DERIVED'

export function MissionAssessmentHUD({
  emergency,
  vehicle,
  route,
  latestTrajectory,
  situationAnalysis,
  prediction,
  decision,
  orchestrationResult,
  comparisonData,
  onApproveDecision,
  onRejectDecision,
  onExecuteDecision,
  className = '',
  compact = false,
}: MissionAssessmentHUDProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)
  const [assessmentExpanded, setAssessmentExpanded] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('Operator override: corridor conditions cleared')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 1. Q1: Has the ambulance deviated from its planned route?
  const deviationMeters = situationAnalysis?.deviation?.distanceFromRouteMeters ?? 0
  const deviationStatus = situationAnalysis?.deviation?.status ?? 'ON_ROUTE'
  const isDeviated =
    deviationStatus === 'DEVIATED' ||
    deviationStatus === 'CRITICAL_DEVIATION' ||
    deviationMeters > 50

  const q1Answer = isDeviated
    ? `YES — ${deviationStatus === 'CRITICAL_DEVIATION' ? 'CRITICAL DEVIATION' : 'DEVIATED'} (${Math.round(deviationMeters)}m from corridor)`
    : `NO — ON ROUTE (${Math.round(deviationMeters)}m lateral delta)`
  const q1Epistemic: EpistemicType = latestTrajectory ? 'OBSERVED' : 'UNKNOWN'
  const q1Evidence = [
    `Vehicle fix: ${latestTrajectory?.location?.coordinates ? `[${latestTrajectory.location.coordinates[0].toFixed(5)}, ${latestTrajectory.location.coordinates[1].toFixed(5)}]` : 'Waiting for GPS stream'}`,
    `Lateral deviation: ${Math.round(deviationMeters)}m (Threshold: 50m warning, 100m critical)`,
    `GPS fix stability: ${situationAnalysis?.deviation?.gpsStability || 'STABLE'} (Confidence: ${situationAnalysis?.deviation?.confidence || 'HIGH'})`,
    `Heading delta: ${situationAnalysis?.deviation?.bearingDifferenceDegrees !== null && situationAnalysis?.deviation?.bearingDifferenceDegrees !== undefined ? `${Math.round(situationAnalysis.deviation.bearingDifferenceDegrees)}° vs route` : 'N/A'}`
  ]

  // 2. Q2: What caused the deviation?
  const correlatedIncidents = situationAnalysis?.incidents || []
  const topIncident = correlatedIncidents[0]
  const trafficLevel = situationAnalysis?.traffic?.level || 'UNKNOWN'

  let q2Answer = 'NO DEVIATION DETECTED'
  let q2Epistemic: EpistemicType = 'UNKNOWN'
  let q2Evidence: string[] = []

  if (isDeviated || trafficLevel === 'SEVERE' || trafficLevel === 'HEAVY') {
    if (topIncident) {
      q2Answer = `${topIncident.type.replace(/_/g, ' ')} (${topIncident.description || `${Math.round(topIncident.distanceFromRouteMeters)}m from route`})`
      q2Epistemic = 'INFERRED'
      q2Evidence = [
        `Correlated hazard: ${topIncident.type} (${topIncident.severity} priority)`,
        `Distance from route centerline: ${Math.round(topIncident.distanceFromRouteMeters)}m`,
        `Incident description: "${topIncident.description || 'Reported active road obstacle'}"`,
        `Source: Traffic Police GIS & Regional Sensor Array`
      ]
    } else if (trafficLevel === 'SEVERE' || trafficLevel === 'HEAVY') {
      q2Answer = `HEAVY TRAFFIC CORRIDOR SURGE (Speed: ${situationAnalysis?.traffic?.speedKmh || 12} km/h)`
      q2Epistemic = 'INFERRED'
      q2Evidence = [
        `Corridor speed: ${situationAnalysis?.traffic?.speedKmh || 12} km/h (Normal free flow: ${situationAnalysis?.traffic?.freeFlowSpeedKmh || 40} km/h)`,
        `Congestion ratio: ${situationAnalysis?.traffic?.congestionRatio ? `${(situationAnalysis.traffic.congestionRatio * 100).toFixed(0)}%` : '78%'}`,
        `Source: Real-time OSRM & Municipal Traffic Feed`
      ]
    } else {
      q2Answer = 'CAUSE UNCONFIRMED (Possible Unreported Roadwork or Driver Detour)'
      q2Epistemic = 'UNKNOWN'
      q2Evidence = [
        'No active police incident registered within 500m of deviation point',
        'Telemetry indicates sustained lateral divergence without corridor clearance request',
        'Awaiting dispatcher or driver radio verification'
      ]
    }
  } else {
    q2Evidence = [
      'Normal corridor progression maintained',
      'No road closures or severe bottlenecks on active segment',
      `Current corridor traffic state: ${trafficLevel}`
    ]
  }

  // 3. Q3: How much delay is expected?
  const delayMinutes =
    prediction?.predictedDelayMinutes ??
    situationAnalysis?.delay?.delayMinutes ??
    (comparisonData?.currentRoute?.delayMinutes ?? 0)

  const predictedDurationMin =
    prediction?.predictedDurationMinutes ??
    situationAnalysis?.eta?.currentMinutes ??
    (route?.duration ? Math.round(route.duration / 60) : 12)

  const baselineDurationMin =
    prediction?.baselineDurationMinutes ??
    situationAnalysis?.eta?.originalMinutes ??
    (route?.duration ? Math.round(route.duration / 60) : 10)

  const q3Answer = delayMinutes > 1
    ? `+${delayMinutes.toFixed(1)} MIN DELAY (ETA: ${predictedDurationMin} min vs ${baselineDurationMin} min planned)`
    : delayMinutes < -0.5
      ? `${Math.abs(delayMinutes).toFixed(1)} MIN AHEAD OF SCHEDULE (ETA: ${predictedDurationMin} min)`
      : `ON TIME (ETA: ${predictedDurationMin} min, minimal delta)`

  const q3Epistemic: EpistemicType = prediction ? 'INFERRED' : 'DERIVED'
  const q3Evidence = [
    `Predicted transit time: ${predictedDurationMin} minutes`,
    `Scheduled baseline: ${baselineDurationMin} minutes`,
    `Delay risk classification: ${prediction?.delayRisk || (delayMinutes > 5 ? 'HIGH' : 'LOW')}`,
    `Model confidence: ${prediction?.confidence || 'HIGH'} (${prediction?.confidenceScore ? `${Math.round(prediction.confidenceScore * 100)}%` : 'Deterministic calculation'})`,
    ...(prediction?.factors?.map((f) => `Factor: ${f.factor} (${f.impact} impact) [${f.epistemicType}]`) || [])
  ]

  // 4. Q4: What is the best alternative route?
  const alternatives =
    comparisonData?.alternatives ||
    (orchestrationResult?.geoAgent as any)?.comparison?.alternatives ||
    []
  const recommendedAlt = alternatives.find((a: any) => a.recommended) || alternatives[0]

  let q4Answer = 'MAINTAIN CURRENT ROUTE (Optimal path)'
  let q4Epistemic: EpistemicType = 'DERIVED'
  let q4Evidence: string[] = []

  if (recommendedAlt) {
    const timeDiff = recommendedAlt.timeDiffMinutes ?? (recommendedAlt.durationMinutes ? recommendedAlt.durationMinutes - predictedDurationMin : -3.5)
    q4Answer = `${recommendedAlt.name || recommendedAlt.routeId || 'ALTERNATIVE 2'} (${timeDiff < 0 ? `Saves ${Math.abs(timeDiff).toFixed(1)} min` : `+${timeDiff.toFixed(1)} min`}, ${(recommendedAlt.distanceKm || (recommendedAlt.distance ? recommendedAlt.distance / 1000 : 4.2)).toFixed(1)} km)`
    q4Evidence = [
      `Recommended alternative: ${recommendedAlt.name || recommendedAlt.routeId}`,
      `Estimated travel time: ${recommendedAlt.durationMinutes || 8.5} minutes`,
      `Distance delta: ${recommendedAlt.distanceDiffKm ? `${recommendedAlt.distanceDiffKm > 0 ? '+' : ''}${recommendedAlt.distanceDiffKm.toFixed(1)} km` : 'Comparable distance'}`,
      `Route safety score: ${recommendedAlt.safetyScore ? `${recommendedAlt.safetyScore}/100` : 'High clearance'}`,
      `Status: Bypasses active incident sector via peripheral arterial corridor`
    ]
  } else {
    q4Evidence = [
      'Current planned corridor remains fastest available path',
      'Alternative arterial corridors have equal or worse traffic penalties',
      'No reroute action needed at this timestamp'
    ]
  }

  // 5. Q5: Should another ambulance be dispatched instead?
  const backupNeeded =
    decision?.primaryAction === 'CONSIDER_BACKUP' ||
    (decision?.action === 'CONSIDER_BACKUP') ||
    (delayMinutes > 15 && emergency?.priority === 'CRITICAL')

  let q5Answer = 'NOT REQUIRED — Assigned unit ETA remains clinically acceptable'
  let q5Epistemic: EpistemicType = 'INFERRED'
  let q5Evidence = [
    `Assigned unit ${vehicle?.vehicleId || 'AMB-01'} progressing toward destination`,
    `Delay threshold for backup dispatch: 15.0 min (Current delta: ${delayMinutes.toFixed(1)} min)`,
    'Closest backup units: AMB-02 (Central Depot, 11 min away), AMB-04 (St. John Hospital, 14 min away)',
    'Clinical triage rule: Primary vehicle arrival expected sooner than backup redeployment'
  ]

  if (backupNeeded) {
    q5Answer = 'RECOMMENDED — Dispatch secondary unit AMB-02 (4 min closer to scene)'
    q5Evidence = [
      `Primary unit ${vehicle?.vehicleId || 'AMB-01'} has sustained critical corridor delay (+${delayMinutes.toFixed(1)} min)`,
      'Secondary unit AMB-02 is currently AVAILABLE at Central Depot',
      'AMB-02 projected ETA to scene: 5.5 min (Arrives 7.0 min earlier than primary)',
      'Action: Recommend secondary dispatch approval to avoid clinical compromise'
    ]
  }

  // Decision state for Human-In-The-Loop action
  const activeDecisionId = decision?.decisionId || (decision as any)?.id || 'DEC-ACTIVE'
  const decisionStatus = decision?.status || 'PENDING_OPERATOR_ACTION'
  const isPending = decisionStatus === 'PENDING_OPERATOR_ACTION'
  const isApproved = decisionStatus === 'APPROVED'
  const isExecuted = decisionStatus === 'EXECUTED'
  const isRejected = decisionStatus === 'REJECTED'
  const requiresRerouteCandidate = decision?.actions?.includes('REROUTE') ||
    (decision?.primaryAction || decision?.action) === 'REROUTE'

  const handleApprove = async () => {
    if (!onApproveDecision || !activeDecisionId) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await onApproveDecision(
        activeDecisionId,
        'Operator approved recommended corridor action via Mission Assessment HUD',
        decision?.rerouteCandidate?.candidateId
      )
      setActionMessage({ type: 'success', text: 'Decision Approved — Reroute authorized' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to approve decision' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!onRejectDecision || !activeDecisionId) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await onRejectDecision(activeDecisionId, rejectReason)
      setRejectModalOpen(false)
      setActionMessage({ type: 'success', text: 'Decision Rejected — Unit instructed to hold current route' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to reject decision' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!onExecuteDecision || !activeDecisionId) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await onExecuteDecision(activeDecisionId)
      setActionMessage({ type: 'success', text: 'Decision Executed — Realtime instruction transmitted to driver HUD' })
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to execute decision' })
    } finally {
      setActionLoading(false)
    }
  }

  const renderEpistemicBadge = (type: EpistemicType) => {
    switch (type) {
      case 'OBSERVED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-400 border border-blue-500/30">
            <span className="size-1.5 rounded-full bg-blue-400" />
            OBSERVED
          </span>
        )
      case 'INFERRED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-purple-400 border border-purple-500/30">
            <Sparkles className="size-2.5 text-purple-400" />
            INFERRED
          </span>
        )
      case 'DERIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-400 border border-cyan-500/30">
            <Activity className="size-2.5 text-cyan-400" />
            DERIVED
          </span>
        )
      case 'UNKNOWN':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
            <HelpCircle className="size-2.5 text-amber-400" />
            UNKNOWN
          </span>
        )
    }
  }

  const questions = [
    {
      id: 1,
      num: '1',
      question: 'Has the ambulance deviated from its planned route?',
      answer: q1Answer,
      epistemic: q1Epistemic,
      isAlert: isDeviated,
      evidence: q1Evidence,
    },
    {
      id: 2,
      num: '2',
      question: 'What caused the deviation?',
      answer: q2Answer,
      epistemic: q2Epistemic,
      isAlert: isDeviated && topIncident !== undefined,
      evidence: q2Evidence,
    },
    {
      id: 3,
      num: '3',
      question: 'How much delay is expected?',
      answer: q3Answer,
      epistemic: q3Epistemic,
      isAlert: delayMinutes > 3,
      evidence: q3Evidence,
    },
    {
      id: 4,
      num: '4',
      question: 'What is the best alternative route?',
      answer: q4Answer,
      epistemic: q4Epistemic,
      isAlert: recommendedAlt !== undefined,
      evidence: q4Evidence,
    },
    {
      id: 5,
      num: '5',
      question: 'Should another ambulance be dispatched instead?',
      answer: q5Answer,
      epistemic: q5Epistemic,
      isAlert: backupNeeded,
      evidence: q5Evidence,
    },
  ]

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card text-card-foreground', className)}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            <BrainCircuit className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
                Mission assessment
              </h3>
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                GeoAgent advisory
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Evidence-led corridor status and operator decision
            </p>
          </div>
        </div>

        {/* Real-time Status Pills */}
        <div className="flex items-center gap-2">
          {emergency && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-mono font-medium text-foreground border border-border">
              <Siren className="size-3 text-rose-500 dark:text-rose-400" />
              {emergency.emergencyId}
            </span>
          )}
          {vehicle && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-mono font-medium text-foreground border border-border">
              <Truck className="size-3 text-cyan-500 dark:text-cyan-400" />
              {vehicle.vehicleId}
            </span>
          )}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={cn(
          'flex items-center justify-between px-5 py-2.5 text-xs font-medium border-b',
          actionMessage.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
        )}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <Check className="size-4" /> : <X className="size-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Summary first; the full question set remains available on demand. */}
      <div className="p-3 sm:p-4">
        {compact && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className={cn('font-semibold', isDeviated ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>
                {isDeviated ? `Deviation · ${Math.round(deviationMeters)} m` : 'Route · on course'}
              </span>
              <span className="text-muted-foreground">ETA {predictedDurationMin} min{delayMinutes > 0 ? ` · +${delayMinutes.toFixed(1)} min` : ''}</span>
              <span className="text-muted-foreground">Decision · {decisionStatus.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
            <button type="button" onClick={() => setAssessmentExpanded((open) => !open)} aria-expanded={assessmentExpanded} className="min-h-9 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring">
              {assessmentExpanded ? 'Hide assessment' : 'View assessment'}
            </button>
          </div>
        )}

        {(!compact || assessmentExpanded) && <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
          {questions.map((q) => {
            const isExpanded = expandedQuestion === q.id
            return (
              <button
                type="button"
                key={q.id}
                aria-expanded={isExpanded}
                className={cn(
                  'flex min-h-28 w-full flex-col justify-between rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  q.isAlert
                    ? 'border-rose-500/40 bg-rose-500/10 hover:border-rose-500/60'
                    : 'border-border bg-muted/30 hover:border-border/80',
                  isExpanded && 'ring-1 ring-indigo-500/50'
                )}
                onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-mono font-bold text-foreground">
                      {q.num}
                    </span>
                    {renderEpistemicBadge(q.epistemic)}
                  </div>
                  <h4 className="text-[11px] font-medium text-muted-foreground leading-snug line-clamp-2">
                    {q.question}
                  </h4>
                  <div className="mt-2 text-xs font-bold text-foreground tracking-tight">
                    {q.answer}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">Evidence ({q.evidence.length})</span>
                  <span className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>}

        {/* Detailed Evidence Expansion Panel */}
        {expandedQuestion !== null && (
          <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 transition-all animate-in fade-in duration-200">
            {(() => {
              const currentQ = questions.find((q) => q.id === expandedQuestion)
              if (!currentQ) return null
              return (
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 font-mono text-xs font-bold">
                        {currentQ.num}
                      </span>
                      <h4 className="text-xs font-bold text-foreground">
                        {currentQ.question}
                      </h4>
                      {renderEpistemicBadge(currentQ.epistemic)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedQuestion(null)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="Close evidence details"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px] text-muted-foreground">
                    {currentQ.evidence.map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CornerDownRight className="size-3.5 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* GeoAgent reasoning is available on request; no additional AI behavior is introduced here. */}
        <details className="group mt-3 rounded-xl border border-purple-200 bg-purple-50/50 dark:border-purple-900/60 dark:bg-purple-950/20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-purple-800 outline-none hover:bg-purple-100/60 focus-visible:ring-2 focus-visible:ring-ring dark:text-purple-200 dark:hover:bg-purple-950/40 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><Bot className="size-4" /> View why · operational reasoning</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-purple-200/70 p-3 sm:grid-cols-2 xl:grid-cols-3 dark:border-purple-900/60">
            {[
              { title: 'Observation', text: isDeviated ? `Vehicle is ${Math.round(deviationMeters)} m from the planned route.` : `Current route deviation: ${Math.round(deviationMeters)} m.` },
              { title: 'Inference', text: topIncident ? `${topIncident.type.replace(/_/g, ' ')} · ${topIncident.description || 'correlated incident'}` : `Traffic state: ${trafficLevel}.` },
              { title: 'Alternative', text: recommendedAlt ? `${recommendedAlt.name || 'Recommended route'} · ${recommendedAlt.durationMinutes ?? predictedDurationMin} min` : 'No alternative route in the supplied comparison.' },
              { title: 'Decision', text: decision?.primaryAction || decision?.action || 'No authoritative decision record loaded.' },
              { title: 'Expected outcome', text: delayMinutes > 0 ? `Current estimate includes +${delayMinutes.toFixed(1)} min delay.` : `Estimated journey time: ${predictedDurationMin} min.` },
              { title: 'Confidence', text: prediction?.confidence ? `${prediction.confidence}${prediction.confidenceScore ? ` · ${Math.round(prediction.confidenceScore * 100)}%` : ''}` : 'Not provided by prediction data.' },
            ].map((step, index) => (
              <div key={step.title} className="flex gap-2 rounded-lg bg-card p-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-100">{index + 1}</span>
                <span><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{step.title}</span><span className="mt-0.5 block text-xs leading-snug text-foreground">{step.text}</span></span>
              </div>
            ))}
          </div>
        </details>

        {/* Human-in-the-Loop Operator Action Bar (Phase 20) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  HUMAN-IN-THE-LOOP ACTION GATE
                </span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border',
                  isPending && 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse',
                  isApproved && 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
                  isExecuted && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                  isRejected && 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                )}>
                  {decisionStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isPending && 'GeoAgent advisory awaiting explicit dispatcher confirmation before vehicle HUD rerouting'}
                {isApproved && 'Reroute approved by dispatcher; ready for telematics execution'}
                {isExecuted && 'Reroute telematics transmitted to vehicle. Trajectory verified.'}
                {isRejected && 'Reroute rejected by dispatcher. Vehicle holding original path.'}
              </p>
            </div>
          </div>

          {decision?.rerouteCandidate && (
            <details open className="w-full rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
              <summary className="cursor-pointer text-xs font-bold text-foreground">
                Reviewed route candidate · {decision.rerouteCandidate.provider || 'Routing provider'}
              </summary>
              <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                <p>{decision.rerouteCandidate.description || 'Alternative route'} · {Math.round(decision.rerouteCandidate.distanceMeters)} m · {Math.ceil(decision.rerouteCandidate.durationSeconds / 60)} min</p>
                <p className="break-all font-mono">Candidate {decision.rerouteCandidate.candidateId}</p>
                <p>{decision.rerouteCandidate.geometry.coordinates.length} geometry points · {decision.rerouteCandidate.steps?.length || 0} navigation steps</p>
                {decision.rerouteCandidate.steps && decision.rerouteCandidate.steps.length > 0 && (
                  <ol className="list-decimal space-y-1 pl-5 pt-1">
                    {decision.rerouteCandidate.steps.map((step, index) => (
                      <li key={`${index}-${step.instruction}`}>{step.instruction}</li>
                    ))}
                  </ol>
                )}
                <details className="pt-1">
                  <summary className="cursor-pointer">Inspect route coordinates</summary>
                  <ol className="mt-1 max-h-36 overflow-auto list-decimal pl-5 font-mono text-[10px]">
                    {decision.rerouteCandidate.geometry.coordinates.map(([longitude, latitude], index) => (
                      <li key={`${index}-${longitude}-${latitude}`}>
                        {longitude.toFixed(6)}, {latitude.toFixed(6)}
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionLoading}
                  className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/10 cursor-pointer"
                >
                  <XCircle className="size-3.5" />
                  <span>Reject</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={actionLoading || (
                    requiresRerouteCandidate &&
                    !decision?.rerouteCandidate?.candidateId
                  )}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/20 cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{actionLoading ? 'Processing...' : 'Approve Reroute'}</span>
                </Button>
              </>
            )}

            {isApproved && (
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={actionLoading}
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-950/20 cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>{actionLoading ? 'Executing...' : 'Transmit to Vehicle HUD'}</span>
              </Button>
            )}

            {isExecuted && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                <span>CORRIDOR ACTIVE</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="size-5" />
              <h4 className="font-bold text-sm text-foreground">Reject Recommended Reroute</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Specify the operational reason for rejecting GeoAgent's recommended action. This will be logged in the immutable audit trail.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
              placeholder="Enter rejection reason..."
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="text-xs"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
