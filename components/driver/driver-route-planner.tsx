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
  errorMessage?: string | null
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
  errorMessage = null,
  initialEmergencyDestination = null,
  className = ''
}: DriverRoutePlannerProps) {
  const [originMode, setOriginMode] = useState<'GPS' | 'MANUAL'>('GPS')
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('lm-koramangala')
  const [destinationSearch, setDestinationSearch] = useState<string>('')
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(
    initialEmergencyDestination?.id || 'hosp-manipal'
  )
  const [customDestinationName, setCustomDestinationName] = useState<string>('')
  const [customDestinationCoords, setCustomDestinationCoords] = useState<[number, number] | null>(null)
  const [preference, setPreference] = useState<'FASTEST' | 'SHORTEST'>('FASTEST')

  const selectedLandmark =
    BENGALURU_LANDMARKS.find((lm) => lm.id === selectedLandmarkId) || BENGALURU_LANDMARKS[0]
  const isGpsActive = originMode === 'GPS' && currentLocation !== null

  const resolvedOriginCoords: [number, number] =
    isGpsActive && currentLocation
      ? currentLocation.coordinates
      : selectedLandmark.coordinates

  const resolvedOriginName = isGpsActive ? 'Current Device GPS Location' : selectedLandmark.name

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

  const selectedDestination = useMemo(() => {
    if (customDestinationName && customDestinationCoords) {
      return {
        id: 'dest-custom',
        name: customDestinationName,
        address: 'Custom Location',
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
    <div className={`rounded-xl border border-slate-800 bg-slate-900/95 p-3 sm:p-4 shadow-xl text-white backdrop-blur-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
              Route Planner
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-white mt-0.5">
            My Location → Destination
          </h2>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close route planner"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        {/* Origin */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            FROM
          </label>

          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <button
              type="button"
              onClick={() => {
                setOriginMode('GPS')
                onRequestGps()
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2.5 text-[11px] font-bold transition-all min-h-[40px] touch-manipulation ${
                originMode === 'GPS'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <LocateFixed className="size-3.5 shrink-0 text-cyan-300" />
              <span>Use My Location</span>
            </button>

            <button
              type="button"
              onClick={() => setOriginMode('MANUAL')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2.5 text-[11px] font-bold transition-all min-h-[40px] touch-manipulation ${
                originMode === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Building2 className="size-3.5 shrink-0 text-slate-300" />
              <span>Select Landmark</span>
            </button>
          </div>

          {originMode === 'GPS' ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5">
              {currentLocation ? (
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="size-3.5" />
                    <span>GPS Active</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-[9px] font-mono text-emerald-300 border border-emerald-800">
                    ±{currentLocation.accuracy || 5}m
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{gpsStatusMessage || 'Tap "Use My Location" for GPS position'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Or tap &quot;Select Landmark&quot; to pick your origin.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <select
              value={selectedLandmarkId}
              onChange={(e) => setSelectedLandmarkId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-bold text-white focus:border-blue-500 focus:outline-none min-h-[40px]"
            >
              {BENGALURU_LANDMARKS.map((lm) => (
                <option key={lm.id} value={lm.id}>
                  {lm.name} ({lm.area})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Destination */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            TO
          </label>

          {/* Search */}
          <div className="relative mb-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={destinationSearch}
              onChange={(e) => {
                setDestinationSearch(e.target.value)
                setCustomDestinationName('')
                setCustomDestinationCoords(null)
              }}
              placeholder="Search hospital or destination..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-[11px] text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[40px]"
            />
          </div>

          {/* Custom Destination */}
          {destinationSearch.trim().length > 2 && (
            <button
              type="button"
              onClick={() => {
                setCustomDestinationName(destinationSearch.trim())
                const fallbackCoord = filteredDestinations[0]?.coordinates || [77.6200, 12.9500]
                setCustomDestinationCoords(fallbackCoord as [number, number])
              }}
              className="w-full mb-1.5 text-left rounded-lg border border-blue-500/40 bg-blue-950/30 p-2 text-[11px] text-blue-300 flex items-center justify-between hover:bg-blue-900/30 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-cyan-400 shrink-0" />
                <span className="font-bold truncate">Use: &quot;{destinationSearch.trim()}&quot;</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-800/60 text-white font-bold">
                Select
              </span>
            </button>
          )}

          {/* Destination List */}
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
                  className={`w-full text-left rounded-lg border p-2 transition-all min-h-[40px] touch-manipulation ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-950/40 ring-1 ring-emerald-500/30'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="font-bold text-[11px] text-slate-100 flex items-center gap-1.5">
                        <MapPin className={`size-3 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="truncate">{dest.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 pl-4">{dest.address}</div>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider shrink-0 border border-emerald-500/30">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Preference */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            OPTIMIZATION
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setPreference('FASTEST')}
              className={`rounded-lg border p-2 text-left transition-all min-h-[40px] touch-manipulation ${
                preference === 'FASTEST'
                  ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/50'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400'
              }`}
            >
              <div className="font-bold text-[11px] text-white">Fastest Corridor</div>
              <p className="text-[9px] text-slate-500 mt-0.5">Live traffic priority</p>
            </button>

            <button
              type="button"
              onClick={() => setPreference('SHORTEST')}
              className={`rounded-lg border p-2 text-left transition-all min-h-[40px] touch-manipulation ${
                preference === 'SHORTEST'
                  ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/50'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400'
              }`}
            >
              <div className="font-bold text-[11px] text-white">Shortest Distance</div>
              <p className="text-[9px] text-slate-500 mt-0.5">Minimize kilometers</p>
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-[11px] flex items-center gap-2">
            <AlertCircle className="size-3.5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Calculating Route...</span>
            ) : (
              <>
                <RouteIcon className="size-4" />
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
