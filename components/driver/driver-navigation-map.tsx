'use client'

import React, { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import type { Incident } from '@/lib/api/types'
import type { ConnectedVehicle } from '@/lib/api/clearance'
import type { NavigationStep, NavigationState, ManeuverType } from './types'
import { NavigationManeuverHUD } from '@/components/navigation/NavigationManeuverHUD'
import { formatDistance, formatDuration, formatArrivalTime } from '@/lib/navigation/geometry'
import {
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  Car,
  Radio,
  LocateFixed,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCcw,
  Volume2,
  VolumeX,
  List,
  Navigation,
  Compass,
  CheckCircle2,
  Clock,
  Gauge
} from 'lucide-react'

function getManeuverIcon(maneuver?: ManeuverType, className = 'size-6 text-white') {
  switch (maneuver) {
    case 'TURN_LEFT':
      return <CornerUpLeft className={className} />
    case 'TURN_RIGHT':
      return <CornerUpRight className={className} />
    case 'KEEP_LEFT':
      return <ArrowUpLeft className={className} />
    case 'KEEP_RIGHT':
      return <ArrowUpRight className={className} />
    case 'U_TURN':
      return <RotateCcw className={className} />
    case 'ARRIVE':
      return <MapPin className={className} />
    case 'DEPART':
    case 'CONTINUE':
    default:
      return <ArrowUp className={className} />
  }
}

function formatManeuverDistance(meters?: number): string {
  if (meters === undefined || meters === null) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

interface DriverNavigationMapProps {
  activeRouteCoordinates?: [number, number][] // [lng, lat]
  leg1Coordinates?: [number, number][] // Leg 1: Current -> Emergency (BLUE)
  leg2Coordinates?: [number, number][] // Leg 2: Emergency -> Hospital (GREEN)
  activeLegNumber?: number // 1 or 2
  alternativeRouteCoordinates?: [number, number][] // [lng, lat]
  originalRouteCoordinates?: [number, number][] // [lng, lat]
  driverLocation?: [number, number] // [lng, lat]
  driverHeading?: number | null
  emergencyCoordinates?: [number, number] // [lng, lat]
  emergencyName?: string
  destinationCoordinates?: [number, number] // [lng, lat]
  destinationName?: string
  routeIncidents?: Incident[]
  clearanceVehicles?: ConnectedVehicle[]
  isDeviated?: boolean
  deviationDistance?: number
  recenterTrigger?: number
  height?: string
  className?: string
  // Turn-by-Turn Navigation props
  currentStep?: NavigationStep | null
  nextStep?: NavigationStep | null
  distanceToNextStepMeters?: number
  totalDistanceRemainingMeters?: number
  totalDurationRemainingSeconds?: number
  steps?: NavigationStep[]
  navState?: NavigationState
  speed?: number | null
  isVoiceActive?: boolean
  onToggleVoice?: () => void
}

export function DriverNavigationMap({
  activeRouteCoordinates = [],
  leg1Coordinates,
  leg2Coordinates,
  activeLegNumber = 1,
  alternativeRouteCoordinates = [],
  originalRouteCoordinates = [],
  driverLocation,
  driverHeading = 0,
  emergencyCoordinates,
  emergencyName = 'Emergency Location',
  destinationCoordinates,
  destinationName = 'Hospital Facility',
  routeIncidents = [],
  clearanceVehicles = [],
  isDeviated = false,
  deviationDistance = 0,
  recenterTrigger = 0,
  height = '100%',
  className = '',
  currentStep,
  nextStep,
  distanceToNextStepMeters,
  totalDistanceRemainingMeters,
  totalDurationRemainingSeconds,
  steps = [],
  navState = 'NAVIGATING',
  speed,
  isVoiceActive = true,
  onToggleVoice
}: DriverNavigationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)

  // Layer groups & polyline references
  const leg1LayerRef = useRef<L.Polyline | null>(null)
  const leg1BackingRef = useRef<L.Polyline | null>(null)
  const leg2LayerRef = useRef<L.Polyline | null>(null)
  const leg2BackingRef = useRef<L.Polyline | null>(null)
  const fallbackActiveRouteLayerRef = useRef<L.Polyline | null>(null)
  const fallbackActiveRouteBackingRef = useRef<L.Polyline | null>(null)
  const alternativeRouteLayerRef = useRef<L.Polyline | null>(null)
  const originalRouteLayerRef = useRef<L.Polyline | null>(null)

  // Markers
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const emergencyMarkerRef = useRef<L.Marker | null>(null)
  const destinationMarkerRef = useRef<L.Marker | null>(null)
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null)
  const clearanceLayerRef = useRef<L.LayerGroup | null>(null)
  const turnMarkersLayerRef = useRef<L.LayerGroup | null>(null)
  const routeChevronsLayerRef = useRef<L.LayerGroup | null>(null)

  const [mapInitialized, setMapInitialized] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [isUserPanning, setIsUserPanning] = useState(false)
  const [isTurnListOpen, setIsTurnListOpen] = useState(false)
  const [isNavHudCollapsed, setIsNavHudCollapsed] = useState(false)

  const handleStepClick = (step: NavigationStep, idx: number) => {
    if (!mapRef.current) return
    if (step.startLocation) {
      mapRef.current.setView([step.startLocation[1], step.startLocation[0]], 17, { animate: true })
      setIsUserPanning(true)
    } else if (activeRouteCoordinates && activeRouteCoordinates.length > idx) {
      const coord = activeRouteCoordinates[Math.min(idx * 2, activeRouteCoordinates.length - 1)]
      mapRef.current.setView([coord[1], coord[0]], 17, { animate: true })
      setIsUserPanning(true)
    }
  }

  // 1. Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true

    async function init() {
      if (!containerRef.current || mapRef.current) return

      // Inject Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const L = (await import('leaflet')).default
      leafletRef.current = L

      if (!isMounted || !containerRef.current) return

      const defaultCenter: [number, number] = driverLocation
        ? [driverLocation[1], driverLocation[0]]
        : [12.9582, 77.6483] // Bengaluru center

      const map = L.map(containerRef.current, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      })

      // Clean tile layer without API Key watermark (uses OSM fallback if no CARTO key)
      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim()
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd'
      })

      // Graceful fallback to OpenStreetMap if tiles fail
      tileLayer.on('tileerror', () => {
        tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
      })

      tileLayer.addTo(map)

      map.on('dragstart', () => {
        setIsUserPanning(true)
      })

      // Custom non-intrusive zoom controls in top-right
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapRef.current = map
      incidentsLayerRef.current = L.layerGroup().addTo(map)
      clearanceLayerRef.current = L.layerGroup().addTo(map)
      turnMarkersLayerRef.current = L.layerGroup().addTo(map)
      routeChevronsLayerRef.current = L.layerGroup().addTo(map)
      setMapInitialized(true)
    }

    init()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // 2. Render Multi-Leg Route Geometry (Leg 1: BLUE, Leg 2: GREEN, Alt: CYAN)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const map = mapRef.current

    // Clean previous route layers
    if (leg1LayerRef.current) map.removeLayer(leg1LayerRef.current)
    if (leg1BackingRef.current) map.removeLayer(leg1BackingRef.current)
    if (leg2LayerRef.current) map.removeLayer(leg2LayerRef.current)
    if (leg2BackingRef.current) map.removeLayer(leg2BackingRef.current)
    if (fallbackActiveRouteLayerRef.current) map.removeLayer(fallbackActiveRouteLayerRef.current)
    if (fallbackActiveRouteBackingRef.current) map.removeLayer(fallbackActiveRouteBackingRef.current)
    if (alternativeRouteLayerRef.current) map.removeLayer(alternativeRouteLayerRef.current)
    if (originalRouteLayerRef.current) map.removeLayer(originalRouteLayerRef.current)

    // Render Original / Degraded Route if available (Muted Amber)
    if (originalRouteCoordinates && originalRouteCoordinates.length > 1) {
      const origLatLngs = originalRouteCoordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      originalRouteLayerRef.current = L.polyline(origLatLngs, {
        color: '#f59e0b', // Amber-500
        weight: 4,
        opacity: 0.5,
        dashArray: '4, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    }

    // Render Alternative Route (Cyan Dashed, Promising)
    if (alternativeRouteCoordinates && alternativeRouteCoordinates.length > 1) {
      const altLatLngs = alternativeRouteCoordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      alternativeRouteLayerRef.current = L.polyline(altLatLngs, {
        color: '#06b6d4', // Cyan-500
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    }

    const allPointsToFit: [number, number][] = []

    // 2A. Render Distinct Multi-Leg Route if legs provided
    if (leg1Coordinates && leg1Coordinates.length > 1) {
      const leg1LatLngs = leg1Coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      allPointsToFit.push(...leg1LatLngs)

      const isLeg1Active = activeLegNumber === 1

      // Backing line for high contrast
      leg1BackingRef.current = L.polyline(leg1LatLngs, {
        color: '#1e3a8a', // Deep Blue-900 backing
        weight: isLeg1Active ? 10 : 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)

      // LEG 1 (BLUE) Polyline
      leg1LayerRef.current = L.polyline(leg1LatLngs, {
        color: isLeg1Active ? '#3b82f6' : '#60a5fa', // Blue-500 or Blue-400
        weight: isLeg1Active ? 6 : 4,
        opacity: isLeg1Active ? 1.0 : 0.7,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    }

    if (leg2Coordinates && leg2Coordinates.length > 1) {
      const leg2LatLngs = leg2Coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      allPointsToFit.push(...leg2LatLngs)

      const isLeg2Active = activeLegNumber === 2

      // Backing line for high contrast
      leg2BackingRef.current = L.polyline(leg2LatLngs, {
        color: '#064e3b', // Deep Emerald-900 backing
        weight: isLeg2Active ? 10 : 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)

      // LEG 2 (GREEN) Polyline
      leg2LayerRef.current = L.polyline(leg2LatLngs, {
        color: isLeg2Active ? '#10b981' : '#34d399', // Emerald-500 or Emerald-400
        weight: isLeg2Active ? 6 : 4,
        opacity: isLeg2Active ? 1.0 : 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    }

    // 2B. Fallback to unified activeRouteCoordinates if legs not partitioned
    if ((!leg1Coordinates || leg1Coordinates.length < 2) && activeRouteCoordinates && activeRouteCoordinates.length > 1) {
      const activeLatLngs = activeRouteCoordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      allPointsToFit.push(...activeLatLngs)

      fallbackActiveRouteBackingRef.current = L.polyline(activeLatLngs, {
        color: '#064e3b',
        weight: 10,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)

      fallbackActiveRouteLayerRef.current = L.polyline(activeLatLngs, {
        color: '#10b981',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    }

    // Initial view fit
    if (recenterTrigger === 0 && allPointsToFit.length > 0) {
      const bounds = L.latLngBounds(allPointsToFit)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [
    activeRouteCoordinates,
    leg1Coordinates,
    leg2Coordinates,
    activeLegNumber,
    alternativeRouteCoordinates,
    originalRouteCoordinates,
    mapInitialized
  ])

  // 3. Render Driver Ambulance Marker (Follows GPS / Telemetry with Heading)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !driverLocation) return
    const L = leafletRef.current
    const map = mapRef.current

    const latLng: [number, number] = [driverLocation[1], driverLocation[0]]
    const headingDeg = driverHeading || 0

    const ambulanceIconHtml = `
      <div style="transform: rotate(${headingDeg}deg); transition: transform 0.3s ease-out;" class="relative flex size-12 items-center justify-center">
        <!-- Pulsing radar ring -->
        <div class="absolute inset-0 size-12 rounded-full bg-blue-500/30 animate-ping"></div>
        <!-- Outer circle -->
        <div class="relative flex size-10 items-center justify-center rounded-full bg-blue-600 border-2 border-white shadow-2xl">
          <!-- Ambulance SVG Icon -->
          <svg class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 17h4V5H2v12h3m9 0h2l3-3v-4h-5v7Z"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
        <!-- Directional pointer tip -->
        <div class="absolute -top-1.5 size-0 border-x-4 border-x-transparent border-b-6 border-b-white"></div>
      </div>
    `

    const icon = L.divIcon({
      className: 'driver-ambulance-marker',
      html: ambulanceIconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    })

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map)
    } else {
      driverMarkerRef.current.setLatLng(latLng)
      driverMarkerRef.current.setIcon(icon)
    }
  }, [driverLocation, driverHeading, mapInitialized])

  // 4. Render Emergency Location Marker (Pulsing Red Emergency Beacon)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !emergencyCoordinates) return
    const L = leafletRef.current
    const map = mapRef.current

    const emergLatLng: [number, number] = [emergencyCoordinates[1], emergencyCoordinates[0]]

    const emergencyIconHtml = `
      <div class="flex flex-col items-center">
        <div class="relative flex size-10 items-center justify-center">
          <div class="absolute inset-0 size-10 rounded-full bg-rose-600/40 animate-ping"></div>
          <div class="relative flex size-9 items-center justify-center rounded-full bg-rose-600 border-2 border-white shadow-2xl text-white">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        </div>
        <div class="mt-1 rounded-md bg-rose-950/95 px-2 py-0.5 text-[10px] font-black text-rose-300 shadow border border-rose-600/50 whitespace-nowrap">
          🚨 ${emergencyName}
        </div>
      </div>
    `

    const icon = L.divIcon({
      className: 'driver-emergency-marker',
      html: emergencyIconHtml,
      iconSize: [140, 54],
      iconAnchor: [70, 20]
    })

    if (!emergencyMarkerRef.current) {
      emergencyMarkerRef.current = L.marker(emergLatLng, { icon, zIndexOffset: 950 }).addTo(map)
    } else {
      emergencyMarkerRef.current.setLatLng(emergLatLng)
      emergencyMarkerRef.current.setIcon(icon)
    }
  }, [emergencyCoordinates, emergencyName, mapInitialized])

  // 5. Render Destination Hospital Marker (Distinct Emerald/Teal Medical Cross)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !destinationCoordinates) return
    const L = leafletRef.current
    const map = mapRef.current

    const destLatLng: [number, number] = [destinationCoordinates[1], destinationCoordinates[0]]

    const destinationIconHtml = `
      <div class="flex flex-col items-center">
        <div class="flex size-9 items-center justify-center rounded-2xl bg-emerald-600 border-2 border-white shadow-2xl text-white">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
        </div>
        <div class="mt-1 rounded-md bg-slate-900/95 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow border border-emerald-500/40 whitespace-nowrap">
          🏥 ${destinationName}
        </div>
      </div>
    `

    const icon = L.divIcon({
      className: 'driver-destination-marker',
      html: destinationIconHtml,
      iconSize: [140, 50],
      iconAnchor: [70, 20]
    })

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = L.marker(destLatLng, { icon, zIndexOffset: 900 }).addTo(map)
    } else {
      destinationMarkerRef.current.setLatLng(destLatLng)
      destinationMarkerRef.current.setIcon(icon)
    }
  }, [destinationCoordinates, destinationName, mapInitialized])

  // 6. Render Route-Relevant Incidents
  useEffect(() => {
    if (!incidentsLayerRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const layer = incidentsLayerRef.current
    layer.clearLayers()

    for (const inc of routeIncidents) {
      if (!inc.location || !Array.isArray(inc.location.coordinates)) continue
      const [lng, lat] = inc.location.coordinates

      const incidentIconHtml = `
        <div class="flex size-8 items-center justify-center rounded-full bg-rose-500 border-2 border-white shadow-lg text-white animate-bounce">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      `

      const icon = L.divIcon({
        className: 'route-incident-marker',
        html: incidentIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      const marker = L.marker([lat, lng], { icon })
      marker.bindTooltip(`<strong>Hazard Ahead:</strong> ${inc.description || inc.type}`, {
        direction: 'top',
        className: 'rounded-lg bg-slate-900 text-white text-xs border border-slate-700'
      })
      layer.addLayer(marker)
    }
  }, [routeIncidents, mapInitialized])

// Helper: Calculate bearing between two coordinates
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const y = Math.sin((lng2 - lng1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lng2 - lng1) * Math.PI / 180)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

// Helper: Generate inline SVG string for Leaflet divIcon turn maneuver markers
function getManeuverSvg(maneuver: ManeuverType | string | undefined): string {
  switch (maneuver) {
    case 'TURN_LEFT':
    case 'SLIGHT_LEFT':
      return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>`
    case 'TURN_RIGHT':
    case 'SLIGHT_RIGHT':
      return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>`
    case 'U_TURN':
      return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`
    case 'ARRIVE':
      return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
    case 'DEPART':
    case 'CONTINUE':
    default:
      return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`
  }
}

  // 7. Render Simulated Connected Vehicles (Clearance Demo V2X)
  useEffect(() => {
    if (!clearanceLayerRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const layer = clearanceLayerRef.current
    layer.clearLayers()

    if (!clearanceVehicles || clearanceVehicles.length === 0) return

    for (const veh of clearanceVehicles) {
      if (!veh.coordinates || !Array.isArray(veh.coordinates)) continue
      const [lng, lat] = veh.coordinates

      const isCleared = veh.status === 'CLEARED'
      const isGivingWay = veh.status === 'GIVING_WAY'

      const bgColor = isCleared
        ? 'bg-emerald-500 text-white'
        : isGivingWay
        ? 'bg-teal-500 text-white'
        : 'bg-amber-500 text-slate-950'

      const vehicleIconHtml = `
        <div class="flex flex-col items-center">
          <div class="flex size-7 items-center justify-center rounded-full ${bgColor} border-2 border-white shadow-lg transition-transform hover:scale-110">
            <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/>
            </svg>
          </div>
          <div class="mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono text-white bg-slate-950/90 border border-slate-700 whitespace-nowrap">
            ${veh.label} (${veh.status === 'CLEARED' ? 'CLEAR' : veh.distanceToAmbulanceMeters + 'm'})
          </div>
        </div>
      `

      const icon = L.divIcon({
        className: 'clearance-vehicle-marker',
        html: vehicleIconHtml,
        iconSize: [80, 44],
        iconAnchor: [40, 22]
      })

      const marker = L.marker([lat, lng], { icon })
      marker.bindTooltip(`<strong>${veh.label} (Simulated V2X)</strong><br/>Status: ${veh.status}<br/>Distance: ${veh.distanceToAmbulanceMeters}m`, {
        direction: 'top',
        className: 'rounded-lg bg-slate-900 text-white text-xs border border-slate-700'
      })
      layer.addLayer(marker)
    }
  }, [clearanceVehicles, mapInitialized])

  // 7B. Render Turn-by-Turn Waypoint Markers & Road Direction Chevrons Directly on Map
  useEffect(() => {
    if (!turnMarkersLayerRef.current || !routeChevronsLayerRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const turnLayer = turnMarkersLayerRef.current
    const chevronLayer = routeChevronsLayerRef.current
    turnLayer.clearLayers()
    chevronLayer.clearLayers()

    const activeCoords = (activeLegNumber === 1 ? leg1Coordinates : leg2Coordinates) || activeRouteCoordinates
    if (!activeCoords || activeCoords.length < 2) return

    // 1. Directional Chevrons along road polyline
    const totalPoints = activeCoords.length
    const stepInterval = Math.max(3, Math.floor(totalPoints / 8))
    for (let i = 1; i < totalPoints - 1; i += stepInterval) {
      const prev = activeCoords[i - 1]
      const curr = activeCoords[i]
      const next = activeCoords[i + 1]
      if (!prev || !curr || !next) continue
      const bearing = calculateBearing(prev[1], prev[0], next[1], next[0])

      const chevronHtml = `
        <div style="transform: rotate(${Math.round(bearing)}deg); display: flex; items-center; justify-content: center; width: 22px; height: 22px; pointer-events: none;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#34d399" style="filter: drop-shadow(0 0 4px rgba(16,185,129,0.95));">
            <path d="M5 3l14 9-14 9V3z"/>
          </svg>
        </div>
      `
      const chevronIcon = L.divIcon({
        className: 'route-flow-chevron',
        html: chevronHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
      const marker = L.marker([curr[1], curr[0]], { icon: chevronIcon, interactive: false })
      chevronLayer.addLayer(marker)
    }

    // 2. Turn Maneuver Waypoint Badges at each intersection on the map
    const maneuverSteps = (steps && steps.length > 0) ? steps : [currentStep].filter(Boolean) as NavigationStep[]
    if (maneuverSteps.length === 0) return

    maneuverSteps.forEach((step, idx) => {
      let coord: [number, number] | null = null
      if (step.startLocation && Array.isArray(step.startLocation)) {
        coord = [step.startLocation[1], step.startLocation[0]]
      } else {
        const frac = idx / Math.max(1, maneuverSteps.length)
        const pointIdx = Math.min(Math.floor(frac * (activeCoords.length - 1)), activeCoords.length - 1)
        const c = activeCoords[pointIdx]
        if (c) coord = [c[1], c[0]]
      }
      if (!coord) return

      const isCurrentTurn = idx === 0
      const svgIcon = getManeuverSvg(step.maneuver)
      const distStr = formatManeuverDistance(step.distance)

      const turnMarkerHtml = isCurrentTurn
        ? `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #047857); border: 2.5px solid #a7f3d0; box-shadow: 0 4px 14px rgba(0,0,0,0.6), 0 0 10px rgba(16,185,129,0.8); display: flex; align-items: center; justify-content: center; color: white;">
              ${svgIcon}
            </div>
            <div style="margin-top: 3px; background: rgba(15, 23, 42, 0.95); color: #34d399; font-size: 10px; font-weight: 800; font-family: ui-monospace, monospace; padding: 2px 7px; border-radius: 9999px; border: 1px solid rgba(52, 211, 153, 0.6); box-shadow: 0 2px 8px rgba(0,0,0,0.7); white-space: nowrap;">
              NEXT: ${distStr}
            </div>
          </div>
        `
        : `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #0f172a; border: 2px solid #38bdf8; box-shadow: 0 3px 10px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: #38bdf8;">
              ${svgIcon}
            </div>
            <div style="margin-top: 2px; background: rgba(15, 23, 42, 0.9); color: #94a3b8; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 9999px; border: 1px solid rgba(56, 189, 248, 0.4); white-space: nowrap;">
              ${distStr}
            </div>
          </div>
        `

      const icon = L.divIcon({
        className: `turn-maneuver-marker-${idx}`,
        html: turnMarkerHtml,
        iconSize: isCurrentTurn ? [64, 60] : [50, 46],
        iconAnchor: isCurrentTurn ? [32, 24] : [25, 20]
      })

      const marker = L.marker(coord, { icon })
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${isCurrentTurn ? '#065f46' : '#1e293b'}; color: ${isCurrentTurn ? '#34d399' : '#38bdf8'}; padding: 2px 6px; border-radius: 4px;">
              ${isCurrentTurn ? 'CURRENT TURN' : `TURN #${idx + 1}`}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #cbd5e1;">${distStr}</span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #f8fafc; line-height: 1.3;">
            ${step.instruction}
          </div>
          <div style="margin-top: 6px; font-size: 10px; color: #10b981; font-weight: 600;">
            ✓ Priority Emergency Corridor Cleared
          </div>
        </div>
      `, {
        className: 'rounded-xl bg-slate-900 text-white text-xs border border-slate-700'
      })

      marker.on('click', () => {
        if (mapRef.current && coord) {
          mapRef.current.setView(coord, 17, { animate: true })
          setIsUserPanning(true)
        }
      })

      turnLayer.addLayer(marker)
    })
  }, [steps, currentStep, activeRouteCoordinates, leg1Coordinates, leg2Coordinates, activeLegNumber, mapInitialized])

  // 8. Handle Re-center & Auto-Follow Camera
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return
    setIsUserPanning(false)
    mapRef.current.setView([driverLocation[1], driverLocation[0]], 16, {
      animate: true,
      duration: 0.8
    })
  }, [recenterTrigger])

  // Smoothly pan to follow driver when live tracking or simulated driving (unless user panned away)
  useEffect(() => {
    if (!mapRef.current || !driverLocation || isUserPanning) return
    mapRef.current.panTo([driverLocation[1], driverLocation[0]], {
      animate: true,
      duration: 0.5
    })
  }, [driverLocation, isUserPanning])

  const handleRecenter = React.useCallback(() => {
    if (!mapRef.current || !driverLocation) return
    setIsUserPanning(false)
    mapRef.current.setView([driverLocation[1], driverLocation[0]], 16, {
      animate: true,
      duration: 0.6
    })
  }, [driverLocation])

  const handleRouteOverview = React.useCallback(() => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const activeCoords = (activeLegNumber === 1 ? leg1Coordinates : leg2Coordinates) || activeRouteCoordinates
    if (activeCoords && activeCoords.length > 1) {
      const latLngs = activeCoords.map(([lng, lat]) => [lat, lng] as [number, number])
      const bounds = L.latLngBounds(latLngs)
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
      setIsUserPanning(true)
    }
  }, [activeLegNumber, leg1Coordinates, leg2Coordinates, activeRouteCoordinates])

  const handleStepSelect = React.useCallback((step: any) => {
    if (!mapRef.current) return
    const coord = step.startLocation || step.endLocation
    if (coord && Array.isArray(coord)) {
      mapRef.current.setView([coord[1], coord[0]], 17, { animate: true })
      setIsUserPanning(true)
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* 1. SHARED GOOGLE-MAPS-STYLE TURN-BY-TURN NAVIGATION HUD */}
      <NavigationManeuverHUD
        currentStep={currentStep as any}
        nextStep={nextStep as any}
        distanceToNextStepMeters={distanceToNextStepMeters || 0}
        formattedDistance={formatDistance(distanceToNextStepMeters)}
        isImminentTurn={(distanceToNextStepMeters || 0) <= 45}
        upcomingSteps={(steps && steps.length > 0 ? steps.slice(1) : []) as any}
        remainingDistanceFormatted={formatDistance(totalDistanceRemainingMeters)}
        remainingDurationFormatted={formatDuration(totalDurationRemainingSeconds)}
        arrivalTimeFormatted={formatArrivalTime(totalDurationRemainingSeconds)}
        routeProgressPercent={
          totalDistanceRemainingMeters != null && totalDistanceRemainingMeters > 0
            ? Math.max(5, Math.min(100, Math.round((1 - (totalDistanceRemainingMeters / Math.max(1, totalDistanceRemainingMeters + 1500))) * 100)))
            : 0
        }
        speed={speed}
        navState={navState}
        activeLegNumber={activeLegNumber}
        vehicleCallsign="AMB-001"
        isUserPanning={isUserPanning}
        isVoiceActive={isVoiceActive}
        onToggleVoice={onToggleVoice}
        onRecenter={handleRecenter}
        onRouteOverview={handleRouteOverview}
        onSelectStep={handleStepSelect}
      />

      {/* 2. LEAFLET MAP CANVAS */}
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className={`relative z-0 overflow-hidden bg-slate-950 ${className}`}
      />
    </div>
  )
}
