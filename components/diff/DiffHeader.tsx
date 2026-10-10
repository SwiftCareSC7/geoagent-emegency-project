'use client'

import React from 'react'
import Link from 'next/link'
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  FastForward,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  ChevronLeft,
  Sparkles,
  Sliders,
  ShieldAlert,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  DiffSimulationStatus,
  DiffMissionStatus,
} from '@/lib/simulation/diff-scenario-engine'

interface DiffHeaderProps {
  timeLabel: string
  timestampSec: number
  simulationState: DiffSimulationStatus
  missionState: DiffMissionStatus
  isPlaying: boolean
  speedMultiplier: number
  onTogglePlay: () => void
  onReset: () => void
  onStepForward: (seconds?: number) => void
  onChangeSpeed: (speed: number) => void
  onToggleHud: () => void
  hudOpen: boolean
}

export function DiffHeader({
  timeLabel,
  timestampSec,
  simulationState,
  missionState,
  isPlaying,
  speedMultiplier,
  onTogglePlay,
  onReset,
  onStepForward,
  onChangeSpeed,
  onToggleHud,
  hudOpen,
}: DiffHeaderProps) {
  // Status badge styling
  const simStateColor =
    simulationState === 'COMPLETED' || simulationState === 'ARRIVED'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      : simulationState === 'REROUTED' || simulationState === 'REROUTE_APPROVED'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      : simulationState === 'ACCIDENT_DETECTED' || simulationState === 'ROUTE_RECALCULATING'
      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
      : simulationState === 'REROUTE_PENDING'
      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse'
      : simulationState === 'RUNNING'
      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
      : 'bg-slate-500/20 text-slate-400 border-slate-500/40'

  const missionStateColor =
    missionState === 'PATIENT_REACHED'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : missionState === 'CORRIDOR_BLOCKED'
      ? 'bg-red-500/20 text-red-300 border-red-500/40'
      : missionState === 'REROUTE_APPROVED'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      : 'bg-sky-500/20 text-sky-300 border-sky-500/40'

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur-md transition-colors">
      {/* Left: Branding & Simulation Badge */}
      <div className="flex items-center gap-3">
        <Link
          href="/control-room"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Return to Live Control Room"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Control Room</span>
        </Link>

        <div className="h-4 w-px bg-border/60" />

        {/* What-If Simulation Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-amber-500 dark:text-amber-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-amber-500"></span>
            </span>
            <span>WHAT-IF SIMULATION</span>
          </div>

          <div className="hidden flex-col md:flex">
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Dynamic Corridor Rerouting
            </h1>
            <span className="text-[10px] text-muted-foreground">
              Incident Response & Autonomous Epistemic Resolution
            </span>
          </div>
        </div>
      </div>

      {/* Center: Digital Simulation Clock & Playback Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Simulation Clock Display */}
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1 font-mono shadow-xs">
          <Clock className="size-3.5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-[9px] font-medium tracking-widest text-muted-foreground">
              SIM TIME
            </span>
            <span
              id="simulation-clock"
              data-testid="sim-clock"
              className="font-mono text-base font-bold tracking-tight text-foreground sm:text-lg"
            >
              {timeLabel}
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card p-1 shadow-xs">
          <Button
            size="sm"
            variant={isPlaying ? 'destructive' : 'default'}
            className={cn(
              'h-8 px-2.5 text-xs font-semibold gap-1.5 transition-all',
              !isPlaying && 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Simulation (Space)' : 'Play Simulation (Space)'}
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                <span className="hidden sm:inline">Play</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={onReset}
            title="Reset Simulation (R)"
          >
            <RotateCcw className="size-3.5" />
            <span className="sr-only">Reset</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => onStepForward(10)}
            title="Step Forward +10s (ArrowRight)"
          >
            <StepForward className="size-3.5" />
            <span className="sr-only">Step +10s</span>
          </Button>

          {/* Speed Multiplier Selector */}
          <div className="ml-1 hidden items-center gap-0.5 rounded border border-border/50 bg-muted/50 p-0.5 lg:flex">
            {[0.5, 1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-mono font-medium transition-colors',
                  speedMultiplier === spd
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: State Indicators & Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Simulation State Pill */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
            simStateColor
          )}
        >
          <Activity className="size-3" />
          <span>{simulationState.replace(/_/g, ' ')}</span>
        </div>

        {/* Mission State Pill */}
        <div
          className={cn(
            'hidden md:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
            missionStateColor
          )}
        >
          <Compass className="size-3" />
          <span>{missionState.replace(/_/g, ' ')}</span>
        </div>

        {/* HUD Toggle Button for Mobile / Small Screens */}
        <Button
          size="sm"
          variant={hudOpen ? 'secondary' : 'outline'}
          className="h-8 px-2.5 text-xs gap-1.5"
          onClick={onToggleHud}
          title="Toggle Tactical Situation Overlay"
        >
          <Sliders className="size-3.5" />
          <span className="hidden sm:inline">{hudOpen ? 'Hide HUD' : 'Show HUD'}</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  )
}
