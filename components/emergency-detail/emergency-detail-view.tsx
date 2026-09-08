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
  Wifi,
  WifiOff,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import {
  analysisApi,
  decisionApi,
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
  type PredictionResult,
  type Decision
} from '@/lib/api/index'
import { useRealtimeEmergency } from '@/lib/socket/useRealtime'
import { Button } from '@/components/ui/button'
import { EmergencyOverviewCard } from './emergency-overview-card'
import { VehicleMovementPanel } from './vehicle-movement-panel'
import { RouteAnalysisPanel } from './route-analysis-panel'
import { DeviationAnalysisPanel } from './deviation-analysis-panel'
import { CorrelatedIncidentsPanel } from './correlated-incidents-panel'
import { EpistemicBreakdownCard } from './epistemic-breakdown-card'
import { PredictionIntelligencePanel } from './prediction-intelligence-panel'
import { RouteComparisonCard } from './route-comparison-card'
import { DecisionApprovalCard } from './decision-approval-card'
import { EventTimelineCard } from './event-timeline-card'
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
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationWorkflowResult | null>(null)

  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Real-Time Socket.IO Hook
  const assignedVehId = emergency?.assignedVehicle
    ? typeof emergency.assignedVehicle === 'object' && 'vehicleId' in emergency.assignedVehicle
      ? emergency.assignedVehicle.vehicleId
      : (typeof emergency.assignedVehicle === 'string' ? emergency.assignedVehicle : undefined)
    : undefined;

  const {
    isConnected: socketConnected,
    freshness,
    liveLocation,
    liveDeviation,
    livePrediction,
    predictionDelta,
    liveDecision,
    liveEvents,
    reconnected,
    acknowledgeReconnect,
    getAgeString
  } = useRealtimeEmergency(emergencyId, assignedVehId);

  // Reflect live telemetry updates into state
  useEffect(() => {
    if (liveLocation) {
      setLatestTrajectory({
        id: `live-${Date.now()}`,
        vehicleId: liveLocation.vehicleId,
        location: liveLocation.location as any,
        speed: liveLocation.speed,
        heading: liveLocation.heading,
        timestamp: liveLocation.timestamp,
        source: 'DEVICE',
        createdAt: liveLocation.timestamp
      });
    }
  }, [liveLocation]);

  // Reflect live decision updates into state
  useEffect(() => {
    if (liveDecision) {
      setDecision((prev) => {
        if (!prev) {
          return {
            id: liveDecision.decisionId,
            decisionId: liveDecision.decisionId,
            emergency: liveDecision.emergencyId || '',
            emergencyId: liveDecision.emergencyId,
            vehicle: assignedVehId || '',
            vehicleId: assignedVehId || '',
            primaryAction: (liveDecision.primaryAction || liveDecision.action || 'MAINTAIN_ROUTE') as any,
            action: (liveDecision.action || liveDecision.primaryAction || 'MAINTAIN_ROUTE') as any,
            severity: (liveDecision.severity || 'INFO') as any,
            status: liveDecision.status as any,
            reasonCodes: liveDecision.reasonCodes || [],
            situationHash: '',
            details: {
              summary: liveDecision.action || liveDecision.primaryAction || '',
              reasoning: []
            },
            evaluatedAt: liveDecision.timestamp || new Date().toISOString()
          } as Decision;
        }
        return {
          ...prev,
          status: liveDecision.status as any,
          approvedBy: liveDecision.approvedBy || prev.approvedBy,
          approvedAt: liveDecision.approvedAt || prev.approvedAt,
          rejectionReason: liveDecision.rejectionReason || (prev as any).rejectionReason,
          executedAt: liveDecision.executedAt || (prev as any).executedAt,
          executionSummary: liveDecision.executionSummary || (prev as any).executionSummary
        };
      });
    }
  }, [liveDecision, assignedVehId]);

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

      // Route for emergency & authoritative route comparison
      const routePromise = routeApi
        .getForEmergency(emergencyId)
        .then(async (res) => {
          if (res.data && res.data.length > 0) {
            const activeRoute = res.data[0]
            setRoute(activeRoute)
            try {
              const compRes = await routeApi.compare(activeRoute.routeId)
              if (compRes && compRes.data) {
                setComparisonData(compRes.data)
              }
            } catch {
              // Fallback to orchestration comparison
              setComparisonData(null)
            }
          } else {
            setRoute(null)
            setComparisonData(null)
          }
        })
        .catch(() => {
          setRoute(null)
          setComparisonData(null)
        })
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

        // Real-Time Arrival & Delay Prediction
        const predPromise = analysisApi
          .getVehiclePredictionSafe(assignedVehId)
          .then((p) => setPrediction(p))
          .catch(() => setPrediction(null))
        promises.push(predPromise)

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
        setPrediction(null)
      }

      // Authoritative Decision
      const decisionPromise = decisionApi
        .list({ emergencyId })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setDecision(res.data[0])
          } else {
            setDecision(null)
          }
        })
        .catch(() => setDecision(null))
      promises.push(decisionPromise)

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

  // Handle Socket.IO reconnection — auto re-sync state
  useEffect(() => {
    if (reconnected) {
      loadData();
      const timer = setTimeout(() => {
        acknowledgeReconnect();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reconnected, acknowledgeReconnect, loadData]);

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
        if (res.data.decision) {
          setDecision(res.data.decision)
        }
      }
      if (assignedVehId) {
        const p = await analysisApi.getVehiclePredictionSafe(assignedVehId)
        setPrediction(p)
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
          {/* Socket.IO Real-Time Stream Freshness Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono border border-zinc-200/50 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 shadow-sm">
            {freshness === 'LIVE' ? (
              <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE FEED</span>
              </span>
            ) : freshness === 'STALE' ? (
              <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>STALE ({getAgeString()})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-zinc-400" />
                <span>REST REFRESH</span>
              </span>
            )}
          </div>

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

      {/* Realtime Connection Status Alerts */}
      {!socketConnected && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-2 shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="font-medium">
              REALTIME CONNECTION LOST — Operating in Polling Fallback mode. Retrying websocket connection...
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
            Auto-reconnecting
          </span>
        </div>
      )}

      {reconnected && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="font-medium">
              REALTIME CONNECTION RESTORED — Emergency stream resynchronized with backend state.
            </span>
          </div>
          <button
            type="button"
            onClick={acknowledgeReconnect}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

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

      {/* Section 2: Real-Time Arrival & Delay Prediction (with Prediction Change Visualization) */}
      <PredictionIntelligencePanel
        prediction={prediction}
        livePrediction={livePrediction}
        predictionDelta={predictionDelta}
        isLoading={loading}
      />

      {/* Section 3 & 4: Route Comparison & Deterministic What-If Analysis */}
      <RouteComparisonCard
        currentRoute={route}
        alternatives={comparisonData?.alternatives || (orchestrationResult?.geoAgent as any)?.comparison?.alternatives || []}
        whyRouteChanged={comparisonData?.whyRouteChanged || (orchestrationResult?.geoAgent as any)?.whyRouteChanged || []}
        whatIfDoNothing={comparisonData?.whatIfDoNothing || (orchestrationResult?.geoAgent as any)?.comparison?.whatIfDoNothing}
        currentEtaMinutes={comparisonData?.currentRoute?.etaMinutes || prediction?.predictedDurationMinutes || situationAnalysis?.eta?.currentMinutes}
        plannedEtaMinutes={comparisonData?.currentRoute?.plannedEtaMinutes || situationAnalysis?.eta?.originalMinutes}
      />

      {/* Section 5: Authoritative Decision Engine & Operator Approval Card */}
      <DecisionApprovalCard
        decision={decision}
        liveDecision={liveDecision}
        emergencyId={emergencyId}
        onDecisionUpdated={(updated) => setDecision(updated)}
      />

      {/* Section 6: Expected Route Corridor */}
      <RouteAnalysisPanel route={route} loading={loading} />

      {/* Section 7: Vehicle Movement & GPS Telemetry Table (with LIVE / STALE / UNKNOWN badges) */}
      <VehicleMovementPanel
        vehicle={vehicle}
        latestFix={latestTrajectory}
        history={trajectoryHistory}
        totalFixes={trajectoryTotal}
        loading={loading}
        freshness={freshness}
        ageString={getAgeString()}
        page={trajectoryPage}
        limit={5}
        onPageChange={handlePageChange}
        onRefresh={loadData}
      />

      {/* Section 8: Corridor Deviation & Traffic Intelligence */}
      <DeviationAnalysisPanel
        analysis={situationAnalysis}
        loading={loading}
      />

      {/* Section 9: Corridor Hazards & Correlated Incidents */}
      <CorrelatedIncidentsPanel
        correlatedIncidents={situationAnalysis?.incidents || []}
        loading={loading}
      />

      {/* Section 10: 3-Tier Epistemic Analysis (Gemini Advisory Reasoning vs Deterministic Rules) */}
      <EpistemicBreakdownCard
        breakdown={orchestrationResult?.epistemicBreakdown}
        executionTimeMs={orchestrationResult?.executionTimeMs}
        loading={loading}
      />

      {/* Section 11: Unified Chronological Event & Audit Timeline */}
      <EventTimelineCard
        emergency={emergency}
        vehicle={vehicle}
        route={route}
        latestFix={latestTrajectory}
        prediction={prediction}
        decision={decision}
        liveDecision={liveDecision}
        situation={situationAnalysis}
        liveEvents={liveEvents}
      />
    </div>
  )
}
