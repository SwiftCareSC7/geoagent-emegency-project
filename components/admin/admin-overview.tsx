'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Database,
  Activity,
  Users,
  Ambulance,
  AlertTriangle,
  MapPin,
  Route as RouteIcon,
  BrainCircuit,
  Cpu,
  RefreshCw,
  Clock,
  Radio,
  Server,
  Sparkles
} from 'lucide-react'
import { adminApi } from '@/lib/api/admin'
import type { AdminSystemStats, AdminDatabaseHealth, AdminSystemHealthSummary } from '@/lib/api/types'
import { Button } from '@/components/ui/button'

export function AdminOverview() {
  const [stats, setStats] = useState<AdminSystemStats | null>(null)
  const [dbHealth, setDbHealth] = useState<AdminDatabaseHealth | null>(null)
  const [providers, setProviders] = useState<AdminSystemHealthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [statsRes, healthRes, provRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getHealth(),
        adminApi.getProviders()
      ])
      setStats(statsRes.data)
      setDbHealth(healthRes.data)
      setProviders(provRes.data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load system overview telemetry')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-8 text-center backdrop-blur-sm">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Gathering real-time system metrics & database state...</p>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="size-10 text-destructive" />
        <div>
          <h3 className="text-base font-semibold text-foreground">Operational Observability Error</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => fetchData(true)} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="size-4" /> Retry
        </Button>
      </div>
    )
  }

  const counts = stats?.counts || {
    users: 0,
    vehicles: 0,
    activeVehicles: 0,
    emergencies: 0,
    activeEmergencies: 0,
    incidents: 0,
    activeIncidents: 0,
    trajectories: 0,
    routes: 0,
    decisions: 0,
    pendingDecisions: 0,
    predictions: 0
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 ring-1 ring-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {status}
          </span>
        )
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500 ring-1 ring-amber-500/20">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {status}
          </span>
        )
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/20">
            {status}
          </span>
        )
      case 'DISCONNECTED':
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-500 ring-1 ring-rose-500/20">
            {status || 'OFFLINE'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar with Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">System Overview & Diagnostics</h2>
          <p className="text-xs text-muted-foreground">
            Authoritative MongoDB counts, live database roundtrip latency, and upstream provider statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats?.timestamp && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {new Date(stats.timestamp).toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={() => fetchData(true)}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="gap-2 border-border/60 bg-card/60 backdrop-blur-sm"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh Live State'}
          </Button>
        </div>
      </div>

      {/* Database & System Infrastructure Health Banner */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* MongoDB Card */}
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-card/50 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                <Database className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">MongoDB Primary</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {dbHealth?.databaseName || 'geoagent-emergency'}
                </p>
              </div>
            </div>
            {getStatusBadge(dbHealth?.status)}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Latency:</span>
              <p className="font-mono font-semibold text-foreground">
                {dbHealth?.latencyMs !== null && dbHealth?.latencyMs !== undefined
                  ? `${dbHealth.latencyMs} ms`
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Ready State:</span>
              <p className="font-semibold text-foreground">{dbHealth?.readyState || 'UNKNOWN'}</p>
            </div>
          </div>
        </div>

        {/* Upstream Providers Card */}
        <div className="col-span-1 rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-card/50 p-5 shadow-sm backdrop-blur-md lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">External Intelligence & Routing Providers</h3>
            </div>
            <span className="text-xs text-muted-foreground">Advisory & Telemetry Ingestion</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RouteIcon className="size-3.5 text-blue-400" /> Google Routes
              </div>
              <div className="mt-2">{getStatusBadge(providers?.providers?.googleRoutes?.status)}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Mode: {providers?.providers?.googleRoutes?.mode || 'mock'}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-emerald-400" /> Google Roads
              </div>
              <div className="mt-2">{getStatusBadge(providers?.providers?.googleRoads?.status)}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Mode: {providers?.providers?.googleRoads?.mode || 'mock'}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-purple-400" /> Gemini 2.5 Flash
              </div>
              <div className="mt-2">{getStatusBadge(providers?.providers?.geminiAi?.status)}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Advisory Reasoning
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Radio className="size-3.5 text-cyan-400" /> Socket.IO
              </div>
              <div className="mt-2">{getStatusBadge('AVAILABLE')}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Live Broadcast
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Verified Operational Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {/* Users */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Users className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.users}</p>
          <p className="text-xs font-medium text-muted-foreground">Users</p>
        </div>

        {/* Vehicles */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Ambulance className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.vehicles}</p>
          <p className="text-xs font-medium text-muted-foreground">
            Vehicles <span className="text-emerald-400">({counts.activeVehicles} active)</span>
          </p>
        </div>

        {/* Emergencies */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
            <Activity className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.emergencies}</p>
          <p className="text-xs font-medium text-muted-foreground">
            Emergencies <span className="text-rose-400">({counts.activeEmergencies} active)</span>
          </p>
        </div>

        {/* Incidents */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.incidents}</p>
          <p className="text-xs font-medium text-muted-foreground">
            Incidents <span className="text-amber-400">({counts.activeIncidents} active)</span>
          </p>
        </div>

        {/* Trajectories */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
            <MapPin className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">
            {counts.trajectories.toLocaleString()}
          </p>
          <p className="text-xs font-medium text-muted-foreground">GPS Points (Est.)</p>
        </div>

        {/* Routes */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <RouteIcon className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.routes}</p>
          <p className="text-xs font-medium text-muted-foreground">Routes</p>
        </div>

        {/* Predictions */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <Cpu className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.predictions}</p>
          <p className="text-xs font-medium text-muted-foreground">Predictions</p>
        </div>

        {/* Decisions */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <BrainCircuit className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{counts.decisions}</p>
          <p className="text-xs font-medium text-muted-foreground">
            Decisions <span className="text-amber-400">({counts.pendingDecisions} pending)</span>
          </p>
        </div>
      </div>

      {/* 24-Hour Activity Window */}
      <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Operational Flow (Last 24 Hours)
        </h4>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 p-3">
            <span className="text-xs text-muted-foreground">New Emergency Intake</span>
            <span className="font-mono text-sm font-bold text-foreground">
              +{stats?.recentActivity?.emergenciesLast24h || 0}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 p-3">
            <span className="text-xs text-muted-foreground">Decisions Evaluated</span>
            <span className="font-mono text-sm font-bold text-foreground">
              +{stats?.recentActivity?.decisionsLast24h || 0}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 p-3">
            <span className="text-xs text-muted-foreground">Road Hazards Logged</span>
            <span className="font-mono text-sm font-bold text-foreground">
              +{stats?.recentActivity?.incidentsLast24h || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
