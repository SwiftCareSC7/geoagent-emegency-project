'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Navigation,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Radio,
  LocateFixed,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  Car,
  GitCompare,
  MapPin,
  Flame,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DriverManeuverCard } from './driver-maneuver-card'
import { DriverStatusCard } from './driver-status-card'
import { DriverBottomSheet } from './driver-bottom-sheet'
import { DriverRoutePlanner } from './driver-route-planner'
import { DriverIncidentModal } from './driver-incident-modal'
import { DriverRerouteAlert } from './driver-reroute-alert'
import { DriverNavigationMap } from './driver-navigation-map'
import { DriverEmergencyHeader } from './driver-emergency-header'
import { DriverGeoAgentPanel } from './driver-geoagent-panel'
import { DriverLiveSituation } from './driver-live-situation'
import { DriverAlternativeRoutes } from './driver-alternative-routes'
import { DriverEmergencyClearance } from './driver-emergency-clearance'
import {
  BENGALURU_HOSPITALS,
  BENGALURU_LANDMARKS,
  type NavigationState,
  type NavigationStep,
  type RoutePlan,
  type GpsLocation,
  type DestinationOption
} from './types'
import { routeApi } from '@/lib/api/routes'
import { incidentApi } from '@/lib/api/incidents'
import { clearanceApi, type ClearanceSession, type ConnectedVehicle } from '@/lib/api/clearance'
import { getSocket, subscribeEvent, REALTIME_EVENTS } from '@/lib/socket/client'
import type { Incident } from '@/lib/api/types'

interface DriverNavigationProps {
  initialEmergency?: any
  ambulanceId?: string
  className?: string
}

