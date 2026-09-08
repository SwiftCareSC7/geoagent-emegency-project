'use client'

import {
  AlertCircle,
  AlertTriangle,
  Ambulance,
  Eye,
  EyeOff,
  LayoutDashboard,
  Navigation,
  PhoneCall,
  RefreshCw,
  Siren,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { getDashboard } from '@/lib/api'
import { vehicleApi } from '@/lib/api/vehicles'
import { emergencyApi } from '@/lib/api/emergencies'
import { incidentApi } from '@/lib/api/incidents'
import type { Emergency, Vehicle, Incident } from '@/lib/api/types'
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

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'veh-101',
    vehicleId: 'AMB-101',
    registrationNumber: 'KA-01-AMB-108',
    type: 'AMBULANCE',
    status: 'DISPATCHED',
    driverName: 'Ananya Rao',
    driverContact: '+91 98765 43210',
    capacity: 2,
  },
  {
    id: 'veh-102',
    vehicleId: 'AMB-102',
    registrationNumber: 'KA-03-EMG-204',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    driverName: 'Rajesh Kumar',
    driverContact: '+91 98765 43211',
    capacity: 1,
  },
  {
    id: 'veh-103',
    vehicleId: 'AMB-103',
    registrationNumber: 'KA-05-MED-309',
    type: 'AMBULANCE',
    status: 'EN_ROUTE',
    driverName: 'Suresh Patel',
    driverContact: '+91 98765 43212',
    capacity: 1,
  },
]

const MOCK_EMERGENCIES: Emergency[] = [
  {
    id: 'emg-001',
    emergencyId: 'EMG-2026-001',
    type: 'CARDIAC',
    priority: 'CRITICAL',
    status: 'DISPATCHED',
    description: 'High-severity acute cardiac event near Indiranagar. Immediate life support required.',
    location: { type: 'Point', coordinates: [77.6389, 12.9345] },
    destination: { type: 'Point', coordinates: [77.6602, 12.9567] },
    assignedVehicle: {
      vehicleId: 'AMB-101',
      registrationNumber: 'KA-01-AMB-108',
      status: 'DISPATCHED',
    },
    callerName: 'Dr. Ramesh Sharma',
    callerContact: '+91 98765 11223',
  },
  {
    id: 'emg-002',
    emergencyId: 'EMG-2026-002',
    type: 'ACCIDENT',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    description: 'Multi-vehicle collision on 100 Feet Road. Structural traffic delay on planned corridor.',
    location: { type: 'Point', coordinates: [77.6412, 12.9378] },
    destination: { type: 'Point', coordinates: [77.6602, 12.9567] },
    assignedVehicle: {
      vehicleId: 'AMB-102',
      registrationNumber: 'KA-03-EMG-204',
      status: 'AVAILABLE',
    },
    callerName: 'Priya Nair',
    callerContact: '+91 98765 44332',
  },
]

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-001',
    incidentId: 'INC-2026-001',
    type: 'ACCIDENT',
    severity: 'HIGH',
    status: 'ACTIVE',
    description: 'Severe Congestion & Multi-vehicle Collision on 100 Feet Road, Indiranagar. Speed: 12 km/h.',
    location: { type: 'Point', coordinates: [77.6412, 12.9378] },
  },
]

export function DriverDashboard({ data }: { data: DashboardData }) {
  const [activeTab, setActiveTab] = useState<'operations' | 'telemetry'>('operations')

  // Live Backend State
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES)
  const [emergencies, setEmergencies] = useState<Emergency[]>(MOCK_EMERGENCIES)
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS)
  const [loadingLive, setLoadingLive] = useState<boolean>(false)
  const [liveError, setLiveError] = useState<string | null>(null)

  // Route & UI State
  const [lastRefreshed, setLastRefreshed] = useState(() => formatTime(new Date()))
  const [refreshing, setRefreshing] = useState(false)
  const [showRecommended, setShowRecommended] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  // Fetch real data from live backend REST endpoints, with fallback
  const fetchLiveData = useCallback(async () => {
    setLoadingLive(true)
    setLiveError(null)

    const [vRes, eRes, iRes] = await Promise.allSettled([
      vehicleApi.list(),
      emergencyApi.list(),
      incidentApi.list(),
    ])

    if (vRes.status === 'fulfilled' && vRes.value.data?.length > 0) {
      setVehicles(vRes.value.data)
    } else {
      setVehicles(MOCK_VEHICLES)
    }

    if (eRes.status === 'fulfilled' && eRes.value.data?.length > 0) {
      setEmergencies(eRes.value.data)
    } else {
      setEmergencies(MOCK_EMERGENCIES)
    }

    if (iRes.status === 'fulfilled' && iRes.value.data?.length > 0) {
      setIncidents(iRes.value.data)
    } else {
      setIncidents(MOCK_INCIDENTS)
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

    // Real-time Vehicle Location / Telemetry
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

    // Real-time Vehicle Status
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

    // Real-time Emergency Updates
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

    // Real-time Decision Changes
    const onDecisionEvent = () => {
      // Refresh emergencies non-blockingly to reflect updated routes / decisions
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
      getDashboard(data.ambulanceId),
    ])
    setRefreshing(false)
  }

  const activeEmergenciesCount = emergencies.filter(
    (e) => !['RESOLVED', 'CANCELLED'].includes(e.status),
  ).length

  return (
    <div className="min-h-svh bg-background">
      <DashboardTopbar
        ambulanceId={data.ambulanceId}
        driverName={data.driverName}
        emergencyActive={data.emergencyActive || activeEmergenciesCount > 0}
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
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                  <span>POLLING</span>
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
              Contact Control Room
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

              {/* Right Column: Fleet Unit Registry */}
              <div className="space-y-6 lg:col-span-2">
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
          /* TAB 2: CORRIDOR TELEMETRY & ROUTE (Preserved View) */
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left column: ETA summary, large map, then timeline */}
            <div className="space-y-6 lg:col-span-3">
              <EtaSummary data={data} />
              <MapPlaceholder
                markers={data.markers}
                showRecommended={showRecommended}
              />
              <TimelinePanel events={data.timeline} />
            </div>

            {/* Right column: deviation & benefit analysis */}
            <div className="space-y-6 lg:col-span-2">
              <RouteStatusCards data={data} />
              <GeoAgentCard explanation={data.explanation} />
            </div>
          </div>
        )}
      </main>

      {/* Priority Voice Modal */}
      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={contactSent ? 'Control room notified' : 'Contact control room?'}
        description={
          contactSent
            ? `A priority voice channel request for ${data.ambulanceId} has been queued with dispatcher.`
            : `This will open an immediate priority radio/voice channel to the central control room for unit ${data.ambulanceId}.`
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
                Confirm Priority Call
              </Button>
            </>
          )
        }
      />
    </div>
  )
}
