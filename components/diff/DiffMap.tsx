'use client'

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { useTheme } from 'next-themes'
import type L from 'leaflet'
import {
  Compass,
  Crosshair,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DiffSimulationSnapshot } from '@/lib/simulation/diff-scenario-engine'

export interface DiffMapHandle {
  fitBoundsAll: () => void
  centerOnVehicle: () => void
  centerOnAccident: () => void
  centerOnDestination: () => void
  setView: (target: [number, number], zoom: number) => void
}

interface DiffMapProps {
  snapshot: DiffSimulationSnapshot
  onSelectMilestoneTarget?: (target: [number, number], zoom: number) => void
}

export const DiffMap = forwardRef<DiffMapHandle, DiffMapProps>(function DiffMap(
  { snapshot, onSelectMilestoneTarget },
  ref
) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  // Layer groups for clean management without layer leakage
  const activeRouteLayerRef = useRef<L.Polyline | null>(null)
  const recommendedRouteLayerRef = useRef<L.Polyline | null>(null)
  const secondaryRouteLayerRef = useRef<L.Polyline | null>(null)
  const trajectoryLineLayerRef = useRef<L.Polyline | null>(null)
  const trajectoryDotsLayerRef = useRef<L.LayerGroup | null>(null)
  const vehicleMarkerRef = useRef<L.Marker | null>(null)
  const accidentMarkerRef = useRef<L.Marker | null>(null)
  const originMarkerRef = useRef<L.Marker | null>(null)
  const destinationMarkerRef = useRef<L.Marker | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [autoFollowVehicle, setAutoFollowVehicle] = useState(false)
  const [basemapStyle, setBasemapStyle] = useState<'carto' | 'google'>('carto')

  // Initialize Map
  useEffect(() => {
    let isMounted = true

    async function initLeaflet() {
      if (!containerRef.current || mapInstanceRef.current) return

      // Inject Leaflet CSS if not already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const L = (await import('leaflet')).default
      ;(window as unknown as { L: typeof L }).L = L

      if (!isMounted || !containerRef.current) return

      // Center Bengaluru corridor: between MG Road [12.9718, 77.5946] and Manipal [12.9578, 77.6490]
      const map = L.map(containerRef.current, {
        center: [12.966, 77.625],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(map)

      // Basemap tile layer: Google Streets HD with subdomains and dark mode CSS filter
      const tile = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps &copy; SwiftCare GeoAgent',
      }).addTo(map)

      tileLayerRef.current = tile
      trajectoryDotsLayerRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map

      // Initial bounds fit to show entire corridor
      const fullBounds = L.latLngBounds([
        [12.972, 77.594], // MG Road
        [12.957, 77.650], // Manipal Hospital HAL
        [12.980, 77.643], // Indiranagar 100ft bypass
      ])
      map.fitBounds(fullBounds, { padding: [40, 40] })

      setMapReady(true)
    }

    initLeaflet()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [resolvedTheme])

  // Update basemap tiles when basemap style changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    mapInstanceRef.current.removeLayer(tileLayerRef.current)

    let url = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
    let subdomains: string | string[] = ['0', '1', '2', '3']

    if (basemapStyle === 'google') {
      url = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
      subdomains = ['0', '1', '2', '3']
    } else {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      subdomains = 'abc'
    }

    const newTile = LRef.tileLayer(url, {
      maxZoom: 20,
      subdomains,
      attribution: '&copy; OpenStreetMap / Google Maps',
    }).addTo(mapInstanceRef.current)

    tileLayerRef.current = newTile
  }, [basemapStyle])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    fitBoundsAll: () => {
      if (!mapInstanceRef.current) return
      const LRef = (window as unknown as { L: typeof L }).L
      if (!LRef) return
      const bounds = LRef.latLngBounds([
        [12.972, 77.594],
        [12.957, 77.650],
        [12.980, 77.643],
      ])
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true })
    },
    centerOnVehicle: () => {
      if (!mapInstanceRef.current) return
      mapInstanceRef.current.setView(snapshot.vehicleLatLng, 16, { animate: true })
    },
    centerOnAccident: () => {
      if (!mapInstanceRef.current) return
      mapInstanceRef.current.setView(
        [snapshot.accidentCoords[1], snapshot.accidentCoords[0]],
        16,
        { animate: true }
      )
    },
    centerOnDestination: () => {
      if (!mapInstanceRef.current) return
      mapInstanceRef.current.setView(
        [snapshot.destination.coordinates[1], snapshot.destination.coordinates[0]],
        16,
        { animate: true }
      )
    },
    setView: (target: [number, number], zoom: number) => {
      if (!mapInstanceRef.current) return
      mapInstanceRef.current.setView(target, zoom, { animate: true })
    },
  }))

  // Update Vector Layers on Snapshot Changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return
    const map = mapInstanceRef.current

    // Convert GeoJSON [lng, lat][] to Leaflet [lat, lng][]
    const toLatLngs = (coords: [number, number][]) =>
      coords.map((c) => [c[1], c[0]] as [number, number])

    // 1. ACTIVE CORRIDOR (BLUE)
    // 🔵 #2563eb / #3b82f6 (Planned / Active Corridor)
    const activeLatLngs = toLatLngs(snapshot.activeRouteCoords)
    if (activeRouteLayerRef.current) {
      activeRouteLayerRef.current.setLatLngs(activeLatLngs)
    } else {
      activeRouteLayerRef.current = LRef.polyline(activeLatLngs, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      activeRouteLayerRef.current.bindPopup(
        '<b>Active Corridor (Blue)</b><br>Authorized Operational Route to Manipal Hospital HAL'
      )
    }

    // 2. RECOMMENDED DETOUR (PURPLE)
    // 🟣 #8b5cf6 / #a855f7 (Recommended Alternative Detour)
    if (snapshot.recommendedRouteCoords && snapshot.recommendedRouteCoords.length > 0) {
      const recLatLngs = toLatLngs(snapshot.recommendedRouteCoords)
      if (recommendedRouteLayerRef.current) {
        recommendedRouteLayerRef.current.setLatLngs(recLatLngs)
      } else {
        recommendedRouteLayerRef.current = LRef.polyline(recLatLngs, {
          color: '#8b5cf6',
          weight: 5.5,
          opacity: 0.95,
          dashArray: '6, 6',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
        recommendedRouteLayerRef.current.bindPopup(
          '<b>Recommended Reroute (Purple)</b><br>Indiranagar 100ft Road Bypass Corridor'
        )
      }
    } else if (recommendedRouteLayerRef.current) {
      map.removeLayer(recommendedRouteLayerRef.current)
      recommendedRouteLayerRef.current = null
    }

    // 3. SECONDARY ALTERNATIVE (GRAY)
    // ⚪ #64748b / #94a3b8 (Other Valid Alternatives)
    if (snapshot.secondaryRouteCoords && snapshot.secondaryRouteCoords.length > 0) {
      const secLatLngs = toLatLngs(snapshot.secondaryRouteCoords)
      if (secondaryRouteLayerRef.current) {
        secondaryRouteLayerRef.current.setLatLngs(secLatLngs)
      } else {
        secondaryRouteLayerRef.current = LRef.polyline(secLatLngs, {
          color: '#64748b',
          weight: 4,
          opacity: 0.75,
          dashArray: '4, 6',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
        secondaryRouteLayerRef.current.bindPopup(
          '<b>Secondary Alternative (Gray)</b><br>Victoria Layout / Intermediate Ring Rd'
        )
      }
    } else if (secondaryRouteLayerRef.current) {
      map.removeLayer(secondaryRouteLayerRef.current)
      secondaryRouteLayerRef.current = null
    }

    // 4. ACTUAL GPS TRAJECTORY (ORANGE)
    // 🟠 #f97316 (Physical GPS Fix Trail)
    if (snapshot.trajectoryPoints.length > 1) {
      const trajLatLngs = snapshot.trajectoryPoints.map(
        (p) => [p.coordinates[1], p.coordinates[0]] as [number, number]
      )
      if (trajectoryLineLayerRef.current) {
        trajectoryLineLayerRef.current.setLatLngs(trajLatLngs)
      } else {
        trajectoryLineLayerRef.current = LRef.polyline(trajLatLngs, {
          color: '#f97316',
          weight: 3.5,
          opacity: 0.9,
          dashArray: '4, 4',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
      }

      // Recent breadcrumb dots
      if (trajectoryDotsLayerRef.current) {
        trajectoryDotsLayerRef.current.clearLayers()
        const recentFixes = snapshot.trajectoryPoints.slice(-12)
        for (const fix of recentFixes) {
          const dot = LRef.circleMarker([fix.coordinates[1], fix.coordinates[0]], {
            radius: 3,
            color: '#ea580c',
            fillColor: '#fb923c',
            fillOpacity: 0.9,
            weight: 1,
          })
          trajectoryDotsLayerRef.current.addLayer(dot)
        }
      }
    } else if (trajectoryLineLayerRef.current) {
      map.removeLayer(trajectoryLineLayerRef.current)
      trajectoryLineLayerRef.current = null
      if (trajectoryDotsLayerRef.current) trajectoryDotsLayerRef.current.clearLayers()
    }

    // 5. ACCIDENT / ROAD HAZARD MARKER (RED)
    // 🔴 #ef4444 with radar pulse halo and clear text badge
    if (snapshot.accidentActive) {
      const accLatLng: [number, number] = [snapshot.accidentCoords[1], snapshot.accidentCoords[0]]
      if (accidentMarkerRef.current) {
        accidentMarkerRef.current.setLatLng(accLatLng)
      } else {
        const accidentIcon = LRef.divIcon({
          className: 'diff-accident-marker',
          html: `
            <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
              <!-- Pulsing radar halo -->
              <div style="position:absolute;inset:0;border-radius:50%;background:#ef4444;opacity:0.4;" class="animate-ping"></div>
              <div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #0f172a;
                border: 2px solid #ef4444;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(239,68,68,0.5);
                font-size: 15px;
                position: relative;
                z-index: 10;
              ">
                <span>⚠️</span>
              </div>
              <!-- Floating label -->
              <div style="
                position: absolute;
                top: 36px;
                white-space: nowrap;
                background: #ef4444;
                color: #ffffff;
                font-size: 9px;
                font-weight: 800;
                font-family: monospace;
                padding: 1px 5px;
                border-radius: 3px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                letter-spacing: 0.5px;
              ">
                ROAD BLOCKED
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        })

        const marker = LRef.marker(accLatLng, { icon: accidentIcon }).addTo(map)
        marker.bindPopup(
          `<b>Road Incident Ahead</b><br>${snapshot.accidentDescription}<br><span style="color:#ef4444;font-weight:bold;">Status: CORRIDOR BLOCKED</span>`
        )
        accidentMarkerRef.current = marker
      }
    } else if (accidentMarkerRef.current) {
      map.removeLayer(accidentMarkerRef.current)
      accidentMarkerRef.current = null
    }

    // 6. AMBULANCE FLEET MARKER (AMB-01)
    // Custom HTML divIcon with ambulance icon, heading rotation, and live speed badge
    const ambLatLng = snapshot.vehicleLatLng
    const heading = Math.round(snapshot.vehicleHeading)
    const speed = snapshot.vehicleSpeedKmh

    const ambulanceIconHtml = `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <!-- Pulsing green halo when moving -->
        ${
          speed > 0
            ? '<div style="position:absolute;inset:2px;border-radius:50%;background:#10b981;opacity:0.35;" class="animate-ping"></div>'
            : ''
        }
        <!-- Ambulance icon disc rotated to heading -->
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid ${speed > 0 ? '#10b981' : '#38bdf8'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          font-size: 16px;
          position: relative;
          z-index: 10;
        ">
          <span style="display:inline-block;transform:rotate(${heading - 90}deg);transition:transform 0.2s ease;">🚑</span>
        </div>
        <!-- Unit Name & Speed Badge -->
        <div style="
          position: absolute;
          top: -18px;
          white-space: nowrap;
          background: #0f172a;
          color: #38bdf8;
          border: 1px solid #38bdf8;
          font-size: 9px;
          font-weight: 700;
          font-family: monospace;
          padding: 1px 4px;
          border-radius: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        ">
          AMB-01 (${speed}k)
        </div>
      </div>
    `

    const ambulanceIcon = LRef.divIcon({
      className: 'diff-ambulance-marker',
      html: ambulanceIconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng(ambLatLng)
      vehicleMarkerRef.current.setIcon(ambulanceIcon)
    } else {
      const marker = LRef.marker(ambLatLng, { icon: ambulanceIcon, zIndexOffset: 1000 }).addTo(map)
      marker.bindPopup(`<b>AMB-01 (ALS Unit)</b><br>Speed: ${speed} km/h<br>Heading: ${heading}°`)
      vehicleMarkerRef.current = marker
    }

    // 7. ORIGIN MARKER (MG Road)
    if (!originMarkerRef.current) {
      const originIcon = LRef.divIcon({
        className: 'diff-origin-marker',
        html: `
          <div style="background:#2563eb;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid white;font-size:13px;">
            🚩
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const oMarker = LRef.marker(
        [snapshot.origin.coordinates[1], snapshot.origin.coordinates[0]],
        { icon: originIcon }
      ).addTo(map)
      oMarker.bindPopup(`<b>Mission Origin</b><br>${snapshot.origin.name}`)
      originMarkerRef.current = oMarker
    }

    // 8. DESTINATION MARKER (Manipal Hospital HAL)
    if (!destinationMarkerRef.current) {
      const destIcon = LRef.divIcon({
        className: 'diff-destination-marker',
        html: `
          <div style="background:#059669;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(5,150,105,0.6);border:2px solid white;font-size:16px;">
            🏥
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const dMarker = LRef.marker(
        [snapshot.destination.coordinates[1], snapshot.destination.coordinates[0]],
        { icon: destIcon }
      ).addTo(map)
      dMarker.bindPopup(
        `<b>Target Destination</b><br>${snapshot.destination.name}<br><span style="color:#059669;font-weight:bold;">Status: PATIENT AWAITING ARRIVAL</span>`
      )
      destinationMarkerRef.current = dMarker
    }

    // Auto-follow vehicle if toggle enabled
    if (autoFollowVehicle) {
      map.panTo(ambLatLng, { animate: true })
    }
  }, [snapshot, mapReady, autoFollowVehicle])

  return (
    <div className="relative h-full w-full flex-1 overflow-hidden bg-muted/20">
      {/* Map Canvas */}
      <div ref={containerRef} className="h-full w-full" tabIndex={0} aria-label="Interactive What-If Simulation Map" />

      {/* Floating Map Overlays & Quick Controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        {/* Recenter & Fit All Bounds */}
        <Button
          size="sm"
          variant="secondary"
          className="size-8 p-0 bg-background/90 shadow-md backdrop-blur-xs border border-border/70"
          onClick={() => {
            if (!mapInstanceRef.current) return
            const LRef = (window as unknown as { L: typeof L }).L
            if (!LRef) return
            const bounds = LRef.latLngBounds([
              [12.972, 77.594],
              [12.957, 77.650],
              [12.980, 77.643],
            ])
            mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], animate: true })
          }}
          title="Fit All Corridors to Screen"
        >
          <Maximize2 className="size-4" />
          <span className="sr-only">Fit Corridors</span>
        </Button>

        {/* Center on Ambulance */}
        <Button
          size="sm"
          variant={autoFollowVehicle ? 'default' : 'secondary'}
          className={cn(
            'size-8 p-0 bg-background/90 shadow-md backdrop-blur-xs border border-border/70',
            autoFollowVehicle && 'bg-blue-600 text-white'
          )}
          onClick={() => {
            setAutoFollowVehicle((prev) => !prev)
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView(snapshot.vehicleLatLng, 16, { animate: true })
            }
          }}
          title={autoFollowVehicle ? 'Auto-tracking AMB-01 (Active)' : 'Follow AMB-01'}
        >
          <Crosshair className="size-4" />
          <span className="sr-only">Track Vehicle</span>
        </Button>

        {/* Basemap Switcher */}
        <Button
          size="sm"
          variant="secondary"
          className="size-8 p-0 bg-background/90 shadow-md backdrop-blur-xs border border-border/70"
          onClick={() => setBasemapStyle((prev) => (prev === 'carto' ? 'google' : 'carto'))}
          title={`Switch Basemap (Current: ${basemapStyle === 'carto' ? 'CARTO' : 'Google Maps'})`}
        >
          <Layers className="size-4" />
          <span className="sr-only">Switch Basemap</span>
        </Button>
      </div>

      {/* Corridor HUD Badge on Bottom-Left */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 rounded-md border border-border/70 bg-background/85 px-2.5 py-1.5 text-[11px] font-mono shadow-md backdrop-blur-xs">
        <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-muted-foreground">Corridor:</span>
        <span className="font-bold text-foreground">
          {snapshot.activeRouteType === 'REROUTE'
            ? 'Indiranagar Bypass Corridor (Active)'
            : 'MG Road -> Old Airport Rd (Primary)'}
        </span>
      </div>
    </div>
  )
})