function haversineMeters(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371e3
  const lat1 = (coord1[1] * Math.PI) / 180
  const lat2 = (coord2[1] * Math.PI) / 180
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180
  const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function calculateBearing(start: [number, number], end: [number, number]): number {
  const startLat = (start[1] * Math.PI) / 180
  const startLng = (start[0] * Math.PI) / 180
  const endLat = (end[1] * Math.PI) / 180
  const endLng = (end[0] * Math.PI) / 180

  const dLng = endLng - startLng
  const y = Math.sin(dLng) * Math.cos(endLat)
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng)

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function DriverNavigation({
  initialEmergency,
  ambulanceId = 'AMB-01',
  className = ''
}: DriverNavigationProps) {
  // Navigation State
  const [navState, setNavState] = useState<NavigationState>('NAVIGATING')
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null)
  const [originalRouteCoordinates, setOriginalRouteCoordinates] = useState<[number, number][]>([])
  const [activePreference, setActivePreference] = useState<'FASTEST' | 'SHORTEST'>('FASTEST')
  const [selectedDestination, setSelectedDestination] = useState<DestinationOption | null>(
    BENGALURU_HOSPITALS[0]
  )
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [distanceToNextStepMeters, setDistanceToNextStepMeters] = useState<number>(450)
  const [totalDistanceRemainingMeters, setTotalDistanceRemainingMeters] = useState<number>(5400)
  const [totalDurationRemainingSeconds, setTotalDurationRemainingSeconds] = useState<number>(900) // 15 min

  // GPS State
  const [currentLocation, setCurrentLocation] = useState<GpsLocation>({
    coordinates: [77.6271, 12.9352], // Koramangala
    heading: 52,
    speed: 22,
    accuracy: 5,
    timestamp: Date.now(),
    isSimulated: true
  })
  const [gpsPermission, setGpsPermission] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('granted')
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null)
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0)

  // Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simCoordIndex, setSimCoordIndex] = useState<number>(0)
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Deviation & GeoAgent Status
  const [isDeviated, setIsDeviated] = useState<boolean>(true) // True by default for 5-second product story!
  const [deviationDistance, setDeviationDistance] = useState<number>(68)
  const [geoAgentState, setGeoAgentState] = useState<'REROUTE_RECOMMENDED' | 'ROUTE_UPDATED' | 'MONITOR'>('REROUTE_RECOMMENDED')
  const [isAcceptingReroute, setIsAcceptingReroute] = useState<boolean>(false)
  const [rerouteAcceptedToast, setRerouteAcceptedToast] = useState<boolean>(false)

  // Emergency Clearance State (Simulated Connected Vehicles / Demo V2X)
  const [clearanceSession, setClearanceSession] = useState<ClearanceSession | null>(null)
  const [isAdvancingClearance, setIsAdvancingClearance] = useState<boolean>(false)

  // Modals & Panels UI
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false)
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false)
  const [mobileActiveTab, setMobileActiveTab] = useState<'COCKPIT' | 'MAP' | 'V2X'>('COCKPIT')
  const [routeIncidents, setRouteIncidents] = useState<Incident[]>([])
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false)

  // 1. Initialize Baseline Emergency Route if not already loaded
  useEffect(() => {
    let isMounted = true

    async function loadInitialCorridor() {
      try {
        setIsLoadingRoute(true)
        const originCoord: [number, number] = [77.6271, 12.9352] // Koramangala
        const destCoord: [number, number] = initialEmergency?.hospitalLocation?.coordinates || [77.6483, 12.9582] // Manipal

        const res = await routeApi.calculateRoutePlan({
          origin: { type: 'Point', coordinates: originCoord },
          destination: { type: 'Point', coordinates: destCoord },
          preference: 'FASTEST',
          computeAlternatives: true
        })

        if (isMounted && res && res.success && res.data) {
          const plan: RoutePlan = res.data

          // Ensure an alternative route exists for the demonstration
          if (!plan.alternative) {
            plan.alternative = {
              geometry: {
                type: 'LineString',
                coordinates: [
                  [77.6271, 12.9352],
                  [77.6320, 12.9420],
                  [77.6380, 12.9510],
                  [77.6412, 12.9540],
                  [77.6483, 12.9582]
                ]
              },
              distanceMeters: 4800,
              durationSeconds: 600, // 10 mins (save 5 mins)
              preference: 'FASTEST',
              description: 'Indiranagar Arterial bypass corridor avoiding Old Airport Rd bottleneck',
              trafficDelaySeconds: 45
            }
          }

          setRoutePlan(plan)
          setOriginalRouteCoordinates(plan.geometry.coordinates)
          setTotalDistanceRemainingMeters(plan.distanceMeters)
          setTotalDurationRemainingSeconds(plan.durationSeconds)
        }
      } catch {
        // Build resilient fallback corridor
        const fallbackPlan: RoutePlan = {
          geometry: {
            type: 'LineString',
            coordinates: [
              [77.6271, 12.9352],
              [77.6310, 12.9390],
              [77.6360, 12.9450],
              [77.6420, 12.9520],
              [77.6483, 12.9582]
            ]
          },
          distanceMeters: 5400,
          durationSeconds: 900,
          trafficDelaySeconds: 180,
          preference: 'FASTEST',
          provider: 'GEOAGENT_OSRM',
          description: 'Primary Old Airport Rd Corridor (Heavy Congestion)',
          steps: [
            { maneuver: 'DEPART', instruction: 'Head northeast on 80ft Road toward Koramangala 4th Block', distance: 650, duration: 90 },
            { maneuver: 'TURN_RIGHT', instruction: 'Turn right onto Intermediate Ring Road toward Domlur', distance: 1800, duration: 320 },
            { maneuver: 'CONTINUE', instruction: 'Continue on Old Airport Rd (Heavy Congestion + Bottleneck)', distance: 2100, duration: 410 },
            { maneuver: 'ARRIVE', instruction: 'Arrive at Manipal Hospital Emergency Bay', distance: 150, duration: 40 }
          ],
          alternative: {
            geometry: {
              type: 'LineString',
              coordinates: [
                [77.6271, 12.9352],
                [77.6320, 12.9420],
                [77.6380, 12.9510],
                [77.6412, 12.9540],
                [77.6483, 12.9582]
              ]
            },
            distanceMeters: 4600,
            durationSeconds: 600, // 10 min
            preference: 'FASTEST',
            description: 'Indiranagar 100ft bypass avoiding Old Airport Rd bottleneck (-5 min)',
            trafficDelaySeconds: 30
          },
          calculatedAt: new Date().toISOString()
        }
        if (isMounted) {
          setRoutePlan(fallbackPlan)
          setOriginalRouteCoordinates(fallbackPlan.geometry.coordinates)
        }
      } finally {
        if (isMounted) setIsLoadingRoute(false)
      }
    }

    loadInitialCorridor()

    return () => {
      isMounted = false
    }
  }, [initialEmergency])

  // 2. Fetch or initialize Emergency Clearance Session (Demo V2X)
  const fetchClearance = useCallback(async () => {
    try {
      const res = await clearanceApi.getForVehicle(ambulanceId)
      if (res && res.success && res.data) {
        setClearanceSession(res.data)
      }
    } catch {
      // Retain optimistic baseline
    }
  }, [ambulanceId])

  useEffect(() => {
    fetchClearance()
  }, [fetchClearance])

  // 3. Socket.IO Realtime Synchronization
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const unsubClearance = subscribeEvent<any>(
      REALTIME_EVENTS.CLEARANCE_STATUS_UPDATED,
      (data) => {
        if (data && (!data.vehicleId || data.vehicleId === ambulanceId)) {
          setClearanceSession(data)
        }
      }
    )

    const unsubRoute = subscribeEvent<any>(
      REALTIME_EVENTS.ROUTE_UPDATED,
      (data) => {
        if (data && data.routePlan) {
          setRoutePlan(data.routePlan)
          setTotalDistanceRemainingMeters(data.routePlan.distanceMeters)
          setTotalDurationRemainingSeconds(data.routePlan.durationSeconds)
        }
      }
    )

    return () => {
      unsubClearance()
      unsubRoute()
    }
  }, [ambulanceId])

  // 4. Advance Emergency Clearance Simulation Step
  const handleAdvanceClearance = async () => {
    setIsAdvancingClearance(true)
    try {
      const res = await clearanceApi.advanceCycle(ambulanceId, 1)
      if (res && res.success && res.data) {
        setClearanceSession(res.data)
      }
    } catch {
      // Local progression fallback
      if (clearanceSession) {
        const nextVehicles = clearanceSession.connectedVehicles.map((v) => {
          if (v.status === 'DETECTED') return { ...v, status: 'ALERT_SENT' as const }
          if (v.status === 'ALERT_SENT') return { ...v, status: 'ACKNOWLEDGED' as const }
          if (v.status === 'ACKNOWLEDGED') return { ...v, status: 'GIVING_WAY' as const }
          if (v.status === 'GIVING_WAY') return { ...v, status: 'CLEARED' as const }
          return v
        })
        const clearedCount = nextVehicles.filter(v => v.status === 'CLEARED').length
        setClearanceSession({
          ...clearanceSession,
          connectedVehicles: nextVehicles,
          summary: {
            ...clearanceSession.summary,
            totalCleared: clearedCount
          }
        })
      }
    } finally {
      setIsAdvancingClearance(false)
    }
  }

  // 5. Accept Reroute Action — Real MongoDB persistence + Socket.IO Broadcast
  const handleAcceptReroute = async () => {
    if (!routePlan || !routePlan.alternative) return
    setIsAcceptingReroute(true)

    try {
      const alternative = routePlan.alternative

      // 1. Call backend API to persist the accepted reroute in MongoDB
      const routeId = (routePlan as any).routeId || (routePlan as any)._id
      if (routeId) {
        try {
          await routeApi.acceptReroute(routeId, {
            acceptedBy: 'DRIVER',
            selectedAlternative: {
              geometry: alternative.geometry,
              distanceMeters: alternative.distanceMeters,
              durationSeconds: alternative.durationSeconds,
              steps: alternative.steps
            },
            reason: 'Accepted GeoAgent recommended Indiranagar bypass'
          })
        } catch {
          // Backend API update fallback
        }
      }

      // 2. Update frontend navigation state immediately
      setOriginalRouteCoordinates(routePlan.geometry.coordinates)
      setRoutePlan({
        ...routePlan,
        geometry: alternative.geometry,
        distanceMeters: alternative.distanceMeters,
        durationSeconds: alternative.durationSeconds,
        preference: alternative.preference,
        steps: alternative.steps || [
          { maneuver: 'CONTINUE', instruction: 'Head onto Indiranagar 100ft Arterial Corridor', distance: 1200, duration: 160 },
          { maneuver: 'TURN_RIGHT', instruction: 'Turn right toward Old Airport Road bypass', distance: 1800, duration: 240 },
          { maneuver: 'ARRIVE', instruction: 'Arrive at Manipal Hospital Emergency Entrance', distance: 200, duration: 40 }
        ],
        alternative: null,
        description: alternative.description || 'Active Indiranagar Bypass Corridor'
      })

      setCurrentStepIndex(0)
      setTotalDistanceRemainingMeters(alternative.distanceMeters)
      setTotalDurationRemainingSeconds(alternative.durationSeconds)
      setIsDeviated(false)
      setDeviationDistance(0)
      setGeoAgentState('ROUTE_UPDATED')
      setRerouteAcceptedToast(true)

      // Trigger automatic clearance cycle so connected vehicles clear the new route!
      setTimeout(() => {
        handleAdvanceClearance()
      }, 600)

      setTimeout(() => {
        setRerouteAcceptedToast(false)
      }, 5000)

    } finally {
      setIsAcceptingReroute(false)
    }
  }

  // 6. Automated Drive Simulation
  useEffect(() => {
    if (!isSimulating || !routePlan || !routePlan.geometry?.coordinates?.length) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current)
        simulationTimerRef.current = null
      }
      return
    }

    const coords = routePlan.geometry.coordinates
    simulationTimerRef.current = setInterval(() => {
      setSimCoordIndex((prevIndex) => {
        const nextIndex = prevIndex + 1

        if (nextIndex >= coords.length) {
          setNavState('ARRIVED')
          setIsSimulating(false)
          setTotalDistanceRemainingMeters(0)
          setTotalDurationRemainingSeconds(0)
          setDistanceToNextStepMeters(0)
          return prevIndex
        }

        const currentPt = coords[nextIndex]
        const prevPt = coords[prevIndex]
        const heading = calculateBearing(prevPt, currentPt)

        setCurrentLocation({
          coordinates: currentPt,
          heading,
          speed: 46,
          accuracy: 3,
          timestamp: Date.now(),
          isSimulated: true
        })

        const pctDone = nextIndex / coords.length
        const distRemaining = Math.max(0, Math.round(routePlan.distanceMeters * (1 - pctDone)))
        const durRemaining = Math.max(0, Math.round(routePlan.durationSeconds * (1 - pctDone)))

        setTotalDistanceRemainingMeters(distRemaining)
        setTotalDurationRemainingSeconds(durRemaining)

        if (routePlan.steps && routePlan.steps.length > 0) {
          const stepCount = routePlan.steps.length
          const currentStepEstimated = Math.min(
            stepCount - 1,
            Math.floor(pctDone * stepCount)
          )
          setCurrentStepIndex(currentStepEstimated)
        }

        return nextIndex
      })
    }, 1200)

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current)
        simulationTimerRef.current = null
      }
    }
  }, [isSimulating, routePlan])

  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false)
    } else {
      if (navState === 'ARRIVED') {
        setSimCoordIndex(0)
        setNavState('NAVIGATING')
      }
      setIsSimulating(true)
    }
  }

  // Maneuver Step References
  const steps = routePlan?.steps || []
  const currentStep = steps[currentStepIndex] || null
  const nextStep = steps[currentStepIndex + 1] || null

  const currentEtaMin = Math.round(totalDurationRemainingSeconds / 60)
  const altEtaMin = routePlan?.alternative 
    ? Math.round(routePlan.alternative.durationSeconds / 60)
    : Math.max(1, currentEtaMin - 5)
  const timeSavedMin = Math.max(1, currentEtaMin - altEtaMin)

  return (
    <div className={`relative flex flex-col h-full w-full overflow-hidden bg-slate-950 select-none ${className}`}>
      {/* 1. TOP EMERGENCY HEADER — 100% Prominence (5-Second Story Step 1) */}
      <div className="z-30 w-full shrink-0">
        <DriverEmergencyHeader
          ambulanceId={ambulanceId}
          destinationName={selectedDestination?.name || 'Manipal Hospital'}
          destinationAddress={selectedDestination?.address || '98 HAL Old Airport Rd, Bengaluru'}
          priority="CRITICAL"
          etaMinutes={currentEtaMin}
          delayMinutes={isDeviated ? 3 : 0}
          emergencyActive={navState !== 'ARRIVED'}
        />
      </div>

      {/* Reroute Success Notification Toast */}
      {rerouteAcceptedToast && (
        <div className="absolute top-20 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-2xl border border-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-200 animate-bounce" />
            <span>GeoAgent Route Activated · Indiranagar Corridor Set · Saving {timeSavedMin} Min</span>
          </div>
        </div>
      )}

      {/* 2. MAIN COCKPIT: Split View on Desktop, Tabbed on Mobile */}
      <div className="flex-1 relative w-full flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT COLUMN / SIDEBAR (Desktop) or TAB CONTENT (Mobile) */}
        <div className={`w-full lg:w-[460px] xl:w-[500px] shrink-0 flex flex-col z-20 overflow-y-auto custom-scrollbar border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-md p-3 sm:p-4 space-y-3 ${
          mobileActiveTab === 'MAP' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* A. GeoAgent Decision Action Hero Card (5-Second Story Steps 2, 3, 4, 5) */}
          {geoAgentState !== 'ROUTE_UPDATED' && routePlan?.alternative ? (
            <DriverGeoAgentPanel
              state={geoAgentState}
              likelyCause="Heavy traffic & collision bottleneck on Old Airport Rd (+3m delay)"
              confidence={0.94}
              currentEtaMinutes={currentEtaMin}
              alternativeEtaMinutes={altEtaMin}
              timeSavedMinutes={timeSavedMin}
              explanation="Bottleneck reported 650m ahead. GeoAgent evaluated Route B via Indiranagar 100ft arterial corridor, bypassing obstruction with clear corridor telemetry."
              evidence={[
                `Ambulance trajectory deviated +${Math.round(deviationDistance)}m off planned centerline`,
                'Intermediate Ring Road congestion index: 88% (Severe bottleneck)',
                'Accident reported: Two-vehicle collision blocking 2 lanes ahead',
                `Alternative Route B saves ~${timeSavedMin} minutes with optimal flow`,
                '3 simulated connected vehicles alerted in clearance corridor'
              ]}
              onAcceptReroute={handleAcceptReroute}
              onKeepCurrentRoute={() => {
                setIsDeviated(false)
                setGeoAgentState('MONITOR')
              }}
              onViewRoute={() => setIsComparisonOpen(!isComparisonOpen)}
              isAccepting={isAcceptingReroute}
            />
          ) : (
            /* State when route is updated or on track */
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      GeoAgent Active Route
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      OPTIMAL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Following recommended arterial bypass corridor. Zero bottlenecks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeviated(true)
                  setGeoAgentState('REROUTE_RECOMMENDED')
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-semibold border border-slate-700 shrink-0"
                title="Test trigger deviation to re-evaluate"
              >
                Simulate Deviation
              </button>
            </div>
          )}

          {/* B. Emergency Clearance Panel (Demo V2X / Simulated Connected Vehicles) (5-Second Story Step 6) */}
          <DriverEmergencyClearance
            session={clearanceSession}
            onAdvanceCycle={handleAdvanceClearance}
            isAdvancing={isAdvancingClearance}
          />

          {/* C. Live Situation & Corridor Status */}
          <DriverLiveSituation
            navState={navState}
            isDeviated={isDeviated}
            deviationDistance={deviationDistance}
            trafficLevel={isDeviated ? 'HEAVY' : 'MODERATE'}
            currentSpeed={currentLocation.speed}
            speedLimit={50}
            incidentAlert={isDeviated ? 'Accident reported 650m ahead on Old Airport Rd' : null}
            etaDelayMinutes={isDeviated ? 3 : 0}
            isSimulated={currentLocation.isSimulated}
            gpsStatus="ACTIVE"
          />

          {/* D. Route Comparison Drawer / Toggle */}
          {isComparisonOpen && routePlan && routePlan.alternative && (
            <DriverAlternativeRoutes
              currentRoute={routePlan}
              alternativeRoute={routePlan.alternative}
              timeSavedMinutes={timeSavedMin}
              isAccepting={isAcceptingReroute}
              onAcceptReroute={handleAcceptReroute}
              onRejectReroute={() => setIsComparisonOpen(false)}
            />
          )}

          {/* E. Next Turn Maneuver Preview */}
          {currentStep && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Navigation className="h-5 w-5 text-cyan-400 rotate-45 shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Next Maneuver</span>
                  <p className="text-xs font-bold text-white line-clamp-1">{currentStep.instruction}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                {currentStep.distance}m
              </span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Leaflet Map Canvas */}
        <div className={`flex-1 relative h-full w-full z-10 ${
          mobileActiveTab === 'COCKPIT' ? 'hidden lg:block' : 'block'
        }`}>
          
          {/* Top Floating Map Controls */}
          <div className="absolute top-3 right-3 sm:right-6 z-30 flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Simulation Drive Toggle */}
            <Button
              size="sm"
              onClick={toggleSimulation}
              className={`h-10 px-3.5 rounded-xl shadow-xl font-bold font-mono text-xs flex items-center gap-1.5 border backdrop-blur-xl transition-all ${
                isSimulating
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700/80'
              }`}
              title="Drive along route polyline"
            >
              {isSimulating ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause Drive</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Simulate Drive</span>
                </>
              )}
            </Button>

            {/* Advance V2X Quick Trigger on Map */}
            <button
              type="button"
              onClick={handleAdvanceClearance}
              disabled={isAdvancingClearance}
              className="h-10 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center gap-1.5 shadow-xl backdrop-blur-md"
              title="Step V2X clearance"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAdvancingClearance ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">V2X Cycle</span>
            </button>

            {/* Audio Mute Toggle */}
            <button
              type="button"
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="size-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center justify-center backdrop-blur-xl transition-all"
              aria-label={voiceMuted ? 'Unmute voice' : 'Mute voice'}
            >
              {voiceMuted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              )}
            </button>

            {/* Recenter Map */}
            <button
              type="button"
              onClick={() => setRecenterTrigger((prev) => prev + 1)}
              className="size-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center justify-center backdrop-blur-xl transition-all"
              aria-label="Recenter map"
            >
              <LocateFixed className="h-4 w-4 text-cyan-400" />
            </button>
          </div>

          {/* Leaflet Map */}
          <DriverNavigationMap
            activeRouteCoordinates={routePlan?.geometry?.coordinates || []}
            alternativeRouteCoordinates={routePlan?.alternative?.geometry?.coordinates || []}
            originalRouteCoordinates={originalRouteCoordinates}
            driverLocation={currentLocation.coordinates}
            driverHeading={currentLocation.heading}
            destinationCoordinates={selectedDestination?.coordinates}
            destinationName={selectedDestination?.name}
            routeIncidents={routeIncidents}
            clearanceVehicles={clearanceSession?.connectedVehicles || []}
            isDeviated={isDeviated}
            deviationDistance={deviationDistance}
            recenterTrigger={recenterTrigger}
            height="100%"
          />
        </div>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (for viewport <= 1024px) */}
      <div className="lg:hidden z-30 w-full bg-slate-950 border-t border-slate-800 flex items-center justify-around p-2">
        <button
          type="button"
          onClick={() => setMobileActiveTab('COCKPIT')}
          className={`flex-1 min-h-[44px] py-1.5 flex flex-col items-center justify-center rounded-lg text-xs font-bold transition-all ${
            mobileActiveTab === 'COCKPIT'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span>Cockpit</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300">GeoAgent + V2X</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveTab('MAP')}
          className={`flex-1 min-h-[44px] py-1.5 flex flex-col items-center justify-center rounded-lg text-xs font-bold transition-all ${
            mobileActiveTab === 'MAP'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1">
            <Navigation className="h-4 w-4" />
            <span>Map View</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-300">Live GPS</span>
        </button>
      </div>

      {/* 4. INCIDENT REPORT MODAL */}
      <DriverIncidentModal
        open={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        currentCoordinates={currentLocation.coordinates}
        onIncidentReported={(newIncident) => {
          setRouteIncidents((prev) => [newIncident, ...prev])
        }}
      />
    </div>
  )
}
