'use client'

import React, { useState, useMemo } from 'react'
import {
  LocateFixed,
  Navigation,
  MapPin,
  Building2,
  Clock,
  Compass,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Route as RouteIcon,
  X,
  Car
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BENGALURU_HOSPITALS,
  BENGALURU_LANDMARKS,
  type DestinationOption,
  type LandmarkOption,
  type GpsLocation
} from './types'

interface DriverRoutePlannerProps {
  currentLocation: GpsLocation | null
  gpsPermission: 'prompt' | 'granted' | 'denied' | 'unavailable'
  gpsStatusMessage: string | null
  onRequestGps: () => void
  onCalculateRoute: (params: {
    originCoordinates: [number, number]
    originName: string
    destinationCoordinates: [number, number]
    destinationName: string
    destinationHospitalCode?: string
    preference: 'FASTEST' | 'SHORTEST'
  }) => void
  onCancel?: () => void
  isLoading?: boolean
  initialEmergencyDestination?: DestinationOption | null
  className?: string
}

export function DriverRoutePlanner({
  currentLocation,
  gpsPermission,
  gpsStatusMessage,
  onRequestGps,
  onCalculateRoute,
  onCancel,
  isLoading = false,
  initialEmergencyDestination = null,
  className = ''
}: DriverRoutePlannerProps) {
  // Origin State: 'GPS' or manual
  const [originMode, setOriginMode] = useState<'GPS' | 'MANUAL'>('GPS')
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('lm-koramangala')
  const [originSearch, setOriginSearch] = useState<string>('')

  // Destination State
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(
    initialEmergencyDestination?.id || 'hosp-manipal'
  )
  const [destinationSearch, setDestinationSearch] = useState<string>('')
  const [customDestinationName, setCustomDestinationName] = useState<string>('')
  const [customDestinationCoords, setCustomDestinationCoords] = useState<[number, number] | null>(null)

  // Route Preference: FASTEST (Default) or SHORTEST
  const [preference, setPreference] = useState<'FASTEST' | 'SHORTEST'>('FASTEST')

  // Resolve Origin
  const selectedLandmark =
    BENGALURU_LANDMARKS.find((lm) => lm.id === selectedLandmarkId) || BENGALURU_LANDMARKS[0]
  const isGpsActive = originMode === 'GPS' && currentLocation !== null

  const resolvedOriginCoords: [number, number] =
    isGpsActive && currentLocation
      ? currentLocation.coordinates
      : selectedLandmark.coordinates

  const resolvedOriginName =
    isGpsActive
      ? 'Current Device GPS Location'
      : selectedLandmark.name

  // Filtered Destinations (Hospitals + Landmarks for search convenience)
  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.toLowerCase().trim()
    if (!q) return BENGALURU_HOSPITALS

    const matchedHospitals = BENGALURU_HOSPITALS.filter(
      (h) => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q)
    )

    const matchedLandmarks = BENGALURU_LANDMARKS.filter(
      (lm) => lm.name.toLowerCase().includes(q) || lm.area.toLowerCase().includes(q)
    ).map((lm) => ({
      id: lm.id,
      name: lm.name,
      address: `${lm.area}, Bengaluru`,
      coordinates: lm.coordinates
    }))

    return [...matchedHospitals, ...matchedLandmarks]
  }, [destinationSearch])

  // Resolve Destination
  const selectedDestination = useMemo(() => {
    if (customDestinationName && customDestinationCoords) {
      return {
        id: 'dest-custom',
        name: customDestinationName,
        address: 'Custom Bengaluru Location',
        coordinates: customDestinationCoords
      }
    }
    const foundHosp = BENGALURU_HOSPITALS.find((h) => h.id === selectedDestinationId)
    if (foundHosp) return foundHosp
    const foundLandmark = BENGALURU_LANDMARKS.find((lm) => lm.id === selectedDestinationId)
    if (foundLandmark) {
      return {
        id: foundLandmark.id,
        name: foundLandmark.name,
        address: `${foundLandmark.area}, Bengaluru`,
        coordinates: foundLandmark.coordinates
      }
    }
    return initialEmergencyDestination || BENGALURU_HOSPITALS[0]
  }, [selectedDestinationId, customDestinationName, customDestinationCoords, initialEmergencyDestination])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onCalculateRoute({
      originCoordinates: resolvedOriginCoords,
      originName: resolvedOriginName,
      destinationCoordinates: selectedDestination.coordinates,
      destinationName: selectedDestination.name,
      destinationHospitalCode: (selectedDestination as any).hospitalCode,
      preference
    })
  }

  return (
    <div
      className={`rounded-3xl border border-slate-700 bg-slate-900/95 p-4 sm:p-6 shadow-2xl text-white backdrop-blur-xl ${className}`}
    >
      {/* Header with Cancel / Back option */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
              Route Planner
            </span>
            <span className="text-[11px] font-mono text-slate-400">Manual / Custom Route</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
            My Location → Destination
          </h2>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close route planner"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* 1. ORIGIN / CURRENT LOCATION */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            FROM: Origin / Starting Point
          </label>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setOriginMode('GPS')
                onRequestGps()
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all min-h-[44px] touch-manipulation ${
                originMode === 'GPS'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <LocateFixed className="size-4 shrink-0 text-cyan-300" />
              <span>Use My Location</span>
            </button>

            <button
              type="button"
              onClick={() => setOriginMode('MANUAL')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all min-h-[44px] touch-manipulation ${
                originMode === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Building2 className="size-4 shrink-0 text-slate-300" />
              <span>Select Landmark</span>
            </button>
          </div>

          {/* GPS Status / Feedback Box */}
          {originMode === 'GPS' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              {currentLocation ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="size-4" />
                    <span>GPS Active: [{currentLocation.coordinates[1].toFixed(4)}, {currentLocation.coordinates[0].toFixed(4)}]</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-[10px] font-mono text-emerald-300 border border-emerald-800">
                    ±{currentLocation.accuracy || 5}m
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{gpsStatusMessage || 'Click "Use My Location" to obtain GPS position'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    If browser GPS is denied or unavailable, tap &quot;Select Landmark&quot; to pick your origin.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Manual Landmark Selector */
            <select
              value={selectedLandmarkId}
              onChange={(e) => setSelectedLandmarkId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white focus:border-blue-500 focus:outline-none min-h-[44px]"
            >
              {BENGALURU_LANDMARKS.map((lm) => (
                <option key={lm.id} value={lm.id}>
                  📍 {lm.name} ({lm.area})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. DESTINATION */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            TO: Destination / Hospital Facility
          </label>

          {/* Destination Search Box */}
          <div className="relative mb-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={destinationSearch}
              onChange={(e) => {
                setDestinationSearch(e.target.value)
                setCustomDestinationName('')
                setCustomDestinationCoords(null)
              }}
              placeholder="Search destination or hospital (e.g. Manipal, Victoria, Indiranagar)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Custom Destination Option if user typed text */}
          {destinationSearch.trim().length > 2 && (
            <button
              type="button"
              onClick={() => {
                setCustomDestinationName(destinationSearch.trim())
                // Use coordinates of first match or center of Bengaluru
                const fallbackCoord = filteredDestinations[0]?.coordinates || [77.6200, 12.9500]
                setCustomDestinationCoords(fallbackCoord as [number, number])
              }}
              className="w-full mb-2 text-left rounded-xl border border-blue-500/60 bg-blue-950/40 p-2.5 text-xs text-blue-300 flex items-center justify-between hover:bg-blue-900/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-cyan-400 shrink-0" />
                <span className="font-bold truncate">Use custom location: &quot;{destinationSearch.trim()}&quot;</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-800/80 text-white font-bold">
                Select
              </span>
            </button>
          )}

          {/* Destination List (Scrollable Cards) */}
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredDestinations.map((dest) => {
              const isSelected = selectedDestination.id === dest.id && !customDestinationName
              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => {
                    setSelectedDestinationId(dest.id)
                    setCustomDestinationName('')
                    setCustomDestinationCoords(null)
                  }}
                  className={`w-full text-left rounded-xl border p-2.5 transition-all min-h-[44px] touch-manipulation ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/50 ring-1 ring-emerald-500/60'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        <MapPin
                          className={`size-3.5 shrink-0 ${
                            isSelected ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{dest.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 pl-5">
                        {dest.address}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0 border border-emerald-500/40">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. OPTIMIZATION PREFERENCE */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            CORRIDOR OPTIMIZATION
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreference('FASTEST')}
              className={`rounded-xl border p-2.5 text-left transition-all min-h-[44px] touch-manipulation ${
                preference === 'FASTEST'
                  ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400'
              }`}
            >
              <div className="font-bold text-xs text-white">⚡ Fastest Corridor</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Live traffic & arterial bypass priority</p>
            </button>

            <button
              type="button"
              onClick={() => setPreference('SHORTEST')}
              className={`rounded-xl border p-2.5 text-left transition-all min-h-[44px] touch-manipulation ${
                preference === 'SHORTEST'
                  ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400'
              }`}
            >
              <div className="font-bold text-xs text-white">📏 Shortest Distance</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Minimizes physical kilometer distance</p>
            </button>
          </div>
        </div>

        {/* 4. SUBMIT ACTION: START ROUTE */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Calculating Route via Backend...</span>
            ) : (
              <>
                <RouteIcon className="size-5" />
                <span>START ROUTE</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
