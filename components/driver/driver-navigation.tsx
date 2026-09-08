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
  RefreshCw,
  Building2,
  Route as RouteIcon,
  XCircle
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
import { DriverJourneyStatus } from './driver-journey-status'
import { DriverScenarioSelector, CANONICAL_DEMO_SCENARIOS, type ScenarioDefinition } from './driver-scenario-selector'
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
  type RouteLeg,
  type EmergencyStage,
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

/** Interpolate intermediate road-like coordinates between 2 points */
function buildSegmentCoordinates(start: [number, number], end: [number, number], intermediateDeltas: [number, number][] = []): [number, number][] {
  const result: [number, number][] = [start]
  for (const delta of intermediateDeltas) {
    result.push([start[0] + delta[0], start[1] + delta[1]])
  }
  result.push(end)
  return result
}

export function DriverNavigation({
  initialEmergency,
  ambulanceId: propAmbulanceId = 'AMB-01',
  className = ''
}: DriverNavigationProps) {
  // Navigation Mode: 'EMERGENCY_MISSION' (Mode A: 2-Leg) vs 'MANUAL_ROUTE' (Mode B: My Location -> Destination)
  const [navigationMode, setNavigationMode] = useState<'EMERGENCY_MISSION' | 'MANUAL_ROUTE'>('EMERGENCY_MISSION')
  const [isRoutePlannerVisible, setIsRoutePlannerVisible] = useState<boolean>(false)

  // Scenario Selection State (Part 64)
  const [currentScenario, setCurrentScenario] = useState<ScenarioDefinition>(CANONICAL_DEMO_SCENARIOS[0])
  const [isScenarioSelectorOpen, setIsScenarioSelectorOpen] = useState<boolean>(false)
  const [activeAmbulanceId, setActiveAmbulanceId] = useState<string>(propAmbulanceId)

  // Multi-Leg Journey State (Parts 3, 4, 5, 11, 12)
  const [activeLegNumber, setActiveLegNumber] = useState<number>(1) // 1: To Emergency, 2: To Hospital
  const [currentStage, setCurrentStage] = useState<EmergencyStage>('HEADING_TO_EMERGENCY')

  // Navigation State
  const [navState, setNavState] = useState<NavigationState>('NAVIGATING')
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null)
  const [leg1Coordinates, setLeg1Coordinates] = useState<[number, number][]>([])
  const [leg2Coordinates, setLeg2Coordinates] = useState<[number, number][]>([])
  const [originalRouteCoordinates, setOriginalRouteCoordinates] = useState<[number, number][]>([])
  const [activePreference, setActivePreference] = useState<'FASTEST' | 'SHORTEST'>('FASTEST')

  // Locations (3 Distinct Locations: Part 4)
  const [currentLocation, setCurrentLocation] = useState<GpsLocation>({
    coordinates: CANONICAL_DEMO_SCENARIOS[0].originCoordinates,
    heading: 52,
    speed: 24,
    accuracy: 4,
    timestamp: Date.now(),
    isSimulated: true
  })
  const [emergencyLocation, setEmergencyLocation] = useState<[number, number]>(
    CANONICAL_DEMO_SCENARIOS[0].emergencyCoordinates
  )
  const [emergencyName, setEmergencyName] = useState<string>(
    CANONICAL_DEMO_SCENARIOS[0].emergencyName
  )
  const [destinationLocation, setDestinationLocation] = useState<[number, number]>(
    CANONICAL_DEMO_SCENARIOS[0].destinationCoordinates
  )
  const [destinationName, setDestinationName] = useState<string>(
    CANONICAL_DEMO_SCENARIOS[0].destinationName
  )

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [distanceToNextStepMeters, setDistanceToNextStepMeters] = useState<number>(350)
  const [totalDistanceRemainingMeters, setTotalDistanceRemainingMeters] = useState<number>(5400)
  const [totalDurationRemainingSeconds, setTotalDurationRemainingSeconds] = useState<number>(900) // 15 min

  const [gpsPermission, setGpsPermission] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('granted')
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null)
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0)

  // Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simCoordIndex, setSimCoordIndex] = useState<number>(0)
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Deviation & GeoAgent Status
  const [isDeviated, setIsDeviated] = useState<boolean>(true)
  const [deviationDistance, setDeviationDistance] = useState<number>(68)
  const [geoAgentState, setGeoAgentState] = useState<'REROUTE_RECOMMENDED' | 'ROUTE_UPDATED' | 'MONITOR' | 'BACKUP_RECOMMENDED'>(
    'REROUTE_RECOMMENDED'
  )
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

  // 1. Browser Geolocation (Part 3 & 15: "USE MY LOCATION")
  const handleRequestGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsPermission('unavailable')
      setGpsStatusMessage('Geolocation not supported on this browser')
      return
    }

    setGpsStatusMessage('Acquiring high-accuracy GPS coordinates...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ]
        setCurrentLocation({
          coordinates: coords,
          heading: position.coords.heading || 0,
          speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 22,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
          isSimulated: false
        })
        setGpsPermission('granted')
        setGpsStatusMessage(null)
        setRecenterTrigger((prev) => prev + 1)
      },
      (error) => {
        let msg = 'Unable to determine GPS location'
        if (error.code === error.PERMISSION_DENIED) {
          setGpsPermission('denied')
          msg = 'Location permission denied in browser settings'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsPermission('unavailable')
          msg = 'GPS signal unavailable'
        } else if (error.code === error.TIMEOUT) {
          setGpsPermission('unavailable')
          msg = 'GPS request timed out'
        }
        setGpsStatusMessage(msg)
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
      }
    )
  }

  // 2. Custom Route Calculation from Route Planner (Part 1, 4, 5, 6)
  const handleCalculateRoute = async (params: {
    originCoordinates: [number, number]
    originName: string
    destinationCoordinates: [number, number]
    destinationName: string
    destinationHospitalCode?: string
    preference: 'FASTEST' | 'SHORTEST'
  }) => {
    setIsLoadingRoute(true)
    try {
      const res = await routeApi.calculateRoutePlan({
        origin: { type: 'Point', coordinates: params.originCoordinates },
        destination: { type: 'Point', coordinates: params.destinationCoordinates },
        preference: params.preference,
        computeAlternatives: true
      })

      if (res && res.success && res.data) {
        const plan: RoutePlan = res.data
        setRoutePlan(plan)
        setOriginalRouteCoordinates(plan.geometry.coordinates)
        setLeg1Coordinates([]) // Single leg in manual mode
        setLeg2Coordinates([])
        setActiveLegNumber(1)
        setCurrentStepIndex(0)
        setTotalDistanceRemainingMeters(plan.distanceMeters)
        setTotalDurationRemainingSeconds(plan.durationSeconds)
        setNavigationMode('MANUAL_ROUTE')
        setNavState('NAVIGATING')
        setIsRoutePlannerVisible(false)
        setDestinationLocation(params.destinationCoordinates)
        setDestinationName(params.destinationName)
        setCurrentLocation((prev) => ({
          ...prev,
          coordinates: params.originCoordinates,
          heading: calculateBearing(params.originCoordinates, params.destinationCoordinates)
        }))
        setIsDeviated(false)
        setDeviationDistance(0)
        setGeoAgentState('MONITOR')
        setRecenterTrigger((prev) => prev + 1)
      } else {
        throw new Error('Fallback')
      }
    } catch {
      // Build robust backend-aligned geometry between origin and destination
      const coords = buildSegmentCoordinates(params.originCoordinates, params.destinationCoordinates, [
        [(params.destinationCoordinates[0] - params.originCoordinates[0]) * 0.35, (params.destinationCoordinates[1] - params.originCoordinates[1]) * 0.2],
        [(params.destinationCoordinates[0] - params.originCoordinates[0]) * 0.7, (params.destinationCoordinates[1] - params.originCoordinates[1]) * 0.8]
      ])
      let dist = 0
      for (let i = 0; i < coords.length - 1; i++) {
        dist += haversineMeters(coords[i], coords[i + 1])
      }
      const dur = Math.round(dist / 10)

      const fallbackPlan: RoutePlan = {
        geometry: { type: 'LineString', coordinates: coords },
        distanceMeters: Math.round(dist),
        durationSeconds: dur,
        preference: params.preference,
        provider: 'GEOAGENT_BENGALURU_ENGINE',
        description: `${params.originName} → ${params.destinationName}`,
        steps: [
          { maneuver: 'DEPART', instruction: `Depart from ${params.originName}`, distance: 300, duration: 40 },
          { maneuver: 'CONTINUE', instruction: 'Follow primary arterial corridor with sirens active', distance: Math.round(dist * 0.7), duration: Math.round(dur * 0.7) },
          { maneuver: 'ARRIVE', instruction: `Arrive at ${params.destinationName}`, distance: 200, duration: 30 }
        ],
        calculatedAt: new Date().toISOString()
      }

      setRoutePlan(fallbackPlan)
      setOriginalRouteCoordinates(coords)
      setLeg1Coordinates([])
      setLeg2Coordinates([])
      setActiveLegNumber(1)
      setCurrentStepIndex(0)
      setTotalDistanceRemainingMeters(fallbackPlan.distanceMeters)
      setTotalDurationRemainingSeconds(fallbackPlan.durationSeconds)
      setNavigationMode('MANUAL_ROUTE')
      setNavState('NAVIGATING')
      setIsRoutePlannerVisible(false)
      setDestinationLocation(params.destinationCoordinates)
      setDestinationName(params.destinationName)
      setCurrentLocation((prev) => ({
        ...prev,
        coordinates: params.originCoordinates,
        heading: calculateBearing(params.originCoordinates, params.destinationCoordinates)
      }))
      setIsDeviated(false)
      setDeviationDistance(0)
      setGeoAgentState('MONITOR')
      setRecenterTrigger((prev) => prev + 1)
    } finally {
      setIsLoadingRoute(false)
    }
  }

  // 3. End / Reset Navigation (Part 14)
  const handleEndNavigation = () => {
    setIsSimulating(false)
    setNavState('IDLE')
    setIsRoutePlannerVisible(true)
    setSimCoordIndex(0)
  }

  // 4. Initialize Multi-Leg Emergency Corridors for the Active Scenario (Mode A)
  const initializeScenarioCorridors = useCallback((sc: ScenarioDefinition) => {
    setNavigationMode('EMERGENCY_MISSION')
    setIsRoutePlannerVisible(false)
    setActiveAmbulanceId(sc.vehicleId)
    setEmergencyLocation(sc.emergencyCoordinates)
    setEmergencyName(sc.emergencyName)
    setDestinationLocation(sc.destinationCoordinates)
    setDestinationName(sc.destinationName)
    setActiveLegNumber(1)
    setCurrentStage('HEADING_TO_EMERGENCY')

    // Generate road-following intermediate vertices for Leg 1 (Current -> Emergency)
    const leg1Coords = buildSegmentCoordinates(sc.originCoordinates, sc.emergencyCoordinates, [
      [(sc.emergencyCoordinates[0] - sc.originCoordinates[0]) * 0.35, (sc.emergencyCoordinates[1] - sc.originCoordinates[1]) * 0.2],
      [(sc.emergencyCoordinates[0] - sc.originCoordinates[0]) * 0.7, (sc.emergencyCoordinates[1] - sc.originCoordinates[1]) * 0.8]
    ])
    setLeg1Coordinates(leg1Coords)

    // Generate road-following intermediate vertices for Leg 2 (Emergency -> Hospital)
    const leg2Coords = buildSegmentCoordinates(sc.emergencyCoordinates, sc.destinationCoordinates, [
      [(sc.destinationCoordinates[0] - sc.emergencyCoordinates[0]) * 0.4, (sc.destinationCoordinates[1] - sc.emergencyCoordinates[1]) * 0.25],
      [(sc.destinationCoordinates[0] - sc.emergencyCoordinates[0]) * 0.75, (sc.destinationCoordinates[1] - sc.emergencyCoordinates[1]) * 0.85]
    ])
    setLeg2Coordinates(leg2Coords)

    // Combined active line for baseline
    const fullLine = [...leg1Coords, ...leg2Coords.slice(1)]
    setOriginalRouteCoordinates(fullLine)

    // Calculate distances
    let dist1 = 0
    for (let i = 0; i < leg1Coords.length - 1; i++) {
      dist1 += haversineMeters(leg1Coords[i], leg1Coords[i + 1])
    }
    let dist2 = 0
    for (let i = 0; i < leg2Coords.length - 1; i++) {
      dist2 += haversineMeters(leg2Coords[i], leg2Coords[i + 1])
    }

    const dur1 = Math.round(dist1 / 10) // ~36 km/h
    const dur2 = Math.round(dist2 / 9)

    // Build RoutePlan with structured legs
    const legs: RouteLeg[] = [
      {
        legNumber: 1,
        type: 'TO_EMERGENCY',
        title: `Leg 1: ${sc.originName} → ${sc.emergencyName}`,
        originName: sc.originName,
        destinationName: sc.emergencyName,
        originCoordinates: sc.originCoordinates,
        destinationCoordinates: sc.emergencyCoordinates,
        geometry: { type: 'LineString', coordinates: leg1Coords },
        distanceMeters: Math.round(dist1),
        durationSeconds: dur1,
        status: 'ACTIVE',
        steps: [
          { maneuver: 'DEPART', instruction: `Head out from ${sc.originName}`, distance: 350, duration: 45 },
          { maneuver: 'TURN_LEFT', instruction: 'Turn left onto primary arterial corridor', distance: 850, duration: 110 },
          { maneuver: 'CONTINUE', instruction: 'Proceed through traffic signal with sirens active', distance: 1200, duration: 160 },
          { maneuver: 'ARRIVE', instruction: `Arrive at Emergency Scene: ${sc.emergencyName}`, distance: 200, duration: 30 }
        ]
      },
      {
        legNumber: 2,
        type: 'TO_HOSPITAL',
        title: `Leg 2: ${sc.emergencyName} → ${sc.destinationName}`,
        originName: sc.emergencyName,
        destinationName: sc.destinationName,
        originCoordinates: sc.emergencyCoordinates,
        destinationCoordinates: sc.destinationCoordinates,
        geometry: { type: 'LineString', coordinates: leg2Coords },
        distanceMeters: Math.round(dist2),
        durationSeconds: dur2,
        status: 'PLANNED',
        steps: [
          { maneuver: 'DEPART', instruction: `Depart ${sc.emergencyName} with patient onboard`, distance: 400, duration: 50 },
          { maneuver: 'TURN_RIGHT', instruction: 'Turn right onto highway approach', distance: 1600, duration: 210 },
          { maneuver: 'CONTINUE', instruction: `Continue toward ${sc.destinationName} Emergency Bay`, distance: 1800, duration: 240 },
          { maneuver: 'ARRIVE', instruction: `Arrive at ${sc.destinationName} ER Bay`, distance: 250, duration: 40 }
        ]
      }
    ]

    // Alternative Route (Bypass corridor saving expected time)
    const hasAlt = sc.hasAutoReroute || sc.hasDeviation || sc.expectedTimeSavedMinutes > 0
    let alternative = null

    if (hasAlt) {
      const altLeg1Coords = buildSegmentCoordinates(sc.originCoordinates, sc.emergencyCoordinates, [
        [(sc.emergencyCoordinates[0] - sc.originCoordinates[0]) * 0.25 + 0.005, (sc.emergencyCoordinates[1] - sc.originCoordinates[1]) * 0.45 + 0.004],
        [(sc.emergencyCoordinates[0] - sc.originCoordinates[0]) * 0.65 + 0.003, (sc.emergencyCoordinates[1] - sc.originCoordinates[1]) * 0.85 + 0.002]
      ])
      alternative = {
        affectedLegNumber: 1,
        geometry: { type: 'LineString' as const, coordinates: altLeg1Coords },
        distanceMeters: Math.round(dist1 * 0.92),
        durationSeconds: Math.max(120, dur1 - sc.expectedTimeSavedMinutes * 60),
        preference: 'FASTEST' as const,
        description: `GeoAgent Recommended Bypass Corridor (Saves ~${sc.expectedTimeSavedMinutes} min)`,
        trafficDelaySeconds: 20,
        steps: [
          { maneuver: 'CONTINUE' as const, instruction: 'Bypass bottleneck via high-speed arterial corridor', distance: 1200, duration: 140 },
          { maneuver: 'TURN_RIGHT' as const, instruction: 'Re-join main approach with green wave', distance: 900, duration: 110 }
        ]
      }
    }

    const plan: RoutePlan = {
      geometry: { type: 'LineString', coordinates: fullLine },
      distanceMeters: Math.round(dist1 + dist2),
      durationSeconds: dur1 + dur2,
      preference: 'FASTEST',
      provider: 'GEOAGENT_BENGALURU_ENGINE',
      description: `${sc.title} — 2-Leg Emergency Transit`,
      legs,
      activeLegIndex: 0,
      emergencyLocation: sc.emergencyCoordinates,
      hospitalLocation: sc.destinationCoordinates,
      alternative,
      steps: legs[0].steps,
      calculatedAt: new Date().toISOString()
    }

    setRoutePlan(plan)
    setTotalDistanceRemainingMeters(plan.distanceMeters)
    setTotalDurationRemainingSeconds(plan.durationSeconds)

    // Set Driver Position at Origin
    setCurrentLocation({
      coordinates: sc.originCoordinates,
      heading: calculateBearing(sc.originCoordinates, sc.emergencyCoordinates),
      speed: 36,
      accuracy: 3,
      timestamp: Date.now(),
      isSimulated: true
    })

    // Set Decision State according to scenario
    if (sc.requiresReroute === false) {
      setIsDeviated(false)
      setDeviationDistance(0)
      setGeoAgentState('MONITOR')
    } else if (sc.hasBackupAmbulance) {
      setIsDeviated(false)
      setGeoAgentState('BACKUP_RECOMMENDED')
    } else {
      setIsDeviated(true)
      setDeviationDistance(sc.hasDeviation ? 92 : 68)
      setGeoAgentState('REROUTE_RECOMMENDED')
    }

    // Set simulated incidents if applicable
    if (sc.type === 'ACCIDENT') {
      setRouteIncidents([
        {
          _id: 'inc-sim-01',
          incidentId: 'INC-DEMO-CORRIDOR',
          type: 'ACCIDENT',
          severity: 'HIGH',
          status: 'ACTIVE',
          description: `Two-vehicle collision near ${sc.emergencyName} bottleneck`,
          location: { type: 'Point', coordinates: [(sc.originCoordinates[0] + sc.emergencyCoordinates[0]) / 2, (sc.originCoordinates[1] + sc.emergencyCoordinates[1]) / 2] },
          reportedBy: { _id: 'u1', name: 'Traffic Police', email: 'tp@swiftcare.local', role: 'ADMIN' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any
      ])
    } else {
      setRouteIncidents([])
    }
  }, [])

  // Initialize first scenario on mount
  useEffect(() => {
    initializeScenarioCorridors(currentScenario)
  }, [initializeScenarioCorridors, currentScenario])

  // 5. Fetch or initialize Emergency Clearance Session (Demo V2X)
  const fetchClearance = useCallback(async () => {
    try {
      const res = await clearanceApi.getForVehicle(activeAmbulanceId)
      if (res && res.success && res.data) {
        setClearanceSession(res.data)
      }
    } catch {
      // Retain baseline
    }
  }, [activeAmbulanceId])

  useEffect(() => {
    fetchClearance()
  }, [fetchClearance])

  // 6. Socket.IO Realtime Synchronization
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const unsubClearance = subscribeEvent<any>(
      REALTIME_EVENTS.CLEARANCE_STATUS_UPDATED,
      (data) => {
        if (data && (!data.vehicleId || data.vehicleId === activeAmbulanceId)) {
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
  }, [activeAmbulanceId])

  // 7. Advance Emergency Clearance Simulation Step
  const handleAdvanceClearance = async () => {
    setIsAdvancingClearance(true)
    try {
      const res = await clearanceApi.advanceCycle(activeAmbulanceId, 1)
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

  // 8. Accept Reroute Action
  const handleAcceptReroute = async () => {
    if (!routePlan || !routePlan.alternative) return
    setIsAcceptingReroute(true)

    try {
      const alternative = routePlan.alternative
      const affectedLeg = alternative.affectedLegNumber || 1

      // Call backend API to persist the accepted reroute in MongoDB
      const routeId = (routePlan as any).routeId || (routePlan as any)._id
      if (routeId) {
        try {
          await routeApi.acceptReroute(routeId, {
            acceptedBy: 'DRIVER',
            geometry: alternative.geometry,
            distanceMeters: alternative.distanceMeters,
            durationSeconds: alternative.durationSeconds,
            steps: alternative.steps,
            reason: `Accepted GeoAgent recommended bypass for Leg ${affectedLeg}`
          })
        } catch {
          // Backend API update fallback
        }
      }

      // Update affected leg coordinates
      if (affectedLeg === 1) {
        setLeg1Coordinates(alternative.geometry.coordinates)
      } else {
        setLeg2Coordinates(alternative.geometry.coordinates)
      }

      // Update frontend navigation state immediately
      setOriginalRouteCoordinates(routePlan.geometry.coordinates)
      setRoutePlan({
        ...routePlan,
        geometry: alternative.geometry,
        distanceMeters: alternative.distanceMeters,
        durationSeconds: alternative.durationSeconds,
        preference: alternative.preference,
        steps: alternative.steps || [
          { maneuver: 'CONTINUE', instruction: 'Head onto recommended bypass arterial corridor', distance: 1100, duration: 150 },
          { maneuver: 'TURN_RIGHT', instruction: 'Turn right toward emergency approach', distance: 1500, duration: 190 },
          { maneuver: 'ARRIVE', instruction: 'Arrive at destination', distance: 200, duration: 35 }
        ],
        alternative: null,
        description: alternative.description || 'Active GeoAgent Recommended Bypass'
      })

      setCurrentStepIndex(0)
      setTotalDistanceRemainingMeters(alternative.distanceMeters)
      setTotalDurationRemainingSeconds(alternative.durationSeconds)
      setIsDeviated(false)
      setDeviationDistance(0)
      setGeoAgentState('ROUTE_UPDATED')
      setRerouteAcceptedToast(true)

      // Trigger automatic clearance cycle
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

  // 9. Stage Progression Handler
  const handleAdvanceStage = () => {
    if (currentStage === 'HEADING_TO_EMERGENCY') {
      setCurrentStage('AT_EMERGENCY')
      setActiveLegNumber(2)
      setCurrentLocation({
        coordinates: emergencyLocation,
        heading: calculateBearing(emergencyLocation, destinationLocation),
        speed: 0,
        accuracy: 2,
        timestamp: Date.now(),
        isSimulated: true
      })
      if (routePlan?.legs?.[1]?.steps) {
        setCurrentStepIndex(0)
        setDistanceToNextStepMeters(400)
      }
    } else if (currentStage === 'AT_EMERGENCY') {
      setCurrentStage('TRANSPORTING_TO_HOSPITAL')
      setActiveLegNumber(2)
      setCurrentLocation((prev) => ({
        ...prev,
        speed: 42,
        timestamp: Date.now()
      }))
    } else if (currentStage === 'TRANSPORTING_TO_HOSPITAL') {
      setCurrentStage('ARRIVING_AT_HOSPITAL')
      setDistanceToNextStepMeters(250)
    } else if (currentStage === 'ARRIVING_AT_HOSPITAL') {
      setCurrentStage('ARRIVED')
      setNavState('ARRIVED')
      setIsSimulating(false)
      setTotalDistanceRemainingMeters(0)
      setTotalDurationRemainingSeconds(0)
    } else {
      // Reset back to Leg 1
      setCurrentStage('HEADING_TO_EMERGENCY')
      setActiveLegNumber(1)
      setNavState('NAVIGATING')
      setCurrentLocation({
        coordinates: currentScenario.originCoordinates,
        heading: 52,
        speed: 28,
        accuracy: 4,
        timestamp: Date.now(),
        isSimulated: true
      })
    }
  }

  // 10. Automated Drive Simulation
  useEffect(() => {
    const activeCoords =
      navigationMode === 'MANUAL_ROUTE'
        ? (routePlan?.geometry?.coordinates || [])
        : activeLegNumber === 1
        ? leg1Coordinates
        : leg2Coordinates

    if (!isSimulating || !activeCoords || activeCoords.length < 2) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current)
        simulationTimerRef.current = null
      }
      return
    }

    simulationTimerRef.current = setInterval(() => {
      setSimCoordIndex((prevIndex) => {
        const nextIndex = prevIndex + 1

        if (nextIndex >= activeCoords.length) {
          if (navigationMode === 'EMERGENCY_MISSION' && activeLegNumber === 1) {
            handleAdvanceStage()
            return 0
          } else {
            setNavState('ARRIVED')
            setIsSimulating(false)
            setTotalDistanceRemainingMeters(0)
            setTotalDurationRemainingSeconds(0)
            return prevIndex
          }
        }

        const currentPt = activeCoords[nextIndex]
        const prevPt = activeCoords[prevIndex]
        const heading = calculateBearing(prevPt, currentPt)

        setCurrentLocation({
          coordinates: currentPt,
          heading,
          speed: 44,
          accuracy: 3,
          timestamp: Date.now(),
          isSimulated: true
        })

        const pctDone = nextIndex / activeCoords.length
        const totalDist = routePlan?.distanceMeters || 5000
        const distRemaining = Math.max(0, Math.round(totalDist * (1 - pctDone)))
        const durRemaining = Math.max(0, Math.round((totalDist / 11) * (1 - pctDone)))

        setTotalDistanceRemainingMeters(distRemaining)
        setTotalDurationRemainingSeconds(durRemaining)

        const activeSteps =
          navigationMode === 'MANUAL_ROUTE'
            ? (routePlan?.steps || [])
            : activeLegNumber === 1
            ? (routePlan?.legs?.[0]?.steps || [])
            : (routePlan?.legs?.[1]?.steps || [])

        if (activeSteps.length > 0) {
          const stepIndex = Math.min(activeSteps.length - 1, Math.floor(pctDone * activeSteps.length))
          setCurrentStepIndex(stepIndex)
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
  }, [isSimulating, activeLegNumber, navigationMode, leg1Coordinates, leg2Coordinates, routePlan])

  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false)
    } else {
      if (navState === 'ARRIVED') {
        setSimCoordIndex(0)
        setNavState('NAVIGATING')
        if (navigationMode === 'EMERGENCY_MISSION') {
          setCurrentStage('HEADING_TO_EMERGENCY')
          setActiveLegNumber(1)
        }
      }
      setIsSimulating(true)
    }
  }

  // Active Maneuver Steps
  const activeSteps =
    navigationMode === 'MANUAL_ROUTE'
      ? (routePlan?.steps || [])
      : activeLegNumber === 1
      ? (routePlan?.legs?.[0]?.steps || routePlan?.steps || [])
      : (routePlan?.legs?.[1]?.steps || routePlan?.steps || [])

  const currentStep = activeSteps[currentStepIndex] || null
  const nextStep = activeSteps[currentStepIndex + 1] || null

  const currentEtaMin = Math.round(totalDurationRemainingSeconds / 60)
  const altEtaMin = routePlan?.alternative 
    ? Math.round(routePlan.alternative.durationSeconds / 60)
    : Math.max(1, currentEtaMin - (currentScenario.expectedTimeSavedMinutes || 5))
  const timeSavedMin = Math.max(1, currentEtaMin - altEtaMin)

  return (
    <div className={`relative flex flex-col h-full w-full overflow-hidden bg-slate-950 select-none ${className}`}>
      {/* 1. TOP EMERGENCY HEADER (Part 1 — Emergency State, Destination, Priority, ETA) */}
      <div className="z-30 w-full shrink-0">
        <DriverEmergencyHeader
          ambulanceId={activeAmbulanceId}
          destinationName={navigationMode === 'MANUAL_ROUTE' ? destinationName : activeLegNumber === 1 ? emergencyName : destinationName}
          destinationAddress={navigationMode === 'MANUAL_ROUTE' ? 'Manual Route Destination' : activeLegNumber === 1 ? 'Emergency Patient Incident Bay' : 'Hospital Tertiary Trauma Center'}
          priority={navigationMode === 'MANUAL_ROUTE' ? 'HIGH' : currentScenario.priority}
          etaMinutes={currentEtaMin}
          delayMinutes={isDeviated ? 3 : 0}
          emergencyActive={navState !== 'ARRIVED'}
          scenarioTitle={navigationMode === 'MANUAL_ROUTE' ? 'Custom Route' : currentScenario.id}
          onOpenScenarios={() => setIsScenarioSelectorOpen(true)}
        />

        {/* MODE SWITCHER / DISCOVERY BAR (Part 1, 7, 21 — Clear Mode Selection) */}
        <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNavigationMode('EMERGENCY_MISSION')
                setIsRoutePlannerVisible(false)
                initializeScenarioCorridors(currentScenario)
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                navigationMode === 'EMERGENCY_MISSION' && !isRoutePlannerVisible
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>🚨 Emergency Mission (2-Leg)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRoutePlannerVisible(true)
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                isRoutePlannerVisible || navigationMode === 'MANUAL_ROUTE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <RouteIcon className="size-3.5" />
              <span>🗺️ Route Planner (My Location → Dest)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {navigationMode === 'MANUAL_ROUTE' && (
              <button
                type="button"
                onClick={handleEndNavigation}
                className="min-h-[38px] px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40 text-[11px]"
              >
                End Route
              </button>
            )}
            <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
              Mode: {navigationMode === 'EMERGENCY_MISSION' ? 'Active 2-Leg Emergency' : 'Manual Route Planner'}
            </span>
          </div>
        </div>
      </div>

      {/* Reroute Success Notification Toast */}
      {rerouteAcceptedToast && (
        <div className="absolute top-28 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-2xl border border-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-200 animate-bounce" />
            <span>GeoAgent Route Activated · Bypass Corridor Set · Saving {timeSavedMin} Min</span>
          </div>
        </div>
      )}

      {/* 2. MAIN COCKPIT: Split View on Desktop, Tabbed on Mobile */}
      <div className="flex-1 relative w-full flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT COLUMN / SIDEBAR (Desktop) or TAB CONTENT (Mobile) */}
        <div className={`w-full lg:w-[480px] xl:w-[520px] shrink-0 flex flex-col z-20 overflow-y-auto custom-scrollbar border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-md p-3 sm:p-4 space-y-3 ${
          mobileActiveTab === 'MAP' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* ROUTE PLANNER VIEW (Shown when user clicks Route Planner or IDLE) */}
          {isRoutePlannerVisible ? (
            <div className="space-y-3">
              <DriverRoutePlanner
                currentLocation={currentLocation}
                gpsPermission={gpsPermission}
                gpsStatusMessage={gpsStatusMessage}
                onRequestGps={handleRequestGps}
                onCalculateRoute={handleCalculateRoute}
                onCancel={() => setIsRoutePlannerVisible(false)}
                isLoading={isLoadingRoute}
                initialEmergencyDestination={
                  navigationMode === 'EMERGENCY_MISSION'
                    ? {
                        id: 'dest-hosp',
                        name: destinationName,
                        address: 'Bengaluru Facility',
                        coordinates: destinationLocation
                      }
                    : null
                }
              />
            </div>
          ) : (
            <>
              {/* A. 2-LEG JOURNEY STATUS (Only in Emergency Mission Mode) */}
              {navigationMode === 'EMERGENCY_MISSION' ? (
                <DriverJourneyStatus
                  ambulanceId={activeAmbulanceId}
                  currentLocationName={currentScenario.originName}
                  emergencyLocationName={emergencyName}
                  emergencyCoordinates={emergencyLocation}
                  destinationName={destinationName}
                  destinationCoordinates={destinationLocation}
                  activeLegNumber={activeLegNumber}
                  currentStage={currentStage}
                  legs={routePlan?.legs || []}
                  onSelectLeg={(legNum) => {
                    setActiveLegNumber(legNum)
                    setCurrentStepIndex(0)
                  }}
                  onAdvanceStage={handleAdvanceStage}
                  isSimulating={isSimulating}
                />
              ) : (
                /* Manual Route Status Card */
                <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 text-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <RouteIcon className="size-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase text-emerald-400">Custom Navigation Active</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRoutePlannerVisible(true)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 underline"
                    >
                      Edit Route
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Car className="size-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">From: Current Device GPS</span>
                    </div>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <MapPin className="size-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">To: {destinationName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* B. NEXT MANEUVER CARD (Part 13 — Turn instructions) */}
              {currentStep && (
                <DriverManeuverCard
                  currentStep={currentStep}
                  nextStep={nextStep}
                  state={navState}
                  distanceToStepMeters={distanceToNextStepMeters}
                  destinationName={destinationName}
                />
              )}

              {/* C. GeoAgent Decision Action Hero Card */}
              {navigationMode === 'EMERGENCY_MISSION' && (
                <>
                  {geoAgentState === 'BACKUP_RECOMMENDED' ? (
                    <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-white shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-400 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                            🤖 GeoAgent Advisory: Backup Unit Dispatched
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          AMB-06 Standby
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Primary corridor delayed by multi-vehicle bottleneck. Secondary unit AMB-06 at St John&apos;s recommended to reduce arrival time by 8 minutes.
                      </p>
                    </div>
                  ) : geoAgentState !== 'ROUTE_UPDATED' && routePlan?.alternative ? (
                    <DriverGeoAgentPanel
                      state={geoAgentState}
                      likelyCause={currentScenario.hasRoadClosure ? 'Full road closure ahead on primary corridor' : 'Severe congestion & bottleneck ahead'}
                      confidence={0.94}
                      currentEtaMinutes={currentEtaMin}
                      alternativeEtaMinutes={altEtaMin}
                      timeSavedMinutes={timeSavedMin}
                      explanation={`Bottleneck detected on corridor. GeoAgent evaluated alternative route, circumventing delay with clear arterial telemetry.`}
                      evidence={[
                        `Ambulance trajectory offset: +${Math.round(deviationDistance)}m`,
                        'Corridor traffic congestion index: 84% (Severe delay)',
                        'Accident/Closure reported: Multiple lanes restricted ahead',
                        `Alternative Route saves ~${timeSavedMin} minutes transit time`,
                        '3 simulated connected vehicles alerted in emergency radius'
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
                              GeoAgent Corridor
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              OPTIMAL
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Following recommended active corridor. Zero active hazards.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeviated(true)
                          setGeoAgentState('REROUTE_RECOMMENDED')
                        }}
                        className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-semibold border border-slate-700 shrink-0 transition-colors"
                        title="Simulate deviation to trigger GeoAgent"
                      >
                        Simulate Deviation
                      </button>
                    </div>
                  )}

                  {/* D. Emergency Clearance Panel */}
                  <DriverEmergencyClearance
                    session={clearanceSession}
                    onAdvanceCycle={handleAdvanceClearance}
                    isAdvancing={isAdvancingClearance}
                  />
                </>
              )}

              {/* E. Live Situation & Corridor Status (Part 22) */}
              <DriverLiveSituation
                navState={navState}
                isDeviated={isDeviated}
                deviationDistance={deviationDistance}
                trafficLevel={isDeviated ? 'HEAVY' : 'MODERATE'}
                currentSpeed={currentLocation.speed}
                speedLimit={50}
                incidentAlert={isDeviated ? `Obstruction reported on approach` : null}
                etaDelayMinutes={isDeviated ? 3 : 0}
                isSimulated={currentLocation.isSimulated}
                gpsStatus="ACTIVE"
              />

              {/* F. Route Comparison Drawer / Toggle */}
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
            </>
          )}
        </div>

        {/* RIGHT COLUMN: HUGE Central Interactive Leaflet Map (Parts 2-10) */}
        <div className={`flex-1 relative h-full w-full z-10 ${
          mobileActiveTab === 'COCKPIT' ? 'hidden lg:block' : 'block'
        }`}>
          
          {/* Top Floating Map Action Bar */}
          <div className="absolute top-3 right-3 sm:right-6 z-30 flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Plan Route / Return to Planner Button (Part 1, 15, 21) */}
            <Button
              size="sm"
              onClick={() => {
                setIsRoutePlannerVisible(!isRoutePlannerVisible)
                if (mobileActiveTab === 'MAP') setMobileActiveTab('COCKPIT')
              }}
              className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xl backdrop-blur-xl border border-emerald-400 transition-all"
              title="Open My Location to Destination Route Planner"
            >
              <RouteIcon className="h-4 w-4" />
              <span>{isRoutePlannerVisible ? 'Hide Planner' : 'Plan Route'}</span>
            </Button>

            {/* Demo Scenario Selector Button */}
            {navigationMode === 'EMERGENCY_MISSION' && (
              <Button
                size="sm"
                onClick={() => setIsScenarioSelectorOpen(true)}
                className="min-h-[44px] px-3.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xl backdrop-blur-xl border border-blue-400 transition-all"
                title="Select Bengaluru Demo Scenario"
              >
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>{currentScenario.id}</span>
              </Button>
            )}

            {/* Simulation Drive Toggle */}
            <Button
              size="sm"
              onClick={toggleSimulation}
              className={`min-h-[44px] px-3.5 rounded-xl shadow-xl font-bold font-mono text-xs flex items-center gap-1.5 border backdrop-blur-xl transition-all ${
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

            {/* Recenter Map (Part 14, 15) */}
            <button
              type="button"
              onClick={() => setRecenterTrigger((prev) => prev + 1)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center justify-center backdrop-blur-xl transition-all"
              aria-label="Recenter map on GPS location"
              title="Recenter on current location"
            >
              <LocateFixed className="h-4 w-4 text-cyan-400" />
            </button>

            {/* Audio Mute Toggle */}
            <button
              type="button"
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center justify-center backdrop-blur-xl transition-all"
              aria-label={voiceMuted ? 'Unmute voice' : 'Mute voice'}
            >
              {voiceMuted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              )}
            </button>
          </div>

          {/* HUGE Leaflet Map (Multi-Leg: Leg 1 BLUE, Leg 2 GREEN, or Single Active Line) */}
          <DriverNavigationMap
            activeRouteCoordinates={routePlan?.geometry?.coordinates || []}
            leg1Coordinates={navigationMode === 'EMERGENCY_MISSION' ? leg1Coordinates : []}
            leg2Coordinates={navigationMode === 'EMERGENCY_MISSION' ? leg2Coordinates : []}
            activeLegNumber={activeLegNumber}
            alternativeRouteCoordinates={routePlan?.alternative?.geometry?.coordinates || []}
            originalRouteCoordinates={originalRouteCoordinates}
            driverLocation={currentLocation.coordinates}
            driverHeading={currentLocation.heading}
            emergencyCoordinates={navigationMode === 'EMERGENCY_MISSION' ? emergencyLocation : undefined}
            emergencyName={navigationMode === 'EMERGENCY_MISSION' ? emergencyName : undefined}
            destinationCoordinates={destinationLocation}
            destinationName={destinationName}
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
            <span>Cockpit & Plan</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300">
            {isRoutePlannerVisible ? 'Route Planner' : 'Navigation HUD'}
          </span>
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

      {/* 4. DEMO SCENARIO SELECTOR MODAL (Part 64) */}
      <DriverScenarioSelector
        isOpen={isScenarioSelectorOpen}
        onClose={() => setIsScenarioSelectorOpen(false)}
        currentScenarioId={currentScenario.id}
        onSelectScenario={(sc) => {
          setCurrentScenario(sc)
          initializeScenarioCorridors(sc)
        }}
      />

      {/* 5. INCIDENT REPORT MODAL */}
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
