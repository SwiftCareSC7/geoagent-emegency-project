'use client'

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  FileSearch,
  Layers,
  MapPin,
  Milestone,
  RefreshCw,
  Route as RouteIcon,
  Shield,
  Siren,
  TrafficCone,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  analysisApi,
  emergencyApi,
  orchestrationApi,
  routeApi,
  trajectoryApi,
  vehicleApi,
  type Emergency,
  type OrchestrationWorkflowResult,
  type Route,
  type SituationAnalysis,
  type Trajectory,
  type Vehicle,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { EmergencyOverviewCard } from './emergency-overview-card'
import { VehicleMovementPanel } from './vehicle-movement-panel'
import { RouteAnalysisPanel } from './route-analysis-panel'
import { DeviationAnalysisPanel } from './deviation-analysis-panel'
import { CorrelatedIncidentsPanel } from './correlated-incidents-panel'
import { EpistemicBreakdownCard } from './epistemic-breakdown-card'
import { cn } from '@/lib/utils'

interface EmergencyDetailViewProps {
  emergencyId: string
}

export function EmergencyDetailView({ emergencyId }: EmergencyDetailViewProps) {
  const [emergency, setEmergency] = useState<Emergency | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [latestTrajectory, setLatestTrajectory] = useState<Trajectory | null>(null)
  const [trajectoryHistory, setTrajectoryHistory] = useState<Trajectory[]>([])
  const [trajectoryTotal, setTrajectoryTotal] = useState<number>(0)
  const [trajectoryPage, setTrajectoryPage] = useState<number>(1)
  const [situationAnalysis, setSituationAnalysis] = useState<SituationAnalysis | null>(null)
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationWorkflowResult | null>(null)

  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      // 1. Fetch Emergency Record
      let emg: Emergency
      try {
        const emgRes = await emergencyApi.get(emergencyId)
        emg = emgRes.data
        setEmergency(emg)
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }
        throw err
      }

      // 2. Resolve Vehicle ID if assigned
      let assignedVehId: string | null = null
      if (emg.assignedVehicle) {
        if (typeof emg.assignedVehicle === 'object' && 'vehicleId' in emg.assignedVehicle) {
          assignedVehId = emg.assignedVehicle.vehicleId
        } else if (typeof emg.assignedVehicle === 'string') {
          assignedVehId = emg.assignedVehicle
        }
      }

      // 3. Concurrent sub-resource requests
      const promises: Promise<unknown>[] = []

      // Route for emergency
      const routePromise = routeApi
        .getForEmergency(emergencyId)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setRoute(res.data[0])
          } else {
            setRoute(null)
          }
        })
        .catch(() => setRoute(null))
      promises.push(routePromise)

      // Vehicle details if assigned
      if (assignedVehId) {
        const vehPromise = vehicleApi
          .get(assignedVehId)
          .then((res) => setVehicle(res.data))
          .catch(() => setVehicle(null))
        promises.push(vehPromise)

        // Latest GPS telemetry
        const latestTrajPromise = trajectoryApi
          .getLatestSafe(assignedVehId)
          .then((traj) => setLatestTrajectory(traj))
        promises.push(latestTrajPromise)

        // Trajectory History (Page 1, 5 fixes)
        const trajHistoryPromise = trajectoryApi
          .getHistory(assignedVehId, { page: 1, limit: 5 })
          .then((res) => {
            setTrajectoryHistory(res.data || [])
            setTrajectoryTotal(res.pagination?.total || 0)
          })
          .catch(() => {
            setTrajectoryHistory([])
            setTrajectoryTotal(0)
          })
        promises.push(trajHistoryPromise)

        // Situation Analysis
        const analysisPromise = analysisApi
          .getVehicleSituationSafe(assignedVehId)
          .then((analysis) => setSituationAnalysis(analysis))
        promises.push(analysisPromise)
      } else {
        setVehicle(null)
        setLatestTrajectory(null)
        setTrajectoryHistory([])
        setTrajectoryTotal(0)
        setSituationAnalysis(null)
      }

      // Orchestration full mission analysis
      const orchPromise = orchestrationApi
        .analyzeEmergencySafe(emergencyId)
        .then((result) => setOrchestrationResult(result))
      promises.push(orchPromise)

      await Promise.allSettled(promises)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err: unknown) {
      console.error('[EmergencyDetailView] Error loading emergency:', err)
      setError(err instanceof Error ? err.message : 'Failed to load emergency data')
    } finally {
      setLoading(false)
    }
  }, [emergencyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Trajectory pagination change
  const handlePageChange = async (newPage: number) => {
    let assignedVehId: string | null = null
    if (emergency?.assignedVehicle) {
      assignedVehId =
        typeof emergency.assignedVehicle === 'object'
          ? emergency.assignedVehicle.vehicleId
          : emergency.assignedVehicle
    }
    if (!assignedVehId) return

    try {
      const res = await trajectoryApi.getHistory(assignedVehId, { page: newPage, limit: 5 })
      setTrajectoryHistory(res.data || [])
      setTrajectoryPage(newPage)
    } catch (err) {
      console.error('[EmergencyDetailView] Failed to paginate trajectory:', err)
    }
  }

  // Handle manual "Re-run Mission Analysis" trigger
  const handleRerunAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await orchestrationApi.analyzeEmergency(emergencyId)
      if (res.data) {
        setOrchestrationResult(res.data)
        if (res.data.analysis && 'deviation' in res.data.analysis) {
          setSituationAnalysis(res.data.analysis as SituationAnalysis)
        }
      }
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('[EmergencyDetailView] Failed to re-run analysis:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  // 404 State
  if (notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
          <Siren className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Emergency Not Found
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
          The emergency record <span className="font-mono font-semibold">{emergencyId}</span> does not exist in the database or may have been deleted.
        </p>
        <Link href="/driver/dashboard" className="mt-6">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Operations Dashboard</span>
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/driver/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300"
            title="Back to Operations Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Emergency Operation
              </span>
              <span className="text-xs text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {emergencyId}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Mission Telemetry & Corridor Analysis
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastUpdated && (
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1 bg-zinc-100/60 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-200/40 dark:border-zinc-700/40">
              <Clock className="h-3 w-3" />
              <span>Retrieved: {lastUpdated}</span>
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-200"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>Reload</span>
          </Button>

          <Button
            size="sm"
            onClick={handleRerunAnalysis}
            disabled={analyzing || loading}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Bot className={cn('h-3.5 w-3.5', analyzing && 'animate-spin')} />
            <span>{analyzing ? 'Evaluating...' : 'Re-run Mission Analysis'}</span>
          </Button>
        </div>
      </div>

      {/* Global error banner */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Emergency Overview Card */}
      {emergency ? (
        <EmergencyOverviewCard emergency={emergency} vehicle={vehicle} />
      ) : (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-6 animate-pulse">
          <div className="h-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
        </div>
      )}

      {/* Section 2: Expected Route Corridor */}
      <RouteAnalysisPanel route={route} loading={loading} />

      {/* Section 3: Vehicle Movement & GPS Telemetry Table */}
      <VehicleMovementPanel
        vehicle={vehicle}
        latestFix={latestTrajectory}
        history={trajectoryHistory}
        totalFixes={trajectoryTotal}
        loading={loading}
        page={trajectoryPage}
        limit={5}
        onPageChange={handlePageChange}
        onRefresh={loadData}
      />

      {/* Section 4: Corridor Deviation & Traffic Intelligence */}
      <DeviationAnalysisPanel
        analysis={situationAnalysis}
        loading={loading}
      />

      {/* Section 5: Corridor Hazards & Correlated Incidents */}
      <CorrelatedIncidentsPanel
        correlatedIncidents={situationAnalysis?.incidents || []}
        loading={loading}
      />

      {/* Section 6: 3-Tier Epistemic Analysis */}
      <EpistemicBreakdownCard
        breakdown={orchestrationResult?.epistemicBreakdown}
        executionTimeMs={orchestrationResult?.executionTimeMs}
        loading={loading}
      />
    </div>
  )
}
