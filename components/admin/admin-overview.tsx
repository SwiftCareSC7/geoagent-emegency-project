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
  Sparkles,
  Gauge,
  Info,
  Map as MapIcon,
  ShieldAlert,
} from 'lucide-react'
import { adminApi } from '@/lib/api/admin'
import { decisionApi } from '@/lib/api/decisions'
import type { AdminSystemStats, AdminDatabaseHealth, AdminSystemHealthSummary, Decision } from '@/lib/api/types'
import { Button } from '@/components/ui/button'

export function AdminOverview() {
  const [stats, setStats] = useState<AdminSystemStats | null>(null)
  const [dbHealth, setDbHealth] = useState<AdminDatabaseHealth | null>(null)
  const [providers, setProviders] = useState<AdminSystemHealthSummary | null>(null)
  const [predictionAnalytics, setPredictionAnalytics] = useState<any>(null)
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [statsRes, healthRes, provRes, decRes, predAnalyticsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getHealth(),
        adminApi.getProviders(),
        decisionApi.list().catch(() => ({ data: [] })),
        adminApi.getPredictionAnalytics().catch(() => null),
      ])
      setStats(statsRes.data)
      setDbHealth(healthRes.data)
      setProviders(provRes.data)
      if (predAnalyticsRes && predAnalyticsRes.data) {
        setPredictionAnalytics(predAnalyticsRes.data)
      }
      if (decRes && Array.isArray(decRes.data)) {
        setRecentDecisions(decRes.data.slice(0, 5))
      }
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

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
              <div className="mt-2">{getStatusBadge(providers?.providers?.gemini?.status || providers?.providers?.geminiAi?.status)}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Advisory Reasoning
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cpu className="size-3.5 text-amber-400" /> Python / V2X
              </div>
              <div className="mt-2">{getStatusBadge(providers?.providers?.pythonV2X?.status || 'AVAILABLE')}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                {providers?.providers?.pythonV2X?.engine === 'python' ? 'Native Python 3.12' : 'JS Fallback Engine'}
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Radio className="size-3.5 text-cyan-400" /> Socket.IO
              </div>
              <div className="mt-2">{getStatusBadge(providers?.providers?.socketIO?.status || 'AVAILABLE')}</div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Live Broadcast
              </p>
            </div>

            <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapIcon className="size-3.5 text-slate-400" /> CARTO Basemap
              </div>
              <div className="mt-2">
                {getStatusBadge(
                  providers?.providers?.cartoBasemap?.status ||
                  (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_CARTO_API_KEY ? 'AVAILABLE' : 'NOT_CONFIGURED')
                )}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                Dark Matter Tiles
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

      {/* Real-World Prediction Model Performance & Ground-Truth Validation Dashboard */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-card/50 p-5 shadow-sm backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/40 gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Prediction Model Performance & Ground-Truth Validation
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Observed corridor arrival outcomes vs predicted ETAs & delay risk categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{predictionAnalytics?.model?.version || 'v1.3-exponential-traffic-blend'}</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
              {predictionAnalytics?.model?.type ? 'Non-ML Heuristic' : 'Deterministic Kinematic'}
            </span>
          </div>
        </div>

        {/* Statistical Sample Size Integrity Banner */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 text-xs">
          <Info className="size-4 shrink-0 text-cyan-400" />
          <div className="flex-1 text-[11px] text-slate-300">
            <strong>Sample Size Integrity (N = {predictionAnalytics?.evaluation?.evaluatedGroundTruthSamples ?? 0}):</strong>{' '}
            {predictionAnalytics?.evaluation?.sampleSizeMessage ||
              'Awaiting completed emergency mission ground truth. Metric claims require meaningful sample size.'}
          </div>
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
            Status: {predictionAnalytics?.evaluation?.sampleSizeStatus || 'INSUFFICIENT_DATA'}
          </span>
        </div>

        {/* Prediction Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
            <span className="text-[11px] text-muted-foreground font-medium">ETA MAE (Mean Error)</span>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">
              {predictionAnalytics?.evaluation?.maeMinutes !== null && predictionAnalytics?.evaluation?.maeMinutes !== undefined
                ? `${predictionAnalytics.evaluation.maeMinutes}m`
                : '—'}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">
              N = {predictionAnalytics?.evaluation?.evaluatedGroundTruthSamples ?? 0} samples
            </span>
          </div>

          <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
            <span className="text-[11px] text-muted-foreground font-medium">Median Absolute Error</span>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">
              {predictionAnalytics?.evaluation?.medianErrorMinutes !== null && predictionAnalytics?.evaluation?.medianErrorMinutes !== undefined
                ? `${predictionAnalytics.evaluation.medianErrorMinutes}m`
                : '—'}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">50th percentile</span>
          </div>

          <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
            <span className="text-[11px] text-muted-foreground font-medium">Within 3-Min Window</span>
            <p className="mt-1 text-xl font-bold font-mono text-emerald-400">
              {predictionAnalytics?.evaluation?.toleranceBuckets?.within3MinutesPercent !== null &&
              predictionAnalytics?.evaluation?.toleranceBuckets?.within3MinutesPercent !== undefined
                ? `${predictionAnalytics.evaluation.toleranceBuckets.within3MinutesPercent}%`
                : 'N < 5 (Pending)'}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">Operational dispatch tolerance</span>
          </div>

          <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
            <span className="text-[11px] text-muted-foreground font-medium">Severe-Delay Misses</span>
            <p className="mt-1 text-xl font-bold font-mono text-emerald-400">
              {predictionAnalytics?.evaluation?.riskClassification?.severeDelayMisses ?? 0}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">False negative risk safety check</span>
          </div>
        </div>

        {/* Counterfactual Routing & AI Governance Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-border/30 bg-muted/10 p-3 space-y-1">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span>Route Recommendations & Counterfactuals</span>
              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                ESTIMATED / COUNTERFACTUAL
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Alternative route time savings are tracked as model estimates. Counterfactual projections are never
              claimed as physical facts unless the alternate corridor was actually traveled.
            </p>
          </div>

          <div className="rounded-xl border border-border/30 bg-muted/10 p-3 space-y-1">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span>Gemini Advisory vs Deterministic Policy</span>
              <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                ADVISORY ONLY
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              AI agreement rate:{' '}
              <strong className="text-foreground">
                {predictionAnalytics?.aiGovernance?.geminiAgreementRatePercent !== null &&
                predictionAnalytics?.aiGovernance?.geminiAgreementRatePercent !== undefined
                  ? `${predictionAnalytics.aiGovernance.geminiAgreementRatePercent}%`
                  : 'N/A'}
              </strong>{' '}
              · Note: Agreement with deterministic rules reflects operational alignment, not ground-truth physical accuracy.
            </p>
          </div>
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

      {/* Recent Authoritative Operational Decisions */}
      {recentDecisions.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-amber-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Operational Decisions & Approvals
              </h4>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Deterministic Engine & Human Operator
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/40 text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Decision ID</th>
                  <th className="py-2 px-3">Emergency</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Summary Rationale</th>
                  <th className="py-2 px-3">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {recentDecisions.map((dec) => (
                  <tr key={dec.id || dec.decisionId} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-foreground font-medium">
                      {dec.decisionId}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {dec.emergencyId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-semibold text-primary">
                        {dec.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                          dec.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20'
                            : dec.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20'
                            : dec.status === 'EXECUTED'
                            ? 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20'
                            : 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20'
                        }`}
                      >
                        {dec.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate" title={dec.details?.summary || ''}>
                      {dec.details?.summary || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {dec.evaluatedAt ? new Date(dec.evaluatedAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
