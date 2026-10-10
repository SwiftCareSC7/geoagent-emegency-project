'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Beaker,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CornerDownRight,
  FastForward,
  Flame,
  Gauge,
  HelpCircle,
  Hospital,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sliders,
  Sparkles,
  StepForward,
  TrendingUp,
  Truck,
  WifiOff,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { MissionAssessmentHUD } from '@/components/assessment/mission-assessment-hud'
import { MapPlaceholder } from '@/components/dashboard/map-placeholder'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CANONICAL_DEMO_SCENARIOS,
  type ScenarioDefinition
} from '@/components/driver/driver-scenario-selector'
import {
  DEMO_EMERGENCIES,
  DEMO_VEHICLES,
  DEMO_INCIDENTS,
  DEMO_ROUTES,
  DEMO_TRAJECTORIES,
  DEMO_DEVIATION,
  DEMO_PREDICTION
} from '@/lib/demo-fixtures'
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

// Simulation Stages for the Complete Response Demonstration (Phase 29)
type SimStage =
  | 'INITIAL_DISPATCH'
  | 'TELEMETRY_PROGRESSION'
  | 'HAZARD_INJECTED'
  | 'DEVIATION_DETECTED'
  | 'CAUSE_ATTRIBUTED'
  | 'ETA_RECALCULATED'
  | 'ALTERNATIVE_RECOMMENDED'
  | 'OPERATOR_DECISION_PENDING'
  | 'REROUTE_APPROVED'
  | 'TELEMATICS_TRANSMITTED'
  | 'CORRIDOR_RECOVERED'
  | 'FINAL_ASSESSMENT'

