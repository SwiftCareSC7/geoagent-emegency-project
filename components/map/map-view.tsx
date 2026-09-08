'use client'

/**
 * SwiftCare GeoAgent — Core Map Viewport Component
 *
 * Instantiates and maintains a stable Leaflet map instance across React rerenders.
 * Provides client-safe tile layers, layer groups, and responsive viewport sizing.
 */

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import type L from 'leaflet'
import type { MapProviderHealth, TileLayerProvider } from './types'

export interface MapViewHandle {
  getMap: () => L.Map | null
  getLayerGroup: (name: string) => L.LayerGroup | null
  fitBounds: (bounds: L.LatLngBounds, options?: L.FitBoundsOptions) => void
  setView: (center: [number, number], zoom: number) => void
  setTileLayer: (provider: TileLayerProvider) => void
  toggleLayer: (name: string, visible: boolean) => void
  invalidateSize: () => void
}

interface MapViewProps {
  initialCenter?: [number, number] // [lat, lng]
  initialZoom?: number
  height?: string
  className?: string
  onMapReady?: () => void
  onBasemapHealthChange?: (status: MapProviderHealth, message?: string) => void
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    initialCenter = [12.9716, 77.5946], // Default center: Bengaluru
    initialZoom = 13,
    height = '100%',
    className = '',
    onMapReady,
    onBasemapHealthChange,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayersRef = useRef<{ [key in TileLayerProvider]?: L.TileLayer }>({})
  const activeTileLayerRef = useRef<TileLayerProvider>('carto_dark')
  const layerGroupsRef = useRef<Map<string, L.LayerGroup>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize Map
  useEffect(() => {
    let isMounted = true

    async function init() {
      if (!containerRef.current || mapInstanceRef.current) return

      // 1. Ensure Leaflet stylesheet is injected
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // 2. Dynamic import of Leaflet
      const L = (await import('leaflet')).default
      // Expose to window for layer managers
      ;(window as unknown as { L: typeof L }).L = L

      if (!isMounted || !containerRef.current) return

      // 3. Create Map instance
      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(map)
      L.control
        .attribution({ position: 'bottomright', prefix: '&copy; Leaflet & CARTO' })
        .addTo(map)

      // 4. Create Tile Layers with CARTO API Key authentication
      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim()
      const cartoDarkUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'

      if (onBasemapHealthChange) {
        onBasemapHealthChange(
          cartoKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          cartoKey ? 'CARTO authenticated tile layer active' : 'CARTO API key not configured'
        )
      }

      const darkTiles = L.tileLayer(cartoDarkUrl, {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      })

      darkTiles.on('tileerror', () => {
        if (onBasemapHealthChange) {
          onBasemapHealthChange('DEGRADED', 'Map tiles encountered loading errors')
        }
      })

      const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      })

      const satelliteTiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; ESRI, Maxar, Earthstar Geographics',
        }
      )

      tileLayersRef.current = {
        carto_dark: darkTiles,
        osm: osmTiles,
        esri_satellite: satelliteTiles,
      }

      darkTiles.addTo(map)

      // 5. Create Standard Layer Groups
      const groupNames = ['routes', 'trajectories', 'incidents', 'deviations', 'emergencies', 'vehicles', 'v2xSignals']
      for (const name of groupNames) {
        const group = L.layerGroup().addTo(map)
        layerGroupsRef.current.set(name, group)
      }

      mapInstanceRef.current = map
      setMapLoaded(true)

      // Handle resize
      setTimeout(() => {
        if (map && !map.getContainer().offsetParent) return
        map.invalidateSize()
      }, 100)

      if (onMapReady) onMapReady()
    }

    init()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Expose Imperative Handle
  useImperativeHandle(
    ref,
    () => ({
      getMap: () => mapInstanceRef.current,
      getLayerGroup: (name: string) => layerGroupsRef.current.get(name) || null,
      fitBounds: (bounds: L.LatLngBounds, options?: L.FitBoundsOptions) => {
        if (mapInstanceRef.current && bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 16,
            animate: true,
            duration: 0.8,
            ...options,
          })
        }
      },
      setView: (center: [number, number], zoom: number) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(center, zoom, { animate: true, duration: 0.6 })
        }
      },
      setTileLayer: (provider: TileLayerProvider) => {
        const map = mapInstanceRef.current
        if (!map) return
        const current = tileLayersRef.current[activeTileLayerRef.current]
        const target = tileLayersRef.current[provider]
        if (current && map.hasLayer(current)) {
          map.removeLayer(current)
        }
        if (target) {
          target.addTo(map)
          activeTileLayerRef.current = provider
        }
      },
      toggleLayer: (name: string, visible: boolean) => {
        const map = mapInstanceRef.current
        const group = layerGroupsRef.current.get(name)
        if (!map || !group) return
        if (visible && !map.hasLayer(group)) {
          map.addLayer(group)
        } else if (!visible && map.hasLayer(group)) {
          map.removeLayer(group)
        }
      },
      invalidateSize: () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      },
    }),
    [mapLoaded]
  )

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-slate-950 ${className}`} style={{ height }}>
      <div ref={containerRef} className="size-full z-0" />
      {!mapLoaded ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-sm z-10 text-slate-300">
          <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-mono">Initializing Spatial Tiles...</span>
        </div>
      ) : null}
    </div>
  )
})
