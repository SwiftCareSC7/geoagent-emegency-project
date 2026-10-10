'use client'

import React from 'react'
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  HelpCircle,
  Hospital,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  Route as RouteIcon,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  TrendingDown,
  Truck,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DiffSimulationSnapshot } from '@/lib/simulation/diff-scenario-engine'

interface DiffTacticalHUDProps {
  snapshot: DiffSimulationSnapshot
  onApproveReroute: () => void
  onRejectReroute?: () => void
  onClose?: () => void
  onFocusEntity?: (target: [number, number], zoom: number) => void
}

export function DiffTacticalHUD({
  snapshot,
  onApproveReroute,
  onRejectReroute,
  onClose,
  onFocusEntity,
}: DiffTacticalHUDProps) {
  const {
    timestampSec,
    timeLabel,
    simulationState,
    missionState,
    vehiclePosition,
    vehicleHeading,
    vehicleSpeedKmh,
    distanceTraveledMeters,
    distanceRemainingMeters,
    etaSeconds,
    accidentActive,
    accidentCoords,
    accidentDescription,
    rerouteAvailable,
    rerouteApproved,
    decisionPending,
    geoAgentAnalysis,
    origin,
    destination,
  } = snapshot

  return (
    <aside
      aria-label="Tactical Situation Overlay"
      className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 sm:w-96 max-h-[calc(100vh-8.5rem)] overflow-y-auto"
    >
      {/* Header bar with Mode Notice */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-blue-600/10 text-blue-500">
            <BrainCircuit className="size-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              GeoAgent Tactical HUD
            </h2>
            <p className="text-[10px] text-muted-foreground">Autonomous Rerouting Core</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
            aria-label="Close HUD"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Hypothetical Notice Warning */}
      <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
        <Info className="size-3.5 shrink-0" />
        <span className="leading-tight">
          <strong>HYPOTHETICAL SCENARIO:</strong> Validates autonomous response to unexpected road blockage.
        </span>
      </div>

      {/* Fleet Unit Telemetry Card */}
      <div className="rounded-lg border border-border/70 bg-card/60 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-red-500/15 text-red-500">
              <Siren className="size-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground">AMB-01</span>
              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ALS Unit
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Gauge className="size-3.5 text-blue-500" />
            <span className="font-bold text-foreground">{vehicleSpeedKmh}</span>
            <span className="text-[10px] text-muted-foreground">km/h</span>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border/50 pt-2 text-center">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Distance</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {(distanceRemainingMeters / 1000).toFixed(1)} km
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Heading</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {Math.round(vehicleHeading)}°
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">ETA</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {etaSeconds > 0 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : 'ARRIVED'}
            </span>
          </div>
        </div>
      </div>

      {/* Incident Alert Banner (appears at T >= 120s) */}
      {accidentActive && (
        <div
          className={cn(
            'rounded-lg border p-2.5 shadow-sm transition-all',
            rerouteApproved
              ? 'border-border/60 bg-muted/30 text-muted-foreground opacity-80'
              : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <AlertTriangle className="size-4 shrink-0 text-red-500" />
              <span>ROAD INCIDENT DETECTED</span>
            </div>
            {onFocusEntity && (
              <button
                type="button"
                onClick={() => onFocusEntity([accidentCoords[1], accidentCoords[0]], 16)}
                className="text-[10px] underline hover:text-foreground"
              >
                Locate
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-tight opacity-90">{accidentDescription}</p>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="font-mono font-medium">Location: Old Airport Rd (Domlur)</span>
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-bold uppercase text-red-600 dark:text-red-400">
              Severity: CRITICAL
            </span>
          </div>
        </div>
      )}

      {/* GeoAgent 3-Tier Epistemic Analysis */}
      <div className="rounded-lg border border-border/80 bg-card/60 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-cyan-500" />
            <span className="text-xs font-bold text-foreground">GeoAgent Epistemic Reasoning</span>
          </div>
          <span className="rounded bg-cyan-500/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
            3-TIER
          </span>
        </div>

        {/* 1. Observed Facts */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            <span>🔍 1. OBSERVED FACTS</span>
          </div>
          <ul className="space-y-0.5 text-[10px] text-muted-foreground">
            {geoAgentAnalysis.observed.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1 leading-tight">
                <span className="text-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Inferred Impact */}
        <div className="mt-2 space-y-1 border-t border-border/40 pt-1.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
            <span>⚡ 2. INFERRED IMPACT</span>
          </div>
          <ul className="space-y-0.5 text-[10px] text-muted-foreground">
            {geoAgentAnalysis.inferred.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1 leading-tight">
                <span className="text-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Unknowns & Assumptions */}
        <div className="mt-2 space-y-1 border-t border-border/40 pt-1.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <span>❓ 3. UNKNOWNS & ASSUMPTIONS</span>
          </div>
          <ul className="space-y-0.5 text-[10px] text-muted-foreground">
            {geoAgentAnalysis.unknown.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1 leading-tight">
                <span className="text-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Compact Advisory Summary */}
        <div className="mt-2.5 rounded border border-cyan-500/30 bg-cyan-500/10 p-2 text-[11px] leading-tight text-foreground">
          <span className="font-bold text-cyan-600 dark:text-cyan-400">ADVISORY: </span>
          <span>{geoAgentAnalysis.recommendation}</span>
        </div>
      </div>

      {/* Human-in-the-Loop Operator Action Box */}
      {decisionPending && !rerouteApproved && (
        <div className="rounded-lg border border-purple-500/60 bg-purple-500/10 p-3 shadow-md animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-purple-500 animate-spin" />
            <h3 className="text-xs font-bold text-purple-700 dark:text-purple-300">
              OPERATOR ACTION REQUIRED
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            Active corridor is blocked ahead. Authorize tactical detour via Indiranagar 100ft Road
            bypass to save <strong>6.5 minutes</strong>?
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              onClick={onApproveReroute}
            >
              <CheckCircle2 className="size-3.5" />
              <span>APPROVE REROUTE</span>
            </Button>

            {onRejectReroute && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={onRejectReroute}
              >
                <span>REJECT</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Decision Approved Notification */}
      {rerouteApproved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
          <div className="flex flex-col">
            <span className="font-bold">REROUTE AUTHORIZED BY OPERATOR</span>
            <span className="text-[10px] text-muted-foreground">
              New BLUE corridor active • V2X Green-Wave preemption engaged
            </span>
          </div>
        </div>
      )}

      {/* Route Comparison Metrics */}
      <div className="rounded-lg border border-border/70 bg-card/40 p-2 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Corridor Comparison
        </span>
        <div className="mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-600" />
              <span className="text-[11px] font-medium text-foreground">Primary (Old Airport Rd)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span>7.9 km</span>
              <span className={cn(accidentActive ? 'text-red-500 font-bold' : 'text-muted-foreground')}>
                {accidentActive ? '+14.2m delay' : '8m ETA'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded bg-purple-500/10 px-2 py-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-purple-600" />
              <span className="text-[11px] font-medium text-foreground">Detour (100ft Rd Bypass)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span>9.2 km</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">-6.5m saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strict Route Color Legend */}
      <div className="rounded-lg border border-border/70 bg-card/30 p-2 text-[10px]">
        <div className="flex items-center gap-1 font-bold text-muted-foreground mb-1">
          <Layers className="size-3" />
          <span>MAP LEGEND</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-600" />
            <span className="text-foreground">Active Corridor (Blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-purple-600" />
            <span className="text-foreground">Detour Reroute (Purple)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-500" />
            <span className="text-foreground">Other Alt (Gray)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-orange-500" />
            <span className="text-foreground">GPS Trajectory (Orange)</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="size-2 rounded-full bg-red-500" />
            <span className="text-foreground">Accident / Road Hazard (Red)</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
