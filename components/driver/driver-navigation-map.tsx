'use client'

import React, { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import type { Incident } from '@/lib/api/types'
import type { ConnectedVehicle } from '@/lib/api/clearance'
import { AlertTriangle, Layers, ChevronDown, ChevronUp, MapPin, Building2, Car, Radio } from 'lucide-react'

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
  className = ''
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

  const [mapInitialized, setMapInitialized] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)

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

      // Add modern dark tile layer with OSM fallback
      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd'
      })

      // Graceful fallback to OpenStreetMap if tiles fail
      tileLayer.on('tileerror', () => {
        tileLayer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      })

      tileLayer.addTo(map)

      // Custom non-intrusive zoom controls in top-right
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapRef.current = map
      incidentsLayerRef.current = L.layerGroup().addTo(map)
      clearanceLayerRef.current = L.layerGroup().addTo(map)
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

  // 8. Handle Re-center Trigger
  useEffect(() => {
    if (!mapRef.current || !driverLocation || recenterTrigger === 0) return
    mapRef.current.setView([driverLocation[1], driverLocation[0]], 16, {
      animate: true,
      duration: 0.8
    })
  }, [recenterTrigger, driverLocation])

  return (
    <div className="relative w-full h-full">
      {/* Route Deviation In-Map Alert Overlay */}
      {isDeviated && (
        <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-[500] pointer-events-none">
          <div className="mx-auto max-w-lg p-2.5 px-3.5 rounded-xl bg-rose-600/95 text-white backdrop-blur-md border border-rose-400 shadow-2xl flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-200 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  Route Deviation Detected (+{Math.round(deviationDistance)}m)
                </span>
                <span className="text-[11px] text-rose-100">
                  GeoAgent has evaluated affected corridor & recommends reroute
                </span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded bg-rose-800/80 border border-rose-300/40 text-[10px] font-extrabold uppercase shrink-0">
              Leg {activeLegNumber}
            </div>
          </div>
        </div>
      )}

      {/* Compact Collapsible Map Legend (Part 10 & 84) */}
      <div className="absolute top-3 left-3 z-[400] max-w-[220px]">
        <button
          type="button"
          onClick={() => setLegendOpen(!legendOpen)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-200 shadow-xl backdrop-blur-md transition-colors"
          aria-label="Toggle Route Legend"
        >
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          <span>MAP LEGEND</span>
          {legendOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {legendOpen && (
          <div className="mt-1.5 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2.5 shadow-2xl backdrop-blur-xl text-[10px] space-y-1.5 animate-in fade-in duration-150">
            <div className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
              Corridor Hierarchy
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <div className="h-2 w-4 rounded-full bg-blue-500 shadow-sm" />
              <span className="font-semibold">🔵 Leg 1: To Emergency</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <div className="h-2 w-4 rounded-full bg-emerald-500 shadow-sm" />
              <span className="font-semibold">🟢 Leg 2: To Hospital</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-4 border-b-2 border-dashed border-cyan-400" />
              <span>⚪ Alternative Route</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-4 border-b-2 border-dotted border-amber-400" />
              <span>🟡 Congested Route</span>
            </div>

            <div className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pt-1 pb-1">
              Key Markers
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span>🚑</span>
              <span>Ambulance (Driver)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span>🚨</span>
              <span>Emergency Location</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span>🏥</span>
              <span>Hospital ER Bay</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span>🚗</span>
              <span>Connected Vehicles (V2X)</span>
            </div>
          </div>
        )}
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
