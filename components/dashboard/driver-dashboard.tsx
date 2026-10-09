'use client'

import React, { useState } from 'react'
import {
  Navigation,
  Activity,
  PhoneCall,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  Radio,
  X,
  CheckCircle2
} from 'lucide-react'
import { DashboardTopbar } from './dashboard-topbar'
import { DriverNavigation } from '@/components/driver/driver-navigation'
import { EtaSummary } from './eta-summary'
import { RouteStatusCards } from './route-status-cards'
import { TimelinePanel } from './timeline-panel'
import { GeoAgentCard } from './geoagent-card'
import { MapPlaceholder } from './map-placeholder'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { AMB_01_DASHBOARD, type DashboardData } from '@/lib/mock-data'
import { DEMO_VEHICLES, DEMO_EMERGENCIES, DEMO_INCIDENTS } from '@/lib/demo-fixtures'
import { cn } from '@/lib/utils'

interface DriverDashboardProps {
  data?: DashboardData
}

export function DriverDashboard({ data }: DriverDashboardProps) {
  const effectiveData = data || AMB_01_DASHBOARD

  const ambulanceId = effectiveData.ambulanceId || 'KA-01-AMB-108'
  const driverName = effectiveData.driverName || 'Ananya Rao'

  const [telemetryDrawerOpen, setTelemetryDrawerOpen] = useState<boolean>(false)
  const [fullTelemetryMode, setFullTelemetryMode] = useState<boolean>(false)
  const [showRecommended, setShowRecommended] = useState<boolean>(true)
  const [contactOpen, setContactOpen] = useState<boolean>(false)
  const [contactSent, setContactSent] = useState<boolean>(false)
  const [mapFocusMode, setMapFocusMode] = useState<boolean>(false)

  // Full-Page Telemetry Mode (Optional inspection view for deep telematics)
  if (fullTelemetryMode) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
        {/* Top Header */}
        <DashboardTopbar
          ambulanceId={ambulanceId}
          driverName={driverName}
          emergencyActive={effectiveData.emergencyActive ?? true}
        />

        {/* View Return Banner */}
        <div className="border-b border-border bg-card/90 backdrop-blur-md px-4 py-2.5 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Activity className="size-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-foreground">
                  Corridor Telemetry & Mock Data Mode
                </span>
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-300">
                  {ambulanceId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecommended((v) => !v)}
                className="border-border bg-card text-xs text-foreground hover:bg-muted"
              >
                {showRecommended ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showRecommended ? 'Hide Alternative' : 'View Alternative'}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setFullTelemetryMode(false)}
                className="bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 shadow-sm"
              >
                <Navigation className="size-3.5 mr-1" />
                <span>Return to Live Cockpit</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Full Telemetry Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card p-4 sm:p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {effectiveData.isSimulated || effectiveData.dataSource === 'SIMULATED' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <span className="size-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                      SIMULATED TRANSIT (OFFLINE DEMO)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      LIVE EMERGENCY TRANSIT
                    </span>
                  )}
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-foreground">
                    Unit: {effectiveData.ambulanceId}
                  </span>
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {effectiveData.routeStatusLabel}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold font-display text-foreground">
                  Officer {effectiveData.driverName} — {effectiveData.vehicle}
                </h1>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Pickup:</strong> {effectiveData.pickup} · <strong className="text-foreground">Base:</strong> {effectiveData.base}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-muted/60 border border-border p-3 sm:px-4">
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Recommended Corridor
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {effectiveData.recommendedRoute}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm border border-emerald-500/30">
                  -{effectiveData.timeSavedMin}m
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <EtaSummary data={effectiveData} />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="font-semibold text-foreground">Corridor Schematic Geometry</span>
                  <span>{effectiveData.routeContext}</span>
                </div>
                <MapPlaceholder
                  markers={effectiveData.markers}
                  showRecommended={showRecommended}
                  emergencies={DEMO_EMERGENCIES}
                  vehicles={DEMO_VEHICLES}
                  incidents={DEMO_INCIDENTS}
                  height="440px"
                />
              </div>
              <TimelinePanel events={effectiveData.timeline} />
            </div>

            <div className="space-y-6 lg:col-span-2">
              <RouteStatusCards data={effectiveData} />
              <GeoAgentCard explanation={effectiveData.explanation} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Default Primary Experience: Focused, Full-Bleed Live Navigation Cockpit
  return (
    <div className="flex flex-col h-dvh w-full bg-background text-foreground overflow-hidden">
      {/* 1. GLOBAL HEADER (Tier 1: DashboardTopbar) */}
      {!mapFocusMode && (
        <DashboardTopbar
          ambulanceId={ambulanceId}
          driverName={driverName}
          emergencyActive={effectiveData.emergencyActive ?? true}
          driverMode
        />
      )}

      {/* 2. MISSION BAR & MAIN WORKSPACE (Tier 2 & 3: DriverNavigation) */}
      <main className="flex-1 min-h-0 relative w-full overflow-hidden">
        <DriverNavigation
          ambulanceId={ambulanceId}
          initialEmergency={
            effectiveData.destination
              ? {
                  assignedHospital: effectiveData.destination,
                  address: effectiveData.destinationFull || 'Bengaluru Corridor'
                }
              : undefined
          }
          onOpenPriorityRadio={() => {
            setContactSent(false)
            setContactOpen(true)
          }}
          onOpenTelemetry={() => setTelemetryDrawerOpen(true)}
          onMapFocusChange={setMapFocusMode}
        />
      </main>

      {/* 3. CORRIDOR TELEMETRY & AUDIT SLIDE-OVER DRAWER */}
      {telemetryDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="telemetry-drawer-title"
        >
          {/* Backdrop click to close */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setTelemetryDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-2xl h-full bg-background border-l border-border shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <Activity className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="telemetry-drawer-title" className="text-base font-bold font-display text-foreground">
                      Corridor Telemetry & Audit
                    </h2>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      {ambulanceId}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deep telematics, sensor logs, and chronological dispatch audit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTelemetryDrawerOpen(false)
                    setFullTelemetryMode(true)
                  }}
                  className="text-xs h-8 border-border hover:bg-muted"
                >
                  Full Page Mode
                </Button>
                <button
                  type="button"
                  onClick={() => setTelemetryDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Close telemetry drawer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
              {/* ETA Summary Card */}
              <EtaSummary data={effectiveData} />

              {/* Deviation & Benefit Analysis Cards */}
              <RouteStatusCards data={effectiveData} />

              {/* GeoAgent AI Reasoning Card */}
              <GeoAgentCard explanation={effectiveData.explanation} />

              {/* Schematic Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="font-semibold text-foreground">Corridor Schematic Geometry</span>
                  <span>{effectiveData.routeContext}</span>
                </div>
                <MapPlaceholder
                  markers={effectiveData.markers}
                  showRecommended={showRecommended}
                  emergencies={DEMO_EMERGENCIES}
                  vehicles={DEMO_VEHICLES}
                  incidents={DEMO_INCIDENTS}
                  height="340px"
                />
              </div>

              {/* Chronological Timeline Panel */}
              <TimelinePanel events={effectiveData.timeline} />
            </div>
          </div>
        </div>
      )}

      {/* 4. PRIORITY VOICE RADIO MODAL */}
      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={contactSent ? 'Central Control Room Notified' : 'Open Priority Radio Channel?'}
        description={
          contactSent
            ? `Priority radio broadcast for unit ${ambulanceId} (${driverName}) has been acknowledged by Bengaluru central dispatch.`
            : `This will open a high-priority two-way encrypted radio channel directly to the Bengaluru Emergency Control Room for unit ${ambulanceId}.`
        }
        footer={
          contactSent ? (
            <Button onClick={() => setContactOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setContactOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setContactSent(true)}
              >
                <PhoneCall className="size-4 mr-1" />
                <span>Confirm Priority Call</span>
              </Button>
            </>
          )
        }
      />
    </div>
  )
}
