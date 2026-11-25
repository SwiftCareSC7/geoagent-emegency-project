/**
 * SwiftCare GeoAgent — Route Layer Manager
 *
 * Renders actual road-constrained GeoJSON LineStrings:
 * - Solid Blue (#2563eb with #1e3a8a casing) = Planned / Active Corridor
 * - Dashed Purple (#8b5cf6 with white halo) = GeoAgent Recommended Bypass Route
 * - Dashed Slate (#64748b) = Secondary Candidate Route
 */

import type L from 'leaflet'
import type { MapRoute } from '../types'
import { toLatLng, toLatLngArray } from '../types'
import { createRoutePopupHtml } from '../popup-content'
import { getRouteSemanticStyle } from '@/lib/routing-constants'

export class RouteLayerManager {
  private layerGroup: L.LayerGroup
  private polylines = new Map<string, L.Polyline>()
  private casingPolylines = new Map<string, L.Polyline>()
  private endpointMarkers = new Map<string, L.Marker[]>()
  private routeDecorations = new Map<string, L.Marker[]>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const y = Math.sin(((lng2 - lng1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lng2 - lng1) * Math.PI) / 180)
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  }

  private clearDecorations(id: string) {
    const dec = this.routeDecorations.get(id)
    if (dec) {
      dec.forEach((m) => this.layerGroup.removeLayer(m))
      this.routeDecorations.delete(id)
    }
    const ep = this.endpointMarkers.get(id)
    if (ep) {
      ep.forEach((m) => this.layerGroup.removeLayer(m))
      this.endpointMarkers.delete(id)
    }
  }

  /** Update all rendered routes (Planned Blue drawn first, Recommended Purple drawn cleanly on top) */
  public updateRoutes(
    routes: MapRoute[],
    selectedRouteId: string | null = null,
    onSelectRoute?: (routeId: string) => void
  ) {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    // Rebuild layer order cleanly so Planned Blue has crisp casing and Recommended Purple sits cleanly above
    this.clear()

    // Draw Planned/Active first, then Secondary, then Recommended Purple on top
    const drawOrder = [...routes].sort((a, b) => {
      const rank = (r: MapRoute) => (r.isRecommended ? 2 : r.routeType === 'ALTERNATIVE' ? 1 : 0)
      return rank(a) - rank(b)
    })

    let endpointsPlaced = false

    for (const route of drawOrder) {
      if (!route.geometry?.coordinates || route.geometry.coordinates.length < 2) continue

      const id = route.routeId
      const coords = route.geometry.coordinates
      const latLngs = toLatLngArray(coords)
      const isPlannedPrimary = route.routeType !== 'ALTERNATIVE'
      const isRecommended = Boolean(route.isRecommended && route.routeType === 'ALTERNATIVE')
      const isFocused = selectedRouteId ? selectedRouteId === id : isPlannedPrimary || isRecommended

      const style = getRouteSemanticStyle(route)
      const color = style.color
      const dashArray = isRecommended ? '8, 7' : style.dashArray
      const weight = isPlannedPrimary ? (isFocused ? 6 : 5) : isRecommended ? 5 : 4
      const opacity = isFocused ? 0.98 : 0.8

      // 1. Casing / Halo polyline for crisp Google-Maps-grade road contrast
      const casingColor = isPlannedPrimary ? '#1e3a8a' : isRecommended ? '#ffffff' : '#0f172a'
      const casingWeight = weight + 3
      const casingOpacity = isPlannedPrimary ? 0.85 : isRecommended ? 0.9 : 0.45

      const casing = LRef.polyline(latLngs, {
        color: casingColor,
        weight: casingWeight,
        opacity: casingOpacity,
        lineJoin: 'round',
        lineCap: 'round',
        interactive: false,
      }).addTo(this.layerGroup)
      this.casingPolylines.set(id, casing)

      // 2. Main semantic route polyline
      const popupContent = createRoutePopupHtml(route)
      const polyline = LRef.polyline(latLngs, {
        color,
        weight,
        opacity,
        dashArray,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(this.layerGroup)

      polyline.bindPopup(popupContent)
      if (onSelectRoute) {
        polyline.on('click', () => onSelectRoute(route.routeId))
      }
      this.polylines.set(id, polyline)

      // 3. Place Origin / Emergency Scene / Hospital markers ONCE (avoiding duplicate overlapping icons)
      if (!endpointsPlaced && isPlannedPrimary) {
        endpointsPlaced = true
        const markers: L.Marker[] = []

        if (route.origin?.coordinates) {
          const originIcon = LRef.divIcon({
            className: 'swiftcare-route-origin',
            html: `<div style="background:#2563eb;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.45);border:2px solid #fff;font-size:12px;">🚩</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })
          const origMarker = LRef.marker(toLatLng(route.origin.coordinates), { icon: originIcon }).addTo(this.layerGroup)
          origMarker.bindPopup(`<b>Dispatch Origin</b><br>Planned Corridor: ${route.routeId}`)
          markers.push(origMarker)
        }

        if (route.emergencyLocation?.coordinates) {
          const emergIcon = LRef.divIcon({
            className: 'swiftcare-route-emerg',
            html: `<div style="background:#dc2626;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(220,38,38,0.55);border:2px solid #fff;font-size:13px;">🚨</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          const emergMarker = LRef.marker(toLatLng(route.emergencyLocation.coordinates), { icon: emergIcon }).addTo(
            this.layerGroup
          )
          emergMarker.bindPopup(`<b>Emergency Incident Scene</b><br>Mission: ${route.emergencyId}`)
          markers.push(emergMarker)
        }

        if (route.destination?.coordinates) {
          const destIcon = LRef.divIcon({
            className: 'swiftcare-route-dest',
            html: `<div style="background:#059669;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);border:2px solid #fff;font-size:14px;">🏥</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          const destMarker = LRef.marker(toLatLng(route.destination.coordinates), { icon: destIcon }).addTo(
            this.layerGroup
          )
          destMarker.bindPopup(`<b>Receiving Hospital</b><br>Corridor: ${route.routeId}`)
          markers.push(destMarker)
        }

        this.endpointMarkers.set(id, markers)
      }

      // 4. Clean directional chevrons & concise corridor callout pill (zero cluttering fake TURN 1..4 boxes)
      if ((isPlannedPrimary || isRecommended) && coords.length > 6) {
        const decorations: L.Marker[] = []
        const chevronCount = 4
        const interval = Math.max(4, Math.floor(coords.length / (chevronCount + 1)))

        for (let i = interval; i < coords.length - 3; i += interval) {
          const p1 = coords[i - 1]
          const p2 = coords[i]
          const p3 = coords[i + 1]
          if (!p1 || !p2 || !p3) continue
          const bearing = this.calculateBearing(p1[1], p1[0], p3[1], p3[0])
          const fill = isPlannedPrimary ? '#ffffff' : '#7c3aed'
          const halo = isPlannedPrimary ? '#1d4ed8' : '#ffffff'

          const chevronIcon = LRef.divIcon({
            className: 'route-map-chevron',
            html: `<div style="transform:rotate(${Math.round(bearing)}deg);display:flex;align-items:center;justify-content:center;width:16px;height:16px;pointer-events:none;"><svg viewBox="0 0 24 24" width="12" height="12" fill="${fill}" stroke="${halo}" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
          const cMarker = LRef.marker([p2[1], p2[0]], { icon: chevronIcon, interactive: false }).addTo(this.layerGroup)
          decorations.push(cMarker)
        }

        // Mid-corridor label pill so Planned vs GeoAgent Recommended are unmistakable on the map
        const midIdx = Math.floor(coords.length * (isRecommended ? 0.52 : 0.36))
        const midPt = coords[midIdx]
        if (midPt) {
          const mins = Math.max(1, Math.round((route.durationSeconds || 600) / 60))
          const pillBg = isPlannedPrimary ? '#1d4ed8' : '#7c3aed'
          const pillText = isPlannedPrimary ? `Planned · ${mins} min` : `Recommended · ${mins} min`
          const pillIcon = LRef.divIcon({
            className: 'route-corridor-label-pill',
            html: `<div style="background:${pillBg};color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;border:1.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);white-space:nowrap;letter-spacing:0.01em;">${pillText}</div>`,
            iconSize: [120, 22],
            iconAnchor: [60, 11],
          })
          const labelMarker = LRef.marker([midPt[1], midPt[0]], { icon: pillIcon })
            .bindPopup(popupContent)
            .addTo(this.layerGroup)
          decorations.push(labelMarker)
        }

        this.routeDecorations.set(id, decorations)
      }
    }
  }

  /** Get bounds encompassing all rendered routes */
  public getBounds(): L.LatLngBounds | null {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef || this.polylines.size === 0) return null

    let combinedBounds: L.LatLngBounds | null = null
    for (const polyline of this.polylines.values()) {
      const b = polyline.getBounds()
      if (!combinedBounds) {
        combinedBounds = LRef.latLngBounds(b.getSouthWest(), b.getNorthEast())
      } else {
        combinedBounds.extend(b)
      }
    }
    return combinedBounds
  }

  /** Clear all routes */
  public clear() {
    this.layerGroup.clearLayers()
    this.polylines.clear()
    this.casingPolylines.clear()
    this.endpointMarkers.clear()
    this.routeDecorations.clear()
  }
}
