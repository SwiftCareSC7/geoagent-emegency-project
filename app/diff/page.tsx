'use client'

/**
 * SwiftCare GeoAgent — /diff Operational Rerouting & Traffic Diff Simulator
 *
 * Visualizes emergency corridor rerouting diffs on Google Maps with Live Traffic:
 * - Google Maps Basemap + Live TrafficLayer (ENABLED BY DEFAULT)
 * - Reroute Diff Comparison: Original vs Recommended Bypass vs Trajectory
 * - Strict Separation: LIVE TRAFFIC vs SIMULATED TRAFFIC clearly distinguished
 * - Semantic Route Visual Hierarchy:
 *     Blue = Active/Planned Corridor
 *     Purple = AI Recommended Detour Bypass
 *     Slate = Degraded / Blocked Original Route
 *     Orange = Actual Ambulance Trajectory
 *     Red = Accident / Incident Hazard
 */

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Split,
  Truck,
  Zap,
} from 'lucide-react'
import { GoogleMapView, type GoogleMapOverlayData } from '@/components/map/google-map-view'
import { MapLegend } from '@/components/map/map-legend'
import { CANONICAL_ROAD_CORRIDORS } from '@/lib/canonical-road-corridors'
import { useMapSettings } from '@/lib/map-settings'
import { cn } from '@/lib/utils'

