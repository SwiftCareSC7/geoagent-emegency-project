'use client'

/**
 * SwiftCare GeoAgent — Prominent Accessible Map Legend Component
 *
 * Provides a high-contrast, visually prominent legend explaining:
 * 🔵 ACTIVE / PLANNED CORRIDOR (Blue)
 * 🟣 RECOMMENDED ALTERNATIVE DETOUR (Purple)
 * ⚪ OTHER ALTERNATIVE ROUTES (Gray)
 * 🔴 ROAD HAZARD / INCIDENT (Red)
 * 🟠 ACTUAL GPS TRAJECTORY (Orange)
 */

import { ChevronDown, ChevronUp, Layers, Info } from 'lucide-react'
import { useState } from 'react'
import { ROUTE_SEMANTICS } from '@/lib/routing-constants'

export function MapLegend() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-72 max-w-[calc(100vw-24px)] rounded-xl border border-border bg-card/95 text-foreground shadow-md backdrop-blur-md text-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 font-semibold hover:bg-muted/60 transition-colors"
        aria-expanded={expanded}
        aria-label="Toggle map operational legend"
      >
        <div className="flex items-center gap-2 text-foreground">
          <span className="flex size-5 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
            <Layers className="size-3" />
          </span>
          <span className="font-extrabold tracking-tight text-[12px] uppercase">
            Map Corridor Legend
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <span>{expanded ? 'Collapse' : 'Expand'}</span>
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </div>
      </button>

      {expanded ? (
        <div className="p-3.5 space-y-3 max-h-[360px] overflow-y-auto">
          {/* Primary Route Types */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>Route Types (Strict Meaning)</span>
              <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">2 Core Types</span>
            </div>

            <div className="space-y-2">
              {/* 1. ACTIVE / PLANNED CORRIDOR (BLUE) */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] shadow-sm font-bold">
                  🔵
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-blue-700 dark:text-blue-300 text-[11px]">
                      {ROUTE_SEMANTICS.activeCorridor.label}
                    </span>
                    <span className="rounded bg-blue-600 text-white font-mono text-[9px] font-black px-1.5 py-0.2 uppercase">
                      Solid Blue
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    Primary operational route the vehicle is currently/planned to follow to destination.
                  </p>
                </div>
              </div>

              {/* 2. RECOMMENDED ALTERNATIVE (PURPLE) */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-purple-500/10 border-2 border-purple-500/40 shadow-xs">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] shadow-sm font-bold">
                  🟣
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">
                      {ROUTE_SEMANTICS.recommendedAlternative.label}
                    </span>
                    <span className="rounded bg-purple-600 text-white font-mono text-[9px] font-black px-1.5 py-0.2 uppercase">
                      Dashed Purple
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    AI/routing suggested road-following detour around congestion or road hazards.
                  </p>
                </div>
              </div>

              {/* 3. OTHER ALTERNATIVE (GRAY) */}
              <div className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-300/60 dark:border-slate-700/60">
                <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white text-[9px]">
                  ⚪
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[10px] block">
                    {ROUTE_SEMANTICS.otherAlternative.label}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block leading-tight">
                    Secondary possible detour candidate evaluated by routing engine.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry & Hazards */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Hazards & Telemetry Fixes
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <span className="size-2 rounded-full bg-red-500 shrink-0" />
                <span className="font-bold text-rose-700 dark:text-rose-400 truncate">
                  🔴 Road Hazard / Blockage
                </span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span className="size-2 rounded-full bg-orange-500 shrink-0" />
                <span className="font-bold text-orange-700 dark:text-orange-400 truncate">
                  🟠 Actual GPS Trajectory
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
