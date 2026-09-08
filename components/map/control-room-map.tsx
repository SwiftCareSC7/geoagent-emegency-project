'use client'

/**
 * SwiftCare GeoAgent — Interactive Geospatial Control Room Map Orchestrator
 *
 * Visualizes ACTUAL backend data without fake movement, fake routes, or fake traffic.
 * Integrates initial REST loading, incremental Socket.IO event updates without full reload,
 * and stable layer managers.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import {
  emergencyApi,
  routeApi,
  trajectoryApi,
  analysisApi,
  vehicleApi,
  incidentApi,
  type Emergency,
  type Vehicle,
  type Incident,
  type Route,
} from '@/lib/api'
import { getSocket, REALTIME_EVENTS } from '@/lib/socket/client'
import { useSocketStatus } from '@/lib/socket/useRealtime'
import { MapView, type MapViewHandle } from './map-view'
import { MapControls } from './map-controls'
import { MapLegend } from './map-legend'
import { VehicleLayerManager } from './layers/vehicle-layer'
import { RouteLayerManager } from './layers/route-layer'
import { IncidentLayerManager } from './layers/incident-layer'
import { TrajectoryLayerManager } from './layers/trajectory-layer'
import { DeviationLayerManager } from './layers/deviation-layer'
import type {
  MapEmergency,
  MapIncident,
  MapLayerVisibility,
  MapRoute,
  MapTrajectory,
  MapVehicle,
  MapDeviation,
  TileLayerProvider,
} from './types'
import { evaluateFreshness, toLatLng } from './types'
import { createEmergencyPopupHtml } from './popup-content'

interface ControlRoomMapProps {
  initialEmergencies?: Emergency[]
  initialVehicles?: Vehicle[]
  initialIncidents?: Incident[]
  selectedEmergencyId?: string | null
  onSelectEmergency?: (emergencyId: string) => void
  showRecommended?: boolean
  className?: string
  height?: string
}

export function ControlRoomMap({
  initialEmergencies,
  initialVehicles,
  initialIncidents,
  selectedEmergencyId: externalSelectedEmergencyId,
  onSelectEmergency,
  showRecommended = true,
  className = '',
  height = '520px',
}: ControlRoomMapProps) {
  const mapViewRef = useRef<MapViewHandle>(null)

  // Layer Managers
  const vehicleManagerRef = useRef<VehicleLayerManager | null>(null)
  const routeManagerRef = useRef<RouteLayerManager | null>(null)
  const incidentManagerRef = useRef<IncidentLayerManager | null>(null)
  const trajectoryManagerRef = useRef<TrajectoryLayerManager | null>(null)
  const deviationManagerRef = useRef<DeviationLayerManager | null>(null)
  const emergencyMarkersRef = useRef<Map<string, L.Marker>>(new Map())

  // Core Data State (Authoritative Backend Records)
  const [emergencies, setEmergencies] = useState<MapEmergency[]>([])
  const [vehicles, setVehicles] = useState<MapVehicle[]>([])
  const [incidents, setIncidents] = useState<MapIncident[]>([])
  const [routes, setRoutes] = useState<MapRoute[]>([])
  const [trajectories, setTrajectories] = useState<MapTrajectory[]>([])
  const [deviations, setDeviations] = useState<MapDeviation[]>([])
  const [predictions, setPredictions] = useState<Record<string, number>>({})

  // Interactive Selection
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(
    externalSelectedEmergencyId || null
  )
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  // Display Controls State
  const [activeTile, setActiveTile] = useState<TileLayerProvider>('carto_dark')
  const [visibility, setVisibility] = useState<MapLayerVisibility>({
    vehicles: true,
    emergencies: true,
    routes: true,
    incidents: true,
    trajectories: true,
    deviations: true,
    v2xSignals: true,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  // Socket Connection Status
  const { isConnected: socketConnected, reconnected } = useSocketStatus()

  // Keep internal selection synced with external prop
  useEffect(() => {
    if (externalSelectedEmergencyId !== undefined) {
      setSelectedEmergencyId(externalSelectedEmergencyId)
    }
  }, [externalSelectedEmergencyId])

  // 1. Initialize Layer Managers when Map View is Ready
  const handleMapReady = useCallback(() => {
    const handle = mapViewRef.current
    if (!handle) return

    const vGroup = handle.getLayerGroup('vehicles')
    const rGroup = handle.getLayerGroup('routes')
    const iGroup = handle.getLayerGroup('incidents')
    const tGroup = handle.getLayerGroup('trajectories')
    const dGroup = handle.getLayerGroup('deviations')

    if (vGroup) vehicleManagerRef.current = new VehicleLayerManager(vGroup)
    if (rGroup) routeManagerRef.current = new RouteLayerManager(rGroup)
    if (iGroup) incidentManagerRef.current = new IncidentLayerManager(iGroup)
    if (tGroup) trajectoryManagerRef.current = new TrajectoryLayerManager(tGroup)
    if (dGroup) deviationManagerRef.current = new DeviationLayerManager(dGroup)
  }, [])

  // 2. Fetch Initial REST State
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load emergencies, vehicles, incidents in parallel
      const [emgRes, vehRes, incRes] = await Promise.all([
        emergencyApi.list().catch(() => ({ success: true, data: [] })),
        vehicleApi.list().catch(() => ({ success: true, data: [] })),
        incidentApi.list({ status: 'ACTIVE' }).catch(() => ({ success: true, data: [] })),
      ])

      const rawEmergencies: Emergency[] = initialEmergencies || emgRes.data || []
      const rawVehicles: Vehicle[] = initialVehicles || vehRes.data || []
      const rawIncidents: Incident[] = initialIncidents || incRes.data || []

      // Map to MapEmergency format
      const mappedEmergencies: MapEmergency[] = rawEmergencies.map((e) => {
        const assignedVehId =
          e.assignedVehicle && typeof e.assignedVehicle === 'object' && 'vehicleId' in e.assignedVehicle
            ? e.assignedVehicle.vehicleId
            : typeof e.assignedVehicle === 'string'
            ? e.assignedVehicle
            : undefined

        return {
          id: e.id || e.emergencyId,
          emergencyId: e.emergencyId,
          type: e.type,
          priority: e.priority,
          status: e.status,
          description: e.description,
          callerName: e.callerName,
          callerContact: e.callerContact,
          location: e.location,
          destination: e.destination,
          assignedVehicleId: assignedVehId,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }
      })

      // Map to MapVehicle format
      const mappedVehicles: MapVehicle[] = rawVehicles.map((v) => ({
        id: v.id || v.vehicleId,
        vehicleId: v.vehicleId,
        registrationNumber: v.registrationNumber,
        type: v.type,
        status: v.status,
        capacity: v.capacity,
        driverName: v.driverName,
        driverContact: v.driverContact,
        location: v.location,
        speed: v.speed ?? 0,
        heading: v.heading ?? 0,
        lastUpdate: v.updatedAt || new Date().toISOString(),
        freshness: evaluateFreshness(v.updatedAt),
      }))

      // Map to MapIncident format
      const mappedIncidents: MapIncident[] = rawIncidents.map((i) => ({
        id: i.id || i.incidentId,
        incidentId: i.incidentId,
        type: i.type,
        severity: i.severity,
        status: i.status,
        description: i.description,
        location: i.location,
        source: i.source,
        emergencyId: i.emergency,
        createdAt: i.createdAt,
      }))

      setEmergencies(mappedEmergencies)
      setVehicles(mappedVehicles)
      setIncidents(mappedIncidents)
      setLastSyncTime(new Date())

      // Auto-select first active emergency if none selected
      if (!selectedEmergencyId && mappedEmergencies.length > 0) {
        setSelectedEmergencyId(mappedEmergencies[0].emergencyId)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to synchronize map state'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [initialEmergencies, initialVehicles, initialIncidents, selectedEmergencyId])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // 3. Silent Reconnect Resynchronization
  useEffect(() => {
    if (reconnected) {
      loadInitialData()
    }
  }, [reconnected, loadInitialData])

  // 4. Load Corridor Data When Selected Emergency Changes
  useEffect(() => {
    if (!selectedEmergencyId) {
      setRoutes([])
      setTrajectories([])
      setDeviations([])
      return
    }

    let isMounted = true

    async function loadCorridorDetails() {
      try {
        const emg = emergencies.find((e) => e.emergencyId === selectedEmergencyId)
        const vehId = emg?.assignedVehicleId

        if (vehId) {
          setSelectedVehicleId(vehId)
        }

        // Parallel fetch for route, trajectory, deviation, prediction
        const [routesRes, trajRes, devRes, predRes] = await Promise.all([
          emergencyApi.getRoutes(selectedEmergencyId!).catch(() => ({ success: true, data: [] })),
          vehId ? trajectoryApi.getRecent(vehId).catch(() => ({ success: true, data: [] })) : Promise.resolve({ success: true, data: [] }),
          vehId ? analysisApi.getVehicleDeviation(vehId).catch(() => null) : Promise.resolve(null),
          vehId ? analysisApi.getVehiclePredictionSafe(vehId).catch(() => null) : Promise.resolve(null),
        ])

        if (!isMounted) return

        // 1. Map Routes
        const rawRoutes: Route[] = routesRes.data || []
        const mappedRoutes: MapRoute[] = rawRoutes.map((r) => ({
          id: r.id || r.routeId,
          routeId: r.routeId,
          emergencyId: selectedEmergencyId!,
          origin: r.origin,
          destination: r.destination,
          geometry: r.geometry,
          distanceMeters: r.distance || r.distanceMeters || 0,
          durationSeconds: r.duration || r.durationSeconds || 0,
          routeType: r.routeType || 'PLANNED',
          status: r.status || 'ACTIVE',
          provider: r.provider,
          isRecommended: showRecommended && (r.routeType === 'CURRENT' || r.status === 'ACTIVE'),
        }))
        setRoutes(mappedRoutes)

        // 2. Map Trajectory (Bounded actual fixes)
        if (vehId && trajRes.data && trajRes.data.length > 0) {
          setTrajectories([
            {
              vehicleId: vehId,
              points: trajRes.data.map((t) => ({
                coordinates: t.location.coordinates,
                speed: t.speed,
                heading: t.heading,
                timestamp: t.timestamp,
              })),
            },
          ])
        } else {
          setTrajectories([])
        }

        // 3. Map Deviation
        if (vehId && devRes?.data) {
          const d = devRes.data
          if (d.status === 'DEVIATED' || d.status === 'CRITICAL_DEVIATION') {
            setDeviations([
              {
                vehicleId: vehId,
                emergencyId: selectedEmergencyId!,
                status: d.status,
                crossTrackDistanceMeters: d.distanceFromRouteMeters || 0,
                bearingDifferenceDegrees: d.bearingDifferenceDegrees,
                stability: d.gpsStability,
                timestamp: new Date().toISOString(),
                epistemicType: 'OBSERVED',
              },
            ])
          } else {
            setDeviations([])
          }
        }

        // 4. Map Prediction
        if (vehId && predRes) {
          setPredictions((prev) => ({
            ...prev,
            [vehId]: predRes.predictedDelayMinutes || 0,
          }))
        }

        // 5. Fit bounds to corridor
        if (mapViewRef.current) {
          setTimeout(() => {
            const rBounds = routeManagerRef.current?.getBounds()
            if (rBounds && rBounds.isValid()) {
              mapViewRef.current?.fitBounds(rBounds)
            } else if (emg?.location?.coordinates) {
              mapViewRef.current?.setView(toLatLng(emg.location.coordinates), 14)
            }
          }, 150)
        }
      } catch (err) {
        console.error('[ControlRoomMap] Corridor load error:', err)
      }
    }

    loadCorridorDetails()

    return () => {
      isMounted = false
    }
  }, [selectedEmergencyId, emergencies, showRecommended])

  // 5. Incremental Real-Time Socket.IO Subscriptions
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Telemetry fix
    const onLocationUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.vehicleId || !payload.location?.coordinates) return

      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === payload.vehicleId
            ? {
                ...v,
                location: payload.location,
                speed: payload.speed ?? v.speed,
                heading: payload.heading ?? v.heading,
                lastUpdate: payload.timestamp || new Date().toISOString(),
                freshness: 'LIVE',
              }
            : v
        )
      )

      // If this vehicle belongs to selected corridor, append trajectory fix
      if (payload.vehicleId === selectedVehicleId) {
        setTrajectories((prev) => {
          const current = prev.find((t) => t.vehicleId === payload.vehicleId)
          const newPt = {
            coordinates: payload.location.coordinates,
            speed: payload.speed ?? 0,
            heading: payload.heading ?? 0,
            timestamp: payload.timestamp || new Date().toISOString(),
          }
          if (current) {
            return [
              {
                ...current,
                points: [...current.points.slice(-49), newPt],
              },
            ]
          }
          return [{ vehicleId: payload.vehicleId, points: [newPt] }]
        })
      }
    }

    // Vehicle status change
    const onStatusUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.vehicleId) return
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === payload.vehicleId ? { ...v, status: payload.status } : v
        )
      )
    }

    // Emergency update
    const onEmergencyUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.emergencyId) return
      setEmergencies((prev) =>
        prev.map((e) =>
          e.emergencyId === payload.emergencyId ? { ...e, ...payload } : e
        )
      )
    }

    // Deviation update
    const onDeviationDetected = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.vehicleId) return

      if (payload.status === 'DEVIATED' || payload.status === 'CRITICAL_DEVIATION') {
        setDeviations([
          {
            vehicleId: payload.vehicleId,
            emergencyId: payload.emergencyId,
            status: payload.status,
            crossTrackDistanceMeters: payload.crossTrackDistanceMeters || 0,
            bearingDifferenceDegrees: payload.bearingDifferenceDegrees,
            stability: payload.stability,
            timestamp: payload.timestamp || new Date().toISOString(),
            epistemicType: 'OBSERVED',
          },
        ])
      } else {
        setDeviations((prev) => prev.filter((d) => d.vehicleId !== payload.vehicleId))
      }
    }

    // Prediction update
    const onPredictionUpdated = (envelope: any) => {
      const payload = envelope?.data || envelope
      if (!payload?.vehicleId) return
      setPredictions((prev) => ({
        ...prev,
        [payload.vehicleId]: payload.predictedDelayMinutes || 0,
      }))
    }

    socket.on(REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED, onLocationUpdated)
    socket.on(REALTIME_EVENTS.VEHICLE_STATUS_UPDATED, onStatusUpdated)
    socket.on(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)
    socket.on(REALTIME_EVENTS.ROUTE_DEVIATION_DETECTED, onDeviationDetected)
    socket.on(REALTIME_EVENTS.PREDICTION_UPDATED, onPredictionUpdated)

    return () => {
      socket.off(REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED, onLocationUpdated)
      socket.off(REALTIME_EVENTS.VEHICLE_STATUS_UPDATED, onStatusUpdated)
      socket.off(REALTIME_EVENTS.EMERGENCY_UPDATED, onEmergencyUpdated)
      socket.off(REALTIME_EVENTS.ROUTE_DEVIATION_DETECTED, onDeviationDetected)
      socket.off(REALTIME_EVENTS.PREDICTION_UPDATED, onPredictionUpdated)
    }
  }, [selectedVehicleId])

  // 6. Push Synchronized Data to Leaflet Layer Managers
  useEffect(() => {
    // 1. Vehicles
    if (vehicleManagerRef.current && visibility.vehicles) {
      vehicleManagerRef.current.updateVehicles(
        vehicles,
        selectedVehicleId,
        predictions,
        (vehId) => {
          setSelectedVehicleId(vehId)
          // Find emergency assigned to this vehicle
          const emg = emergencies.find((e) => e.assignedVehicleId === vehId)
          if (emg) {
            setSelectedEmergencyId(emg.emergencyId)
            if (onSelectEmergency) onSelectEmergency(emg.emergencyId)
          }
        }
      )
    }

    // 2. Routes
    if (routeManagerRef.current && visibility.routes) {
      routeManagerRef.current.updateRoutes(routes, selectedRouteId, (rId) => {
        setSelectedRouteId(rId)
      })
    }

    // 3. Incidents
    if (incidentManagerRef.current && visibility.incidents) {
      incidentManagerRef.current.updateIncidents(incidents)
    }

    // 4. Trajectories
    if (trajectoryManagerRef.current && visibility.trajectories) {
      trajectoryManagerRef.current.updateTrajectories(trajectories)
    }

    // 5. Deviations
    if (deviationManagerRef.current && visibility.deviations) {
      const positions = new Map<string, [number, number]>()
      vehicles.forEach((v) => {
        if (v.location?.coordinates) {
          positions.set(v.vehicleId, toLatLng(v.location.coordinates))
        }
      })
      deviationManagerRef.current.updateDeviations(deviations, positions)
    }
  }, [vehicles, routes, incidents, trajectories, deviations, predictions, selectedVehicleId, selectedRouteId, visibility, emergencies, onSelectEmergency])

  // 7. Update Emergency Destination & Pickup Markers
  useEffect(() => {
    const handle = mapViewRef.current
    if (!handle) return
    const group = handle.getLayerGroup('emergencies')
    if (!group) return

    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    group.clearLayers()
    emergencyMarkersRef.current.clear()

    if (!visibility.emergencies) return

    emergencies.forEach((emg) => {
      if (!emg.location?.coordinates) return

      const isSelected = selectedEmergencyId === emg.emergencyId

      // Pickup pin
      const pickupIcon = LRef.divIcon({
        className: 'swiftcare-emergency-marker',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 50%;
            background: #ef4444;
            border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(239,68,68,0.5);
            font-size: ${isSelected ? '15px' : '12px'};
            cursor: pointer;
          ">
            <span>🚨</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = LRef.marker(toLatLng(emg.location.coordinates), {
        icon: pickupIcon,
        zIndexOffset: isSelected ? 3000 : 500,
      }).addTo(group)

      marker.bindPopup(createEmergencyPopupHtml(emg))

      marker.on('click', () => {
        setSelectedEmergencyId(emg.emergencyId)
        if (onSelectEmergency) onSelectEmergency(emg.emergencyId)
      })

      emergencyMarkersRef.current.set(emg.emergencyId, marker)
    })
  }, [emergencies, selectedEmergencyId, visibility.emergencies, onSelectEmergency])

  // Layer Visibility Toggle Handler
  const handleToggleLayer = (key: keyof MapLayerVisibility) => {
    const next = !visibility[key]
    setVisibility((prev) => ({ ...prev, [key]: next }))
    mapViewRef.current?.toggleLayer(key, next)
  }

  // Focus Selected Emergency
  const handleFitCorridor = () => {
    if (!mapViewRef.current) return
    const rBounds = routeManagerRef.current?.getBounds()
    if (rBounds && rBounds.isValid()) {
      mapViewRef.current.fitBounds(rBounds)
      return
    }
    const emg = emergencies.find((e) => e.emergencyId === selectedEmergencyId)
    if (emg?.location?.coordinates) {
      mapViewRef.current.setView(toLatLng(emg.location.coordinates), 15)
    }
  }

  // Reset to City Overview
  const handleResetView = () => {
    mapViewRef.current?.setView([12.9716, 77.5946], 13)
  }

  return (
    <div className={`relative w-full rounded-2xl border border-border bg-slate-950 overflow-hidden shadow-2xl ${className}`}>
      {/* Real Map Viewport */}
      <MapView
        ref={mapViewRef}
        height={height}
        onMapReady={handleMapReady}
      />

      {/* Floating Map Controls */}
      <MapControls
        visibility={visibility}
        onToggleLayer={handleToggleLayer}
        onZoomIn={() => mapViewRef.current?.getMap()?.zoomIn()}
        onZoomOut={() => mapViewRef.current?.getMap()?.zoomOut()}
        onFitCorridor={handleFitCorridor}
        onResetView={handleResetView}
        activeTile={activeTile}
        onSelectTile={(tile) => {
          setActiveTile(tile)
          mapViewRef.current?.setTileLayer(tile)
        }}
        hasSelectedEmergency={!!selectedEmergencyId}
      />

      {/* Floating Accessible Legend */}
      <MapLegend />

      {/* Floating Status & Freshness Header Banner */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 max-w-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 shadow-xl backdrop-blur-md">
          {socketConnected ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE CONTROL STREAM</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-amber-400">
              <span className="size-2 rounded-full bg-amber-400" />
              <span>OFFLINE / POLLING</span>
            </span>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400 font-mono">
            {emergencies.length} Emergencies · {vehicles.length} Units
          </span>
        </div>

        {/* Selected Mission Pill */}
        {selectedEmergencyId ? (
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-950/85 px-3 py-1.5 text-xs text-cyan-200 shadow-xl backdrop-blur-md">
            <span className="font-bold flex items-center gap-1.5">
              <span>Active Corridor:</span>
              <code className="bg-cyan-900/60 px-1.5 py-0.5 rounded text-white font-mono">
                {selectedEmergencyId}
              </code>
            </span>
            {selectedVehicleId ? (
              <span className="text-[11px] text-cyan-300 font-mono">
                Unit: <strong>{selectedVehicleId}</strong>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Honest Empty State Banner (No Fabricated Data) */}
      {!loading && emergencies.length === 0 && vehicles.length === 0 ? (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center p-6 bg-slate-950/75 backdrop-blur-xs text-center">
          <div className="size-12 rounded-full bg-slate-800/80 flex items-center justify-center text-xl mb-3">
            📍
          </div>
          <h3 className="text-sm font-bold text-slate-200">No Active Emergency Missions</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            The metropolitan control room is currently operating in standby. Map will visualize actual
            corridors once an emergency call is dispatched.
          </p>
        </div>
      ) : null}
    </div>
  )
}
