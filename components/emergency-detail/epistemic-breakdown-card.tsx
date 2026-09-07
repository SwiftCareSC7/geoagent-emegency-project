'use client'

import {
  Brain,
  CheckCircle,
  Eye,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import type { EpistemicBreakdown } from '@/lib/api/types'

interface EpistemicBreakdownCardProps {
  breakdown?: EpistemicBreakdown | null
  executionTimeMs?: number
  loading?: boolean
}

export function EpistemicBreakdownCard({
  breakdown,
  executionTimeMs,
  loading = false,
}: EpistemicBreakdownCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm animate-pulse">
        <div className="h-6 w-52 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
        </div>
      </div>
    )
  }

  const observed = breakdown?.observed || []
  const inferred = breakdown?.inferred || []
  const unknown = breakdown?.unknown || []

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">
              3-Tier Epistemic Analysis
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Epistemic separation distinguishing physical sensor ground truth from algorithmic inference and unobserved variables
          </p>
        </div>

        {executionTimeMs !== undefined && (
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60">
            Pipeline latency: {executionTimeMs}ms
          </span>
        )}
      </div>

      {/* 3 Column Epistemic Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {/* Tier 1: Observed */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>OBSERVED (Physical Ground Truth)</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
            Hardware GPS sensor coordinates, actual odometer speed, and persisted database geometries.
          </p>

          {observed.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              {observed.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400 italic">No physical telemetry fixes recorded yet.</p>
          )}
        </div>

        {/* Tier 2: Inferred */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>INFERRED (Algorithmic Deductions)</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
            Corridor cross-track calculation, delay projections, and GeoAgent operational recommendations.
          </p>

          {inferred.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              {inferred.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400 italic">No algorithmic inferences generated.</p>
          )}
        </div>

        {/* Tier 3: Unknown */}
        <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/30 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
            <HelpCircle className="h-4 w-4 text-zinc-500" />
            <span>UNKNOWN (Unobserved Variables)</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
            Unobserved operational variables that must not be hallucinated or falsely assumed.
          </p>

          {unknown.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              {unknown.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                  <span className="text-zinc-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400 italic">All critical mission variables are accounted for.</p>
          )}
        </div>
      </div>
    </div>
  )
}
