'use client'

import {
  Activity,
  AlertTriangle,
  Ambulance,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  Hospital,
  Info,
  Layers,
  MapPin,
  Navigation,
  Pause,
  PhoneCall,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TrafficCone,
  Volume2,
  Wifi,
  Zap,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  List,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { MapMarker } from '@/lib/mock-data'
import { subscribeEvent, REALTIME_EVENTS } from '@/lib/socket/client'
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

const V2X_SIGNALS = [
  { coord: [12.9730, 77.6030] as [number, number], name: 'Mayo Hall Junction', status: 'GREEN_WAVE_ACTIVE' },
  { coord: [12.9760, 77.6200] as [number, number], name: '100ft Rd Signal #1', status: 'FORCED_GREEN_4S' },
  { coord: [12.9690, 77.6350] as [number, number], name: 'HAL 2nd Stage Signal #2', status: 'PREEMPTION_QUEUED' },
  { coord: [12.9620, 77.6430] as [number, number], name: 'Airport Rd Bypass Signal #3', status: 'CLEAR_CORRIDOR' },
]

const INTERACTIVE_MAP_STEPS = [
  { maneuver: 'DEPART', instruction: 'Depart MG Road Metro toward Mayo Hall', distance: 800, duration: 90, coord: [12.9716, 77.5946] as [number, number] },
  { maneuver: 'CONTINUE', instruction: 'Proceed through Mayo Hall Junction green wave', distance: 1200, duration: 110, coord: [12.9730, 77.6030] as [number, number] },
  { maneuver: 'TURN_LEFT', instruction: 'Bypass Command Hospital bottleneck via 100ft Road', distance: 1800, duration: 150, coord: [12.9760, 77.6200] as [number, number] },
  { maneuver: 'CONTINUE', instruction: 'Follow HAL 2nd Stage preemption corridor', distance: 1400, duration: 120, coord: [12.9690, 77.6350] as [number, number] },
  { maneuver: 'TURN_RIGHT', instruction: 'Turn right onto Airport Road bypass', distance: 900, duration: 75, coord: [12.9620, 77.6430] as [number, number] },
  { maneuver: 'ARRIVE', instruction: 'Arrive at Manipal Hospital Emergency Care Bay', distance: 300, duration: 30, coord: [12.9582, 77.6483] as [number, number] },
]

function getInteractiveManeuverIcon(maneuver?: string, className = 'size-5 text-white') {
  switch (maneuver) {
    case 'TURN_LEFT':
      return <CornerUpLeft className={className} />
    case 'TURN_RIGHT':
      return <CornerUpRight className={className} />
    case 'KEEP_LEFT':
      return <ArrowUpLeft className={className} />
    case 'KEEP_RIGHT':
      return <ArrowUpRight className={className} />
    case 'ARRIVE':
      return <MapPin className={className} />
    case 'DEPART':
    case 'CONTINUE':
    default:
      return <ArrowUp className={className} />
  }
}

export function RealInteractiveMap({
  showRecommended = true,
  className,
}: RealInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)

  // System & Map State
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simStep, setSimStep] = useState(3)
  const [isTurnListOpen, setIsTurnListOpen] = useState(false)
  const [isNavHudCollapsed, setIsNavHudCollapsed] = useState(false)

  const currentNavIdx = Math.min(simStep, INTERACTIVE_MAP_STEPS.length - 1)
  const currentNavStep = INTERACTIVE_MAP_STEPS[currentNavIdx]
  const nextNavStep = INTERACTIVE_MAP_STEPS[currentNavIdx + 1] || null

  const handleNavStepClick = (coord: [number, number]) => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setView(coord, 16)
  }

  const [mapStyle, setMapStyle] = useState<'dark' | 'google_traffic' | 'satellite'>('google_traffic')
  const [futurePredictionMinutes, setFuturePredictionMinutes] = useState<0 | 10 | 20 | 30>(10)
  const [patientSeverity, setPatientSeverity] = useState<'CRITICAL_CARDIAC' | 'SEVERE_TRAUMA' | 'MODERATE'>('CRITICAL_CARDIAC')
  
  // Novelty Toggles
  const [enableV2XPreemption, setEnableV2XPreemption] = useState(true)
  const [enableVirtualSiren, setEnableVirtualSiren] = useState(true)
  const [enableHospitalBedMatch, setEnableHospitalBedMatch] = useState(true)
  const [liveV2XData, setLiveV2XData] = useState<{
    corridorHealth?: string;
    preemptedCount?: number;
    totalSignals?: number;
    civilianAlertedCount?: number;
    timeSavedMinutes?: number;
    signals?: any[];
  } | null>(null)

  const [visibleLayers, setVisibleLayers] = useState({
    planned: true,
    alternative: true,
    traffic: true,
    v2x: true,
    incidents: true,
    virtualSiren: true,
  })

  // Initialize Leaflet Map on Client
  useEffect(() => {
    let isMounted = true

    async function initLeafletMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return

      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const L = (await import('leaflet')).default
      if (!isMounted || !mapContainerRef.current) return

      const map = L.map(mapContainerRef.current, {
        center: BANGALORE_CENTER,
        zoom: 13,
        zoomControl: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(map)
      mapInstanceRef.current = map

      // Base Tile Layer Providers (including Google & CARTO & OpenStreetMap)
      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim()
      const cartoDarkUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'

      const darkTiles = L.tileLayer(cartoDarkUrl, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      })

      const googleTrafficTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; Google Maps / OpenStreetMap Real-Time Traffic Layer',
        maxZoom: 19,
      })

      const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; ESRI Satellite Imagery & Google Imagery',
        maxZoom: 19,
      })

      googleTrafficTiles.addTo(map)
      mapInstanceRef.current.tileLayers = {
        dark: darkTiles,
        google_traffic: googleTrafficTiles,
        satellite: satelliteTiles,
      }

      // Custom Leaflet Icons
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
            box-shadow: 0 0 14px rgba(0,0,0,0.5);
            border: 2px solid white;
            font-size: ${size * 0.5}px;
          ">${emoji}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

      // Layer Groups
      const plannedGroup = L.layerGroup().addTo(map)
      const altGroup = L.layerGroup().addTo(map)
      const v2xGroup = L.layerGroup().addTo(map)
      const incidentGroup = L.layerGroup().addTo(map)
      const sirenGroup = L.layerGroup().addTo(map)

      mapInstanceRef.current.groups = {
        planned: plannedGroup,
        alternative: altGroup,
        v2x: v2xGroup,
        incidents: incidentGroup,
        siren: sirenGroup,
      }

      // 1. Planned Route A (Blue)
      L.polyline(PLANNED_ROUTE_A, { color: '#3b82f6', weight: 5, opacity: 0.75 })
        .bindPopup('<b>Route A (Old Airport Road)</b><br>Planned ETA: 10 min | Distance: 6.22 km')
        .addTo(plannedGroup)

      // 2. Recommended Route B (Green)
      L.polyline(RECOMMENDED_ROUTE_B, { color: '#10b981', weight: 6, opacity: 0.9 })
        .bindPopup('<b>Route B (Indiranagar 100ft Rd - RECOMMENDED)</b><br>ETA: 11 min | Time Saved: 5.0 min')
        .addTo(altGroup)

      // 3. Alternative Route C (Amber)
      L.polyline(ALTERNATIVE_ROUTE_C, { color: '#f59e0b', weight: 4, dashArray: '6, 6', opacity: 0.6 })
        .bindPopup('<b>Route C (Inner Ring Rd)</b><br>ETA: 14 min')
        .addTo(altGroup)

      // 4. Deviated Telemetry Path (Red Dashed)
      L.polyline(DEVIATED_PATH, { color: '#ef4444', weight: 4, dashArray: '8, 8' })
        .bindPopup('<b>Deviated Telemetry Path</b><br>Distance off route: 444.7m')
        .addTo(incidentGroup)

      // 5. Static Markers
      L.marker([12.9716, 77.5946], { icon: createCustomIcon('#3b82f6', '🚩') })
        .bindPopup('<b>Dispatch Start</b><br>MG Road Metro Station')
        .addTo(map)

      L.marker([12.9582, 77.6483], { icon: createCustomIcon('#10b981', '🏥', 36) })
        .bindPopup('<b>Manipal Hospital (Destination)</b><br>ICU Beds Available: 4 | Cath Lab: Ready')
        .addTo(map)

      L.marker([12.9725, 77.6180], { icon: createCustomIcon('#ef4444', '⚠️', 34) })
        .bindPopup('<b>🚨 ACCIDENT ZONE</b><br>Multi-Vehicle Collision (+6 min delay)')
        .addTo(incidentGroup)

      // 6. V2X Traffic Signal Markers
      const v2xMarkerMap = new Map()
      V2X_SIGNALS.forEach((sig) => {
        const marker = L.circleMarker(sig.coord, {
          radius: 8,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.9,
        })
          .bindPopup(`<b>🚦 V2X Traffic Signal: ${sig.name}</b><br>Preemption Status: <span style="color:#10b981;font-weight:bold">${sig.status}</span>`)
          .addTo(v2xGroup)
        v2xMarkerMap.set(sig.name, marker)
      })
      mapInstanceRef.current.v2xMarkerMap = v2xMarkerMap

      // 7. Virtual Siren 500m Clear Corridor Circle
      const sirenCircle = L.circle(DEVIATED_PATH[DEVIATED_PATH.length - 1], {
        radius: 500,
        color: '#e11d48',
        fillColor: '#e11d48',
        fillOpacity: 0.12,
        dashArray: '4, 4',
      }).addTo(sirenGroup)
      mapInstanceRef.current.sirenCircle = sirenCircle

      // 8. Live Ambulance Marker
      const ambulanceMarker = L.marker(DEVIATED_PATH[DEVIATED_PATH.length - 1], {
        icon: createCustomIcon('#e11d48', '🚑', 38),
        zIndexOffset: 1000,
      })
        .bindPopup('<b>🚑 Ambulance A102</b><br>Speed: 42 km/h | Vitals: Critical Cardiac | Status: DEVIATED (444.7m)')
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

  // Map Tile Style Switcher
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current.tileLayers) return
    const { dark, google_traffic, satellite } = mapInstanceRef.current.tileLayers
    const map = mapInstanceRef.current

    map.removeLayer(dark)
    map.removeLayer(google_traffic)
    map.removeLayer(satellite)

    if (mapStyle === 'dark') dark.addTo(map)
    else if (mapStyle === 'google_traffic') google_traffic.addTo(map)
    else if (mapStyle === 'satellite') satellite.addTo(map)
  }, [mapStyle])

  // Layer Visibility Switcher
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current.groups) return
    const { planned, alternative, v2x, incidents, siren } = mapInstanceRef.current.groups
    const map = mapInstanceRef.current

    visibleLayers.planned ? map.addLayer(planned) : map.removeLayer(planned)
    visibleLayers.alternative && showRecommended ? map.addLayer(alternative) : map.removeLayer(alternative)
    visibleLayers.v2x && enableV2XPreemption ? map.addLayer(v2x) : map.removeLayer(v2x)
    visibleLayers.incidents ? map.addLayer(incidents) : map.removeLayer(incidents)
    visibleLayers.virtualSiren && enableVirtualSiren ? map.addLayer(siren) : map.removeLayer(siren)
  }, [visibleLayers, showRecommended, enableV2XPreemption, enableVirtualSiren])

  // Real-Time V2X Green-Wave Socket Listener
  useEffect(() => {
    const unsub = subscribeEvent<any>(REALTIME_EVENTS.V2X_GREEN_WAVE_UPDATED, (data) => {
      if (!data) return
      setLiveV2XData(data)
      if (mapInstanceRef.current?.v2xMarkerMap && Array.isArray(data.signals)) {
        data.signals.forEach((sig: any) => {
          const marker = mapInstanceRef.current.v2xMarkerMap.get(sig.name)
          if (marker) {
            const isGreen = sig.state === 'GREEN_WAVE_ACTIVE' || sig.state === 'FORCED_GREEN_4S'
            const isAmber = sig.state === 'PREEMPTION_REQUESTED' || sig.state === 'APPROACHING'
            const color = isGreen ? '#10b981' : (isAmber ? '#f59e0b' : '#ef4444')
            marker.setStyle({ color, fillColor: color })
            marker.setPopupContent(`<b>🚦 V2X Traffic Signal: ${sig.name}</b><br>State: <span style="color:${color};font-weight:bold">${sig.state}</span><br>Civilian Yields: ${sig.civilianVehiclesYielding || 0}`)
          }
        })
      }
    })
    return () => unsub()
  }, [])

  // Real-Time Simulation Engine
  useEffect(() => {
    if (!isSimulating || !mapInstanceRef.current) return

    const simulationWaypoints: [number, number][] = [
      [12.9716, 77.5946],
      [12.9730, 77.6030],
      [12.9745, 77.6120],
      [12.9760, 77.6200], // Indiranagar 100ft Rd
      [12.9690, 77.6350],
      [12.9620, 77.6430],
      [12.9582, 77.6483], // Hospital Arrival
    ]

    const interval = setInterval(() => {
      setSimStep((prev) => {
        const next = (prev + 1) % simulationWaypoints.length
        const currentCoord = simulationWaypoints[next]

        if (mapInstanceRef.current) {
          if (mapInstanceRef.current.ambulanceMarker) {
            mapInstanceRef.current.ambulanceMarker.setLatLng(currentCoord)
          }
          if (mapInstanceRef.current.sirenCircle) {
            mapInstanceRef.current.sirenCircle.setLatLng(currentCoord)
          }
          mapInstanceRef.current.panTo(currentCoord, { animate: true, duration: 0.5 })
        }

        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isSimulating])

  // Recenter Handler
  const handleRecenter = () => {
    if (mapInstanceRef.current && mapInstanceRef.current.ambulanceMarker) {
      const pos = mapInstanceRef.current.ambulanceMarker.getLatLng()
      mapInstanceRef.current.setView(pos, 14, { animate: true })
    }
  }

  // Predictive Traffic Factors
  const getPredictionImpact = () => {
    switch (futurePredictionMinutes) {
      case 10:
        return { delay: '+2.5 min', risk: 'Moderate', text: 'Congestion forming near Command Hospital junction in +10m due to traffic spillover.' }
      case 20:
        return { delay: '+5.8 min', risk: 'High', text: 'Gridlock expected at Trinity Circle in +20m. Route B bypass recommended now.' }
      case 30:
        return { delay: '+9.2 min', risk: 'Critical', text: 'Severe congestion expanding across Old Airport Rd. Emergency corridor preemption required.' }
      default:
        return { delay: '+0 min', risk: 'Normal', text: 'Current live traffic conditions observed via telemetry.' }
    }
  }

  const predictionData = getPredictionImpact()

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      {/* Top Navigation & Feature Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4 animate-pulse text-amber-500" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-card-foreground flex items-center gap-2">
              <span>GeoAgent Advanced Emergency Map</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Novelty AI Engine
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Google Maps Traffic + Predictive Traffic Forecasting + V2X Signal Preemption
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
            {isSimulating ? 'Pause Telemetry' : 'Simulate Telemetry'}
          </Button>

          <Button size="sm" variant="outline" onClick={handleRecenter} className="h-8 gap-1.5 text-xs">
            <RotateCcw className="size-3.5" />
            Recenter
          </Button>

          {/* Map Style Selector */}
          <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMapStyle('google_traffic')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                mapStyle === 'google_traffic' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
              )}
            >
              Google Traffic
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('dark')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                mapStyle === 'dark' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
              )}
            >
              Dark GIS
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                mapStyle === 'satellite' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
              )}
            >
              Satellite
            </button>
          </div>
        </div>
      </div>

      {/* NOVELTY CONTROL STRIP 1: PREDICTIVE TRAFFIC FORECAST SLIDER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <BrainCircuit className="size-4 text-purple-500 shrink-0" />
          <span>Predictive Traffic Forecast:</span>
        </div>

        <div className="flex items-center gap-2">
          {([0, 10, 20, 30] as const).map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setFuturePredictionMinutes(mins)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border',
                futurePredictionMinutes === mins
                  ? 'border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {mins === 0 ? 'Live (Now)' : `+${mins} min Future`}
            </button>
          ))}
        </div>
      </div>

      {/* NOVELTY CONTROL STRIP 2: NOVELTY EMERGENCY FEATURES TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-card-foreground">
            <input
              type="checkbox"
              checked={enableV2XPreemption}
              onChange={(e) => setEnableV2XPreemption(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <Zap className="size-3.5 text-emerald-500" />
            <span>V2X Green Wave Preemption</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-card-foreground">
            <input
              type="checkbox"
              checked={enableVirtualSiren}
              onChange={(e) => setEnableVirtualSiren(e.target.checked)}
              className="rounded accent-rose-500"
            />
            <Volume2 className="size-3.5 text-rose-500" />
            <span>500m Virtual Siren Broadcast</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-card-foreground">
            <input
              type="checkbox"
              checked={enableHospitalBedMatch}
              onChange={(e) => setEnableHospitalBedMatch(e.target.checked)}
              className="rounded accent-blue-500"
            />
            <Hospital className="size-3.5 text-blue-500" />
            <span>ICU Bed Capacity Match</span>
          </label>
        </div>

        {/* Patient Triage Severity Selector */}
        <div className="flex items-center gap-1.5">
          <Stethoscope className="size-3.5 text-rose-500 shrink-0" />
          <span className="text-muted-foreground">Triage:</span>
          <select
            value={patientSeverity}
            onChange={(e) => setPatientSeverity(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="CRITICAL_CARDIAC">Critical Cardiac (0-min Delay Allowance)</option>
            <option value="SEVERE_TRAUMA">Severe Trauma (2-min Delay Allowance)</option>
            <option value="MODERATE">Moderate Injury (5-min Delay Allowance)</option>
          </select>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative w-full aspect-[16/9] min-h-[400px] bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 size-full z-0" />

        {!mapLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm z-10">
            <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <span className="text-xs font-medium text-muted-foreground">
              Loading Google Traffic Tiles & Predictive AI Corridor...
            </span>
          </div>
        ) : null}

        {/* FLOATING NOVELTY OVERLAY PANEL: PREDICTIVE TRAFFIC & NOVELTY STATUS */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-sm">
          {/* Predictive Traffic Alert Box */}
          {futurePredictionMinutes > 0 ? (
            <div className="rounded-xl border border-purple-500/40 bg-purple-950/90 p-3 text-white backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <BrainCircuit className="size-4 animate-pulse text-purple-400" />
                  <span>PREDICTIVE TRAFFIC (+{futurePredictionMinutes}m)</span>
                </div>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                  Risk: {predictionData.risk}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-purple-100 leading-snug">
                {predictionData.text}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-purple-300 font-mono">
                <span>Predicted Bottleneck Delay: {predictionData.delay}</span>
                <span>Accuracy: 94.8%</span>
              </div>
            </div>
          ) : null}

          {/* Real-time Deviation & V2X Preemption Card */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/85 p-2.5 text-white backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <AlertTriangle className="size-4 animate-bounce text-rose-500" />
                <span>DEVIATION DETECTED: 444.7m OFF-ROUTE</span>
              </div>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                {patientSeverity === 'CRITICAL_CARDIAC' ? '0-MIN ALLOWANCE' : 'ALERT'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-rose-100">
              Ambulance A102 turned onto Indiranagar 100ft Rd.
            </p>
          </div>

          {/* V2X Traffic Signal Status */}
          {enableV2XPreemption ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/85 p-2.5 text-white backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Zap className="size-4 text-emerald-400" />
                  <span>V2X SIGNAL PREEMPTION {liveV2XData?.corridorHealth ? `(${liveV2XData.corridorHealth})` : 'ACTIVE'}</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  {liveV2XData?.preemptedCount ?? 4} Signals Green
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-200">
                Traffic lights along corridor forced green. <b>{liveV2XData?.civilianAlertedCount ?? 142} civilian cars alerted to yield.</b>
                {liveV2XData?.timeSavedMinutes ? ` Saved -${liveV2XData.timeSavedMinutes}m.` : ''}
              </p>
            </div>
          ) : null}
        </div>

        {/* TOP-RIGHT: TURN-BY-TURN NAVIGATION HUD */}
        <div className="absolute top-3 right-3 z-10 max-w-sm w-[320px] sm:w-[350px] pointer-events-auto">
          <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Navigation className="size-3.5 text-cyan-400" />
                <span>Live Turn Guidance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase">
                  Step {currentNavIdx + 1} of {INTERACTIVE_MAP_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsNavHudCollapsed(!isNavHudCollapsed)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  aria-label={isNavHudCollapsed ? 'Expand turn navigation' : 'Collapse turn navigation'}
                >
                  {isNavHudCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>
              </div>
            </div>

            {!isNavHudCollapsed ? (
              <div className="p-3">
                {/* Primary Maneuver Card */}
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-300/40 shrink-0">
                    {getInteractiveManeuverIcon(currentNavStep?.maneuver, 'size-6 text-white')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-white tracking-tight leading-none">
                        {currentNavStep?.distance ? `${currentNavStep.distance} m` : '0 m'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {currentNavStep?.maneuver?.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="mt-1 text-xs sm:text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                      {currentNavStep?.instruction}
                    </h4>

                    {nextNavStep && (
                      <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="text-cyan-400 font-bold">Then</span>
                        <span className="shrink-0">{getInteractiveManeuverIcon(nextNavStep.maneuver, 'size-3 text-cyan-300')}</span>
                        <span className="truncate text-slate-300 font-medium">
                          {nextNavStep.instruction} ({nextNavStep.distance}m)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Maneuvers toggle */}
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsTurnListOpen(!isTurnListOpen)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                  >
                    <List className="size-3 text-cyan-400" />
                    <span>All Turns ({INTERACTIVE_MAP_STEPS.length})</span>
                    {isTurnListOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isSimulating ? 'Simulating Drive...' : 'Live Route'}
                  </span>
                </div>

                {/* Expandable Step-by-Step Maneuver List */}
                {isTurnListOpen && (
                  <div className="mt-2 max-h-48 overflow-y-auto custom-scrollbar rounded-xl bg-slate-950/90 border border-slate-800 p-1.5 space-y-1 animate-in fade-in duration-150">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>Corridor Turns</span>
                      <span className="text-cyan-400 font-normal">Click to pan map</span>
                    </div>
                    {INTERACTIVE_MAP_STEPS.map((step, idx) => {
                      const isCurrent = idx === currentNavIdx
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleNavStepClick(step.coord)}
                          className={`w-full text-left p-1.5 rounded-lg flex items-start gap-2 transition-all text-xs ${
                            isCurrent
                              ? 'bg-emerald-950/60 border border-emerald-500/40 text-white'
                              : 'hover:bg-slate-900 text-slate-300 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className={`size-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {getInteractiveManeuverIcon(step.maneuver, 'size-3')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[11px] leading-snug line-clamp-1">{step.instruction}</p>
                            <p className="text-[9px] text-slate-400">{step.distance} m · ~{Math.round(step.duration / 60)} min</p>
                          </div>
                          {isCurrent && (
                            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[8px] uppercase shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="size-7 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    {getInteractiveManeuverIcon(currentNavStep?.maneuver, 'size-3.5 text-white')}
                  </div>
                  <span className="text-xs font-bold text-white truncate">
                    {currentNavStep?.distance}m: {currentNavStep?.instruction}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNavHudCollapsed(false)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300 uppercase shrink-0"
                >
                  Expand
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Map Layers Selector Floating Box */}
        <div className="absolute bottom-3 right-3 z-10 rounded-xl border border-border bg-card/90 p-2.5 backdrop-blur-md shadow-lg text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-card-foreground pb-1 border-b border-border">
            <Layers className="size-3.5 text-primary" />
            <span>Layer Controls</span>
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
            <span>Route B (100ft Rd Bypass)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={visibleLayers.v2x}
              onChange={(e) => setVisibleLayers({ ...visibleLayers, v2x: e.target.checked })}
              className="rounded accent-emerald-400"
            />
            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
            <span>V2X Green Wave Nodes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={visibleLayers.virtualSiren}
              onChange={(e) => setVisibleLayers({ ...visibleLayers, virtualSiren: e.target.checked })}
              className="rounded accent-rose-500"
            />
            <span className="size-2 rounded-full bg-rose-500 inline-block" />
            <span>500m Virtual Siren Zone</span>
          </label>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-500" />
            <span>Route A (Delayed: 16m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span>Route B (Optimal: 11m · Saved 5m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-purple-500" />
            <span>Predictive Forecast Mode: +{futurePredictionMinutes}m</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          <span>Novelty Features Active: V2X Signal Preemption + Patient Severity Triage</span>
        </div>
      </div>
    </div>
  )
}
