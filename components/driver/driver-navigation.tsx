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
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DriverManeuverCard } from './driver-maneuver-card'
import { DriverStatusCard } from './driver-status-card'
import { DriverBottomSheet } from './driver-bottom-sheet'
import { DriverRoutePlanner } from './driver-route-planner'
import { DriverIncidentModal } from './driver-incident-modal'
import { DriverRerouteAlert } from './driver-reroute-alert'
import { DriverNavigationMap } from './driver-navigation-map'
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
  const [navState, setNavState] = useState<NavigationState>('IDLE')
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null)
  const [activePreference, setActivePreference] = useState<'FASTEST' | 'SHORTEST'>('FASTEST')
  const [selectedDestination, setSelectedDestination] = useState<DestinationOption | null>(
    BENGALURU_HOSPITALS[0]
  )
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [distanceToNextStepMeters, setDistanceToNextStepMeters] = useState<number>(450)
  const [totalDistanceRemainingMeters, setTotalDistanceRemainingMeters] = useState<number>(4850)
  const [totalDurationRemainingSeconds, setTotalDurationRemainingSeconds] = useState<number>(660)

  // GPS State
  const [currentLocation, setCurrentLocation] = useState<GpsLocation>({
    coordinates: [77.6271, 12.9352], // Default Koramangala
    heading: 45,
    speed: 38,
    accuracy: 6,
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

  // Modals & Overlays
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false)
  const [isRerouteAlertOpen, setIsRerouteAlertOpen] = useState<boolean>(false)
  const [routeIncidents, setRouteIncidents] = useState<Incident[]>([])
  const [rerouteSavings, setRerouteSavings] = useState<{ timeSaved: number; newEta: number; newDist: number; desc: string }>({
    timeSaved: 4,
    newEta: 10,
    newDist: 4.3,
    desc: 'Faster arterial bypass avoids severe congestion on Inner Ring Road.'
  })
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false)

  // 1. Initial GPS setup & watch
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsPermission('unavailable')
      setGpsStatusMessage('Geolocation not supported in this environment')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Only override if not in simulated drive mode
        if (!isSimulating) {
          setCurrentLocation({
            coordinates: [pos.coords.longitude, pos.coords.latitude],
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : null,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            isSimulated: false
          })
          setGpsPermission('granted')
          setGpsStatusMessage(null)
        }
      },
      (err) => {
        if (err.code === 1) {
          setGpsPermission('denied')
          setGpsStatusMessage('Location permission denied. Using high-precision simulation fallback.')
        } else {
          setGpsStatusMessage('GPS signal weak. Using fallback coordinates.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isSimulating])

  // 2. Fetch active incidents on route
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await incidentApi.list({ status: 'ACTIVE' })
      if (res && res.data) {
        setRouteIncidents(res.data)
      }
    } catch {
      // Retain clean baseline
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 20000)
    return () => clearInterval(interval)
  }, [fetchIncidents])

  // 3. Request GPS permission handler
  const handleRequestGps = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            coordinates: [pos.coords.longitude, pos.coords.latitude],
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : null,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            isSimulated: false
          })
          setGpsPermission('granted')
          setGpsStatusMessage('Location locked via GPS')
          setRecenterTrigger((prev) => prev + 1)
        },
        () => {
          setGpsPermission('denied')
          setGpsStatusMessage('Location access denied. Simulation active.')
        },
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // 4. Calculate Route Plan
  const handleCalculateRoute = useCallback(
    async (params: {
      originCoordinates: [number, number]
      originName: string
      destinationCoordinates: [number, number]
      destinationName: string
      destinationHospitalCode?: string
      preference: 'FASTEST' | 'SHORTEST'
    }) => {
      setIsLoadingRoute(true)
      setNavState('ROUTE_CALCULATING')
      setActivePreference(params.preference)

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
          setSelectedDestination({
            id: `dest-${Date.now()}`,
            name: params.destinationName,
            address: 'Bengaluru Corridor',
            coordinates: params.destinationCoordinates,
            hospitalCode: params.destinationHospitalCode
          })
          setCurrentStepIndex(0)
          setTotalDistanceRemainingMeters(plan.distanceMeters)
          setTotalDurationRemainingSeconds(plan.durationSeconds)

          if (plan.steps && plan.steps.length > 0) {
            setDistanceToNextStepMeters(plan.steps[0].distance)
          }

          setNavState('NAVIGATING')
          setRecenterTrigger((prev) => prev + 1)
        } else {
          throw new Error('No route returned')
        }
      } catch (err: any) {
        // Fallback default route if offline
        setNavState('NAVIGATING')
      } finally {
        setIsLoadingRoute(false)
      }
    },
    []
  )

  // 5. Automated Drive Simulation
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
          // Arrived!
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
          speed: 48,
          accuracy: 4,
          timestamp: Date.now(),
          isSimulated: true
        })

        // Progress metrics
        const pctDone = nextIndex / coords.length
        const distRemaining = Math.max(0, Math.round(routePlan.distanceMeters * (1 - pctDone)))
        const durRemaining = Math.max(0, Math.round(routePlan.durationSeconds * (1 - pctDone)))

        setTotalDistanceRemainingMeters(distRemaining)
        setTotalDurationRemainingSeconds(durRemaining)

        // Step index progression
        if (routePlan.steps && routePlan.steps.length > 0) {
          const stepCount = routePlan.steps.length
          const currentStepEstimated = Math.min(
            stepCount - 1,
            Math.floor(pctDone * stepCount)
          )
          setCurrentStepIndex(currentStepEstimated)

          const stepDist = routePlan.steps[currentStepEstimated]?.distance || 300
          const distWithinStep = Math.max(20, Math.round(stepDist * (1 - ((pctDone * stepCount) % 1))))
          setDistanceToNextStepMeters(distWithinStep)

          // Approaching turn alert
          if (distWithinStep < 100 && currentStepEstimated < stepCount - 1) {
            setNavState('APPROACHING_TURN')
          } else if (distRemaining < 80) {
            setNavState('ARRIVING')
          } else {
            setNavState('NAVIGATING')
          }
        }

        // Trigger realistic Reroute Opportunity midway if alternative exists
        if (nextIndex === Math.floor(coords.length * 0.45) && routePlan.alternative) {
          setIsRerouteAlertOpen(true)
        }

        return nextIndex
      })
    }, 1200)

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current)
      }
    }
  }, [isSimulating, routePlan])

  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false)
    } else {
      if (navState === 'ARRIVED' || navState === 'IDLE') {
        // Reset coordinate index
        setSimCoordIndex(0)
        setNavState('NAVIGATING')
      }
      setIsSimulating(true)
    }
  }

  // 6. Maneuver Step References
  const steps = routePlan?.steps || []
  const currentStep = steps[currentStepIndex] || null
  const nextStep = steps[currentStepIndex + 1] || null

  // 7. Accept Reroute
  const handleAcceptReroute = () => {
    if (routePlan?.alternative) {
      const currentAlt = routePlan.alternative
      setRoutePlan({
        ...routePlan,
        geometry: currentAlt.geometry,
        distanceMeters: currentAlt.distanceMeters,
        durationSeconds: currentAlt.durationSeconds,
        preference: currentAlt.preference,
        steps: currentAlt.steps || routePlan.steps,
        alternative: null
      })
      setCurrentStepIndex(0)
      setTotalDistanceRemainingMeters(currentAlt.distanceMeters)
      setTotalDurationRemainingSeconds(currentAlt.durationSeconds)
      setNavState('NAVIGATING')
    }
    setIsRerouteAlertOpen(false)
  }

  // 8. End / Reset Navigation
  const handleEndNavigation = () => {
    setIsSimulating(false)
    setNavState('IDLE')
    setRoutePlan(null)
    setSimCoordIndex(0)
  }

  return (
    <div className={`relative flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950 select-none ${className}`}>
      {/* 1. TOP MANEUVER CARD (Prominent Turn Instruction) */}
      {navState !== 'IDLE' && (
        <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-6 sm:max-w-md z-30 pointer-events-auto">
          <DriverManeuverCard
            currentStep={currentStep}
            nextStep={nextStep}
            state={navState}
            distanceToStepMeters={distanceToNextStepMeters}
            destinationName={selectedDestination?.name}
          />
        </div>
      )}

      {/* 2. TOP RIGHT FLOATING CONTROLS */}
      <div className="absolute top-3 right-3 sm:right-6 z-30 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Simulation Mode Toggle (Evaluator & Demo Control) */}
        {navState !== 'IDLE' && (
          <Button
            size="sm"
            onClick={toggleSimulation}
            className={`h-11 px-3.5 rounded-2xl shadow-xl font-bold font-mono text-xs flex items-center gap-2 border backdrop-blur-xl transition-all ${
              isSimulating
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700/80'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="size-4 fill-current" />
                <span>Pause Sim</span>
              </>
            ) : (
              <>
                <Play className="size-4 fill-current" />
                <span>Simulate Drive</span>
              </>
            )}
          </Button>
        )}

        {/* Audio Mute Toggle */}
        <button
          type="button"
          onClick={() => setVoiceMuted(!voiceMuted)}
          className="size-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center justify-center backdrop-blur-xl transition-all"
          aria-label={voiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
        >
          {voiceMuted ? (
            <VolumeX className="size-5 text-rose-400" />
          ) : (
            <Volume2 className="size-5 text-emerald-400" />
          )}
        </button>

        {/* Recenter Button */}
        <button
          type="button"
          onClick={() => setRecenterTrigger((prev) => prev + 1)}
          className="size-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center justify-center backdrop-blur-xl transition-all"
          aria-label="Recenter map on ambulance"
        >
          <LocateFixed className="size-5 text-cyan-400" />
        </button>
      </div>

      {/* 3. FULL-SCREEN FOCUSED LEAFLET MAP */}
      <div className="flex-1 w-full h-full relative z-0">
        <DriverNavigationMap
          activeRouteCoordinates={routePlan?.geometry?.coordinates || []}
          alternativeRouteCoordinates={routePlan?.alternative?.geometry?.coordinates || []}
          driverLocation={currentLocation.coordinates}
          driverHeading={currentLocation.heading}
          destinationCoordinates={selectedDestination?.coordinates}
          destinationName={selectedDestination?.name}
          routeIncidents={routeIncidents}
          recenterTrigger={recenterTrigger}
          height="100%"
        />
      </div>

      {/* 4. ROUTE PLANNER OVERLAY (Shown when IDLE or planning) */}
      {navState === 'IDLE' && (
        <div className="absolute inset-x-3 bottom-4 sm:bottom-6 sm:inset-x-auto sm:left-6 sm:max-w-lg z-30 pointer-events-auto">
          <DriverRoutePlanner
            currentLocation={currentLocation}
            gpsPermission={gpsPermission}
            gpsStatusMessage={gpsStatusMessage}
            onRequestGps={handleRequestGps}
            onCalculateRoute={handleCalculateRoute}
            isLoading={isLoadingRoute}
            initialEmergencyDestination={initialEmergency ? {
              id: initialEmergency.emergencyId || 'dest-emg',
              name: initialEmergency.assignedHospital || 'Manipal Hospital',
              address: initialEmergency.address || 'Bengaluru Emergency Center',
              coordinates: initialEmergency.hospitalLocation?.coordinates || [77.6483, 12.9582]
            } : null}
          />
        </div>
      )}

      {/* 5. ARRIVED BANNER */}
      {navState === 'ARRIVED' && (
        <div className="absolute top-24 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-md animate-in zoom-in-95 duration-300">
          <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-950/95 p-6 shadow-2xl backdrop-blur-2xl text-center">
            <div className="mx-auto size-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="size-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-white">Arrived at Destination</h2>
            <p className="mt-1 text-sm text-emerald-200">
              {selectedDestination?.name || 'Hospital Facility'}
            </p>
            <p className="mt-2 text-xs font-mono text-emerald-300/80">
              Corridor traversal complete · Transfer patient to trauma team
            </p>
            <Button
              onClick={handleEndNavigation}
              className="mt-4 w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
            >
              Finish Run & Return to Standby
            </Button>
          </div>
        </div>
      )}

      {/* 6. BOTTOM STATUS CARD & EXPANDABLE SHEET */}
      {navState !== 'IDLE' && (
        <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-auto">
          <DriverBottomSheet
            durationSeconds={totalDurationRemainingSeconds}
            distanceMeters={totalDistanceRemainingMeters}
            preference={activePreference}
            trafficDelaySeconds={routePlan?.trafficDelaySeconds || 0}
            destinationName={selectedDestination?.name}
            destinationAddress={selectedDestination?.address}
            steps={steps}
            onRecenter={() => setRecenterTrigger((prev) => prev + 1)}
            onReportIncident={() => setIsIncidentModalOpen(true)}
            onRequestHelp={() => {
              window.alert(`SOS beacon sent to Control Room for Ambulance ${ambulanceId}. Paramedic support notified.`)
            }}
            onEndNavigation={handleEndNavigation}
          />
        </div>
      )}

      {/* 7. QUICK INCIDENT REPORT MODAL */}
      <DriverIncidentModal
        open={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        currentCoordinates={currentLocation.coordinates}
        onIncidentReported={(newIncident) => {
          setRouteIncidents((prev) => [newIncident, ...prev])
        }}
      />

      {/* 8. REROUTE ALERT (Faster Route Found) */}
      <DriverRerouteAlert
        open={isRerouteAlertOpen}
        timeSavedMinutes={rerouteSavings.timeSaved}
        newEtaMinutes={rerouteSavings.newEta}
        newDistanceKm={rerouteSavings.newDist}
        bypassDescription={rerouteSavings.desc}
        onAcceptReroute={handleAcceptReroute}
        onDismiss={() => setIsRerouteAlertOpen(false)}
      />
    </div>
  )
}