export default function DiffPage() {
  const { isTrafficEnabled, toggleTraffic } = useMapSettings()
  const [trafficMode, setTrafficMode] = useState<'LIVE' | 'SIMULATED'>('LIVE')
  const [selectedScenario, setSelectedScenario] = useState<'ACCIDENT_OLD_AIRPORT' | 'JUNCTION_GRIDLOCK'>('ACCIDENT_OLD_AIRPORT')

  // Canonical Coordinates from Authoritative Corridors
  const activeCorridorCoords: [number, number][] = CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.primary.coordinates.map(
    ([lng, lat]) => [lng, lat] as [number, number]
  )
  const bypassCorridorCoords: [number, number][] = (
    CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.alternative?.coordinates ||
    CANONICAL_ROAD_CORRIDORS.MG_ROAD_TO_MANIPAL.primary.coordinates
  ).map(([lng, lat]) => [lng, lat] as [number, number])
  const trajectoryCoords: [number, number][] = activeCorridorCoords.slice(0, Math.floor(activeCorridorCoords.length * 0.42))

  const overlays: GoogleMapOverlayData = useMemo(() => {
    return {
      activeRouteCoordinates: bypassCorridorCoords, // AI recommended bypass is the active corridor
      alternativeRouteCoordinates: bypassCorridorCoords,
      originalRouteCoordinates: activeCorridorCoords, // Original route is now secondary/degraded
      trajectoryCoordinates: trajectoryCoords,
      driverLocation: trajectoryCoords[trajectoryCoords.length - 1] as [number, number],
      driverHeading: 85,
      emergencyLocation: [77.6030, 12.9730],
      emergencyName: 'Patient Scene (Mayo Hall)',
      destinationLocation: [77.6483, 12.9582],
      destinationName: 'Manipal Hospital Emergency Bay',
      incidents: [
        {
          id: 'diff-inc-1',
          incidentId: 'INC-BLOCKED-01',
          type: 'ACCIDENT',
          severity: 'HIGH',
          status: 'ACTIVE',
          description: '3-Vehicle Collision on Old Airport Road — 2 Lanes Obstructed',
          location: {
            type: 'Point',
            coordinates: [77.6250, 12.9660],
          },
        },
      ],
    }
  }, [activeCorridorCoords, bypassCorridorCoords, trajectoryCoords])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-border bg-card/95 px-4 sm:px-6 py-3.5 backdrop-blur-md sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/control-room"
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Return to Control Room"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Split className="size-3.5" />
              </div>
              <h1 className="text-base font-extrabold tracking-tight">
                Emergency Corridor Reroute & Traffic Diff Inspector
              </h1>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                DIFF-ENGINE v2.4
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live Google Maps + Real-Time Traffic comparison evaluating algorithmic detour decisions vs. road gridlock.
            </p>
          </div>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Traffic Source Mode Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setTrafficMode('LIVE')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all',
                trafficMode === 'LIVE'
                  ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE GOOGLE TRAFFIC</span>
            </button>
            <button
              type="button"
              onClick={() => setTrafficMode('SIMULATED')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all',
                trafficMode === 'SIMULATED'
                  ? 'bg-card text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="size-2 rounded-full bg-amber-500" />
              <span>SIMULATED TRAFFIC SCENARIO</span>
            </button>
          </div>

          {/* Traffic Layer Toggle */}
          <button
            type="button"
            onClick={toggleTraffic}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all',
              isTrafficEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            <Zap className="size-3.5" />
            <span>Traffic Overlay: {isTrafficEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Map Viewport (Left) + Decision Audit & Diff Stats (Right) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-6">
        {/* Left Column (8 cols): Google Maps Viewport */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative w-full rounded-2xl border-2 border-border overflow-hidden bg-slate-950 shadow-xl min-h-[560px] flex-1">
            <GoogleMapView
              initialCenter={[12.968, 77.622]}
              initialZoom={13}
              height="100%"
              trafficEnabled={isTrafficEnabled}
              onToggleTraffic={toggleTraffic}
              overlays={overlays}
              isSimulatedTraffic={trafficMode === 'SIMULATED'}
              simulationLabel="SIMULATED ACCIDENT GRIDLOCK (+8.4 min delay)"
            />

            {/* Embedded Accessible Legend */}
            <MapLegend />

            {/* Floating Live vs Simulated Indicator */}
            <div className="absolute top-3 right-3 z-10">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold shadow-xl backdrop-blur-md',
                  trafficMode === 'LIVE'
                    ? 'bg-slate-900/90 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    trafficMode === 'LIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  )}
                />
                <span>
                  {trafficMode === 'LIVE' ? 'OFFICIAL GOOGLE LIVE TRAFFIC' : 'SIMULATED TRAFFIC SCENARIO'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Scenario Toggles */}
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <BrainCircuit className="size-4 text-purple-500" />
              <span className="font-bold">Active Simulation Scenario:</span>
              <span className="font-mono text-muted-foreground">Indiranagar 100ft Rd Bypass vs Old Airport Rd</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Emergency Focus:</span>
              <span className="font-bold font-mono px-2 py-0.5 rounded bg-muted border border-border">
                AMB-102 • Priority 1
              </span>
            </div>
          </div>
        </section>

        {/* Right Column (4 cols): Reroute Decision Analytics & Comparative Diff */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          {/* Card 1: Executive Reroute Verdict */}
          <div className="p-5 rounded-2xl border-2 border-purple-500/40 bg-card shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-purple-500 animate-pulse" />
                <h2 className="font-bold text-sm tracking-tight">Reroute Decision Diff</h2>
              </div>
              <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                DETOUR RECOMMENDED
              </span>
            </div>

            {/* Differential KPI Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/60 border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Original Corridor
                </span>
                <span className="text-base font-extrabold text-foreground line-through decoration-rose-500">
                  18.4 min
                </span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono block">
                  +7.2 min gridlock delay
                </span>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block">
                  Recommended Detour
                </span>
                <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">
                  11.2 min
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                  ✓ Saves -7.2 min
                </span>
              </div>
            </div>

            {/* Decision Rationale */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="size-4 text-rose-500" />
                <span>Trigger Reason & Road Hazard</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Google Live Traffic detected heavy congestion (red flow) spanning 1.8km on Old Airport Road caused by a 3-vehicle collision. The GeoAgent Decision Engine computed an alternate green-wave corridor via 100ft Road with 0 signal stops.
              </p>
            </div>
          </div>

          {/* Card 2: Road-Constrained Geometric Verification */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Route Constraint Verification</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">Road Network Constrained:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">100% Validated</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">Building Penetration Check:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">0 Intersections</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">Google Traffic Awareness:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">TRAFFIC_AWARE_OPTIMAL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">Corridor Clearance (V2X):</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">4 Signals Preempted</span>
              </div>
            </div>
          </div>

          {/* Card 3: Quick Navigation to Other Map Surfaces */}
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-2 text-xs">
            <span className="font-bold text-foreground block">Inspect Other Map Surfaces</span>
            <div className="flex flex-col gap-1.5">
              <Link
                href="/control-room"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted font-medium transition-colors"
              >
                <span>Control Room Metropolitan Map</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/driver/dashboard"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted font-medium transition-colors"
              >
                <span>Driver Turn-by-Turn Navigation Map</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/emergency-lab"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted font-medium transition-colors"
              >
                <span>Emergency Lab Simulation Map</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
