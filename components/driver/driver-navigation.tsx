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
import { DriverSmsButton } from './driver-sms-button'
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
import { CANONICAL_ROAD_CORRIDORS } from '@/lib/canonical-road-corridors'
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

/**
 * Snap a GPS coordinate to the closest point along a route polyline.
 * Also returns orthogonal cross-track deviation distance in meters.
 */
function snapToRoute(
  point: [number, number],
  routeCoords: [number, number][]
): {
  snappedPoint: [number, number]
  deviationMeters: number
  nearestSegmentIndex: number
} {
  if (!routeCoords || routeCoords.length === 0) {
    return { snappedPoint: point, deviationMeters: 0, nearestSegmentIndex: 0 }
  }
  if (routeCoords.length === 1) {
    const d = haversineMeters(point, routeCoords[0])
    return { snappedPoint: routeCoords[0], deviationMeters: d, nearestSegmentIndex: 0 }
  }

  let minDistance = Infinity
  let bestPoint = routeCoords[0]
  let bestSegIndex = 0

  const [px, py] = point

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [ax, ay] = routeCoords[i]
    const [bx, by] = routeCoords[i + 1]

    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy

    let t = 0
    if (lenSq > 0) {
      t = ((px - ax) * dx + (py - ay) * dy) / lenSq
      t = Math.max(0, Math.min(1, t))
    }

    const projX = ax + t * dx
    const projY = ay + t * dy
    const projPoint: [number, number] = [projX, projY]

    const dist = haversineMeters(point, projPoint)
    if (dist < minDistance) {
      minDistance = dist
      bestPoint = projPoint
      bestSegIndex = i
    }
  }

  return {
    snappedPoint: bestPoint,
    deviationMeters: minDistance,
    nearestSegmentIndex: bestSegIndex
  }
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
  const [routeError, setRouteError] = useState<string | null>(null)
  const [gpsMode, setGpsMode] = useState<'SIMULATION' | 'LIVE_GPS'>('SIMULATION')

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
    setRouteError(null)
    try {
      const res = await routeApi.calculateRoutePlan({
        origin: { type: 'Point', coordinates: params.originCoordinates },
        destination: { type: 'Point', coordinates: params.destinationCoordinates },
        preference: params.preference,
        computeAlternatives: true
      })

      if (res && res.success && res.data && res.data.geometry?.coordinates?.length > 1) {
        const plan: RoutePlan = res.data
        setRoutePlan(plan)
        setOriginalRouteCoordinates(plan.geometry.coordinates)
        setLeg1Coordinates([]) // Single leg in manual mode
        setLeg2Coordinates([])
        setActiveLegNumber(1)
        setCurrentStepIndex(0)
        setDistanceToNextStepMeters(plan.steps?.[0]?.distance || 350)
        setTotalDistanceRemainingMeters(plan.distanceMeters)
        setTotalDurationRemainingSeconds(plan.durationSeconds)
        setNavigationMode('MANUAL_ROUTE')
        setNavState('NAVIGATING')
        setIsRoutePlannerVisible(false)
        setDestinationLocation(params.destinationCoordinates)
        setDestinationName(params.destinationName)
        setCurrentLocation((prev) => ({
          ...prev,
          coordinates: plan.geometry.coordinates[0],
          heading: calculateBearing(plan.geometry.coordinates[0], plan.geometry.coordinates[1] || params.destinationCoordinates)
        }))
        setIsDeviated(false)
        setDeviationDistance(0)
        setGeoAgentState('MONITOR')
        setRecenterTrigger((prev) => prev + 1)
      } else {
        throw new Error(res?.message || 'Unable to calculate road route')
      }
    } catch (err: unknown) {
      console.error('[DriverNav] Custom route calculation error:', err)
      setRouteError('Road route unavailable between selected points. Please choose valid street locations.')
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
  const initializeScenarioCorridors = useCallback(async (sc: ScenarioDefinition) => {
    setNavigationMode('EMERGENCY_MISSION')
    setIsRoutePlannerVisible(false)
    setActiveAmbulanceId(sc.vehicleId)
    setEmergencyLocation(sc.emergencyCoordinates)
    setEmergencyName(sc.emergencyName)
    setDestinationLocation(sc.destinationCoordinates)
    setDestinationName(sc.destinationName)
    setActiveLegNumber(1)
    setCurrentStage('HEADING_TO_EMERGENCY')
    setCurrentStepIndex(0)
    setIsSimulating(false)
    setSimCoordIndex(0)
    setIsLoadingRoute(true)
    setRouteError(null)

    try {
      // Fetch real drivable road networks for Leg 1 and Leg 2 in parallel
      const [leg1Res, leg2Res] = await Promise.all([
        routeApi.calculateRoutePlan({
          origin: { type: 'Point', coordinates: sc.originCoordinates },
          destination: { type: 'Point', coordinates: sc.emergencyCoordinates },
          preference: 'FASTEST',
          computeAlternatives: sc.hasAutoReroute || sc.hasDeviation || sc.expectedTimeSavedMinutes > 0
        }).catch((err) => {
          console.warn('[DriverNav] Leg 1 calculation error:', err)
          return null
        }),
        routeApi.calculateRoutePlan({
          origin: { type: 'Point', coordinates: sc.emergencyCoordinates },
          destination: { type: 'Point', coordinates: sc.destinationCoordinates },
          preference: 'FASTEST'
        }).catch((err) => {
          console.warn('[DriverNav] Leg 2 calculation error:', err)
          return null
        })
      ])

      const leg1Plan = leg1Res?.data
      const leg2Plan = leg2Res?.data

      // Match scenario ID to authentic canonical road corridors
      const scenarioCorridorMap: Record<string, { leg1: any, leg2: any, alt?: any }> = {
        'DEMO-001': {
          leg1: CANONICAL_ROAD_CORRIDORS.KORAMANGALA_DEPOT_TO_EMERGENCY.primary,
          leg2: CANONICAL_ROAD_CORRIDORS.EMERGENCY_TO_MANIPAL.primary,
          alt: CANONICAL_ROAD_CORRIDORS.EMERGENCY_TO_MANIPAL.alternative
        },
        'DEMO-002': {
          leg1: CANONICAL_ROAD_CORRIDORS.HEBBAL_TO_VICTORIA_LEG1.primary,
          leg2: CANONICAL_ROAD_CORRIDORS.HEBBAL_TO_VICTORIA_LEG2.primary,
          alt: CANONICAL_ROAD_CORRIDORS.HEBBAL_TO_VICTORIA_LEG2.alternative
        },
        'DEMO-003': {
          leg1: CANONICAL_ROAD_CORRIDORS.WHITEFIELD_TO_SAKRA_LEG1.primary,
          leg2: CANONICAL_ROAD_CORRIDORS.WHITEFIELD_TO_SAKRA_LEG2.primary,
          alt: CANONICAL_ROAD_CORRIDORS.WHITEFIELD_TO_SAKRA_LEG2.alternative
        },
        'DEMO-004': {
          leg1: CANONICAL_ROAD_CORRIDORS.YELAHANKA_TO_BOWRING_LEG1.primary,
          leg2: CANONICAL_ROAD_CORRIDORS.YELAHANKA_TO_BOWRING_LEG2.primary,
          alt: CANONICAL_ROAD_CORRIDORS.YELAHANKA_TO_BOWRING_LEG2.alternative
        },
        'DEMO-005': {
          leg1: CANONICAL_ROAD_CORRIDORS.ECITY_TO_STJOHNS_LEG1.primary,
          leg2: CANONICAL_ROAD_CORRIDORS.ECITY_TO_STJOHNS_LEG2.primary,
          alt: CANONICAL_ROAD_CORRIDORS.ECITY_TO_STJOHNS_LEG2.alternative
        }
      }

      const defaultCorridor = scenarioCorridorMap[sc.id] || scenarioCorridorMap['DEMO-001']

      // Guaranteed authentic Road Geometry (NEVER synthetic straight lines or array interpolation)
      const leg1Coords: [number, number][] = (leg1Plan?.geometry?.coordinates?.length > 1)
        ? leg1Plan.geometry.coordinates
        : (defaultCorridor?.leg1?.coordinates as [number, number][])

      const leg2Coords: [number, number][] = (leg2Plan?.geometry?.coordinates?.length > 1)
        ? leg2Plan.geometry.coordinates
        : (defaultCorridor?.leg2?.coordinates as [number, number][])

      setLeg1Coordinates(leg1Coords)
      setLeg2Coordinates(leg2Coords)

      const fullLine: [number, number][] = [...leg1Coords, ...leg2Coords.slice(1)]
      setOriginalRouteCoordinates(fullLine)

      const dist1 = leg1Plan?.distanceMeters || defaultCorridor?.leg1?.distance || 2800
      const dist2 = leg2Plan?.distanceMeters || defaultCorridor?.leg2?.distance || 5200
      const dur1 = leg1Plan?.durationSeconds || defaultCorridor?.leg1?.duration || 320
      const dur2 = leg2Plan?.durationSeconds || defaultCorridor?.leg2?.duration || 640

      const leg1Steps: NavigationStep[] = (leg1Plan?.steps && leg1Plan.steps.length > 0)
        ? leg1Plan.steps
        : (defaultCorridor?.leg1?.steps && defaultCorridor.leg1.steps.length > 0)
          ? defaultCorridor.leg1.steps
          : [
              { maneuver: 'DEPART', instruction: `Head out from ${sc.originName}`, distance: 350, duration: 45, startLocation: sc.originCoordinates },
              { maneuver: 'ARRIVE', instruction: `Arrive at Emergency Scene: ${sc.emergencyName}`, distance: 0, duration: 0, startLocation: sc.emergencyCoordinates }
            ]

      const leg2Steps: NavigationStep[] = (leg2Plan?.steps && leg2Plan.steps.length > 0)
        ? leg2Plan.steps
        : (defaultCorridor?.leg2?.steps && defaultCorridor.leg2.steps.length > 0)
          ? defaultCorridor.leg2.steps
          : [
              { maneuver: 'DEPART', instruction: `Depart ${sc.emergencyName} with patient stabilized onboard`, distance: 350, duration: 45, startLocation: sc.emergencyCoordinates },
              { maneuver: 'ARRIVE', instruction: `Arrive at ${sc.destinationName} ER Bay`, distance: 0, duration: 0, startLocation: sc.destinationCoordinates }
            ]

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
          distanceMeters: dist1,
          durationSeconds: dur1,
          status: 'ACTIVE',
          steps: leg1Steps
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
          distanceMeters: dist2,
          durationSeconds: dur2,
          status: 'PLANNED',
          steps: leg2Steps
        }
      ]

      let alternative = null
      if (leg1Plan?.alternative && leg1Plan.alternative.geometry?.coordinates?.length > 1) {
        alternative = {
          affectedLegNumber: 1,
          geometry: leg1Plan.alternative.geometry,
          distanceMeters: leg1Plan.alternative.distanceMeters,
          durationSeconds: leg1Plan.alternative.durationSeconds,
          preference: 'FASTEST' as const,
          description: leg1Plan.alternative.description || `GeoAgent Recommended Bypass Corridor (Saves ~${sc.expectedTimeSavedMinutes} min)`,
          trafficDelaySeconds: 20,
          steps: leg1Plan.alternative.steps || [
            { maneuver: 'CONTINUE' as const, instruction: 'Bypass bottleneck via arterial corridor', distance: 1200, duration: 140 },
            { maneuver: 'ARRIVE' as const, instruction: 'Arrive at destination', distance: 200, duration: 30 }
          ]
        }
      } else if ((sc.hasReroute || sc.hasAlternative) && defaultCorridor?.alt?.coordinates) {
        alternative = {
          affectedLegNumber: 2,
          geometry: { type: 'LineString' as const, coordinates: defaultCorridor.alt.coordinates as [number, number][] },
          distanceMeters: defaultCorridor.alt.distance || (dist2 + 600),
          durationSeconds: defaultCorridor.alt.duration + 360,
          preference: 'FASTEST' as const,
          description: `GeoAgent Recommended Bypass Corridor (Saves ~${sc.expectedTimeSavedMinutes || 6} min)`,
          trafficDelaySeconds: 360,
          steps: defaultCorridor.alt.steps || []
        }
      }

      const plan: RoutePlan = {
        geometry: { type: 'LineString', coordinates: fullLine },
        distanceMeters: dist1 + dist2,
        durationSeconds: dur1 + dur2,
        preference: 'FASTEST',
        provider: leg1Plan?.provider || 'GEOAGENT_CORRIDOR_ENGINE',
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

      setCurrentLocation({
        coordinates: leg1Coords[0],
        heading: calculateBearing(leg1Coords[0], leg1Coords[1] || sc.emergencyCoordinates),
        speed: 36,
        accuracy: 3,
        timestamp: Date.now(),
        isSimulated: true
      })
      setDistanceToNextStepMeters(legs[0].steps[0]?.distance || 350)
      setRecenterTrigger((prev) => prev + 1)
    } catch (err: unknown) {
      console.warn('[DriverNav] Scenario corridors calculation fallback triggered:', err)
    } finally {
      setIsLoadingRoute(false)
    }

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

  // 10. Automated Drive Simulation (Road-snapped along real street geometry)
  useEffect(() => {
    const activeCoords =
      navigationMode === 'MANUAL_ROUTE'
        ? (routePlan?.geometry?.coordinates || [])
        : activeLegNumber === 1
        ? leg1Coordinates
        : leg2Coordinates

    if (!isSimulating || gpsMode === 'LIVE_GPS' || !activeCoords || activeCoords.length < 2) {
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

        // Road-snapping ensures vehicle stays precisely centered on road centerline
        const snap = snapToRoute(currentPt, activeCoords)
        const displayPt = snap.deviationMeters <= 50 ? snap.snappedPoint : currentPt

        setCurrentLocation({
          coordinates: displayPt,
          heading,
          speed: 46,
          accuracy: 3,
          timestamp: Date.now(),
          isSimulated: true
        })

        const pctDone = nextIndex / activeCoords.length
        const totalDist =
          navigationMode === 'MANUAL_ROUTE'
            ? (routePlan?.distanceMeters || 4000)
            : activeLegNumber === 1
            ? (routePlan?.legs?.[0]?.distanceMeters || 3000)
            : (routePlan?.legs?.[1]?.distanceMeters || 3000)

        const distRemaining = Math.max(0, Math.round(totalDist * (1 - pctDone)))
        const durRemaining = Math.max(0, Math.round((totalDist / 12) * (1 - pctDone)))

        setTotalDistanceRemainingMeters(distRemaining)
        setTotalDurationRemainingSeconds(durRemaining)

        const activeSteps =
          navigationMode === 'MANUAL_ROUTE'
            ? (routePlan?.steps || [])
            : activeLegNumber === 1
            ? (routePlan?.legs?.[0]?.steps || [])
            : (routePlan?.legs?.[1]?.steps || [])

        if (activeSteps.length > 0) {
          const stepCount = activeSteps.length
          const stepIndex = Math.min(stepCount - 1, Math.floor(pctDone * stepCount))
          setCurrentStepIndex(stepIndex)

          // Smoothly decrease distance countdown to next maneuver
          const stepSlice = 1 / stepCount
          const progressInStep = Math.max(0, Math.min(1, (pctDone - stepIndex * stepSlice) / stepSlice))
          const currentStepDist = activeSteps[stepIndex]?.distance || 400
          const distToManeuver = Math.max(20, Math.round(currentStepDist * (1 - progressInStep)))
          setDistanceToNextStepMeters(distToManeuver)
        }

        return nextIndex
      })
    }, 700)

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current)
        simulationTimerRef.current = null
      }
    }
  }, [isSimulating, gpsMode, activeLegNumber, navigationMode, leg1Coordinates, leg2Coordinates, routePlan])

  // 11. Continuous Live GPS Tracking (watchPosition)
  useEffect(() => {
    if (gpsMode !== 'LIVE_GPS') return
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatusMessage('Geolocation not supported on this browser')
      setGpsMode('SIMULATION')
      return
    }

    const activeCoords =
      navigationMode === 'MANUAL_ROUTE'
        ? (routePlan?.geometry?.coordinates || [])
        : activeLegNumber === 1
        ? leg1Coordinates
        : leg2Coordinates

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rawCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        const snap = snapToRoute(rawCoords, activeCoords)
        const displayCoords = snap.deviationMeters <= 50 ? snap.snappedPoint : rawCoords
        const heading = pos.coords.heading ?? calculateBearing(currentLocation.coordinates, displayCoords)

        setCurrentLocation({
          coordinates: displayCoords,
          heading: heading || 0,
          speed: Math.round(pos.coords.speed ? pos.coords.speed * 3.6 : 32),
          accuracy: Math.round(pos.coords.accuracy || 4),
          timestamp: pos.timestamp || Date.now(),
          isSimulated: false
        })

        const isOff = snap.deviationMeters > 50
        setIsDeviated(isOff)
        setDeviationDistance(Math.round(snap.deviationMeters))
        if (isOff) {
          setGeoAgentState('REROUTE_RECOMMENDED')
        }
      },
      (err) => {
        console.warn('[DriverNav] Geolocation watchPosition error:', err)
        setGpsStatusMessage('GPS signal lost or permission denied')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [gpsMode, activeLegNumber, navigationMode, leg1Coordinates, leg2Coordinates, routePlan, currentLocation.coordinates])

  const toggleSimulation = () => {
    if (gpsMode === 'LIVE_GPS') {
      setGpsMode('SIMULATION')
    }
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

            {/* GPS Tracking Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                if (gpsMode === 'SIMULATION') {
                  setIsSimulating(false)
                  setGpsMode('LIVE_GPS')
                } else {
                  setGpsMode('SIMULATION')
                }
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                gpsMode === 'LIVE_GPS'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title={gpsMode === 'LIVE_GPS' ? 'Switch to simulation mode' : 'Track live browser GPS'}
            >
              <Radio className={`size-3.5 ${gpsMode === 'LIVE_GPS' ? 'text-white animate-pulse' : 'text-slate-400'}`} />
              <span>{gpsMode === 'LIVE_GPS' ? 'Live GPS Active' : 'Live GPS'}</span>
            </button>

            {/* Emergency Status SMS Action */}
            <DriverSmsButton
              emergencyId={currentScenario.id}
              ambulanceId={activeAmbulanceId}
              defaultCallerContact={currentScenario.callerContact || '9876543210'}
              destinationHospital={destinationName}
              etaMinutes={currentEtaMin}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isLoadingRoute && (
              <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold animate-pulse">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Routing Roads...</span>
              </span>
            )}
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
                errorMessage={routeError}
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
            currentStep={routePlan?.steps?.[currentStepIndex] || null}
            nextStep={routePlan?.steps?.[currentStepIndex + 1] || null}
            distanceToNextStepMeters={distanceToNextStepMeters}
            totalDistanceRemainingMeters={totalDistanceRemainingMeters}
            totalDurationRemainingSeconds={totalDurationRemainingSeconds}
            steps={routePlan?.steps || []}
            navState={navState}
            speed={currentLocation.speed}
            isVoiceActive={!voiceMuted}
            onToggleVoice={() => setVoiceMuted(!voiceMuted)}
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
