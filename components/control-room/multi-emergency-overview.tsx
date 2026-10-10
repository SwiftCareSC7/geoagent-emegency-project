'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Siren,
  AlertTriangle,
  Ambulance,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  MapPin,
  Clock,
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { emergencyApi } from '@/lib/api/emergencies'
import { vehicleApi } from '@/lib/api/vehicles'
import { DEMO_EMERGENCIES, DEMO_VEHICLES } from '@/lib/demo-fixtures'
import { getSocket, REALTIME_EVENTS } from '@/lib/socket/client'
import { cn } from '@/lib/utils'
import type {
  Emergency,
  Vehicle,
  EmergencyPriority,
  EmergencyStatus,
  EmergencyType,
  CreateEmergencyPayload
} from '@/lib/api/types'

const PRIORITY_BADGES: Record<string, { label: string; className: string; pulse?: boolean }> = {
  CRITICAL: {
    label: 'Critical',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
    pulse: true,
  },
  HIGH: {
    label: 'High Priority',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-semibold',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  LOW: {
    label: 'Low',
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  REPORTED: {
    label: 'Reported',
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
  DISPATCHED: {
    label: 'Dispatched',
    className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  },
  EN_ROUTE_SCENE: {
    label: 'En Route to Scene',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium',
  },
  ON_SCENE: {
    label: 'At Scene',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium',
  },
  EN_ROUTE_HOSPITAL: {
    label: 'En Route to Hospital',
    className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-medium',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
}

export function MultiEmergencyOverview() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isSimulated, setIsSimulated] = useState<boolean>(false)
  const [socketConnected, setSocketConnected] = useState<boolean>(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Intake Modal State
  const [intakeModalOpen, setIntakeModalOpen] = useState<boolean>(false)
  const [intakeSubmitting, setIntakeSubmitting] = useState<boolean>(false)
  const [intakeError, setIntakeError] = useState<string | null>(null)
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null)

  // Intake Form
  const [intakeType, setIntakeType] = useState<EmergencyType>('MEDICAL')
  const [intakePriority, setIntakePriority] = useState<EmergencyPriority>('HIGH')
  const [intakeDescription, setIntakeDescription] = useState<string>('')
  const [intakeCallerName, setIntakeCallerName] = useState<string>('')
  const [intakeCallerContact, setIntakeCallerContact] = useState<string>('')
  const [intakeLng, setIntakeLng] = useState<string>('77.6271')
  const [intakeLat, setIntakeLat] = useState<string>('12.9352')

  const fetchOverviewData = useCallback(async () => {
    try {
      setError(null)
      const [eRes, vRes] = await Promise.allSettled([
        emergencyApi.list(),
        vehicleApi.list()
      ])

      let loadedRealData = false

      if (eRes.status === 'fulfilled' && eRes.value.data && eRes.value.data.length > 0) {
        setEmergencies(eRes.value.data)
        loadedRealData = true
      }

      if (vRes.status === 'fulfilled' && vRes.value.data && vRes.value.data.length > 0) {
        setVehicles(vRes.value.data)
      }

      if (loadedRealData) {
        setIsSimulated(false)
      } else {
        const isProd = process.env.NODE_ENV === 'production'
        if (isProd) {
          setIsSimulated(false)
          setEmergencies([])
          setVehicles([])
          setError('No active operational emergencies in production database.')
        } else {
          setIsSimulated(true)
          setEmergencies(DEMO_EMERGENCIES.map(e => ({ ...e, isSimulated: true } as any)))
          setVehicles(DEMO_VEHICLES.map(v => ({ ...v, isSimulated: true } as any)))
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch emergency fleet stream')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOverviewData()
  }, [fetchOverviewData])

  // Socket.IO subscriptions for live dispatch updates
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

    const onEmergencyCreated = (envelope: any) => {
      const created = envelope?.data || envelope
      if (!created?.emergencyId) return
      setEmergencies((prev) => {
        if (prev.some((e) => e.emergencyId === created.emergencyId)) return prev
        return [created, ...prev]
      })
    }

    const onEmergencyUpdated = (envelope: any) => {
      const updated = envelope?.data || envelope
      if (!updated?.emergencyId) return
      setEmergencies((prev) =>
        prev.map((e) => (e.emergencyId === updated.emergencyId ? { ...e, ...updated } : e))
      )
    }

    socket.on(REALTIME_EVENTS.EMERGENCY_CREATED, onEmergencyCreated)
    socket.on(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(REALTIME_EVENTS.EMERGENCY_CREATED, onEmergencyCreated)
      socket.off(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)
      socket.emit('room:leave', { room: 'control-room' })
    }
  }, [])

  // Filtered emergency list
  const filteredEmergencies = useMemo(() => {
    return emergencies.filter((e) => {
      if (selectedPriority !== 'ALL' && e.priority !== selectedPriority) return false
      if (selectedStatus !== 'ALL' && e.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchId = e.emergencyId?.toLowerCase().includes(query)
        const matchType = e.type?.toLowerCase().includes(query)
        const matchDesc = e.description?.toLowerCase().includes(query)
        const matchCaller = e.callerName?.toLowerCase().includes(query)
        if (!matchId && !matchType && !matchDesc && !matchCaller) return false
      }
      return true
    })
  }, [emergencies, selectedPriority, selectedStatus, searchQuery])

  // Summary counts
  const activeEmergencies = emergencies.filter((e) => !['RESOLVED', 'CANCELLED'].includes(e.status))
  const criticalCount = activeEmergencies.filter((e) => e.priority === 'CRITICAL').length
  const highCount = activeEmergencies.filter((e) => e.priority === 'HIGH').length
  const assignedVehiclesCount = activeEmergencies.filter((e) => !!e.assignedVehicle).length

  const handleManualRefresh = () => {
    setRefreshing(true)
    fetchOverviewData()
  }

  // Handle emergency intake creation
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIntakeError(null)
    setIntakeSuccess(null)

    const lng = parseFloat(intakeLng)
    const lat = parseFloat(intakeLat)

    if (isNaN(lng) || isNaN(lat)) {
      setIntakeError('Please provide valid longitude and latitude coordinates.')
      return
    }

    setIntakeSubmitting(true)
    try {
      const payload: CreateEmergencyPayload = {
        type: intakeType,
        priority: intakePriority,
        description: intakeDescription.trim() || undefined,
        callerName: intakeCallerName.trim() || undefined,
        callerContact: intakeCallerContact.trim() || undefined,
        location: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      }

      const res = await emergencyApi.create(payload)
      if (res.data) {
        setIntakeSuccess(`Emergency ${res.data.emergencyId} registered successfully!`)
        // Append to top of list
        setEmergencies((prev) => [res.data, ...prev])
        // Reset form
        setIntakeDescription('')
        setIntakeCallerName('')
        setIntakeCallerContact('')
        setTimeout(() => {
          setIntakeModalOpen(false)
          setIntakeSuccess(null)
        }, 1200)
      }
    } catch (err: any) {
      setIntakeError(err?.message || 'Failed to submit emergency intake call.')
    } finally {
      setIntakeSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <Siren className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-display text-foreground tracking-tight">
                  Central Control Room — Multi-Mission Overview
                </h1>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Fleet Ops
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Consolidated operational emergency dispatches, response units, and active corridors
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Socket Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border bg-card shadow-xs">
              {isSimulated ? (
                <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>SIMULATED {socketConnected ? '(STREAM READY)' : '(OFFLINE)'}</span>
                </span>
              ) : socketConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>DISPATCH STREAM LIVE</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-cyan-500 font-medium">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  <span>POLLING BACKEND</span>
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
            >
              <RefreshCw className={cn('size-3.5 mr-1.5', (refreshing || loading) && 'animate-spin')} />
              <span>Refresh</span>
            </Button>

            <Link href="/control-room">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Layers className="size-3.5" />
                <span>Corridor Map View</span>
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => {
                setIntakeError(null)
                setIntakeSuccess(null)
                setIntakeModalOpen(true)
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="size-4" />
              <span>New Intake Call</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Simulation Environment Notice */}
        {isSimulated && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-4" />
              </span>
              <div>
                <p className="font-bold">
                  SIMULATED / DEMO SCENARIO ENVIRONMENT
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Showing canonical demonstration emergency records. Actuation workflows will not deploy real-world field response units.
                </p>
              </div>
            </div>
            <span className="rounded-md border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">
              SIMULATED DATA
            </span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchOverviewData}>
              Retry
            </Button>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Active
              </span>
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Activity className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold font-display text-foreground">
              {activeEmergencies.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emergencies.length} total calls in system
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Critical Priority
              </span>
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold font-display text-rose-600 dark:text-rose-400">
              {criticalCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Immediate life-threat priority
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                High Priority
              </span>
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                <ShieldAlert className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold font-display text-orange-600 dark:text-orange-400">
              {highCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Urgent response required
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Units Dispatched
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Ambulance className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
              {assignedVehiclesCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ambulances actively allocated
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search emergency ID, description, caller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Priority:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPriority(p)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                  selectedPriority === p
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Emergency Missions Table / Grid */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
            ))}
          </div>
        ) : filteredEmergencies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Siren className="mx-auto size-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-bold font-display text-foreground">
              {emergencies.length === 0 ? 'No Active Emergency Missions' : 'No Emergencies Match Filter'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {emergencies.length === 0
                ? 'All emergency response channels are clear. Use "New Intake Call" to log an incoming incident.'
                : 'Try adjusting your search criteria or clearing priority filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmergencies.map((emg) => {
              const priority = PRIORITY_BADGES[emg.priority] || PRIORITY_BADGES.MEDIUM
              const status = STATUS_BADGES[emg.status] || STATUS_BADGES.REPORTED
              const assignedVehId =
                typeof emg.assignedVehicle === 'object' && emg.assignedVehicle !== null && 'vehicleId' in emg.assignedVehicle
                  ? emg.assignedVehicle.vehicleId
                  : typeof emg.assignedVehicle === 'string'
                  ? emg.assignedVehicle
                  : null

              const assignedVehObj = assignedVehId ? vehicles.find((v) => v.vehicleId === assignedVehId) : null
              const isSim = (emg as any).isSimulated || emg.emergencyId?.startsWith('E-DEMO-')

              return (
                <div
                  key={emg.emergencyId || emg.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-bold text-foreground">
                          {emg.emergencyId}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-foreground uppercase tracking-wide">
                          {emg.type}
                        </span>
                        {isSim && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            SIMULATED
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                            priority.className,
                            priority.pulse && 'animate-pulse'
                          )}
                        >
                          {priority.label}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      {emg.description && (
                        <p className="text-xs text-foreground/90 font-medium">
                          {emg.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-rose-500" />
                          <span>
                            Location: [{emg.location?.coordinates?.[0]?.toFixed(4)}, {emg.location?.coordinates?.[1]?.toFixed(4)}]
                          </span>
                        </div>
                        {emg.callerName && (
                          <div className="flex items-center gap-1.5">
                            <PhoneCall className="size-3.5 text-muted-foreground" />
                            <span>Caller: {emg.callerName} {emg.callerContact ? `(${emg.callerContact})` : ''}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted-foreground" />
                          <span>Updated: {emg.updatedAt ? new Date(emg.updatedAt).toLocaleTimeString() : 'Recent'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-right">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Assigned Unit
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                          <Ambulance className="size-3.5 text-primary" />
                          <span>{assignedVehId || 'UNASSIGNED'}</span>
                        </div>
                      </div>

                      <Link href={`/control-room`}>
                        <Button size="sm" className="gap-1.5 font-semibold">
                          <span>Corridor Analysis</span>
                          <ArrowUpRight className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Emergency Intake Modal */}
      <Modal
        open={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        title="Emergency Intake Call Registration"
        description="Log an urgent incoming emergency call to dispatch fleet response and begin corridor clearing."
      >
        <form onSubmit={handleIntakeSubmit} className="space-y-4">
          {intakeError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{intakeError}</span>
            </div>
          )}

          {intakeSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{intakeSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Emergency Type *
              </label>
              <select
                value={intakeType}
                onChange={(e) => setIntakeType(e.target.value as EmergencyType)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="MEDICAL">Medical Incident</option>
                <option value="ACCIDENT">Traffic Collision</option>
                <option value="CARDIAC">Cardiac Arrest</option>
                <option value="TRAUMA">Severe Trauma</option>
                <option value="FIRE">Fire Hazard</option>
                <option value="RESPIRATORY">Respiratory Distress</option>
                <option value="OBSTETRIC">Obstetric Emergency</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Priority Tier *
              </label>
              <select
                value={intakePriority}
                onChange={(e) => setIntakePriority(e.target.value as EmergencyPriority)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="CRITICAL">CRITICAL (Immediate Siren)</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="LOW">LOW Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Scene Description & Chief Complaint
            </label>
            <textarea
              rows={2}
              value={intakeDescription}
              onChange={(e) => setIntakeDescription(e.target.value)}
              placeholder="e.g. 2-vehicle collision with head trauma, patient unconscious..."
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Caller Name
              </label>
              <input
                type="text"
                value={intakeCallerName}
                onChange={(e) => setIntakeCallerName(e.target.value)}
                placeholder="e.g. Traffic Police Patrol"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Caller Contact
              </label>
              <input
                type="text"
                value={intakeCallerContact}
                onChange={(e) => setIntakeCallerContact(e.target.value)}
                placeholder="+91 98450 00000"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Scene Coordinates [Longitude, Latitude] *
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={intakeLng}
                onChange={(e) => setIntakeLng(e.target.value)}
                placeholder="Longitude (77.xxxx)"
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                value={intakeLat}
                onChange={(e) => setIntakeLat(e.target.value)}
                placeholder="Latitude (12.xxxx)"
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground py-0.5">Presets:</span>
              <button
                type="button"
                onClick={() => { setIntakeLng('77.6271'); setIntakeLat('12.9352'); }}
                className="rounded px-2 py-0.5 text-[10px] bg-muted hover:bg-muted/80 text-foreground"
              >
                Koramangala
              </button>
              <button
                type="button"
                onClick={() => { setIntakeLng('77.6413'); setIntakeLat('12.9784'); }}
                className="rounded px-2 py-0.5 text-[10px] bg-muted hover:bg-muted/80 text-foreground"
              >
                Indiranagar
              </button>
              <button
                type="button"
                onClick={() => { setIntakeLng('77.5925'); setIntakeLat('13.0358'); }}
                className="rounded px-2 py-0.5 text-[10px] bg-muted hover:bg-muted/80 text-foreground"
              >
                Hebbal
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIntakeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={intakeSubmitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              {intakeSubmitting ? (
                <>
                  <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                  Registering...
                </>
              ) : (
                'Dispatch Call'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
