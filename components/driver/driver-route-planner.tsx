'use client'

import React, { useState } from 'react'
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
  Route as RouteIcon
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
  isLoading = false,
  initialEmergencyDestination = null,
  className = ''
}: DriverRoutePlannerProps) {
  // Origin State: 'GPS' or manual landmark
  const [originMode, setOriginMode] = useState<'GPS' | 'MANUAL'>('GPS')
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('lm-koramangala')

  // Destination State: Preselected or hospital from list
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    initialEmergencyDestination?.id || 'hosp-manipal'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Route Preference: FASTEST (Default) or SHORTEST
  const [preference, setPreference] = useState<'FASTEST' | 'SHORTEST'>('FASTEST')

  // Selected Origin Resolution
  const selectedLandmark = BENGALURU_LANDMARKS.find(lm => lm.id === selectedLandmarkId) || BENGALURU_LANDMARKS[0]
  const isGpsActive = originMode === 'GPS' && currentLocation !== null

  const resolvedOriginCoords: [number, number] =
    isGpsActive && currentLocation
      ? currentLocation.coordinates
      : selectedLandmark.coordinates

  const resolvedOriginName =
    isGpsActive
      ? 'Current Device GPS Location'
      : selectedLandmark.name

  // Selected Destination Resolution
  const filteredHospitals = BENGALURU_HOSPITALS.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedHospital =
    BENGALURU_HOSPITALS.find(h => h.id === selectedHospitalId) ||
    initialEmergencyDestination ||
    BENGALURU_HOSPITALS[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onCalculateRoute({
      originCoordinates: resolvedOriginCoords,
      originName: resolvedOriginName,
      destinationCoordinates: selectedHospital.coordinates,
      destinationName: selectedHospital.name,
      destinationHospitalCode: selectedHospital.hospitalCode,
      preference
    })
  }

  return (
    <div className={`rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-7 shadow-2xl text-white backdrop-blur-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
            Emergency Route Engine
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Start Navigation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Select origin, destination hospital, and corridor optimization preference.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* 1. CURRENT LOCATION (ORIGIN) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            1. Origin / Current Location
          </label>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setOriginMode('GPS')
                onRequestGps()
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold transition-all touch-manipulation min-h-[44px] ${
                originMode === 'GPS'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <LocateFixed className="size-4 shrink-0" />
              <span>Use My Location</span>
            </button>

            <button
              type="button"
              onClick={() => setOriginMode('MANUAL')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold transition-all touch-manipulation min-h-[44px] ${
                originMode === 'MANUAL'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Building2 className="size-4 shrink-0" />
              <span>Select Landmark</span>
            </button>
          </div>

          {/* GPS Status / Feedback Box */}
          {originMode === 'GPS' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {currentLocation ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="size-4" />
                    <span>GPS Signal Active</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    [{currentLocation.coordinates[1].toFixed(4)}, {currentLocation.coordinates[0].toFixed(4)}]
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{gpsStatusMessage || 'Location required — click Use My Location to allow GPS'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    If browser GPS is denied or simulated, you can switch to Landmark origin.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Manual Bengaluru Landmarks Dropdown */
            <select
              value={selectedLandmarkId}
              onChange={(e) => setSelectedLandmarkId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
            >
              {BENGALURU_LANDMARKS.map(lm => (
                <option key={lm.id} value={lm.id}>
                  {lm.name} ({lm.area})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. DESTINATION (HOSPITAL / FACILITY) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            2. Destination Emergency Facility
          </label>

          {/* Hospital Search input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Bengaluru hospital (e.g. Manipal, Victoria)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Hospital Selection Cards Grid */}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {filteredHospitals.map(hosp => {
              const isSelected = selectedHospitalId === hosp.id
              return (
                <button
                  key={hosp.id}
                  type="button"
                  onClick={() => setSelectedHospitalId(hosp.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all min-h-[44px] touch-manipulation ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                        <MapPin className={`size-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="truncate">{hosp.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {hosp.address}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. ROUTE PREFERENCE: FASTEST VS SHORTEST */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            3. Route Optimization Preference
          </label>

          <div className="grid grid-cols-2 gap-3">
            {/* FASTEST OPTION */}
            <button
              type="button"
              onClick={() => setPreference('FASTEST')}
              className={`rounded-xl border p-3.5 text-left transition-all min-h-[44px] touch-manipulation ${
                preference === 'FASTEST'
                  ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500'
                  : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="preference"
                  checked={preference === 'FASTEST'}
                  onChange={() => setPreference('FASTEST')}
                  className="accent-emerald-500 size-4"
                />
                <span className="font-bold text-xs text-white">Fastest</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                Optimizes travel time via arterial corridors with live traffic awareness.
              </p>
            </button>

            {/* SHORTEST OPTION */}
            <button
              type="button"
              onClick={() => setPreference('SHORTEST')}
              className={`rounded-xl border p-3.5 text-left transition-all min-h-[44px] touch-manipulation ${
                preference === 'SHORTEST'
                  ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500'
                  : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="preference"
                  checked={preference === 'SHORTEST'}
                  onChange={() => setPreference('SHORTEST')}
                  className="accent-emerald-500 size-4"
                />
                <span className="font-bold text-xs text-white">Shortest</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                Minimizes physical distance travelled, regardless of speed and traffic.
              </p>
            </button>
          </div>
        </div>

        {/* Action Button: CALCULATE ROUTE */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Calculating Optimal Route...</span>
            ) : (
              <>
                <RouteIcon className="size-5" />
                <span>Calculate Route & Start Navigation</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
