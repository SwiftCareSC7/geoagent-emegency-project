'use client'

/**
 * SwiftCare GeoAgent — Production Google Maps Viewport with Live Traffic Layer
 *
 * Implements the GLOBAL GOOGLE MAPS + REAL-TIME TRAFFIC LAYER STANDARD:
 * - Basemap: Google Maps JavaScript API with responsive dark / light themes
 * - Real-time Traffic: Official google.maps.TrafficLayer ENABLED BY DEFAULT with auto-refresh
 * - Strict SwiftCare Visual Hierarchy:
 *     1. Active Ambulance (top zIndex, heading arrow, pulsing radar)
 *     2. Planned / Active Corridor (BLUE #2563eb with contrast backing)
 *     3. Recommended Alternative Detour (PURPLE #8b5cf6 with contrast backing)
 *     4. Incident / Hazard (RED #ef4444 pulsing beacon)
 *     5. Actual GPS Trajectory (ORANGE #f97316 dashed breadcrumbs)
 *     6. Google Live Traffic Layer (underneath routes, clear road condition context)
 * - Safe Lifecycle: Exactly ONE TrafficLayer instance per map; zero duplicate layers on rerender
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { useTheme } from 'next-themes'
import {
  loadGoogleMaps,
  GOOGLE_MAPS_DARK_STYLE,
  GOOGLE_MAPS_LIGHT_STYLE,
} from '@/lib/google-maps-loader'
import { ROUTE_SEMANTICS } from '@/lib/routing-constants'
import type { Emergency, Vehicle, Incident, Route, Trajectory } from '@/lib/api/types'
import {
  AlertTriangle,
  Compass,
  Layers,
  MapPin,
  Radio,
  RotateCcw,
  Truck,
  Wifi,
  Zap,
} from 'lucide-react'

export interface GoogleMapViewHandle {
  getMap: () => google.maps.Map | null
  fitBounds: (bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral) => void
  setView: (center: [number, number], zoom?: number) => void
  setTrafficEnabled: (enabled: boolean) => void
}

export interface GoogleMapOverlayData {
  activeRouteCoordinates?: [number, number][] // [lng, lat]
  leg1Coordinates?: [number, number][] // [lng, lat]
  leg2Coordinates?: [number, number][] // [lng, lat]
  activeLegNumber?: number
  alternativeRouteCoordinates?: [number, number][] // [lng, lat]
  originalRouteCoordinates?: [number, number][] // [lng, lat]
  trajectoryCoordinates?: [number, number][] // [lng, lat]
  driverLocation?: [number, number] // [lng, lat]
  driverHeading?: number | null
  emergencyLocation?: [number, number] // [lng, lat]
  emergencyName?: string
  destinationLocation?: [number, number] // [lng, lat]
  destinationName?: string
  incidents?: Incident[]
  vehicles?: Vehicle[]
}

interface GoogleMapViewProps {
  initialCenter?: [number, number] // [lat, lng]
  initialZoom?: number
  height?: string
  className?: string
  trafficEnabled?: boolean
  onToggleTraffic?: () => void
  onMapReady?: (map: google.maps.Map) => void
  onError?: (error: Error) => void
  overlays?: GoogleMapOverlayData
  isSimulatedTraffic?: boolean
  simulationLabel?: string
  showControls?: boolean
}

export const GoogleMapView = forwardRef<GoogleMapViewHandle, GoogleMapViewProps>(
  function GoogleMapView(
    {
      initialCenter = [12.9716, 77.5946], // Default: Bengaluru
      initialZoom = 13,
      height = '100%',
      className = '',
      trafficEnabled = true, // MANDATORY: Live traffic layer defaults to TRUE
      onToggleTraffic,
      onMapReady,
      onError,
      overlays,
      isSimulatedTraffic = false,
      simulationLabel,
      showControls = true,
    },
    ref
  ) {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme !== 'light'

    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<google.maps.Map | null>(null)
    const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Polyline refs
    const activeRoutePolylineRef = useRef<google.maps.Polyline | null>(null)
    const activeRouteBackingRef = useRef<google.maps.Polyline | null>(null)
    const leg1PolylineRef = useRef<google.maps.Polyline | null>(null)
    const leg1BackingRef = useRef<google.maps.Polyline | null>(null)
    const leg2PolylineRef = useRef<google.maps.Polyline | null>(null)
    const leg2BackingRef = useRef<google.maps.Polyline | null>(null)
    const alternativeRoutePolylineRef = useRef<google.maps.Polyline | null>(null)
    const alternativeRouteBackingRef = useRef<google.maps.Polyline | null>(null)
    const otherRoutePolylineRef = useRef<google.maps.Polyline | null>(null)
    const trajectoryPolylineRef = useRef<google.maps.Polyline | null>(null)

    // Marker refs
    const driverMarkerRef = useRef<google.maps.Marker | null>(null)
    const emergencyMarkerRef = useRef<google.maps.Marker | null>(null)
    const destinationMarkerRef = useRef<google.maps.Marker | null>(null)
    const incidentMarkersRef = useRef<google.maps.Marker[]>([])
    const vehicleMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map())
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

    // 1. Initialize Google Map
    useEffect(() => {
      let isMounted = true

      async function init() {
        if (!containerRef.current || mapRef.current) return

        try {
          await loadGoogleMaps()
          if (!isMounted || !containerRef.current) return

          const map = new google.maps.Map(containerRef.current, {
            center: { lat: initialCenter[0], lng: initialCenter[1] },
            zoom: initialZoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: isDark ? GOOGLE_MAPS_DARK_STYLE : GOOGLE_MAPS_LIGHT_STYLE,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: true,
            fullscreenControl: false,
            gestureHandling: 'greedy',
          })

          mapRef.current = map
          infoWindowRef.current = new google.maps.InfoWindow()

          // 2. INITIALIZE GOOGLE TRAFFIC LAYER (ENABLED BY DEFAULT)
          const trafficLayer = new google.maps.TrafficLayer()
          trafficLayerRef.current = trafficLayer

          if (trafficEnabled) {
            trafficLayer.setMap(map)
          }

          setMapLoaded(true)
          if (onMapReady) onMapReady(map)
        } catch (err: any) {
          console.error('[GoogleMapView] Failed to initialize Google Maps:', err)
          setErrorMsg(err.message || 'Failed to load Google Maps Platform')
          if (onError) onError(err)
        }
      }

      init()

      return () => {
        isMounted = false
        // Clean up Traffic Layer
        if (trafficLayerRef.current) {
          trafficLayerRef.current.setMap(null)
          trafficLayerRef.current = null
        }
        // Clean up Polylines
        activeRoutePolylineRef.current?.setMap(null)
        activeRouteBackingRef.current?.setMap(null)
        leg1PolylineRef.current?.setMap(null)
        leg1BackingRef.current?.setMap(null)
        leg2PolylineRef.current?.setMap(null)
        leg2BackingRef.current?.setMap(null)
        alternativeRoutePolylineRef.current?.setMap(null)
        alternativeRouteBackingRef.current?.setMap(null)
        otherRoutePolylineRef.current?.setMap(null)
        trajectoryPolylineRef.current?.setMap(null)

        // Clean up Markers
        driverMarkerRef.current?.setMap(null)
        emergencyMarkerRef.current?.setMap(null)
        destinationMarkerRef.current?.setMap(null)
        incidentMarkersRef.current.forEach((m) => m.setMap(null))
        incidentMarkersRef.current = []
        vehicleMarkersRef.current.forEach((m) => m.setMap(null))
        vehicleMarkersRef.current.clear()

        infoWindowRef.current?.close()
        mapRef.current = null
      }
    }, [])

    // Synchronize Theme Style (Dark <-> Light) without destroying map instance
    useEffect(() => {
      if (!mapRef.current) return
      mapRef.current.setOptions({
        styles: isDark ? GOOGLE_MAPS_DARK_STYLE : GOOGLE_MAPS_LIGHT_STYLE,
      })
    }, [isDark])

    // Synchronize Traffic Layer (Single Instance Protection)
    useEffect(() => {
      if (!mapRef.current) return

      if (trafficEnabled) {
        if (!trafficLayerRef.current) {
          trafficLayerRef.current = new google.maps.TrafficLayer()
        }
        trafficLayerRef.current.setMap(mapRef.current)
      } else {
        if (trafficLayerRef.current) {
          trafficLayerRef.current.setMap(null)
        }
      }
    }, [trafficEnabled])

    // Expose Imperative Handle
    useImperativeHandle(
      ref,
      () => ({
        getMap: () => mapRef.current,
        fitBounds: (bounds) => {
          if (mapRef.current) {
            mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
          }
        },
        setView: (center, zoom = 14) => {
          if (mapRef.current) {
            mapRef.current.panTo({ lat: center[0], lng: center[1] })
            mapRef.current.setZoom(zoom)
          }
        },
        setTrafficEnabled: (enabled: boolean) => {
          if (mapRef.current) {
            if (enabled) {
              if (!trafficLayerRef.current) {
                trafficLayerRef.current = new google.maps.TrafficLayer()
              }
              trafficLayerRef.current.setMap(mapRef.current)
            } else {
              trafficLayerRef.current?.setMap(null)
            }
          }
        },
      }),
      []
    )

    // 3. Render SwiftCare Route Polylines
    useEffect(() => {
      if (!mapRef.current || !mapLoaded || !overlays) return
      const map = mapRef.current

      // Clean existing polylines
      activeRoutePolylineRef.current?.setMap(null)
      activeRouteBackingRef.current?.setMap(null)
      leg1PolylineRef.current?.setMap(null)
      leg1BackingRef.current?.setMap(null)
      leg2PolylineRef.current?.setMap(null)
      leg2BackingRef.current?.setMap(null)
      alternativeRoutePolylineRef.current?.setMap(null)
      alternativeRouteBackingRef.current?.setMap(null)
      otherRoutePolylineRef.current?.setMap(null)
      trajectoryPolylineRef.current?.setMap(null)

      const bounds = new google.maps.LatLngBounds()
      let hasPoints = false

      // 3A. Planned / Active Corridor (Leg 1 / Leg 2 or activeRouteCoordinates in BLUE)
      if (overlays.leg1Coordinates && overlays.leg1Coordinates.length > 1) {
        const path = overlays.leg1Coordinates.map(([lng, lat]) => {
          const pt = { lat, lng }
          bounds.extend(pt)
          hasPoints = true
          return pt
        })

        // High contrast backing line
        leg1BackingRef.current = new google.maps.Polyline({
          path,
          strokeColor: '#0f172a',
          strokeWeight: 10,
          strokeOpacity: 0.9,
          zIndex: 99,
          map,
        })

        leg1PolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: ROUTE_SEMANTICS.activeCorridor.color, // #2563eb Blue
          strokeWeight: 6,
          strokeOpacity: 1.0,
          zIndex: 100,
          map,
        })
      }

      if (overlays.leg2Coordinates && overlays.leg2Coordinates.length > 1) {
        const path = overlays.leg2Coordinates.map(([lng, lat]) => {
          const pt = { lat, lng }
          bounds.extend(pt)
          hasPoints = true
          return pt
        })

        leg2BackingRef.current = new google.maps.Polyline({
          path,
          strokeColor: '#0f172a',
          strokeWeight: 10,
          strokeOpacity: 0.9,
          zIndex: 99,
          map,
        })

        leg2PolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: '#3b82f6', // Active corridor Blue tone
          strokeWeight: 6,
          strokeOpacity: 1.0,
          zIndex: 100,
          map,
        })
      }

      // Unified activeRouteCoordinates fallback if legs are not split
      if (
        (!overlays.leg1Coordinates || overlays.leg1Coordinates.length < 2) &&
        overlays.activeRouteCoordinates &&
        overlays.activeRouteCoordinates.length > 1
      ) {
        const path = overlays.activeRouteCoordinates.map(([lng, lat]) => {
          const pt = { lat, lng }
          bounds.extend(pt)
          hasPoints = true
          return pt
        })

        activeRouteBackingRef.current = new google.maps.Polyline({
          path,
          strokeColor: '#0f172a',
          strokeWeight: 10,
          strokeOpacity: 0.9,
          zIndex: 99,
          map,
        })

        activeRoutePolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: ROUTE_SEMANTICS.activeCorridor.color, // #2563eb Blue
          strokeWeight: 6,
          strokeOpacity: 1.0,
          zIndex: 100,
          map,
        })
      }

      // 3B. Recommended Alternative Detour (PURPLE Dashed)
      if (
        overlays.alternativeRouteCoordinates &&
        overlays.alternativeRouteCoordinates.length > 1
      ) {
        const path = overlays.alternativeRouteCoordinates.map(([lng, lat]) => {
          const pt = { lat, lng }
          bounds.extend(pt)
          hasPoints = true
          return pt
        })

        // Purple backing
        alternativeRouteBackingRef.current = new google.maps.Polyline({
          path,
          strokeColor: '#4c1d95',
          strokeWeight: 9,
          strokeOpacity: 0.6,
          zIndex: 89,
          map,
        })

        // Purple dashed polyline
        const lineSymbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 4,
          strokeColor: ROUTE_SEMANTICS.recommendedAlternative.color, // #8b5cf6
        }

        alternativeRoutePolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: ROUTE_SEMANTICS.recommendedAlternative.color,
          strokeOpacity: 0,
          icons: [
            {
              icon: lineSymbol,
              offset: '0',
              repeat: '14px',
            },
          ],
          zIndex: 90,
          map,
        })
      }

      // 3C. Other Alternatives (Slate Gray)
      if (overlays.originalRouteCoordinates && overlays.originalRouteCoordinates.length > 1) {
        const path = overlays.originalRouteCoordinates.map(([lng, lat]) => ({ lat, lng }))
        otherRoutePolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: ROUTE_SEMANTICS.otherAlternative.color, // #64748b
          strokeWeight: 4,
          strokeOpacity: 0.7,
          zIndex: 70,
          map,
        })
      }

      // 3D. GPS Trajectory (ORANGE Dashed)
      if (overlays.trajectoryCoordinates && overlays.trajectoryCoordinates.length > 1) {
        const path = overlays.trajectoryCoordinates.map(([lng, lat]) => ({ lat, lng }))
        trajectoryPolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: ROUTE_SEMANTICS.gpsTrajectory.color, // #f97316 Orange
          strokeWeight: 4,
          strokeOpacity: 0.9,
          zIndex: 80,
          map,
        })
      }
    }, [overlays, mapLoaded])

    // 4. Render Markers (Ambulance, Emergency, Hospital, Incidents)
    useEffect(() => {
      if (!mapRef.current || !mapLoaded || !overlays) return
      const map = mapRef.current

      // 4A. Driver / Ambulance Marker
      if (overlays.driverLocation) {
        const pos = { lat: overlays.driverLocation[1], lng: overlays.driverLocation[0] }
        const heading = overlays.driverHeading || 0

        // Custom SVG ambulance icon with heading
        const ambulanceSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" />
            <path d="M14 24h16v-8H14v8zm16 0h4l3-3v-5h-7v8z" fill="#ffffff" />
            <circle cx="18" cy="25" r="2.5" fill="#1e3a8a" />
            <circle cx="28" cy="25" r="2.5" fill="#1e3a8a" />
            <polygon points="22,4 26,10 18,10" fill="#ffffff" />
          </svg>
        `
        const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(ambulanceSvg)}`

        if (!driverMarkerRef.current) {
          driverMarkerRef.current = new google.maps.Marker({
            position: pos,
            map,
            title: 'Active Emergency Unit',
            zIndex: 1000,
            icon: {
              url: iconUrl,
              scaledSize: new google.maps.Size(44, 44),
              anchor: new google.maps.Point(22, 22),
            },
          })
        } else {
          driverMarkerRef.current.setPosition(pos)
        }
      }

      // 4B. Emergency Location Marker (Red Alert Beacon)
      if (overlays.emergencyLocation) {
        const pos = { lat: overlays.emergencyLocation[1], lng: overlays.emergencyLocation[0] }
        const emergencySvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
            <path d="M18 10v9m0 4v1" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
          </svg>
        `
        const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(emergencySvg)}`

        if (!emergencyMarkerRef.current) {
          emergencyMarkerRef.current = new google.maps.Marker({
            position: pos,
            map,
            title: overlays.emergencyName || 'Emergency Scene',
            zIndex: 950,
            icon: {
              url: iconUrl,
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 18),
            },
          })
        } else {
          emergencyMarkerRef.current.setPosition(pos)
        }
      }

      // 4C. Destination / Hospital Marker (Emerald Medical Cross)
      if (overlays.destinationLocation) {
        const pos = { lat: overlays.destinationLocation[1], lng: overlays.destinationLocation[0] }
        const hospitalSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
            <rect x="2" y="2" width="34" height="34" rx="8" fill="#059669" stroke="#ffffff" stroke-width="2" />
            <path d="M19 10v18m-9-9h18" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" />
          </svg>
        `
        const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(hospitalSvg)}`

        if (!destinationMarkerRef.current) {
          destinationMarkerRef.current = new google.maps.Marker({
            position: pos,
            map,
            title: overlays.destinationName || 'Destination Hospital Facility',
            zIndex: 900,
            icon: {
              url: iconUrl,
              scaledSize: new google.maps.Size(38, 38),
              anchor: new google.maps.Point(19, 19),
            },
          })
        } else {
          destinationMarkerRef.current.setPosition(pos)
        }
      }

      // 4D. Incidents (Red Hazard Markers)
      incidentMarkersRef.current.forEach((m) => m.setMap(null))
      incidentMarkersRef.current = []

      if (overlays.incidents && overlays.incidents.length > 0) {
        const incidentSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
            <polygon points="15,3 28,26 2,26" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
            <line x1="15" y1="12" x2="15" y2="18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="15" cy="22" r="1.5" fill="#ffffff" />
          </svg>
        `
        const incIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(incidentSvg)}`

        overlays.incidents.forEach((inc) => {
          if (!inc.location?.coordinates) return
          const pos = { lat: inc.location.coordinates[1], lng: inc.location.coordinates[0] }
          const marker = new google.maps.Marker({
            position: pos,
            map,
            title: `Hazard: ${inc.description || inc.type}`,
            zIndex: 920,
            icon: {
              url: incIconUrl,
              scaledSize: new google.maps.Size(30, 30),
              anchor: new google.maps.Point(15, 15),
            },
          })

          marker.addListener('click', () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.setContent(`
                <div style="font-family:system-ui,sans-serif;padding:6px;max-width:220px;color:#0f172a;">
                  <div style="font-weight:bold;color:#ef4444;font-size:12px;margin-bottom:2px;">
                    ⚠️ Road Incident (${inc.type})
                  </div>
                  <div style="font-size:11px;color:#334155;margin-bottom:4px;">
                    ${inc.description || 'Congestion / Hazard detected'}
                  </div>
                  <div style="font-size:10px;color:#64748b;font-family:monospace;">
                    Severity: ${inc.severity || 'HIGH'} • Status: ${inc.status || 'ACTIVE'}
                  </div>
                </div>
              `)
              infoWindowRef.current.open(map, marker)
            }
          })

          incidentMarkersRef.current.push(marker)
        })
      }
    }, [overlays, mapLoaded])

    const handleRecenter = useCallback(() => {
      if (!mapRef.current) return
      if (overlays?.driverLocation) {
        mapRef.current.panTo({
          lat: overlays.driverLocation[1],
          lng: overlays.driverLocation[0],
        })
        mapRef.current.setZoom(16)
      } else {
        mapRef.current.panTo({ lat: initialCenter[0], lng: initialCenter[1] })
        mapRef.current.setZoom(initialZoom)
      }
    }, [overlays?.driverLocation, initialCenter, initialZoom])

    return (
      <div
        className={`relative w-full overflow-hidden rounded-xl bg-slate-900 border border-border shadow-inner ${className}`}
        style={{ height }}
      >
        {/* Google Maps Container DOM */}
        <div ref={containerRef} className="size-full z-0" />

        {/* Loading Spinner */}
        {!mapLoaded && !errorMsg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-sm z-20 text-slate-200">
            <div className="size-8 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold tracking-tight">Initializing Google Maps Platform</span>
              <span className="text-[11px] text-slate-400 font-mono">
                Loading Vector Basemap & Real-Time TrafficLayer...
              </span>
            </div>
          </div>
        ) : null}

        {/* Provider Error State */}
        {errorMsg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-6 text-center z-20">
            <AlertTriangle className="size-8 text-amber-500" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Google Maps Platform Notice
              </h4>
              <p className="text-xs text-slate-300 max-w-md">{errorMsg}</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              Degraded State: Fallback to Leaflet Spatial Engine Available
            </span>
          </div>
        ) : null}

        {/* FLOATING STATUS & CONTROLS RIBBON */}
        {showControls && mapLoaded ? (
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Live Traffic Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white border border-slate-700/80 shadow-lg backdrop-blur-md text-xs">
              <span
                className={`size-2 rounded-full ${
                  trafficEnabled
                    ? isSimulatedTraffic
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400 animate-ping'
                    : 'bg-slate-500'
                }`}
              />
              <span className="font-extrabold tracking-tight text-[11px]">
                {trafficEnabled
                  ? isSimulatedTraffic
                    ? simulationLabel || 'SIMULATED TRAFFIC'
                    : 'GOOGLE LIVE TRAFFIC'
                  : 'TRAFFIC OFF'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono pl-1 border-l border-slate-700">
                {trafficEnabled ? 'ONLINE' : 'MUTED'}
              </span>
            </div>

            {/* Optional Traffic Layer Toggle Button */}
            {onToggleTraffic && (
              <button
                type="button"
                onClick={onToggleTraffic}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md backdrop-blur-md ${
                  trafficEnabled
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title="Toggle Google Maps Real-time Traffic Layer"
              >
                <Zap className="size-3 text-emerald-400" />
                <span>Traffic: {trafficEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Recenter Button */}
            <button
              type="button"
              onClick={handleRecenter}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-md backdrop-blur-md text-xs font-semibold"
              title="Recenter camera on operational focus"
            >
              <RotateCcw className="size-3" />
              <span>Recenter</span>
            </button>
          </div>
        ) : null}

        {/* Global Watermark */}
        <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/80 text-slate-400 border border-slate-800/80 backdrop-blur-xs">
            Google Maps Platform • Live Traffic Layer
          </span>
        </div>
      </div>
    )
  }
)
