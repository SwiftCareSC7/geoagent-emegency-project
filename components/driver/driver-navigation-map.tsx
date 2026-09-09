'use client'

import React, { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import type { Incident } from '@/lib/api/types'
import type { ConnectedVehicle } from '@/lib/api/clearance'
import type { NavigationStep, NavigationState, ManeuverType } from './types'
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

  return (
    <div className="relative w-full h-full">
      {/* Floating Recenter / Return to Vehicle Button when user panned away */}
      {isUserPanning && driverLocation && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setIsUserPanning(false)
              if (mapRef.current && driverLocation) {
                mapRef.current.setView([driverLocation[1], driverLocation[0]], 16, {
                  animate: true,
                  duration: 0.6
                })
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-2xl border-2 border-white/60 backdrop-blur-xl animate-bounce tracking-wide transition-all cursor-pointer"
            aria-label="Return to live vehicle location"
          >
            <LocateFixed className="size-4 text-cyan-300 animate-spin" />
            <span>RETURN TO VEHICLE</span>
          </button>
        </div>
      )}
      {/* 1. ON-MAP TURN-BY-TURN NAVIGATION HUD */}
      <div className="absolute top-3 left-3 sm:left-4 z-[450] max-w-sm sm:max-w-md w-[calc(100%-24px)] sm:w-[380px] pointer-events-auto">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200">
          {/* Top Bar: Mission Leg & Audio & Collapse */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px]">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wide ${
                activeLegNumber === 1
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}>
                {activeLegNumber === 1 ? '🔵 Leg 1 · To Scene' : '🟢 Leg 2 · To Hospital'}
              </span>
              {speed != null && (
                <span className="flex items-center gap-1 font-mono font-bold text-slate-300">
                  <Gauge className="size-3 text-cyan-400" />
                  {Math.round(speed)} km/h
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {onToggleVoice && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  aria-label={isVoiceActive ? 'Mute turn guidance voice' : 'Unmute turn guidance voice'}
                  title={isVoiceActive ? 'Voice active' : 'Voice muted'}
                >
                  {isVoiceActive ? (
                    <Volume2 className="size-3.5 text-emerald-400" />
                  ) : (
                    <VolumeX className="size-3.5 text-rose-400" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNavHudCollapsed(!isNavHudCollapsed)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label={isNavHudCollapsed ? 'Expand turn navigation HUD' : 'Collapse turn navigation HUD'}
              >
                {isNavHudCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Primary Maneuver Card */}
          {!isNavHudCollapsed ? (
            <div className="p-3.5">
              <div className="flex items-start gap-3.5">
                {/* Maneuver Arrow Icon Box */}
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-300/40 shrink-0">
                  {getManeuverIcon(currentStep?.maneuver, 'size-7 text-white')}
                </div>

                {/* Distance & Turn Instruction */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                      {formatManeuverDistance(distanceToNextStepMeters)}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      {currentStep?.maneuver?.replace('_', ' ') || 'CONTINUE'}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xs sm:text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                    {currentStep?.instruction || 'Follow cleared emergency corridor'}
                  </h3>

                  {/* Next Step Preview */}
                  {nextStep && (
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-cyan-400 font-bold">Then</span>
                      <span className="shrink-0">{getManeuverIcon(nextStep.maneuver, 'size-3.5 text-cyan-300')}</span>
                      <span className="truncate text-slate-300 font-medium">
                        {nextStep.instruction} ({formatManeuverDistance(nextStep.distance)})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Bar: All Turns toggle & Map Legend toggle */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsTurnListOpen(!isTurnListOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  <List className="size-3.5 text-cyan-400" />
                  <span>All Turns ({steps.length || 1})</span>
                  {isTurnListOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLegendOpen(!legendOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Layers className="size-3 text-blue-400" />
                  <span>Legend</span>
                  {legendOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              </div>

              {/* Expandable Step-by-Step Maneuver List */}
              {isTurnListOpen && (
                <div className="mt-2.5 max-h-56 overflow-y-auto custom-scrollbar rounded-xl bg-slate-950/90 border border-slate-800 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 pb-1 border-b border-slate-800 flex items-center justify-between">
                    <span>Turn-by-Turn Route Guidance</span>
                    <span className="text-cyan-400 font-normal">Tap turn to view on map</span>
                  </div>
                  {(steps && steps.length > 0 ? steps : [currentStep]).filter(Boolean).map((step, idx) => {
                    const isCurrent = idx === 0
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => step && handleStepClick(step, idx)}
                        className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all text-xs ${
                          isCurrent
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-white'
                            : 'hover:bg-slate-900 text-slate-300 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className={`size-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {getManeuverIcon(step?.maneuver, 'size-3.5')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs leading-snug line-clamp-1">{step?.instruction}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatManeuverDistance(step?.distance)} · ~{Math.max(1, Math.round((step?.duration || 30) / 60))} min
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px] uppercase shrink-0">
                            Current
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Legend dropdown if toggled */}
              {legendOpen && (
                <div className="mt-2 rounded-xl border border-slate-700/80 bg-slate-950/95 p-2.5 text-[10px] space-y-1.5 animate-in fade-in duration-150">
                  <div className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                    Corridor Hierarchy
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <div className="h-2 w-4 rounded-full bg-blue-500" />
                    <span>🔵 Leg 1: To Emergency Scene</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <div className="h-2 w-4 rounded-full bg-emerald-500" />
                    <span>🟢 Leg 2: To Hospital ER</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="h-1.5 w-4 border-b-2 border-dashed border-cyan-400" />
                    <span>⚪ Alternative Bypass</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="h-1.5 w-4 border-b-2 border-dotted border-amber-400" />
                    <span>🟡 Congested Route</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed Pill */
            <div className="p-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  {getManeuverIcon(currentStep?.maneuver, 'size-4 text-white')}
                </div>
                <div className="truncate">
                  <span className="font-black text-sm text-white mr-1.5">
                    {formatManeuverDistance(distanceToNextStepMeters)}
                  </span>
                  <span className="text-xs text-slate-200 font-semibold truncate">
                    {currentStep?.instruction || 'Continue on route'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavHudCollapsed(false)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300 uppercase shrink-0"
              >
                Expand
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className={`relative z-0 overflow-hidden bg-slate-950 ${className}`}
      />
    </div>
  )
}
