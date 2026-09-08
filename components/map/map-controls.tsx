'use client'

/**
 * SwiftCare GeoAgent — Accessible Map Controls Component
 *
 * Provides floating, minimal, accessible control triggers for:
 * - Zoom in / out
 * - Fit active emergency corridor
 * - Layer visibility toggling
 * - Basemap tile selection
 * - Center reset
 */

import {
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import type { MapLayerVisibility, TileLayerProvider } from './types'

interface MapControlsProps {
  visibility: MapLayerVisibility
  onToggleLayer: (layer: keyof MapLayerVisibility) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitCorridor: () => void
  onResetView: () => void
  activeTile: TileLayerProvider
  onSelectTile: (tile: TileLayerProvider) => void
  hasSelectedEmergency?: boolean
}

export function MapControls({
  visibility,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  onFitCorridor,
  onResetView,
  activeTile,
  onSelectTile,
  hasSelectedEmergency = false,
}: MapControlsProps) {
  const [layersOpen, setLayersOpen] = useState(false)
  const [tilesOpen, setTilesOpen] = useState(false)

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
      {/* Zoom & Fit Group */}
      <div className="flex flex-col rounded-xl border border-slate-700/60 bg-slate-900/90 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="flex size-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="flex size-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Minus className="size-4" />
        </button>
        <div className="my-1 h-px bg-slate-800" />
        <button
          type="button"
          onClick={onFitCorridor}
          disabled={!hasSelectedEmergency}
          aria-label="Fit selected emergency corridor"
          title={hasSelectedEmergency ? 'Focus on selected corridor' : 'Select an emergency first'}
          className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
            hasSelectedEmergency
              ? 'text-cyan-400 hover:bg-slate-800 hover:text-cyan-300'
              : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <Crosshair className="size-4" />
        </button>
        <button
          type="button"
          onClick={onResetView}
          aria-label="Reset to city overview"
          title="Reset to metropolitan overview"
          className="flex size-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {/* Layer Toggles Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setLayersOpen(!layersOpen)
            setTilesOpen(false)
          }}
          aria-label="Toggle map layers"
          aria-expanded={layersOpen}
          className={`flex size-9 items-center justify-center rounded-xl border shadow-lg backdrop-blur-md transition-colors ${
            layersOpen
              ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300'
              : 'border-slate-700/60 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layers className="size-4" />
        </button>

        {layersOpen ? (
          <div className="absolute right-0 top-11 w-48 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md space-y-1">
            <div className="font-bold text-slate-400 text-[11px] pb-1 border-b border-slate-800">
              Layer Controls
            </div>
            {[
              { key: 'vehicles', label: 'Fleet Vehicles (🚑)' },
              { key: 'emergencies', label: 'Emergency Points (🚨)' },
              { key: 'routes', label: 'Routes (Planned / Alt)' },
              { key: 'incidents', label: 'Road Hazards (⚠️)' },
              { key: 'trajectories', label: 'Breadcrumb Trails' },
              { key: 'deviations', label: 'Route Deviations' },
              { key: 'v2xSignals', label: 'V2X Traffic Signals' },
            ].map(({ key, label }) => {
              const active = visibility[key as keyof MapLayerVisibility]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleLayer(key as keyof MapLayerVisibility)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-slate-800 transition-colors"
                >
                  <span>{label}</span>
                  {active ? (
                    <Eye className="size-3.5 text-emerald-400" />
                  ) : (
                    <EyeOff className="size-3.5 text-slate-500" />
                  )}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Basemap Switcher Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setTilesOpen(!tilesOpen)
            setLayersOpen(false)
          }}
          aria-label="Switch map style"
          aria-expanded={tilesOpen}
          className={`flex size-9 items-center justify-center rounded-xl border shadow-lg backdrop-blur-md transition-colors ${
            tilesOpen
              ? 'border-indigo-500 bg-indigo-950/80 text-indigo-300'
              : 'border-slate-700/60 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <MapIcon className="size-4" />
        </button>

        {tilesOpen ? (
          <div className="absolute right-0 top-11 w-40 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2 text-xs text-slate-200 shadow-2xl backdrop-blur-md space-y-1">
            <div className="font-bold text-slate-400 text-[11px] pb-1 border-b border-slate-800">
              Basemap Style
            </div>
            {[
              { id: 'carto_dark', label: 'Dark Mode (Night)' },
              { id: 'osm', label: 'Street Map (OSM)' },
              { id: 'esri_satellite', label: 'ESRI Satellite' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelectTile(id as TileLayerProvider)
                  setTilesOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
                  activeTile === id
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>{label}</span>
                {activeTile === id ? <span className="size-1.5 rounded-full bg-primary" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
