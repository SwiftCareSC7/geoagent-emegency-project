'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import type L from 'leaflet'
import type { Incident } from '@/lib/api/types'

interface DriverNavigationMapProps {
  activeRouteCoordinates?: [number, number][] // [lng, lat]
  alternativeRouteCoordinates?: [number, number][] // [lng, lat]
  driverLocation?: [number, number] // [lng, lat]
  driverHeading?: number | null
  destinationCoordinates?: [number, number] // [lng, lat]
  destinationName?: string
  routeIncidents?: Incident[]
  recenterTrigger?: number
  height?: string
  className?: string
}

export function DriverNavigationMap({
  activeRouteCoordinates = [],
  alternativeRouteCoordinates = [],
  driverLocation,
  driverHeading = 0,
  destinationCoordinates,
  destinationName = 'Hospital Facility',
  routeIncidents = [],
  recenterTrigger = 0,
  height = '100%',
  className = ''
}: DriverNavigationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)

  // Layer groups
  const activeRouteLayerRef = useRef<L.Polyline | null>(null)
  const activeRouteBackingRef = useRef<L.Polyline | null>(null)
  const alternativeRouteLayerRef = useRef<L.Polyline | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const destinationMarkerRef = useRef<L.Marker | null>(null)
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null)

  const [mapInitialized, setMapInitialized] = useState(false)

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
        : [12.9582, 77.6483] // Bangalore center

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

      // Add custom non-intrusive zoom controls
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapRef.current = map
      incidentsLayerRef.current = L.layerGroup().addTo(map)
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

  // 2. Render Active & Alternative Routes
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const map = mapRef.current

    // Clean previous route layers
    if (activeRouteLayerRef.current) map.removeLayer(activeRouteLayerRef.current)
    if (activeRouteBackingRef.current) map.removeLayer(activeRouteBackingRef.current)
    if (alternativeRouteLayerRef.current) map.removeLayer(alternativeRouteLayerRef.current)

    // Render Alternative Route (Muted, thinner)
    if (alternativeRouteCoordinates && alternativeRouteCoordinates.length > 1) {
      const altLatLngs = alternativeRouteCoordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      alternativeRouteLayerRef.current = L.polyline(altLatLngs, {
        color: '#64748b', // Slate-500
        weight: 4,
        opacity: 0.65,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)
    }

    // Render Active Route (Visually dominant, thick, glowing)
    if (activeRouteCoordinates && activeRouteCoordinates.length > 1) {
      const activeLatLngs = activeRouteCoordinates.map(([lng, lat]) => [lat, lng] as [number, number])

      // High-contrast backing shadow line
      activeRouteBackingRef.current = L.polyline(activeLatLngs, {
        color: '#064e3b', // Deep emerald shadow
        weight: 9,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)

      // Glowing active route line
      activeRouteLayerRef.current = L.polyline(activeLatLngs, {
        color: '#10b981', // Emerald-500
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)

      // Initial view fit
      if (recenterTrigger === 0) {
        const bounds = L.latLngBounds(activeLatLngs)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      }
    }
  }, [activeRouteCoordinates, alternativeRouteCoordinates, mapInitialized])

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
        <div class="absolute inset-0 size-12 rounded-full bg-emerald-500/25 animate-ping"></div>
        <!-- Outer circle -->
        <div class="relative flex size-10 items-center justify-center rounded-full bg-emerald-600 border-2 border-white shadow-xl">
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

  // 4. Render Destination Hospital Marker
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !destinationCoordinates) return
    const L = leafletRef.current
    const map = mapRef.current

    const destLatLng: [number, number] = [destinationCoordinates[1], destinationCoordinates[0]]

    const destinationIconHtml = `
      <div class="flex flex-col items-center">
        <div class="flex size-9 items-center justify-center rounded-2xl bg-rose-600 border-2 border-white shadow-2xl text-white">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6v12m-6-6h12"/>
          </svg>
        </div>
        <div class="mt-1 rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-white shadow border border-slate-700 whitespace-nowrap">
          ${destinationName}
        </div>
      </div>
    `

    const icon = L.divIcon({
      className: 'driver-destination-marker',
      html: destinationIconHtml,
      iconSize: [120, 50],
      iconAnchor: [60, 20]
    })

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = L.marker(destLatLng, { icon, zIndexOffset: 900 }).addTo(map)
    } else {
      destinationMarkerRef.current.setLatLng(destLatLng)
      destinationMarkerRef.current.setIcon(icon)
    }
  }, [destinationCoordinates, destinationName, mapInitialized])

  // 5. Render Route-Relevant Incidents Only
  useEffect(() => {
    if (!incidentsLayerRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const layer = incidentsLayerRef.current
    layer.clearLayers()

    for (const inc of routeIncidents) {
      if (!inc.location || !Array.isArray(inc.location.coordinates)) continue
      const [lng, lat] = inc.location.coordinates

      const incidentIconHtml = `
        <div class="flex size-8 items-center justify-center rounded-full bg-amber-500 border-2 border-white shadow-lg text-slate-950 animate-bounce">
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
      marker.bindTooltip(`<strong>Hazard:</strong> ${inc.description || inc.type}`, {
        direction: 'top',
        className: 'rounded-lg bg-slate-900 text-white text-xs border border-slate-700'
      })
      layer.addLayer(marker)
    }
  }, [routeIncidents, mapInitialized])

  // 6. Handle Re-center Trigger
  useEffect(() => {
    if (!mapRef.current || !driverLocation || recenterTrigger === 0) return
    mapRef.current.setView([driverLocation[1], driverLocation[0]], 16, {
      animate: true,
      duration: 0.8
    })
  }, [recenterTrigger, driverLocation])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className={`relative z-0 overflow-hidden bg-slate-950 ${className}`}
    />
  )
}
