'use client'

/**
 * SwiftCare GeoAgent — Core Map Viewport Component
 *
 * Instantiates and maintains a stable Leaflet map instance across React rerenders.
 * Provides client-safe tile layers, layer groups, and responsive viewport sizing.
 */

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { useTheme } from 'next-themes'
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
  const { resolvedTheme } = useTheme()
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
        .attribution({
          position: 'bottomright',
          prefix:
            '<span class="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold text-muted-foreground bg-background/80 backdrop-blur-xs border border-border/50">SwiftCare GeoAgent</span>',
        })
        .addTo(map)

      // 4. Create High-Definition Tile Layers (Google Maps, CARTO Retina, OSM, ESRI)
      const googleStreets = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps',
      })

      const googleTraffic = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps &amp; Traffic',
      })

      const googleHybrid = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps Imagery',
      })

      const googleSatellite = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps Satellite',
      })

      const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      })

      const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      })

      const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      })

      const satelliteTiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; ESRI World Imagery',
        }
      )

      if (onBasemapHealthChange) {
        onBasemapHealthChange('AVAILABLE', 'High-definition basemap layers active')
      }

      tileLayersRef.current = {
        google_streets: googleStreets,
        google_traffic: googleTraffic,
        google_hybrid: googleHybrid,
        google_satellite: googleSatellite,
        carto_dark: darkTiles,
        carto_light: lightTiles,
        osm: osmTiles,
        esri_satellite: satelliteTiles,
      }

      const isLightMode = resolvedTheme === 'light'
      const initialTileKey: TileLayerProvider = isLightMode ? 'google_streets' : 'carto_dark'
      const initialLayer = tileLayersRef.current[initialTileKey] || darkTiles
      initialLayer.addTo(map)
      activeTileLayerRef.current = initialTileKey

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
          if (typeof (target as any).bringToBack === 'function') {
            ;(target as any).bringToBack()
          }
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

  // Dynamically synchronize basemap with global light / dark theme
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    const currentProvider = activeTileLayerRef.current
    // Only auto-switch if active tile is carto_dark or carto_light
    if (currentProvider === 'carto_dark' || currentProvider === 'carto_light') {
      const targetProvider: TileLayerProvider = resolvedTheme === 'light' ? 'carto_light' : 'carto_dark'
      if (currentProvider !== targetProvider) {
        const currentLayer = tileLayersRef.current[currentProvider]
        const targetLayer = tileLayersRef.current[targetProvider]
        if (currentLayer && map.hasLayer(currentLayer)) {
          map.removeLayer(currentLayer)
        }
        if (targetLayer) {
          targetLayer.addTo(map)
          activeTileLayerRef.current = targetProvider
        }
      }
    }
  }, [resolvedTheme])

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-muted/40 dark:bg-slate-950 ${className}`} style={{ height }}>
      <div ref={containerRef} className="size-full z-0" />
      {!mapLoaded ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 dark:bg-slate-950/80 backdrop-blur-sm z-10 text-foreground dark:text-slate-300">
          <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-mono">Initializing Spatial Tiles...</span>
        </div>
      ) : null}
    </div>
  )
})
