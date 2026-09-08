'use client'

/**
 * SwiftCare GeoAgent — Accessible Map Legend Component
 *
 * Provides a collapsible, accessible legend matching actual rendered layers.
 */

import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'

export function MapLegend() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="absolute bottom-3 left-3 z-[1000] max-w-xs rounded-xl border border-slate-700/60 bg-slate-900/90 text-slate-200 shadow-xl backdrop-blur-md text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 font-bold hover:text-white transition-colors"
        aria-expanded={expanded}
        aria-label="Toggle map legend"
      >
        <div className="flex items-center gap-1.5 text-slate-300">
          <Info className="size-3.5 text-cyan-400" />
          <span>Operational Legend</span>
        </div>
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>

      {expanded ? (
        <div className="border-t border-slate-800 px-3 py-2.5 space-y-2.5 text-[11px]">
          {/* Fleet Vehicles */}
          <div>
            <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1">
              Fleet Units
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-3.5 items-center justify-center rounded-full border border-emerald-400 bg-emerald-950 text-[10px]">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                </span>
                <span>Live Telemetry (&lt;15s)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-3.5 items-center justify-center rounded-full border border-amber-400 bg-amber-950 text-[10px]">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                </span>
                <span>Stale Telemetry (15s–60s)</span>
              </div>
            </div>
          </div>

          {/* Routes */}
          <div>
            <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1">
              Corridor Routes
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-1 w-4 rounded-full bg-emerald-500" />
                <span>Active / Selected Route</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-4 rounded-full bg-blue-500" />
                <span>Planned Route</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-4 rounded-full bg-amber-500 border-t border-dashed border-amber-300" />
                <span>Alternative Candidate</span>
              </div>
            </div>
          </div>

          {/* Incidents & Deviations */}
          <div>
            <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1">
              Hazards & Deviations
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px]">⚠️</span>
                <span className="text-rose-400">Critical / High Road Hazard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full border border-rose-500 border-dashed bg-rose-500/20" />
                <span className="text-rose-400">Route Deviation Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-3 bg-cyan-400 border-t border-dashed border-cyan-300" />
                <span className="text-cyan-300">Actual GPS Breadcrumb Trail</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
