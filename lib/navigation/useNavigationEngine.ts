'use client'

/**
 * SwiftCare GeoAgent — Unified Turn-by-Turn Navigation Engine
 *
 * Reusable React hook driving navigation behavior across all map surfaces:
 * - Real spatial step progression (advances by road distance, not timer)
 * - Road-snapped vehicle coordinates and heading calculation
 * - Dynamic distance countdown ("350 m" -> "150 m" -> "50 m" -> "NOW")
 * - Next maneuver preview and upcoming step queue
 * - Live ETA and route progress calculation (traveled / total)
 * - Off-route deviation detection
 * - Proximity-based destination arrival
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import type {
  NormalizedRoute,
  NormalizedStep,
  NavigationState,
  TurnByTurnEngineState,
  SnappedLocation
} from './types'
import {
  haversineDistance,
  snapPointToPolyline,
  computePolylineLength,
  computeDistanceAlongPolyline,
  formatDistance,
  formatDuration,
  formatArrivalTime
} from './geometry'

interface UseNavigationEngineOptions {
  deviationThresholdMeters?: number
  waypointPassDistanceMeters?: number
  imminentTurnDistanceMeters?: number
  arrivalDistanceMeters?: number
  onStepChange?: (step: NormalizedStep, stepIndex: number) => void
  onArrival?: (legNumber: number) => void
  onDeviation?: (distanceMeters: number) => void
}

export function useNavigationEngine(
  route: NormalizedRoute | null,
  vehicleCoordinates: [number, number] | null,
  activeLegNumber = 1,
  options: UseNavigationEngineOptions = {}
): TurnByTurnEngineState & {
  snappedLocation: SnappedLocation | null
  activePolyline: [number, number][]
} {
  const {
    deviationThresholdMeters = 55,
    waypointPassDistanceMeters = 30,
    imminentTurnDistanceMeters = 45,
    arrivalDistanceMeters = 40,
    onStepChange,
    onArrival,
    onDeviation
  } = options

  // Internal Step Index
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [navState, setNavState] = useState<NavigationState>('IDLE')
  const offRouteCountRef = useRef(0)

  // 1. Resolve Active Leg and Polyline
  const activePolyline = useMemo<[number, number][]>(() => {
    if (!route) return []
    if (route.legs && route.legs.length > 0) {
      const leg = route.legs.find((l) => l.legNumber === activeLegNumber) || route.legs[0]
      return leg?.geometry?.coordinates || route.geometry?.coordinates || []
    }
    return route.geometry?.coordinates || []
  }, [route, activeLegNumber])

  // 2. Resolve Active Steps
  const activeSteps = useMemo<NormalizedStep[]>(() => {
    if (!route) return []
    if (route.legs && route.legs.length > 0) {
      const leg = route.legs.find((l) => l.legNumber === activeLegNumber) || route.legs[0]
      if (leg && leg.steps && leg.steps.length > 0) {
        return leg.steps
      }
    }
    return route.steps || []
  }, [route, activeLegNumber])

  // Reset step index when route or leg changes
  useEffect(() => {
    setCurrentStepIndex(0)
    setNavState(route && activePolyline.length >= 2 ? 'NAVIGATING' : 'IDLE')
    offRouteCountRef.current = 0
  }, [route?.id, activeLegNumber])

  // 3. Snap Vehicle to Route Polyline
  const snappedLocation = useMemo<SnappedLocation | null>(() => {
    if (!vehicleCoordinates || activePolyline.length < 2) return null
    return snapPointToPolyline(vehicleCoordinates, activePolyline)
  }, [vehicleCoordinates, activePolyline])

  // 4. Total Route Length & Traveled Distance
  const totalLengthMeters = useMemo<number>(() => {
    if (activePolyline.length < 2) return 0
    return computePolylineLength(activePolyline)
  }, [activePolyline])

  const traveledDistanceMeters = useMemo<number>(() => {
    if (!snappedLocation || activePolyline.length < 2) return 0
    return computeDistanceAlongPolyline(
      activePolyline,
      snappedLocation.nearestSegmentIndex,
      snappedLocation.snappedCoordinates
    )
  }, [snappedLocation, activePolyline])

  const remainingDistanceMeters = useMemo<number>(() => {
    return Math.max(0, totalLengthMeters - traveledDistanceMeters)
  }, [totalLengthMeters, traveledDistanceMeters])

  // 5. Spatial Step Progression
  useEffect(() => {
    if (!snappedLocation || activeSteps.length === 0 || activePolyline.length < 2) return

    const destinationCoord = activePolyline[activePolyline.length - 1]
    const distToDestination = haversineDistance(
      snappedLocation.snappedCoordinates,
      destinationCoord
    )

    // Check Arrival
    if (distToDestination <= arrivalDistanceMeters) {
      if (navState !== 'ARRIVED') {
        setNavState('ARRIVED')
        onArrival?.(activeLegNumber)
      }
      return
    } else if (distToDestination <= 250 && navState !== 'ARRIVING') {
      setNavState('ARRIVING')
    }

    // Check Deviation (Off Route)
    if (snappedLocation.distanceToRouteMeters > deviationThresholdMeters) {
      offRouteCountRef.current += 1
      if (offRouteCountRef.current >= 3) {
        if (navState !== 'OFF_ROUTE') {
          setNavState('OFF_ROUTE')
          onDeviation?.(snappedLocation.distanceToRouteMeters)
        }
      }
    } else {
      offRouteCountRef.current = 0
      if (navState === 'OFF_ROUTE') {
        setNavState('NAVIGATING')
      }
    }

    // Step Advancement: inspect current step's end location
    const currStep = activeSteps[currentStepIndex]
    if (!currStep) return

    let waypointCoord = currStep.endLocation
    if (!waypointCoord && currentStepIndex < activeSteps.length - 1) {
      waypointCoord = activeSteps[currentStepIndex + 1]?.startLocation
    }

    if (waypointCoord) {
      const distToStepEnd = haversineDistance(
        snappedLocation.snappedCoordinates,
        waypointCoord
      )

      // If driver is close to the turn junction, advance to next step
      if (distToStepEnd <= waypointPassDistanceMeters) {
        if (currentStepIndex < activeSteps.length - 1) {
          const nextIdx = currentStepIndex + 1
          setCurrentStepIndex(nextIdx)
          const nextStepObj = activeSteps[nextIdx]
          if (nextStepObj) {
            onStepChange?.(nextStepObj, nextIdx)
          }
        }
      }
    }
  }, [
    snappedLocation,
    activeSteps,
    currentStepIndex,
    activePolyline,
    arrivalDistanceMeters,
    deviationThresholdMeters,
    waypointPassDistanceMeters,
    activeLegNumber,
    navState,
    onArrival,
    onDeviation,
    onStepChange
  ])

  // 6. Current & Next Step Calculations
  const currentStep = activeSteps[currentStepIndex] || null
  const upcomingSteps = activeSteps.slice(currentStepIndex + 1)
  const completedSteps = activeSteps.slice(0, currentStepIndex)
  const nextStep = upcomingSteps[0] || null

  // 7. Distance to Next Maneuver
  const distanceToNextStepMeters = useMemo<number>(() => {
    if (!snappedLocation || !currentStep) return 0

    let targetCoord = currentStep.endLocation
    if (!targetCoord && nextStep) {
      targetCoord = nextStep.startLocation
    }
    if (!targetCoord && activePolyline.length > 0) {
      targetCoord = activePolyline[activePolyline.length - 1]
    }
    if (!targetCoord) return 0

    return haversineDistance(snappedLocation.snappedCoordinates, targetCoord)
  }, [snappedLocation, currentStep, nextStep, activePolyline])

  const isImminentTurn = distanceToNextStepMeters <= imminentTurnDistanceMeters
  const formattedDistanceToNextStep = isImminentTurn ? 'NOW' : formatDistance(distanceToNextStepMeters)

  // 8. Progress Percentage & Duration
  const routeProgressPercent = useMemo<number>(() => {
    if (totalLengthMeters <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((traveledDistanceMeters / totalLengthMeters) * 100)))
  }, [traveledDistanceMeters, totalLengthMeters])

  const remainingDurationSeconds = useMemo<number>(() => {
    if (!route || totalLengthMeters <= 0) return 0
    const totalDuration = route.durationSeconds || 600
    const ratio = Math.max(0, Math.min(1, remainingDistanceMeters / totalLengthMeters))
    return Math.round(totalDuration * ratio)
  }, [route, remainingDistanceMeters, totalLengthMeters])

  return {
    navState,
    currentStepIndex,
    currentStep,
    nextStep,
    distanceToNextStepMeters,
    formattedDistanceToNextStep,
    isImminentTurn,
    upcomingSteps,
    completedSteps,
    traveledDistanceMeters,
    remainingDistanceMeters,
    remainingDurationSeconds,
    routeProgressPercent,
    etaFormatted: formatDuration(remainingDurationSeconds),
    arrivalTimeFormatted: formatArrivalTime(remainingDurationSeconds),
    trafficCondition: route?.trafficCondition || 'LIGHT',
    isOffRoute: navState === 'OFF_ROUTE',
    offRouteDistanceMeters: snappedLocation?.distanceToRouteMeters || 0,
    activeLegNumber,
    snappedLocation,
    activePolyline
  }
}
