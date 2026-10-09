'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  computeSimulationSnapshot,
  SCENARIO_MILESTONES,
  type ScenarioMilestone,
} from '@/lib/simulation/diff-scenario-engine'
import { DiffHeader } from '@/components/diff/DiffHeader'
import { DiffTimeline } from '@/components/diff/DiffTimeline'
import { DiffTacticalHUD } from '@/components/diff/DiffTacticalHUD'
import type { DiffMapHandle } from '@/components/diff/DiffMap'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Dynamically import Leaflet map component with SSR disabled
const DiffMap = dynamic(
  () => import('@/components/diff/DiffMap').then((m) => m.DiffMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/20 font-mono text-xs text-muted-foreground">
        Loading What-If Geospatial Viewport...
      </div>
    ),
  }
)

export default function DiffScenarioPage() {
  const [timestampSec, setTimestampSec] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1)
  const [manualOperatorApproved, setManualOperatorApproved] = useState<boolean>(false)
  const [hudOpen, setHudOpen] = useState<boolean>(true)

  const mapRef = useRef<DiffMapHandle>(null)
  const tickerRef = useRef<NodeJS.Timeout | null>(null)

  // Current simulation snapshot computed on-the-fly
  const snapshot = computeSimulationSnapshot(timestampSec, manualOperatorApproved)

  // Playback ticker loop
  useEffect(() => {
    if (!isPlaying) {
      if (tickerRef.current) clearInterval(tickerRef.current)
      return
    }

    const intervalMs = Math.max(50, 1000 / speedMultiplier)
    const timer = setInterval(() => {
      setTimestampSec((prev) => {
        if (prev >= 430) {
          setIsPlaying(false)
          return 430
        }
        return prev + 1
      })
    }, intervalMs)

    tickerRef.current = timer

    return () => {
      clearInterval(timer)
    }
  }, [isPlaying, speedMultiplier])

  // Playback action handlers
  const handleTogglePlay = useCallback(() => {
    setTimestampSec((prev) => {
      if (prev >= 430) return 0 // restart if at end
      return prev
    })
    setIsPlaying((prev) => !prev)
  }, [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setTimestampSec(0)
    setManualOperatorApproved(false)
    if (mapRef.current) {
      mapRef.current.fitBoundsAll()
    }
  }, [])

  const handleStepForward = useCallback((stepSec = 10) => {
    setTimestampSec((prev) => Math.min(430, prev + stepSec))
  }, [])

  const handleSeek = useCallback((seconds: number) => {
    setTimestampSec(Math.max(0, Math.min(430, seconds)))
  }, [])

  const handleApproveReroute = useCallback(() => {
    setManualOperatorApproved(true)
  }, [])

  const handleFocusMilestone = useCallback((milestone: ScenarioMilestone) => {
    if (mapRef.current && milestone.cameraTarget) {
      mapRef.current.setView(milestone.cameraTarget, milestone.cameraZoom || 15)
    }
  }, [])

  const handleFocusEntity = useCallback((target: [number, number], zoom: number) => {
    if (mapRef.current) {
      mapRef.current.setView(target, zoom)
    }
  }, [])

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        handleTogglePlay()
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        handleReset()
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        handleStepForward(10)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setTimestampSec((prev) => Math.max(0, prev - 10))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTogglePlay, handleReset, handleStepForward])

  return (
    <ProtectedRoute allowedRoles={['CONTROL_ROOM', 'ADMIN']}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased select-none">
        {/* Top Header */}
        <DiffHeader
        timeLabel={snapshot.timeLabel}
        timestampSec={snapshot.timestampSec}
        simulationState={snapshot.simulationState}
        missionState={snapshot.missionState}
        isPlaying={isPlaying}
        speedMultiplier={speedMultiplier}
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onStepForward={handleStepForward}
        onChangeSpeed={setSpeedMultiplier}
        onToggleHud={() => setHudOpen((prev) => !prev)}
        hudOpen={hudOpen}
      />

      {/* Main Map-First Workspace */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Full-Bleed Map Viewport */}
        <DiffMap ref={mapRef} snapshot={snapshot} />

        {/* Floating Tactical Overlay HUD (Desktop / Tablet) */}
        {hudOpen && (
          <div className="absolute right-4 top-4 z-20 transition-all max-sm:inset-x-2 max-sm:top-2">
            <DiffTacticalHUD
              snapshot={snapshot}
              onApproveReroute={handleApproveReroute}
              onClose={() => setHudOpen(false)}
              onFocusEntity={handleFocusEntity}
            />
          </div>
        )}
      </main>

        {/* Synchronized Bottom Milestone Timeline */}
        <DiffTimeline
          currentTimestampSec={snapshot.timestampSec}
          currentMilestoneIndex={snapshot.currentMilestoneIndex}
          onSeek={handleSeek}
          onFocusMilestone={handleFocusMilestone}
        />
      </div>
    </ProtectedRoute>
  )
}