export default function EmergencyLabPage() {
  // Scenario Selection
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition>(
    CANONICAL_DEMO_SCENARIOS[0]
  )
  const [scenarioFilter, setScenarioFilter] = useState<'ALL' | 'CRITICAL' | 'REROUTE' | 'CLOSURE'>('ALL')

  // Simulation Clock & State
  const [isPlaying, setIsPlaying] = useState(false)
  const [simSpeed, setSimSpeed] = useState<number>(1) // 1x, 2x, 5x
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentStage, setCurrentStage] = useState<SimStage>('INITIAL_DISPATCH')

  // Injected Event Overrides
  const [injectedHazard, setInjectedHazard] = useState<string | null>(null)
  const [injectedTrafficLevel, setInjectedTrafficLevel] = useState<'NORMAL' | 'HEAVY' | 'SEVERE'>('NORMAL')
  const [isGpsLost, setIsGpsLost] = useState(false)
  const [isBreakdown, setIsBreakdown] = useState(false)
  const [isHospitalDivert, setIsHospitalDivert] = useState(false)

  // Dynamic Telemetry & Assessment State
  const [lateralDeviationMeters, setLateralDeviationMeters] = useState(0)
  const [delayMinutes, setDelayMinutes] = useState(0)
  const [decisionState, setDecisionState] = useState<'PENDING_OPERATOR_ACTION' | 'APPROVED' | 'EXECUTED' | 'REJECTED'>('PENDING_OPERATOR_ACTION')

  // Auto-play timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Format MM:SS for Simulation Clock
  const formatSimTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Filtered Scenarios
  const filteredScenarios = CANONICAL_DEMO_SCENARIOS.filter((sc) => {
    if (scenarioFilter === 'CRITICAL') return sc.priority === 'CRITICAL'
    if (scenarioFilter === 'REROUTE') return sc.hasAutoReroute || sc.requiresReroute
    if (scenarioFilter === 'CLOSURE') return sc.hasRoadClosure
    return true
  })

  // Reset Simulation to Initial State
  const handleResetSimulation = () => {
    setIsPlaying(false)
    setElapsedSeconds(0)
    setCurrentStage('INITIAL_DISPATCH')
    setInjectedHazard(null)
    setInjectedTrafficLevel('NORMAL')
    setIsGpsLost(false)
    setIsBreakdown(false)
    setIsHospitalDivert(false)
    setLateralDeviationMeters(0)
    setDelayMinutes(0)
    setDecisionState('PENDING_OPERATOR_ACTION')
  }

  // Handle Scenario Change
  const handleSelectScenario = (sc: ScenarioDefinition) => {
    setSelectedScenario(sc)
    handleResetSimulation()
  }

  // Advance Simulation One Step Forward
  const handleStepForward = useCallback(() => {
    setCurrentStage((prev) => {
      switch (prev) {
        case 'INITIAL_DISPATCH':
          setElapsedSeconds(45)
          return 'TELEMETRY_PROGRESSION'
        case 'TELEMETRY_PROGRESSION':
          setElapsedSeconds(110)
          setInjectedHazard('Richmond Road Water Main Rupture')
          return 'HAZARD_INJECTED'
        case 'HAZARD_INJECTED':
          setElapsedSeconds(180)
          setLateralDeviationMeters(420)
          return 'DEVIATION_DETECTED'
        case 'DEVIATION_DETECTED':
          setElapsedSeconds(210)
          return 'CAUSE_ATTRIBUTED'
        case 'CAUSE_ATTRIBUTED':
          setElapsedSeconds(235)
          setDelayMinutes(7.5)
          return 'ETA_RECALCULATED'
        case 'ETA_RECALCULATED':
          setElapsedSeconds(260)
          return 'ALTERNATIVE_RECOMMENDED'
        case 'ALTERNATIVE_RECOMMENDED':
          setElapsedSeconds(280)
          return 'OPERATOR_DECISION_PENDING'
        case 'OPERATOR_DECISION_PENDING':
          setElapsedSeconds(310)
          setDecisionState('APPROVED')
          return 'REROUTE_APPROVED'
        case 'REROUTE_APPROVED':
          setElapsedSeconds(340)
          setDecisionState('EXECUTED')
          return 'TELEMATICS_TRANSMITTED'
        case 'TELEMATICS_TRANSMITTED':
          setElapsedSeconds(420)
          setLateralDeviationMeters(12)
          setDelayMinutes(2.5) // Recovered 5 minutes!
          return 'CORRIDOR_RECOVERED'
        case 'CORRIDOR_RECOVERED':
          setElapsedSeconds(540)
          setIsPlaying(false)
          return 'FINAL_ASSESSMENT'
        case 'FINAL_ASSESSMENT':
        default:
          setIsPlaying(false)
          return 'FINAL_ASSESSMENT'
      }
    })
  }, [])

  // Auto-play effect
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(800 / simSpeed, 200)
      timerRef.current = setInterval(() => {
        handleStepForward()
      }, intervalMs)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, simSpeed, handleStepForward])

  // Event Injections (Phase 28 & 47)
  const injectRoadClosure = () => {
    setInjectedHazard('Active Road Closure — Police Hazard Perimeter')
    setLateralDeviationMeters(420)
    setDelayMinutes(8)
    setCurrentStage('DEVIATION_DETECTED')
  }

  const injectTrafficJam = () => {
    setInjectedTrafficLevel('SEVERE')
    setDelayMinutes(11)
    setCurrentStage('ETA_RECALCULATED')
  }

  const injectBreakdown = () => {
    setIsBreakdown(true)
    setDelayMinutes(25)
    setCurrentStage('ALTERNATIVE_RECOMMENDED')
  }

  const injectGpsLoss = () => {
    setIsGpsLost((prev) => !prev)
  }

  // Generate Synthetic State for the selected scenario & stage
  const mockEmergency: Emergency = {
    id: selectedScenario.emergencyId,
    emergencyId: selectedScenario.emergencyId,
    type: selectedScenario.type as any,
    priority: selectedScenario.priority,
    status: currentStage === 'FINAL_ASSESSMENT' ? 'RESOLVED' : 'IN_PROGRESS',
    description: selectedScenario.subtitle,
    location: {
      type: 'Point',
      coordinates: selectedScenario.emergencyCoordinates
    },
    destination: {
      type: 'Point',
      coordinates: selectedScenario.destinationCoordinates
    },
    assignedVehicle: {
      vehicleId: selectedScenario.vehicleId,
      registrationNumber: `KA-01-AM-${selectedScenario.vehicleId.slice(-2)}`,
      status: 'EN_ROUTE'
    },
    createdAt: new Date().toISOString()
  }

  const mockVehicle: Vehicle = {
    id: selectedScenario.vehicleId,
    vehicleId: selectedScenario.vehicleId,
    registrationNumber: `KA-01-AM-${selectedScenario.vehicleId.slice(-2)}`,
    type: 'AMBULANCE',
    status: isBreakdown ? 'MAINTENANCE' : 'EN_ROUTE',
    capacity: 2,
    driverName: 'Officer Raghavan',
    speed: isBreakdown ? 0 : injectedTrafficLevel === 'SEVERE' ? 11 : 48,
    heading: 72,
    location: {
      type: 'Point',
      coordinates: selectedScenario.originCoordinates
    }
  }

  const mockRoute: Route = {
    routeId: `R-${selectedScenario.id}`,
    emergency: selectedScenario.emergencyId,
    vehicle: selectedScenario.vehicleId,
    origin: { type: 'Point', coordinates: selectedScenario.originCoordinates },
    destination: { type: 'Point', coordinates: selectedScenario.destinationCoordinates },
    geometry: {
      type: 'LineString',
      coordinates: [
        selectedScenario.originCoordinates,
        selectedScenario.emergencyCoordinates,
        selectedScenario.destinationCoordinates
      ]
    },
    distance: 6400,
    duration: 720,
    status: 'ACTIVE'
  }

  const mockTrajectory: Trajectory = {
    vehicleId: selectedScenario.vehicleId,
    location: {
      type: 'Point',
      coordinates: isGpsLost ? [0, 0] : selectedScenario.originCoordinates
    },
    speed: mockVehicle.speed || 40,
    heading: 72,
    timestamp: new Date().toISOString(),
    source: isGpsLost ? 'API' : 'SIMULATOR'
  }

  const mockIncidents: Incident[] = injectedHazard
    ? [
        {
          id: 'INC-SIM-01',
          incidentId: 'INC-SIM-01',
          type: 'ROAD_CLOSURE',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          description: injectedHazard,
          location: { type: 'Point', coordinates: selectedScenario.emergencyCoordinates }
        }
      ]
    : []

  const mockSituationAnalysis: SituationAnalysis = {
    vehicleId: selectedScenario.vehicleId,
    routeId: mockRoute.routeId,
    emergencyId: selectedScenario.emergencyId,
    analyzedAt: new Date().toISOString(),
    status: {
      route: lateralDeviationMeters > 50 ? 'DEVIATED' : 'ON_ROUTE',
      traffic: injectedTrafficLevel === 'SEVERE' ? 'SEVERE' : 'MODERATE'
    },
    deviation: {
      status: lateralDeviationMeters > 50 ? 'DEVIATED' : 'ON_ROUTE',
      distanceFromRouteMeters: lateralDeviationMeters,
      nearestPointOnRoute: { type: 'Point', coordinates: selectedScenario.originCoordinates },
      bearingDifferenceDegrees: lateralDeviationMeters > 50 ? 44 : 2,
      vehicleBearing: 72,
      routeBearing: 68,
      gpsStability: isGpsLost ? 'INSUFFICIENT_DATA' : 'STABLE',
      sustainedDeviation: lateralDeviationMeters > 100,
      confidence: isGpsLost ? 'LOW' : 'HIGH'
    },
    progress: {
      remainingDistanceMeters: 3800,
      progressPercentage: 45
    },
    traffic: {
      level: injectedTrafficLevel === 'SEVERE' ? 'SEVERE' : 'MODERATE',
      speedKmh: mockVehicle.speed || 38,
      freeFlowSpeedKmh: 45,
      congestionRatio: injectedTrafficLevel === 'SEVERE' ? 0.88 : 0.32,
      source: 'SIMULATION_CORRIDOR_STREAM'
    },
    eta: {
      currentMinutes: 12 + delayMinutes,
      originalMinutes: 12,
      remainingDistanceMeters: 3800,
      estimatedSpeedKmh: 38,
      status: delayMinutes > 2 ? 'DELAYED' : 'ON_TIME'
    },
    delay: {
      delayMinutes: delayMinutes,
      timeSavedMinutes: currentStage === 'CORRIDOR_RECOVERED' ? 4.5 : 0
    },
    incidents: mockIncidents.map((inc) => ({
      incidentId: inc.incidentId,
      type: inc.type,
      severity: inc.severity,
      description: inc.description,
      location: inc.location,
      distanceFromVehicleMeters: 280,
      distanceFromRouteMeters: 14
    })),
    evidence: [
      `Simulation Clock: ${formatSimTime(elapsedSeconds)}`,
      `Active Stage: ${currentStage}`,
      `Vehicle Lateral Offset: ${lateralDeviationMeters}m`,
      `Corridor Speed: ${mockVehicle.speed} km/h`
    ]
  }

  const mockPrediction: PredictionResult = {
    predictedEta: new Date(Date.now() + (12 + delayMinutes) * 60000).toISOString(),
    baselineEta: new Date(Date.now() + 12 * 60000).toISOString(),
    predictedDurationSeconds: (12 + delayMinutes) * 60,
    baselineDurationSeconds: 720,
    predictedDurationMinutes: 12 + delayMinutes,
    baselineDurationMinutes: 12,
    predictedDelaySeconds: delayMinutes * 60,
    predictedDelayMinutes: delayMinutes,
    delayRisk: delayMinutes > 5 ? 'HIGH' : delayMinutes > 2 ? 'MEDIUM' : 'LOW',
    routeRisk: lateralDeviationMeters > 50 ? 'HIGH' : 'LOW',
    confidence: isGpsLost ? 'LOW' : 'HIGH',
    confidenceScore: isGpsLost ? 0.42 : 0.94,
    rerouteAdvised: lateralDeviationMeters > 50 || delayMinutes > 3,
    rerouteUrgency: lateralDeviationMeters > 100 ? 'IMMEDIATE' : 'NONE',
    factors: [
      {
        factor: injectedHazard ? 'Road Closure Hazard' : 'Traffic Progression',
        impact: injectedHazard ? 'Critical (+8 min)' : 'Normal',
        epistemicType: 'INFERRED'
      }
    ],
    predictedAt: new Date().toISOString()
  }

  const mockDecision: Decision = {
    decisionId: `DEC-${selectedScenario.id}`,
    emergencyId: selectedScenario.emergencyId,
    vehicleId: selectedScenario.vehicleId,
    primaryAction: isBreakdown ? 'CONSIDER_BACKUP' : lateralDeviationMeters > 50 ? 'REROUTE' : 'CONTINUE',
    actions: isBreakdown
      ? ['CONSIDER_BACKUP']
      : lateralDeviationMeters > 50
        ? ['REROUTE']
        : ['CONTINUE'],
    rerouteCandidate: lateralDeviationMeters > 50
      ? {
          candidateId: `SIM-${selectedScenario.id}`,
          geometry: mockRoute.geometry,
          distanceMeters: mockRoute.distance,
          durationSeconds: mockRoute.duration,
          provider: 'SIMULATOR',
          description: 'Simulated alternate emergency corridor'
        }
      : null,
    severity: lateralDeviationMeters > 50 || isBreakdown ? 'CRITICAL' : 'NORMAL',
    status: decisionState,
    reasonCodes: lateralDeviationMeters > 50 ? ['CORRIDOR_DEVIATION_DETECTED', 'HAZARD_INTERSECTION'] : ['NOMINAL_PROGRESSION'],
    evaluatedAt: new Date().toISOString()
  }

  const mockComparisonData = {
    currentRoute: {
      routeId: mockRoute.routeId,
      etaMinutes: 12 + delayMinutes,
      delayMinutes: delayMinutes
    },
    alternatives: [
      {
        name: 'Alternative 2 (Via Residency Road Bypass)',
        routeId: 'ALT-02',
        durationMinutes: 9.5,
        timeDiffMinutes: -4.5,
        distanceKm: 4.8,
        recommended: true,
        safetyScore: 92
      },
      {
        name: 'Alternative 3 (Via Old Madras Rd)',
        routeId: 'ALT-03',
        durationMinutes: 14,
        timeDiffMinutes: 2,
        distanceKm: 6.2,
        recommended: false,
        safetyScore: 78
      }
    ]
  }

  return (
    <ProtectedRoute allowedRoles={['CONTROL_ROOM', 'ADMIN']}>
      <div className="min-h-svh bg-background text-foreground">
      <DashboardTopbar
        ambulanceId={selectedScenario.vehicleId}
        driverName="Simulation Controller"
        emergencyActive={true}
        lastRefreshed={formatSimTime(elapsedSeconds)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Lab Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                <Beaker className="size-4" />
              </span>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Emergency Lab · Simulation & Stress Workbench
              </h1>
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                18 TEST SCENARIOS
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deterministic verification, real-time event injection, and automated GeoAgent response audit
            </p>
          </div>

          {/* Clock & Speed Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-1.5 font-mono text-xs">
              <Clock className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-muted-foreground">CLOCK:</span>
              <span className="font-bold text-foreground text-sm" suppressHydrationWarning>
                {formatSimTime(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-mono">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={cn(
                    'px-2 py-1 rounded font-bold transition-colors cursor-pointer',
                    simSpeed === spd
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Simulation Playback & Stage Progression Controller (Phase 28 & 29) */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border">
            {/* Play/Pause/Step/Reset Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  'gap-1.5 font-bold text-xs shadow-md cursor-pointer',
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                <span>{isPlaying ? 'Pause Simulation' : 'Run Demonstration'}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleStepForward}
                disabled={isPlaying}
                className="gap-1 text-xs border-border bg-muted/60 text-foreground hover:bg-muted cursor-pointer"
              >
                <StepForward className="size-3.5" />
                <span>Step Forward</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleResetSimulation}
                className="gap-1 text-xs border-border bg-muted/60 text-foreground hover:bg-muted cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </Button>
            </div>

            {/* Current Stage Indicator */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">STAGE:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-md">
                {currentStage.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Real-time Event Injection Bar (Phase 28 & 47) */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold shrink-0">
              Inject Fault / Hazard:
            </span>
            <button
              type="button"
              onClick={injectRoadClosure}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <AlertTriangle className="size-3 text-rose-500 dark:text-rose-400" />
              <span>Road Closure (+420m)</span>
            </button>

            <button
              type="button"
              onClick={injectTrafficJam}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Flame className="size-3 text-amber-500 dark:text-amber-400" />
              <span>Traffic Surge (11 km/h)</span>
            </button>

            <button
              type="button"
              onClick={injectBreakdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <Truck className="size-3 text-rose-500 dark:text-rose-400" />
              <span>Engine Failure (Backup Req)</span>
            </button>

            <button
              type="button"
              onClick={injectGpsLoss}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                isGpsLost
                  ? 'border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold'
                  : 'border-border bg-muted/60 text-foreground hover:bg-muted'
              )}
            >
              <WifiOff className="size-3" />
              <span>{isGpsLost ? 'GPS Lost (Reconnecting)' : 'GPS Dropout'}</span>
            </button>
          </div>
        </div>

        {/* 5-Question Canonical Mission Assessment HUD (Front and Center) */}
        <MissionAssessmentHUD
          emergency={mockEmergency}
          vehicle={mockVehicle}
          route={mockRoute}
          latestTrajectory={mockTrajectory}
          situationAnalysis={mockSituationAnalysis}
          prediction={mockPrediction}
          decision={mockDecision}
          comparisonData={mockComparisonData}
          onApproveDecision={async () => {
            setDecisionState('APPROVED')
          }}
          onRejectDecision={async () => {
            setDecisionState('REJECTED')
          }}
          onExecuteDecision={async () => {
            setDecisionState('EXECUTED')
            setLateralDeviationMeters(10)
            setDelayMinutes(2)
            setCurrentStage('CORRIDOR_RECOVERED')
          }}
        />

        {/* Metropolitan Map & Scenario Selector Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Real-time Map Viewport */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-1 shadow-xl overflow-hidden">
              <MapPlaceholder
                showRecommended={true}
                selectedEmergencyId={selectedScenario.emergencyId}
                emergencies={[mockEmergency]}
                vehicles={[mockVehicle]}
                incidents={mockIncidents}
                height="520px"
              />
            </div>
          </div>

          {/* Right Column (4 cols): 18 Prebuilt Scenario Picker */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Canonical Test Catalog ({CANONICAL_DEMO_SCENARIOS.length})
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Select to load</span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mb-3">
                {(['ALL', 'CRITICAL', 'REROUTE', 'CLOSURE'] as const).map((flt) => (
                  <button
                    key={flt}
                    type="button"
                    onClick={() => setScenarioFilter(flt)}
                    className={cn(
                      'px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer',
                      scenarioFilter === flt
                        ? 'bg-purple-600 text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {flt}
                  </button>
                ))}
              </div>

              {/* Scenario Scrollable List */}
              <div className="space-y-2 max-h-110 overflow-y-auto pr-1">
                {filteredScenarios.map((sc) => {
                  const isSelected = selectedScenario.id === sc.id
                  return (
                    <div
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc)}
                      className={cn(
                        'rounded-xl border p-3 cursor-pointer transition-all text-xs',
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 text-foreground shadow-sm ring-1 ring-purple-500/40'
                          : 'border-border bg-muted/40 text-foreground hover:border-border/80 hover:bg-muted/70'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-[10px]">
                          {sc.id}
                        </span>
                        <span className={cn(
                          'rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase',
                          sc.priority === 'CRITICAL' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-muted text-muted-foreground'
                        )}>
                          {sc.priority}
                        </span>
                      </div>
                      <div className="font-bold text-foreground line-clamp-1">{sc.title}</div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {sc.subtitle}
                      </p>
                      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Save: ~{sc.expectedTimeSavedMinutes} min</span>
                        <span>{sc.vehicleId}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
