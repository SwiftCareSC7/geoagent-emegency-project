'use client'

import { AlertTriangle, Ambulance, CheckCircle2, Compass, Hospital, Layers, Play, Pause, RotateCcw, TrafficCone, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { MapMarker } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface RealInteractiveMapProps {
  markers?: MapMarker[]
  showRecommended?: boolean
  className?: string
  height?: string
}

// Preset Bengaluru Coordinates for Emergency Telemetry
const BANGALORE_CENTER: [number, number] = [12.968, 77.622]

const PLANNED_ROUTE_A: [number, number][] = [
  [12.9716, 77.5946], // MG Road Metro (Start)
  [12.9730, 77.6030], // Mayo Hall
  [12.9735, 77.6110], // Trinity Circle
  [12.9725, 77.6180], // Command Hospital Junction (ACCIDENT ZONE)
  [12.9660, 77.6300], // Domlur Flyover
  [12.9610, 77.6400], // Murugeshpalya
  [12.9582, 77.6483], // Manipal Hospital (Destination)
]

const DEVIATED_PATH: [number, number][] = [
  [12.9716, 77.5946],
  [12.9730, 77.6030],
  [12.9745, 77.6120],
  [12.9760, 77.6200], // Indiranagar 100ft Rd (Current Position)
]

const RECOMMENDED_ROUTE_B: [number, number][] = [
  [12.9716, 77.5946],
  [12.9760, 77.6200], // 100ft Rd Bypass
  [12.9690, 77.6350], // HAL 2nd Stage
  [12.9620, 77.6430], // Airport Rd bypass
  [12.9582, 77.6483], // Manipal Hospital
]

const ALTERNATIVE_ROUTE_C: [number, number][] = [
  [12.9716, 77.5946],
  [12.9600, 77.6080], // Shanthi Nagar
  [12.9500, 77.6250], // Inner Ring Rd
  [12.9540, 77.6400], // Ejipura Flyover
  [12.9582, 77.6483], // Manipal Hospital
]

const V2X_SIGNALS: [number, number][] = [
  [12.9730, 77.6030],
  [12.9760, 77.6200],
  [12.9690, 77.6350],
  [12.9620, 77.6430],
]

export function RealInteractiveMap({
  showRecommended = true,
  className,
}: RealInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)

  // Simulation & Map State
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simStep, setSimStep] = useState(3) // Default to step 3 (Deviated position)
  const [selectedMapStyle, setSelectedMapStyle] = useState<'dark' | 'streets'>('dark')
  const [visibleLayers, setVisibleLayers] = useState({
    planned: true,
    alternative: true,
    v2x: true,
    incidents: true,
  })

  // Load Leaflet dynamically on client-side
  useEffect(() => {
    let isMounted = true

    async function initLeafletMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return

      // Dynamically load Leaflet CSS if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Import Leaflet JS dynamically
      const L = (await import('leaflet')).default

      if (!isMounted || !mapContainerRef.current) return

      // Initialize map centered on Bangalore emergency corridor
      const map = L.map(mapContainerRef.current, {
        center: BANGALORE_CENTER,
        zoom: 13,
        zoomControl: false,
      })

      // Add Zoom control at top right
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapInstanceRef.current = map

      // Base Tile Layers
      const darkTiles = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        },
      )

      const streetTiles = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        },
      )

      darkTiles.addTo(map)
      mapInstanceRef.current.tileLayers = { dark: darkTiles, streets: streetTiles }

      // Custom Leaflet Markers & Icons
      const createCustomIcon = (bgColor: string, emoji: string, size = 32) =>
        L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div style="
            background-color: ${bgColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px rgba(0,0,0,0.4);
            border: 2px solid white;
            font-size: ${size * 0.5}px;
          ">${emoji}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

      // Create Layer Groups
      const plannedGroup = L.layerGroup().addTo(map)
      const altGroup = L.layerGroup().addTo(map)
      const v2xGroup = L.layerGroup().addTo(map)
      const incidentGroup = L.layerGroup().addTo(map)

      mapInstanceRef.current.groups = {
        planned: plannedGroup,
        alternative: altGroup,
        v2x: v2xGroup,
        incidents: incidentGroup,
      }

      // 1. Draw Planned Route A (Blue)
      L.polyline(PLANNED_ROUTE_A, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.75,
      })
        .bindPopup('<b>Route A (Old Airport Road)</b><br>Planned ETA: 10 min | Distance: 6.22 km')
        .addTo(plannedGroup)

      // 2. Draw Alternative Route B (Green)
      L.polyline(RECOMMENDED_ROUTE_B, {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
      })
        .bindPopup('<b>Route B (Indiranagar 100ft Rd - RECOMMENDED)</b><br>ETA: 11 min | Time Saved: 5.0 min')
        .addTo(altGroup)

      // 3. Draw Alternative Route C (Amber)
      L.polyline(ALTERNATIVE_ROUTE_C, {
        color: '#f59e0b',
        weight: 4,
        dashArray: '6, 6',
        opacity: 0.6,
      })
        .bindPopup('<b>Route C (Inner Ring Rd)</b><br>ETA: 14 min')
        .addTo(altGroup)

      // 4. Draw Deviated Path (Red Dashed)
      L.polyline(DEVIATED_PATH, {
        color: '#ef4444',
        weight: 4,
        dashArray: '8, 8',
      })
        .bindPopup('<b>Deviated Path</b><br>Distance off route: 444.7m')
        .addTo(incidentGroup)

      // 5. Add Static Markers
      L.marker([12.9716, 77.5946], {
        icon: createCustomIcon('#3b82f6', '🚩'),
      })
        .bindPopup('<b>Dispatch Start</b><br>MG Road Metro Station')
        .addTo(map)

      L.marker([12.9582, 77.6483], {
        icon: createCustomIcon('#10b981', '🏥', 36),
      })
        .bindPopup('<b>Destination Hospital</b><br>Manipal Hospital HAL Airport Rd')
        .addTo(map)

      L.marker([12.9725, 77.6180], {
        icon: createCustomIcon('#ef4444', '⚠️', 34),
      })
        .bindPopup('<b>🚨 ACCIDENT ZONE</b><br>Multi-Vehicle Collision (+6 min delay)')
        .addTo(incidentGroup)

      // 6. V2X Green-Wave Signals
      V2X_SIGNALS.forEach((coord, i) => {
        L.circleMarker(coord, {
          radius: 7,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.9,
        })
          .bindPopup(`<b>V2X Traffic Signal #${i + 1}</b><br>Status: GREEN WAVE SYNCHRONIZED`)
          .addTo(v2xGroup)
      })

      // 7. Live Ambulance Marker
      const ambulanceMarker = L.marker(DEVIATED_PATH[DEVIATED_PATH.length - 1], {
        icon: createCustomIcon('#e11d48', '🚑', 38),
        zIndexOffset: 1000,
      })
        .bindPopup('<b>🚑 Ambulance A102</b><br>Speed: 42 km/h | Status: DEVIATED (444.7m off-route)')
        .addTo(map)
        .openPopup()

      mapInstanceRef.current.ambulanceMarker = ambulanceMarker

      setMapLoaded(true)
    }

    initLeafletMap()

    return () => {
      isMounted = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Handle Map Style Switch (Dark vs Streets)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current.tileLayers) return
    const { dark, streets } = mapInstanceRef.current.tileLayers
    const map = mapInstanceRef.current

    if (selectedMapStyle === 'dark') {
      map.removeLayer(streets)
      dark.addTo(map)
    } else {
      map.removeLayer(dark)
      streets.addTo(map)
    }
  }, [selectedMapStyle])

  // Handle Layer Toggle Visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current.groups) return
    const { planned, alternative, v2x, incidents } = mapInstanceRef.current.groups
    const map = mapInstanceRef.current

    visibleLayers.planned ? map.addLayer(planned) : map.removeLayer(planned)
    visibleLayers.alternative && showRecommended ? map.addLayer(alternative) : map.removeLayer(alternative)
    visibleLayers.v2x ? map.addLayer(v2x) : map.removeLayer(v2x)
    visibleLayers.incidents ? map.addLayer(incidents) : map.removeLayer(incidents)
  }, [visibleLayers, showRecommended])

  // Real-Time Animation Simulator
  useEffect(() => {
    if (!isSimulating || !mapInstanceRef.current) return

    const simulationWaypoints = [
      [12.9716, 77.5946],
      [12.9730, 77.6030],
      [12.9745, 77.6120],
      [12.9760, 77.6200], // Indiranagar 100ft Rd (Deviated)
      [12.9690, 77.6350], // Route B segment
      [12.9620, 77.6430],
      [12.9582, 77.6483], // Hospital Arrived
    ]

    const interval = setInterval(() => {
      setSimStep((prev) => {
        const next = (prev + 1) % simulationWaypoints.length
        const currentCoord = simulationWaypoints[next]

        if (mapInstanceRef.current && mapInstanceRef.current.ambulanceMarker) {
          mapInstanceRef.current.ambulanceMarker.setLatLng(currentCoord)
          mapInstanceRef.current.panTo(currentCoord, { animate: true, duration: 0.5 })
        }

        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isSimulating])

  // Recenter Map on Ambulance
  const handleRecenter = () => {
    if (mapInstanceRef.current && mapInstanceRef.current.ambulanceMarker) {
      const pos = mapInstanceRef.current.ambulanceMarker.getLatLng()
      mapInstanceRef.current.setView(pos, 14, { animate: true })
    }
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="size-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-card-foreground">
              Real Interactive Map · Bengaluru Emergency Corridor
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Live GIS Leaflet Tile Layer · Leaflet 1.9.4 & CARTO Dark Tiles
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={isSimulating ? 'destructive' : 'default'}
            onClick={() => setIsSimulating(!isSimulating)}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            {isSimulating ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isSimulating ? 'Pause Stream' : 'Simulate Telemetry'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRecenter}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            Recenter
          </Button>

          <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedMapStyle('dark')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                selectedMapStyle === 'dark' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
              )}
            >
              Dark GIS
            </button>
            <button
              type="button"
              onClick={() => setSelectedMapStyle('streets')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                selectedMapStyle === 'streets' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
              )}
            >
              Streets
            </button>
          </div>
        </div>
      </div>

      {/* Main Leaflet Map Viewport */}
      <div className="relative w-full aspect-[16/9] min-h-[380px] bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 size-full z-0" />

        {/* Loading Overlay */}
        {!mapLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm z-10">
            <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <span className="text-xs font-medium text-muted-foreground">
              Initializing Leaflet GIS Tiles & Emergency Polylines...
            </span>
          </div>
        ) : null}

        {/* Floating Telemetry Badge Overlay */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-xs">
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/80 p-2.5 text-white backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
              <AlertTriangle className="size-4 animate-bounce shrink-0" />
              <span>DEVIATION ALARM DETECTED</span>
            </div>
            <p className="mt-1 text-[11px] text-rose-200/90 leading-tight">
              Ambulance A102 is <b>444.7 meters</b> off Route A on Indiranagar 100ft Rd.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/80 p-2.5 text-white backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Zap className="size-4 shrink-0 text-emerald-400" />
              <span>V2X GREEN WAVE SYNCHRONIZED</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-200/90 leading-tight">
              Route B recommended (11 min ETA). <b>Saved 5.0 minutes</b> vs congested Route A.
            </p>
          </div>
        </div>

        {/* Layer Controls Floating Box */}
        <div className="absolute bottom-3 right-3 z-10 rounded-xl border border-border bg-card/90 p-2.5 backdrop-blur-md shadow-lg text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-card-foreground pb-1 border-b border-border">
            <Layers className="size-3.5 text-primary" />
            <span>Map Layers</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={visibleLayers.planned}
              onChange={(e) => setVisibleLayers({ ...visibleLayers, planned: e.target.checked })}
              className="rounded accent-blue-500"
            />
            <span className="size-2 rounded-full bg-blue-500 inline-block" />
            <span>Planned Route A</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={visibleLayers.alternative}
              onChange={(e) => setVisibleLayers({ ...visibleLayers, alternative: e.target.checked })}
              className="rounded accent-emerald-500"
            />
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            <span>Route B (Indiranagar)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={visibleLayers.v2x}
              onChange={(e) => setVisibleLayers({ ...visibleLayers, v2x: e.target.checked })}
              className="rounded accent-emerald-400"
            />
            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
            <span>V2X Traffic Signals</span>
          </label>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-500" />
            <span>Route A (6.22 km · 16m delayed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span>Route B (6.48 km · 11m ETA)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500" />
            <span>Deviated Path (444.7m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span>Route C (6.79 km · 14m)</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          <span>Real GIS Leaflet Interactive Engine Active</span>
        </div>
      </div>
    </div>
  )
}
