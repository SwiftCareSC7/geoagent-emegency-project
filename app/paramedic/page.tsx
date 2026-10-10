'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  HeartPulse,
  Hospital,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  Send,
  Shield,
  Siren,
  Stethoscope,
  Thermometer,
  Truck,
  User,
  BrainCircuit,
  Wifi,
  WifiOff
} from 'lucide-react'
import Link from 'next/link'
import { emergencyApi } from '@/lib/api/emergencies'
import { vehicleApi } from '@/lib/api/vehicles'
import { analysisApi } from '@/lib/api/analysis'
import type { Emergency, Vehicle, PredictionResult } from '@/lib/api/types'
import { DEMO_EMERGENCIES, DEMO_VEHICLES } from '@/lib/demo-fixtures'
import { getSocket, REALTIME_EVENTS } from '@/lib/socket/client'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { cn } from '@/lib/utils'

export default function ParamedicPage() {
  const [emergencies, setEmergencies] = useState<Emergency[]>(DEMO_EMERGENCIES)
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEMO_VEHICLES)
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>('E-DEMO-001')
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string>('')

  // Clinical Vitals State
  const [heartRate, setHeartRate] = useState<number>(104)
  const [bloodPressure, setBloodPressure] = useState<string>('138/88')
  const [spo2, setSpo2] = useState<number>(96)
  const [respiratoryRate, setRespiratoryRate] = useState<number>(20)
  const [gcsScore, setGcsScore] = useState<number>(14)
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    'Patient conscious, severe thoracic blunt trauma from two-wheeler collision. 15L O2 via non-rebreather mask. IV saline line established.'
  )
  const [transmittingNotification, setTransmittingNotification] = useState(false)
  const [notificationSent, setNotificationSent] = useState(false)

  const { user, authenticated } = useAuth()

  const fetchParamedicData = useCallback(async () => {
    setLoading(true)
    try {
      const [eRes, vRes] = await Promise.allSettled([
        emergencyApi.list(),
        vehicleApi.list()
      ])

      if (eRes.status === 'fulfilled' && eRes.value.data && eRes.value.data.length > 0) {
        setEmergencies(eRes.value.data)
        if (!selectedEmergencyId) {
          setSelectedEmergencyId(eRes.value.data[0].emergencyId)
        }
      }
      if (vRes.status === 'fulfilled' && vRes.value.data && vRes.value.data.length > 0) {
        setVehicles(vRes.value.data)
      }
    } catch {
      // Keep demo fallbacks
    } finally {
      setLoading(false)
      setLastRefreshed(new Date().toLocaleTimeString())
    }
  }, [selectedEmergencyId])

  useEffect(() => {
    if (!authenticated || !user) return
    if (user.role !== 'PARAMEDIC' && user.role !== 'ADMIN' && !user.permittedWorkspaces?.includes('PARAMEDIC')) return
    fetchParamedicData()
  }, [authenticated, user, fetchParamedicData])

  // Real-time socket subscription
  useEffect(() => {
    if (!authenticated || !user) return
    if (user.role !== 'PARAMEDIC' && user.role !== 'ADMIN' && !user.permittedWorkspaces?.includes('PARAMEDIC')) return
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

    const onEmergencyUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.emergencyId) return
      setEmergencies((prev) =>
        prev.map((e) => (e.emergencyId === payload.emergencyId ? { ...e, ...payload } : e))
      )
    }

    socket.on(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)
      socket.emit('room:leave', { room: 'control-room' })
    }
  }, [])

  // Resolve active emergency & assigned vehicle
  const currentEmergency =
    emergencies.find((e) => e.emergencyId === selectedEmergencyId) || emergencies[0] || null

  const assignedVehicleId = currentEmergency?.assignedVehicle
    ? typeof currentEmergency.assignedVehicle === 'object' && 'vehicleId' in currentEmergency.assignedVehicle
      ? currentEmergency.assignedVehicle.vehicleId
      : (typeof currentEmergency.assignedVehicle === 'string' ? currentEmergency.assignedVehicle : undefined)
    : 'AMB-01'

  const currentVehicle =
    vehicles.find((v) => v.vehicleId === assignedVehicleId) || vehicles[0] || null

  // Fetch prediction for assigned vehicle
  useEffect(() => {
    if (!assignedVehicleId) return
    analysisApi.getVehiclePredictionSafe(assignedVehicleId)
      .then((p) => setPrediction(p))
      .catch(() => setPrediction(null))
  }, [assignedVehicleId])

  const handleTransmitPreArrival = async () => {
    setTransmittingNotification(true)
    // Simulate real pre-arrival telemetry transmission to ER trauma team
    await new Promise((res) => setTimeout(res, 800))
    setTransmittingNotification(false)
    setNotificationSent(true)
  }

  return (
    <ProtectedRoute allowedRoles={['PARAMEDIC', 'CONTROL_ROOM', 'ADMIN']}>
      <div className="min-h-svh bg-background text-foreground">
        <DashboardTopbar
          ambulanceId={currentVehicle?.vehicleId || 'AMB-01'}
          driverName={currentVehicle?.driverName || 'Officer Paramedic'}
          emergencyActive={currentEmergency?.status !== 'RESOLVED'}
          lastRefreshed={lastRefreshed}
        />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <HeartPulse className="size-4" />
              </span>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Pre-Hospital Clinical Triage & Hospital Readiness
              </h1>
              <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                PARAMEDIC WORKSPACE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Patient, transport, and destination overview
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono border border-border bg-card text-foreground">
              {socketConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>SOCKET CONNECTED</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>SOCKET DISCONNECTED</span>
                </span>
              )}
            </div>

            <Button
              onClick={fetchParamedicData}
              disabled={loading}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-foreground border-border hover:bg-muted"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Emergency Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-mono text-muted-foreground shrink-0">Active Calls:</span>
          {emergencies.map((emg) => (
            <button
              key={emg.emergencyId}
              type="button"
              onClick={() => setSelectedEmergencyId(emg.emergencyId)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border shrink-0 transition-colors cursor-pointer',
                selectedEmergencyId === emg.emergencyId
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300 font-bold'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Siren className="size-3 text-rose-500 dark:text-rose-400" />
              <span>{emg.emergencyId}</span>
              <span className="text-[10px] text-muted-foreground font-mono">({emg.type})</span>
            </button>
          ))}
        </div>

        {/* Main Grid: Patient & Clinical Vitals Left, Hospital Readiness Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Clinical Patient Profile & Continuous Vitals */}
          <div className="lg:col-span-7 space-y-6">
            {/* Patient Incident Header Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Patient Profile & Incident Information
                  </span>
                </div>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase border',
                  currentEmergency?.priority === 'CRITICAL'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                )}>
                  {currentEmergency?.priority} PRIORITY
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                <div className="rounded-xl bg-muted/60 border border-border p-3">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Emergency Type</span>
                  <div className="mt-1 font-bold text-foreground">{currentEmergency?.type}</div>
                </div>
                <div className="rounded-xl bg-muted/60 border border-border p-3">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Caller Name</span>
                  <div className="mt-1 font-bold text-foreground">{currentEmergency?.callerName || 'Bystander Report'}</div>
                </div>
                <div className="rounded-xl bg-muted/60 border border-border p-3">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Caller Contact</span>
                  <div className="mt-1 font-bold text-cyan-600 dark:text-cyan-400 font-mono">{currentEmergency?.callerContact || '+91 98450 12345'}</div>
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 border border-border p-3 text-xs">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Scene Description</span>
                <p className="mt-1 text-muted-foreground leading-relaxed font-medium">
                  {currentEmergency?.description || 'Two-wheeler and heavy transport vehicle collision near Richmond Circle junction.'}
                </p>
              </div>
            </div>

            {/* Continuous Clinical Vitals Stream */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Patient vitals
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 rounded-full bg-amber-500/10 px-2 py-1">
                  LOCAL DEMO VALUES · NOT DEVICE TELEMETRY
                </span>
              </div>

              {/* Vitals KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold uppercase mb-1">
                    <Heart className="size-3 text-rose-500 fill-rose-500" />
                    <span>Heart Rate</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground">{heartRate}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">BPM (Normal: 60-100)</div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase mb-1">
                    <Activity className="size-3 text-cyan-500" />
                    <span>Blood Pressure</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground">{bloodPressure}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">mmHg</div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">
                    <Stethoscope className="size-3 text-blue-500" />
                    <span>SpO2</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">{spo2}%</div>
                  <div className="text-[10px] font-mono text-muted-foreground">15L Non-Rebreather</div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase mb-1">
                    <BrainCircuit className="size-3 text-purple-500" />
                    <span>GCS Score</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground">{gcsScore}/15</div>
                  <div className="text-[10px] font-mono text-muted-foreground">E4 V4 M6 (Conscious)</div>
                </div>
              </div>

              <Disclosure title="Clinical notes & interventions" summary="Local workspace text · not transmitted">
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Clinical Pre-Hospital Notes & Interventions
                </label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                />
              </Disclosure>
            </div>
          </div>

          {/* Right Column (5 cols): Destination Hospital Readiness & ER Handoff */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Hospital className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Destination ER Trauma Bay
                  </span>
                </div>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  DEMO READINESS
                </span>
              </div>

              {/* Hospital Target Card */}
              <div className="rounded-xl border border-border bg-muted/60 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {currentVehicle?.hospitalName || 'St. John’s Medical College Hospital'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Level 1 Trauma & Comprehensive Stroke Center
                    </p>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse mt-1" />
                </div>

                {/* Live GeoAgent Corridor ETA Sync */}
                <div className="rounded-lg bg-card border border-border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Predicted corridor ETA</div>
                      <div className="font-mono text-lg font-bold text-foreground">
                        {prediction?.predictedDurationMinutes ?? '—'}{prediction ? ' MINUTES' : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground px-2 py-1 rounded bg-muted">
                    {prediction ? 'BACKEND PREDICTION' : 'NO PREDICTION'}
                  </span>
                </div>

                <Disclosure title="Hospital readiness details" summary="Local demo fields · no receiving-capacity API">
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Trauma Team Readiness:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">STANDBY CONFIRMED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Blood Bank (O-Negative):</span>
                    <span className="font-bold text-foreground">4 UNITS RESERVED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>CT Suite:</span>
                    <span className="font-bold text-foreground">PRE-ALERTED</span>
                  </div>
                </div>
                </Disclosure>
              </div>

              {/* Transmit Pre-Arrival Summary Action */}
              <div className="mt-5 space-y-3">
                {notificationSent && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>Demo confirmation shown locally. No packet was sent to a hospital system.</span>
                  </div>
                )}

                <Button
                  onClick={handleTransmitPreArrival}
                  disabled={transmittingNotification}
                  className="w-full font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/20 transition-colors cursor-pointer"
                >
                  <Send className="size-4" />
                  <span>
                    {transmittingNotification
                      ? 'Simulating transmission...'
                      : 'Simulate pre-arrival packet'}
                  </span>
                </Button>

                <p className="text-[11px] text-center text-muted-foreground font-mono">
                  Demonstration only: GCS {gcsScore}, HR {heartRate}, BP {bloodPressure}, and SpO2 {spo2}% are not sent to an ER.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
