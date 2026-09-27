'use client'

import React, { useRef, useEffect } from 'react'
import {
  Clock,
  MapPin,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Compass,
  Sparkles,
  ShieldCheck,
  Siren,
  Hospital,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SCENARIO_MILESTONES,
  type ScenarioMilestone,
  formatSimClock,
} from '@/lib/simulation/diff-scenario-engine'

interface DiffTimelineProps {
  currentTimestampSec: number
  currentMilestoneIndex: number
  onSeek: (seconds: number) => void
  onFocusMilestone?: (milestone: ScenarioMilestone) => void
}

function getMilestoneIcon(category: ScenarioMilestone['category'], id: string) {
  switch (id) {
    case 'm1':
      return <Siren className="size-3 text-blue-500" />
    case 'm2':
      return <Compass className="size-3 text-emerald-500" />
    case 'm3':
      return <Navigation className="size-3 text-blue-500" />
    case 'm5':
    case 'm6':
      return <AlertTriangle className="size-3 text-red-500" />
    case 'm7':
    case 'm8':
      return <Sparkles className="size-3 text-purple-500" />
    case 'm9':
    case 'm10':
      return <ShieldCheck className="size-3 text-emerald-500" />
    case 'm12':
    case 'm13':
      return <Hospital className="size-3 text-emerald-500" />
    default:
      return <Clock className="size-3 text-muted-foreground" />
  }
}

export function DiffTimeline({
  currentTimestampSec,
  currentMilestoneIndex,
  onSeek,
  onFocusMilestone,
}: DiffTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeNodeRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll active milestone into view smoothly
  useEffect(() => {
    if (activeNodeRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const node = activeNodeRef.current
      const containerWidth = container.offsetWidth
      const nodeLeft = node.offsetLeft
      const nodeWidth = node.offsetWidth

      container.scrollTo({
        left: nodeLeft - containerWidth / 2 + nodeWidth / 2,
        behavior: 'smooth',
      })
    }
  }, [currentMilestoneIndex])

  const totalDurationSec = 430
  const progressPercent = Math.min(100, Math.max(0, (currentTimestampSec / totalDurationSec) * 100))

  return (
    <footer
      aria-label="Synchronized Scenario Timeline"
      className="relative z-20 flex flex-col gap-2 border-t border-border/70 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-md transition-colors"
    >
      {/* Top scrubber slider & current time */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <Clock className="size-3.5 text-muted-foreground" />
          <span>{formatSimClock(currentTimestampSec)}</span>
          <span className="text-[10px] text-muted-foreground">/ 07:10</span>
        </div>

        {/* Range Scrubber */}
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={totalDurationSec}
            step={1}
            value={currentTimestampSec}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Simulation Time Scrubber"
          />

          {/* Progress fill */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-1.5 rounded-lg bg-blue-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-[10px] font-mono text-muted-foreground">
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Horizontal Milestone Nodes Container */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth"
      >
        {SCENARIO_MILESTONES.map((milestone, idx) => {
          const isPassed = currentTimestampSec >= milestone.timestampSec
          const isActive = currentMilestoneIndex === idx

          return (
            <button
              key={milestone.id}
              ref={isActive ? activeNodeRef : null}
              type="button"
              onClick={() => {
                onSeek(milestone.timestampSec)
                if (onFocusMilestone) onFocusMilestone(milestone)
              }}
              className={cn(
                'group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left transition-all',
                isActive
                  ? 'border-blue-500 bg-blue-500/15 shadow-xs scale-102 ring-1 ring-blue-500/40'
                  : isPassed
                  ? 'border-border/80 bg-muted/40 hover:bg-muted/70 text-foreground'
                  : 'border-border/40 bg-card/40 opacity-65 hover:opacity-100 text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'flex size-5 items-center justify-center rounded-full',
                  isActive
                    ? 'bg-blue-500/20 text-blue-500'
                    : isPassed
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/40 text-muted-foreground'
                )}
              >
                {getMilestoneIcon(milestone.category, milestone.id)}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] font-semibold text-muted-foreground">
                    {milestone.timeLabel}
                  </span>
                  {isActive && (
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-blue-500" />
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-semibold leading-tight whitespace-nowrap',
                    isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-foreground'
                  )}
                >
                  {milestone.shortTitle}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </footer>
  )
}
