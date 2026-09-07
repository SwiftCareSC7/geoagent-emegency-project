'use client'

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  FileSearch,
  Gauge,
  HelpCircle,
  Info,
  Navigation,
  Scale,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import type { DeviationStatus, SituationAnalysis, StabilityStatus, TrafficLevel } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface DeviationAnalysisPanelProps {
  analysis?: SituationAnalysis | null
  loading?: boolean
  error?: string | null
}

const deviationStatusMeta: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2; description: string }
> = {
  ON_ROUTE: {
    label: 'On Planned Route',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
    description: 'Vehicle trajectory conforms precisely within acceptable corridor cross-track tolerance (< 50m).',
  },
  WARNING: {
    label: 'Corridor Warning',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: AlertTriangle,
    description: 'Cross-track distance exceeds 50m or bearing divergence indicates potential corridor departure.',
  },
  DEVIATED: {
    label: 'Route Deviation Detected',
    color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    icon: AlertCircle,
    description: 'Vehicle has sustained departure from expected route (> 50m sustained or diverging heading).',
  },
  CRITICAL_DEVIATION: {
    label: 'Critical Route Deviation',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: AlertCircle,
    description: 'Vehicle is > 100m away from planned emergency route. Urgent corridor intervention recommended.',
  },
  UNKNOWN: {
    label: 'Deviation Unknown / Insufficient Data',
    color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    icon: HelpCircle,
    description: 'Insufficient GPS telemetry points or missing active route geometry to compute spatial deviation.',
  },
}

const trafficLevelMeta: Record<
  string,
  { label: string; color: string }
