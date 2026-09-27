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
  ShieldAlert,
  GitCompare,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { getDashboard } from '@/lib/dashboard-api'
import { vehicleApi } from '@/lib/api/vehicles'
import { emergencyApi } from '@/lib/api/emergencies'
import { incidentApi } from '@/lib/api/incidents'
import { routeApi } from '@/lib/api/routes'
import { analysisApi } from '@/lib/api/analysis'
import { decisionApi } from '@/lib/api/decisions'
import { trajectoryApi } from '@/lib/api/trajectories'
import type {
  Emergency,
  Vehicle,
  Incident,
  Route,
  Trajectory,
  SituationAnalysis,
  PredictionResult,
  Decision
} from '@/lib/api/types'
import { DEMO_VEHICLES, DEMO_EMERGENCIES, DEMO_INCIDENTS, getCanonicalRouteForEmergency } from '@/lib/demo-fixtures'
import { validateRouteGeometry } from '@/lib/route-validator'
import { AMB_01_DASHBOARD, type DashboardData } from '@/lib/mock-data'
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
import { MissionAssessmentHUD } from '@/components/assessment/mission-assessment-hud'

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
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData || AMB_01_DASHBOARD)

  // Mission Assessment & Corridor State
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [selectedTrajectory, setSelectedTrajectory] = useState<Trajectory | null>(null)
  const [situationAnalysis, setSituationAnalysis] = useState<SituationAnalysis | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [comparisonData, setComparisonData] = useState<any>(null)

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

  // Resolve active emergency and vehicle objects
  const selectedEmergency = emergencies.find((e) => e.emergencyId === selectedEmergencyId) || (emergencies.length > 0 ? emergencies[0] : null)
  const assignedVehicleId = selectedEmergency?.assignedVehicle
    ? typeof selectedEmergency.assignedVehicle === 'object' && 'vehicleId' in selectedEmergency.assignedVehicle
      ? selectedEmergency.assignedVehicle.vehicleId
      : (typeof selectedEmergency.assignedVehicle === 'string' ? selectedEmergency.assignedVehicle : undefined)
    : undefined
  const selectedVehicle = assignedVehicleId ? vehicles.find((v) => v.vehicleId === assignedVehicleId) || null : null

  // Fetch corridor telemetry, analysis, prediction, and decisions for selected emergency
  useEffect(() => {
    if (!selectedEmergencyId) return

    const targetVehId = assignedVehicleId || null

    // Fetch Route
    routeApi.getForEmergency(selectedEmergencyId)
      .then(async (res) => {
        let authRoute: Route | null = null
        if (res.data && res.data.length > 0) {
          const candidate = res.data[0]
          const val = validateRouteGeometry(candidate)
          if (val.isValid && val.isRoadConstrained) {
            authRoute = candidate
          }
        }
        if (!authRoute) {
          const fallback = getCanonicalRouteForEmergency(selectedEmergencyId, selectedEmergency)
          authRoute = fallback.length > 0 ? (fallback[0] as unknown as Route) : null
        }
        setSelectedRoute(authRoute)
        if (authRoute) {
          try {
            const comp = await routeApi.compare(authRoute.routeId)
            if (comp && comp.data) setComparisonData(comp.data)
          } catch {
            setComparisonData(null)
          }
        } else {
          setComparisonData(null)
        }
      })
      .catch(() => {
        const fallback = getCanonicalRouteForEmergency(selectedEmergencyId, selectedEmergency)
        setSelectedRoute(fallback.length > 0 ? (fallback[0] as unknown as Route) : null)
        setComparisonData(null)
      })

    // Fetch Latest GPS Trajectory
    if (targetVehId) {
      trajectoryApi.getLatestSafe(targetVehId)
        .then((t) => setSelectedTrajectory(t))
        .catch(() => setSelectedTrajectory(null))

      // Fetch Situation Analysis (Deviation + Hazard correlation)
      analysisApi.getVehicleSituationSafe(targetVehId)
        .then((s) => setSituationAnalysis(s))
        .catch(() => setSituationAnalysis(null))

      // Fetch Delay & Arrival Prediction
      analysisApi.getVehiclePredictionSafe(targetVehId)
        .then((p) => setPrediction(p))
        .catch(() => setPrediction(null))
    } else {
      setSelectedTrajectory(null)
      setSituationAnalysis(null)
      setPrediction(null)
    }

    // Fetch Decisions
    decisionApi.list({ emergencyId: selectedEmergencyId })
      .then((dRes) => {
        if (dRes.data && dRes.data.length > 0) {
          setDecision(dRes.data[0])
        } else {
          setDecision(null)
        }
      })
      .catch(() => setDecision(null))
  }, [selectedEmergencyId, assignedVehicleId, selectedEmergency])

  // Decision Handlers
  const handleApproveDecision = async (decisionId: string, comment?: string) => {
    const res = await decisionApi.approve(decisionId, comment)
    if (res.data) setDecision(res.data)
    fetchLiveData()
  }

  const handleRejectDecision = async (decisionId: string, reason?: string) => {
    const res = await decisionApi.reject(decisionId, reason)
    if (res.data) setDecision(res.data)
    fetchLiveData()
  }

  const handleExecuteDecision = async (decisionId: string) => {
    const res = await decisionApi.execute(decisionId)
    if (res.data) setDecision(res.data)
    fetchLiveData()
  }

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
              <Navigation className="size-3.5 text-emerald-400" />
              <span>Corridor Telemetry & Mock Data</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400">AMB-01</span>
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

            <Link
              href="/diff"
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <GitCompare className="size-3.5 text-purple-500" />
              <span>What-If Simulator</span>
            </Link>

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

            {/* Quick-Access Corridor Telemetry & Mock Data Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Navigation className="size-4 animate-pulse" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">AMB-01 MOCK CORRIDOR ACTIVE</span>
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/25">Deviation Detected</span>
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">-6m Saved via Route B</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unit KA-01-AMB-108 (Officer Ananya Rao) en route to Manipal Hospital · Road accident on 100 Feet Road
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('telemetry')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                <span>Inspect Full Telemetry & Timeline</span>
              </Button>
            </div>

            {/* 5-Question Mission Assessment HUD */}
            <MissionAssessmentHUD
              emergency={selectedEmergency}
              vehicle={selectedVehicle}
              route={selectedRoute}
              latestTrajectory={selectedTrajectory}
              situationAnalysis={situationAnalysis}
              prediction={prediction}
              decision={decision}
              comparisonData={comparisonData}
              onApproveDecision={handleApproveDecision}
              onRejectDecision={handleRejectDecision}
              onExecuteDecision={handleExecuteDecision}
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
          <div className="space-y-6">
            {/* 5-Question Mission Assessment HUD in Telemetry View */}
            <MissionAssessmentHUD
              emergency={selectedEmergency}
              vehicle={selectedVehicle}
              route={selectedRoute}
              latestTrajectory={selectedTrajectory}
              situationAnalysis={situationAnalysis}
              prediction={prediction}
              decision={decision}
              comparisonData={comparisonData}
              onApproveDecision={handleApproveDecision}
              onRejectDecision={handleRejectDecision}
              onExecuteDecision={handleExecuteDecision}
            />

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
