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

import { ChevronUp, Layers, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROUTE_SEMANTICS } from '@/lib/routing-constants'

export function MapLegend() {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [expanded])

  return (
    <div
      ref={containerRef}
      style={{ zIndex: 2500 }}
      className="pointer-events-auto absolute bottom-3 left-3 flex max-h-[calc(100%-24px)] w-72 max-w-[calc(100%-24px)] flex-col overflow-hidden rounded-xl border border-border bg-card/98 text-xs text-foreground shadow-xl backdrop-blur-md transition-all"
    >
      {expanded ? (
        <>
          {/* Top close strip so users can close from either top or bottom */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Route Types (Strict Meaning)
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close map legend"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span>Close</span>
              <X className="size-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 max-h-[220px] border-b border-border/70">
            <div className="space-y-2">
              {/* 1. ACTIVE / PLANNED CORRIDOR (BLUE) */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-2">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
                  🔵
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                      {ROUTE_SEMANTICS.activeCorridor.label}
                    </span>
                    <span className="rounded bg-blue-600 px-1.5 py-0.2 font-mono text-[9px] font-black uppercase text-white">
                      Solid Blue
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-600 dark:text-slate-300">
                    Primary operational route the vehicle is currently/planned to follow to destination.
                  </p>
                </div>
              </div>

              {/* 2. RECOMMENDED ALTERNATIVE (PURPLE) */}
              <div className="flex items-start gap-2.5 rounded-xl border-2 border-purple-500/40 bg-purple-500/10 p-2 shadow-xs">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-sm">
                  🟣
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                      {ROUTE_SEMANTICS.recommendedAlternative.label}
                    </span>
                    <span className="rounded bg-purple-600 px-1.5 py-0.2 font-mono text-[9px] font-black uppercase text-white">
                      Dashed Purple
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-600 dark:text-slate-300">
                    AI/routing suggested road-following detour around congestion or road hazards.
                  </p>
                </div>
              </div>

              {/* 3. OTHER ALTERNATIVE (GRAY) */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-300/60 bg-slate-100 px-2 py-1.5 dark:border-slate-700/60 dark:bg-slate-800/40">
                <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-[9px] text-white">
                  ⚪
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-medium text-slate-700 dark:text-slate-300">
                    {ROUTE_SEMANTICS.otherAlternative.label}
                  </span>
                  <span className="block text-[9px] leading-tight text-slate-500 dark:text-slate-400">
                    Secondary possible detour candidate evaluated by routing engine.
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry & Hazards */}
            <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
              <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hazards & Telemetry Fixes
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5">
                  <span className="size-2 shrink-0 rounded-full bg-red-500" />
                  <span className="truncate font-bold text-rose-700 dark:text-rose-400">
                    🔴 Road Hazard / Blockage
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 p-1.5">
                  <span className="size-2 shrink-0 rounded-full bg-orange-500" />
                  <span className="truncate font-bold text-orange-700 dark:text-orange-400">
                    🟠 Actual GPS Trajectory
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Bottom Anchor Toggle / Close Bar — always pinned at bottom-left */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex min-h-10 w-full shrink-0 items-center justify-between gap-2 bg-card px-3 py-2 font-semibold transition-colors hover:bg-muted/60"
        aria-expanded={expanded}
        aria-label="Toggle map operational legend"
      >
        <div className="flex items-center gap-2 text-foreground">
          <span className="flex size-5 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
            <Layers className="size-3" />
          </span>
          <span className="text-[12px] font-extrabold uppercase tracking-tight">
            Map Corridor Legend
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {expanded ? (
            <>
              <span>Close</span>
              <X className="size-3.5" />
            </>
          ) : (
            <>
              <span>Expand</span>
              <ChevronUp className="size-3.5" />
            </>
          )}
        </div>
      </button>
    </div>
  )
}