> = {
  FREE: { label: 'Free Flow (Green)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  LIGHT: { label: 'Light Traffic', color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' },
  MODERATE: { label: 'Moderate Congestion', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  HEAVY: { label: 'Heavy Congestion', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  SEVERE: { label: 'Severe Gridlock', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  UNKNOWN: { label: 'Traffic Unknown', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
}

const evidenceExplanations: Record<string, { label: string; desc: string }> = {
  ROUTE_DEVIATION: {
    label: 'Route Deviation Confirmed',
    desc: 'Vehicle has exited the planned route corridor boundary.',
  },
  HEAVY_TRAFFIC: {
    label: 'Heavy Corridor Traffic',
    desc: 'Congestion ratio along segment exceeds 0.50 threshold.',
  },
  LOW_VEHICLE_SPEED: {
    label: 'Abnormal Low Speed',
    desc: 'Vehicle speed dropped below 15 km/h unexpectedly.',
  },
  GPS_UNCERTAINTY: {
    label: 'GPS Telemetry Jitter',
    desc: 'Recent GPS fixes exhibit high spatial instability.',
  },
  SIGNIFICANT_DELAY: {
    label: 'Significant ETA Delay',
    desc: 'Delay exceeded 5 minutes past planned arrival window.',
  },
  ACCIDENT_NEAR_ROUTE: {
    label: 'Corridor Road Hazard',
    desc: 'Reported accident or blockage intersects emergency path.',
  },
}

export function DeviationAnalysisPanel({ analysis, loading = false, error = null }: DeviationAnalysisPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm animate-pulse">
        <div className="h-6 w-56 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 text-rose-500 font-semibold mb-2">
          <AlertCircle className="h-5 w-5" />
          <span>Situation Analysis Failed</span>
        </div>
        <p className="text-xs text-zinc-500">{error}</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold mb-3">
          <FileSearch className="h-5 w-5 text-zinc-400" />
          <span>Corridor Deviation & Traffic Intelligence</span>
        </div>
        <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Situation analysis is not yet computed. Requires an active route and at least 1 telemetry fix.
          </p>
        </div>
      </div>
    )
  }

  const dev = analysis.deviation
  const traffic = analysis.traffic
  const eta = analysis.eta
  const delay = analysis.delay
  const devStatus = dev?.status || 'UNKNOWN'
  const statusMeta = deviationStatusMeta[devStatus] || deviationStatusMeta.UNKNOWN
  const StatusIcon = statusMeta.icon

  const trafficMeta = trafficLevelMeta[traffic?.level || 'UNKNOWN'] || trafficLevelMeta.UNKNOWN

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">
              Corridor Deviation & Traffic Intelligence
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time deterministic spatial cross-track error, bearing divergence, and congestion assessment
          </p>
        </div>

        {/* Primary Deviation Status Pill */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
              statusMeta.color,
            )}
          >
            <StatusIcon className="h-4 w-4" />
            <span>{statusMeta.label}</span>
          </span>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="my-4 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
        <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <p>{statusMeta.description}</p>
      </div>

      {/* Spatial Deviation Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Cross-track Distance */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <Scale className="h-3.5 w-3.5 text-rose-500" />
            <span>Cross-Track Error</span>
          </div>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {dev?.distanceFromRouteMeters !== undefined
              ? `${dev.distanceFromRouteMeters.toFixed(1)} m`
              : 'N/A'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Tolerance: 50m warn / 100m crit
          </span>
        </div>

        {/* Bearing Divergence */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <Compass className="h-3.5 w-3.5 text-amber-500" />
            <span>Bearing Divergence</span>
          </div>
          <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {dev?.bearingDifferenceDegrees !== null && dev?.bearingDifferenceDegrees !== undefined
              ? `${dev.bearingDifferenceDegrees.toFixed(1)}°`
              : '0.0°'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Heading vs corridor angle
          </span>
        </div>

        {/* GPS Stability / Jitter */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
            <span>GPS Stability</span>
          </div>
          <p className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
            {dev?.gpsStability || 'STABLE'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Confidence: {dev?.confidence || 'HIGH'}
          </span>
        </div>

        {/* Traffic Congestion Level */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            <Gauge className="h-3.5 w-3.5 text-purple-500" />
            <span>Corridor Traffic</span>
          </div>
          <p className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
            {trafficMeta.label}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            Speed: {traffic?.speedKmh?.toFixed(0) || 'N/A'} km/h (ratio: {traffic?.congestionRatio?.toFixed(2) || '0.00'})
          </span>
        </div>
      </div>

      {/* ETA & Delay Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        {/* Planned vs Current ETA */}
        <div className="p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>ETA & Schedule Progress</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">Planned Duration:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {eta?.originalMinutes ?? 0} mins
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono mt-1">
            <span className="text-zinc-500">Current Adjusted ETA:</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400">
              {eta?.currentMinutes !== null && eta?.currentMinutes !== undefined
                ? `${eta.currentMinutes} mins`
                : 'Evaluating...'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono mt-1">
            <span className="text-zinc-500">Remaining Distance:</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {analysis.progress?.remainingDistanceMeters
                ? `${(analysis.progress.remainingDistanceMeters / 1000).toFixed(2)} km`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Calculated Delay Impact */}
        <div className="p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Calculated Corridor Delay</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {delay?.delayMinutes !== undefined && delay.delayMinutes > 0
                ? `+${delay.delayMinutes}`
                : `${delay?.delayMinutes ?? 0}`}
            </span>
            <span className="text-xs text-zinc-500">minutes calculated delay</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {delay?.delayMinutes && delay.delayMinutes > 0
              ? 'Delay compounded by traffic friction along active response corridor.'
              : 'Emergency unit is operating on or ahead of schedule.'}
          </p>
        </div>
      </div>

      {/* Structured Evidence Tags */}
      {analysis.evidence && analysis.evidence.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
            Structured Causal Evidence Identified by Analysis Engine
          </span>
          <div className="flex flex-wrap gap-2">
            {analysis.evidence.map((ev, idx) => {
              const meta = evidenceExplanations[ev] || {
                label: ev.replace(/_/g, ' '),
                desc: 'Identified by situation analysis engine',
              }
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-800/70 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                    {meta.label}
                  </span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {meta.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
