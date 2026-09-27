'use client'

/**
 * SwiftCare GeoAgent — Global Map & Traffic Configuration Store
 *
 * Enforces GLOBAL GOOGLE MAPS + REAL-TIME TRAFFIC LAYER AS DEFAULT:
 * - Basemap: Google Maps (default)
 * - Live Traffic: ON (default: true)
 * - Persisted in localStorage so user preferences are remembered, but default is always ON.
 */

import { useState, useEffect, useCallback } from 'react'

export interface GlobalMapSettings {
  defaultProvider: 'google_maps' | 'leaflet_fallback'
  trafficLayerEnabled: boolean
  autoFollowAmbulance: boolean
  showCorridorIncidents: boolean
  showAlternativeRoutes: boolean
  trafficDataSource: 'GOOGLE_LIVE' | 'SIMULATED'
}

const SETTINGS_KEY = 'swiftcare_global_map_settings_v1'

export const DEFAULT_MAP_SETTINGS: GlobalMapSettings = {
  defaultProvider: 'google_maps',
  trafficLayerEnabled: true, // MANDATORY: Live traffic is ENABLED by default across all maps
  autoFollowAmbulance: true,
  showCorridorIncidents: true,
  showAlternativeRoutes: true,
  trafficDataSource: 'GOOGLE_LIVE',
}

export function getStoredMapSettings(): GlobalMapSettings {
  if (typeof window === 'undefined') return DEFAULT_MAP_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_MAP_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_MAP_SETTINGS,
      ...parsed,
      // Always guarantee trafficLayerEnabled is boolean and defaults true if undefined
      trafficLayerEnabled: typeof parsed.trafficLayerEnabled === 'boolean' ? parsed.trafficLayerEnabled : true,
      defaultProvider: parsed.defaultProvider || 'google_maps',
    }
  } catch {
    return DEFAULT_MAP_SETTINGS
  }
}

export function saveStoredMapSettings(settings: Partial<GlobalMapSettings>): GlobalMapSettings {
  if (typeof window === 'undefined') return DEFAULT_MAP_SETTINGS
  try {
    const current = getStoredMapSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('swiftcare:map_settings_changed', { detail: updated }))
    return updated
  } catch {
    return DEFAULT_MAP_SETTINGS
  }
}

export function useMapSettings() {
  const [settings, setSettings] = useState<GlobalMapSettings>(DEFAULT_MAP_SETTINGS)

  useEffect(() => {
    setSettings(getStoredMapSettings())

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<GlobalMapSettings>
      if (customEvent.detail) {
        setSettings(customEvent.detail)
      } else {
        setSettings(getStoredMapSettings())
      }
    }

    window.addEventListener('swiftcare:map_settings_changed', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('swiftcare:map_settings_changed', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const updateSettings = useCallback((newSettings: Partial<GlobalMapSettings>) => {
    const updated = saveStoredMapSettings(newSettings)
    setSettings(updated)
  }, [])

  const toggleTraffic = useCallback(() => {
    updateSettings({ trafficLayerEnabled: !settings.trafficLayerEnabled })
  }, [settings.trafficLayerEnabled, updateSettings])

  const toggleProvider = useCallback(() => {
    updateSettings({
      defaultProvider: settings.defaultProvider === 'google_maps' ? 'leaflet_fallback' : 'google_maps',
    })
  }, [settings.defaultProvider, updateSettings])

  return {
    settings,
    updateSettings,
    toggleTraffic,
    toggleProvider,
    isTrafficEnabled: settings.trafficLayerEnabled,
    isGoogleMaps: settings.defaultProvider === 'google_maps',
  }
}
