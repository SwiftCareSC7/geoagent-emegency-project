'use client'

import {
  AlertCircle,
  Eye,
  EyeOff,
  LayoutDashboard,
  Navigation,
  PhoneCall,
  RefreshCw,
  Layers,
  Radio,
  ShieldAlert
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { getDashboard } from '@/lib/dashboard-api'
import { vehicleApi } from '@/lib/api/vehicles'
import { emergencyApi } from '@/lib/api/emergencies'
import { incidentApi } from '@/lib/api/incidents'
import type { Emergency, Vehicle, Incident } from '@/lib/api/types'
import { DEMO_VEHICLES, DEMO_EMERGENCIES, DEMO_INCIDENTS } from '@/lib/demo-fixtures'
import type { DashboardData } from '@/lib/mock-data'
import { getSocket, REALTIME_EVENTS } from '@/lib/socket/client'
import { cn } from '@/lib/utils'

import { DashboardTopbar } from './dashboard-topbar'
import { EmergencySummaryCards } from './emergency-summary-cards'
import { VehicleFleetPanel } from './vehicle-fleet-panel'
import { ActiveEmergenciesPanel } from './active-emergencies-panel'
import { RoadIncidentsPanel } from './road-incidents-panel'
import { EtaSummary } from './eta-summary'
import { GeoAgentCard } from './geoagent-card'
import { MapPlaceholder } from './map-placeholder'
import { RouteStatusCards } from './route-status-cards'
import { TimelinePanel } from './timeline-panel'
import { EmergencyClearanceMonitor } from './emergency-clearance-monitor'

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ControlRoomDashboard({ initialData }: { initialData?: DashboardData }) {
  const [activeTab, setActiveTab] = useState<'operations' | 'telemetry'>('operations')

  // Live Backend State (Resilient with Canonical Demo Fallbacks)
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEMO_VEHICLES)
  const [emergencies, setEmergencies] = useState<Emergency[]>(DEMO_EMERGENCIES)
  const [incidents, setIncidents] = useState<Incident[]>(DEMO_INCIDENTS)
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>('E-DEMO-001')
  const [loadingLive, setLoadingLive] = useState<boolean>(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [isLiveStream, setIsLiveStream] = useState<boolean>(false)

  // Route & UI State
  const [lastRefreshed, setLastRefreshed] = useState(() => formatTime(new Date()))
  const [refreshing, setRefreshing] = useState(false)
  const [showRecommended, setShowRecommended] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | undefined>(initialData)

  // Fetch real data from live backend REST endpoints
  const fetchLiveData = useCallback(async () => {
    setLoadingLive(true)

    const [vRes, eRes, iRes] = await Promise.allSettled([
      vehicleApi.list(),
      emergencyApi.list(),
      incidentApi.list({ status: 'ACTIVE' }),
    ])

    let backendLive = false

    if (vRes.status === 'fulfilled' && vRes.value.data && vRes.value.data.length > 0) {
      setVehicles(vRes.value.data)
      backendLive = true
    }

    if (eRes.status === 'fulfilled' && eRes.value.data && eRes.value.data.length > 0) {
      const emgList = eRes.value.data
      setEmergencies(emgList)
      setSelectedEmergencyId((prev) => prev || (emgList.length > 0 ? emgList[0].emergencyId : 'E-DEMO-001'))
      backendLive = true
    }

    if (iRes.status === 'fulfilled' && iRes.value.data && iRes.value.data.length > 0) {
      setIncidents(iRes.value.data)
      backendLive = true
    }

    if (backendLive) {
      setIsLiveStream(true)
      setLiveError(null)
    } else {
      setIsLiveStream(false)
      setLiveError(null)
      setVehicles((prev) => (prev.length > 0 ? prev : DEMO_VEHICLES))
      setEmergencies((prev) => (prev.length > 0 ? prev : DEMO_EMERGENCIES))
      setIncidents((prev) => (prev.length > 0 ? prev : DEMO_INCIDENTS))
      setSelectedEmergencyId((prev) => prev || 'E-DEMO-001')
    }

    setLoadingLive(false)
    setLastRefreshed(formatTime(new Date()))
  }, [])

  useEffect(() => {
    fetchLiveData()
  }, [fetchLiveData])

  // Real-time Socket.IO subscriptions for Control Room fleet and emergency updates
  const [socketConnected, setSocketConnected] = useState(false)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onConnect = () => {
      setSocketConnected(true)
      socket.emit('room:join', { room: 'control-room' })
    }
    const onDisconnect = () => setSocketConnected(false)

    if (socket.connected) {
      setSocketConnected(true)
      socket.emit('room:join', { room: 'control-room' })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    const onLocationUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.vehicleId) return
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === payload.vehicleId
            ? {
                ...v,
                speed: payload.speed ?? v.speed,
                heading: payload.heading ?? v.heading,
                location: payload.location
                  ? { type: 'Point', coordinates: payload.location.coordinates }
                  : v.location,
              }
            : v
        )
      )
    }

    const onStatusUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.vehicleId) return
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === payload.vehicleId
            ? { ...v, status: payload.status }
            : v
        )
      )
    }

    const onEmergencyUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.emergencyId) return
      setEmergencies((prev) => {
        const idx = prev.findIndex((e) => e.emergencyId === payload.emergencyId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], ...payload }
          return updated
        }
        return [payload, ...prev]
      })
    }

    const onDecisionEvent = () => {
      fetchLiveData()
    }

    socket.on(REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED, onLocationUpdated)
    socket.on(REALTIME_EVENTS.VEHICLE_STATUS_UPDATED, onStatusUpdated)
    socket.on(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)
    socket.on(REALTIME_EVENTS.EMERGENCY_CREATED, onEmergencyUpdated)
    socket.on(REALTIME_EVENTS.DECISION_CREATED, onDecisionEvent)
    socket.on(REALTIME_EVENTS.DECISION_APPROVED, onDecisionEvent)
    socket.on(REALTIME_EVENTS.DECISION_EXECUTED, onDecisionEvent)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED, onLocationUpdated)
      socket.off(REALTIME_EVENTS.VEHICLE_STATUS_UPDATED, onStatusUpdated)
      socket.off(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)
      socket.off(REALTIME_EVENTS.EMERGENCY_CREATED, onEmergencyUpdated)
      socket.off(REALTIME_EVENTS.DECISION_CREATED, onDecisionEvent)
      socket.off(REALTIME_EVENTS.DECISION_APPROVED, onDecisionEvent)
      socket.off(REALTIME_EVENTS.DECISION_EXECUTED, onDecisionEvent)
      socket.emit('room:leave', { room: 'control-room' })
    }
  }, [fetchLiveData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchLiveData(),
      getDashboard('AMB-01').then((d) => setDashboardData(d)).catch(() => {})
    ])
    setRefreshing(false)
  }

  const activeEmergenciesCount = emergencies.filter(
    (e) => !['RESOLVED', 'CANCELLED'].includes(e.status),
  ).length

  return (
    <div className="min-h-svh bg-background">
      <DashboardTopbar
        ambulanceId="HQ-CENTRAL"
        driverName="Dispatcher"
        emergencyActive={activeEmergenciesCount > 0}
        lastRefreshed={lastRefreshed}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Navigation & Action Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('operations')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'operations'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutDashboard className="size-3.5" />
              <span>Operations Live Overview</span>
              {activeEmergenciesCount > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {activeEmergenciesCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
                activeTab === 'telemetry'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Navigation className="size-3.5" />
              <span>Corridor Telemetry & Route</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono border border-border bg-card shadow-xs">
              {socketConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>CONTROL STREAM LIVE</span>
                </span>
              ) : isLiveStream ? (
                <span className="flex items-center gap-1.5 text-cyan-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span>POLLING LIVE API</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span>DEMO SIMULATION CORRIDOR</span>
                </span>
              )}
            </div>

            <Button
              onClick={handleRefresh}
              disabled={refreshing || loadingLive}
              size="sm"
            >
              <RefreshCw
                className={refreshing || loadingLive ? 'animate-spin' : undefined}
              />
              Refresh Live Data
            </Button>

            {activeTab === 'telemetry' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecommended((v) => !v)}
                aria-pressed={showRecommended}
              >
                {showRecommended ? <EyeOff /> : <Eye />}
                View Alternative Route
              </Button>
            ) : null}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setContactSent(false)
                setContactOpen(true)
              }}
            >
              <PhoneCall />
              Broadcast Alert
            </Button>

            <span className="text-xs text-muted-foreground">
              Synced: {lastRefreshed}
            </span>
          </div>
        </div>

        {/* Global Live Error Banner */}
        {liveError ? (
          <div className="mb-6 flex items-start justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                <strong>Backend Sync Warning:</strong> {liveError}
              </span>
            </div>
            <button
              type="button"
              onClick={fetchLiveData}
              className="ml-3 shrink-0 underline hover:no-underline font-semibold"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* TAB 1: OPERATIONS LIVE OVERVIEW */}
        {activeTab === 'operations' ? (
          <div className="space-y-6">
            {/* Live Metrics Summary */}
            <EmergencySummaryCards
              emergencies={emergencies}
              vehicles={vehicles}
              incidents={incidents}
              loading={loadingLive}
            />

            {/* Real-time Metropolitan Map Viewport */}
            <MapPlaceholder
              showRecommended={showRecommended}
              selectedEmergencyId={selectedEmergencyId}
              onSelectEmergency={setSelectedEmergencyId}
              emergencies={emergencies}
              vehicles={vehicles}
              incidents={incidents}
              height="460px"
            />

            {/* Operations Grid */}
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left Column: Live Emergency Stream & Road Hazards */}
              <div className="space-y-6 lg:col-span-3">
                <ActiveEmergenciesPanel
                  emergencies={emergencies}
                  loading={loadingLive}
                  error={liveError && emergencies.length === 0 ? liveError : null}
                  onRetry={fetchLiveData}
                />
                <RoadIncidentsPanel
                  incidents={incidents}
                  loading={loadingLive}
                  error={liveError && incidents.length === 0 ? liveError : null}
                  onRetry={fetchLiveData}
                />
              </div>

              {/* Right Column: Fleet Unit Registry & Clearance Monitoring */}
              <div className="space-y-6 lg:col-span-2">
                <EmergencyClearanceMonitor ambulanceId="AMB-01" />
                <VehicleFleetPanel
                  vehicles={vehicles}
                  loading={loadingLive}
                  error={liveError && vehicles.length === 0 ? liveError : null}
                  onRetry={fetchLiveData}
                />
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: CORRIDOR TELEMETRY & ROUTE */
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              {dashboardData ? <EtaSummary data={dashboardData} /> : null}
              <MapPlaceholder
                markers={dashboardData?.markers}
                showRecommended={showRecommended}
                selectedEmergencyId={selectedEmergencyId}
                onSelectEmergency={setSelectedEmergencyId}
                emergencies={emergencies}
                vehicles={vehicles}
                incidents={incidents}
                height="500px"
              />
              {dashboardData?.timeline ? <TimelinePanel events={dashboardData.timeline} /> : null}
            </div>

            <div className="space-y-6 lg:col-span-2">
              <EmergencyClearanceMonitor ambulanceId="AMB-01" />
              {dashboardData ? <RouteStatusCards data={dashboardData} /> : null}
              {dashboardData?.explanation ? <GeoAgentCard explanation={dashboardData.explanation} /> : null}
            </div>
          </div>
        )}
      </main>

      {/* Broadcast Alert Modal */}
      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={contactSent ? 'Fleet Broadcast Dispatched' : 'Broadcast Priority Alert?'}
        description={
          contactSent
            ? 'Priority radio override broadcast has been transmitted to all active ambulance units and regional trauma centers.'
            : 'This will issue a high-priority dispatch order to all active field units across Bengaluru.'
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
                <PhoneCall />
                Broadcast Dispatch Order
              </Button>
            </>
          )
        }
      />
    </div>
  )
}
