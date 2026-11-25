'use client'

/**
 * SwiftCare GeoAgent — Authentic Map Corridor Legend Component
 *
 * Renders true SVG polyline & operational marker swatches matching the exact
 * vector layers drawn on ControlRoomMap, DriverNavigationMap, DiffMap, and RealInteractiveMap:
 * - Solid Blue (#2563eb): Planned / Active Corridor
 * - Dashed Purple (#8b5cf6): GeoAgent Recommended Route
 * - Dashed Slate (#64748b): Secondary Candidate Route
 * - Dotted Orange (#f97316): Actual GPS Trajectory
 * - Red Marker (#ef4444): Road Hazard / Closure + Origin / Scene / Hospital pins
 */

import { ChevronDown, ChevronUp, X } from 'lucide-react'
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
      className="pointer-events-auto absolute bottom-3 left-3 z-[1100] flex max-w-[calc(100%-24px)] flex-col overflow-hidden rounded-xl border border-border/90 bg-card/98 text-xs text-foreground shadow-2xl backdrop-blur-md transition-all"
    >
      {expanded ? (
        <div className="w-80 max-w-[calc(100vw-32px)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/50 px-3 py-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
              Map Corridor Legend
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

          {/* Body */}
          <div className="max-h-[220px] space-y-2.5 overflow-y-auto p-3">
            {/* 1. Planned / Active Route — Solid Blue */}
            <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-2">
              <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden="true" className="shrink-0">
                <line x1="2" y1="7" x2="34" y2="7" stroke="#1e3a8a" strokeWidth="7" strokeLinecap="round" />
                <line x1="2" y1="7" x2="34" y2="7" stroke="#2563eb" strokeWidth="4.5" strokeLinecap="round" />
                <polygon points="17,3 24,7 17,11" fill="#ffffff" />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[11px] font-bold text-blue-700 dark:text-blue-300">
                    Planned Corridor
                  </span>
                  <span className="shrink-0 rounded bg-blue-600 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                    Solid Blue
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  Primary planned road corridor from dispatch to hospital.
                </p>
              </div>
            </div>

            {/* 2. GeoAgent Recommended Route — Dashed Purple */}
            <div className="flex items-center gap-3 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-2">
              <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden="true" className="shrink-0">
                <line x1="2" y1="7" x2="34" y2="7" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" opacity="0.9" />
                <line
                  x1="2"
                  y1="7"
                  x2="34"
                  y2="7"
                  stroke="#8b5cf6"
                  strokeWidth="4"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[11px] font-bold text-purple-700 dark:text-purple-300">
                    Recommended Bypass
                  </span>
                  <span className="shrink-0 rounded bg-purple-600 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                    Dashed Purple
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  Routing agent detour bypassing congestion or road closures.
                </p>
              </div>
            </div>

            {/* 3. Secondary / Superseded & GPS Breadcrumbs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5">
                <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true" className="shrink-0">
                  <line
                    x1="2"
                    y1="5"
                    x2="24"
                    y2="5"
                    stroke={ROUTE_SEMANTICS.gpsTrajectory.color}
                    strokeWidth="3"
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="truncate text-[10px] font-semibold text-foreground">GPS Trail</span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5">
                <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true" className="shrink-0">
                  <line
                    x1="2"
                    y1="5"
                    x2="24"
                    y2="5"
                    stroke={ROUTE_SEMANTICS.otherAlternative.color}
                    strokeWidth="3"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="truncate text-[10px] font-semibold text-foreground">Alt Candidate</span>
              </div>
            </div>

            {/* 4. Operational Markers */}
            <div className="grid grid-cols-2 gap-1.5 border-t border-border/70 pt-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                  🚑
                </span>
                <span className="truncate text-muted-foreground">Ambulance Unit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[9px] text-white">
                  ⚠️
                </span>
                <span className="truncate text-muted-foreground">Road Hazard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white">
                  🚨
                </span>
                <span className="truncate text-muted-foreground">Emergency Scene</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white">
                  🏥
                </span>
                <span className="truncate text-muted-foreground">Receiving Hospital</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Always-visible compact visual swatch bar — immediately readable on first load */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label="Toggle map corridor legend details"
        className="flex min-h-9 items-center gap-3 px-3 py-1.5 text-left transition-colors hover:bg-muted/60"
      >
        {/* Solid Blue Planned Swatch */}
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" className="shrink-0">
            <line x1="2" y1="4" x2="20" y2="4" stroke="#1e3a8a" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="2" y1="4" x2="20" y2="4" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-bold text-foreground">Planned</span>
        </span>

        {/* Dashed Purple Recommended Swatch */}
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" className="shrink-0">
            <line
              x1="2"
              y1="4"
              x2="20"
              y2="4"
              stroke="#8b5cf6"
              strokeWidth="3.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Recommended</span>
        </span>

        {/* GPS & Hazard compact indicators on sm+ */}
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true" className="shrink-0">
            <line
              x1="2"
              y1="4"
              x2="14"
              y2="4"
              stroke="#f97316"
              strokeWidth="3"
              strokeDasharray="2 3"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] font-medium text-muted-foreground">GPS</span>
        </span>

        <span className="hidden items-center gap-1 sm:inline-flex">
          <span className="size-2 rounded-full bg-rose-500" />
          <span className="text-[10px] font-medium text-muted-foreground">Hazard</span>
        </span>

        <span className="ml-1 inline-flex items-center gap-0.5 border-l border-border pl-2 text-[10px] font-semibold text-muted-foreground">
          <span>{expanded ? 'Hide' : 'Legend'}</span>
          {expanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </span>
      </button>
    </div>
  )
}
