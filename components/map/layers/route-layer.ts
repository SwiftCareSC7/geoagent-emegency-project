/**
 * SwiftCare GeoAgent — Route Layer Manager
 *
 * Renders actual GeoJSON LineStrings from backend Route documents.
 * Distinguishes Planned, Active, and Alternative routes without fabricating geometry.
 */

import type L from 'leaflet'
import type { MapRoute } from '../types'
import { toLatLng, toLatLngArray } from '../types'
import { createRoutePopupHtml } from '../popup-content'

export class RouteLayerManager {
  private layerGroup: L.LayerGroup
  private polylines = new Map<string, L.Polyline>()
  private endpointMarkers = new Map<string, L.Marker[]>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  /** Update all rendered routes */
  public updateRoutes(
    routes: MapRoute[],
    selectedRouteId: string | null = null,
    onSelectRoute?: (routeId: string) => void
  ) {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    const seenIds = new Set<string>()

    for (const route of routes) {
      if (!route.geometry?.coordinates || route.geometry.coordinates.length < 2) continue

      const id = route.routeId
      seenIds.add(id)
      const latLngs = toLatLngArray(route.geometry.coordinates)
      const isSelected = selectedRouteId === id || route.status === 'ACTIVE'

      // Route styling
      let color = '#3b82f6' // Blue (Planned / Leg 1)
      let weight = isSelected ? 6 : 4
      let opacity = isSelected ? 0.95 : 0.65
      let dashArray: string | undefined = undefined

      if (route.routeType === 'CURRENT' || route.status === 'ACTIVE') {
        color = '#10b981' // Emerald (Active)
        weight = isSelected ? 7 : 5
        opacity = 0.95
      } else if (route.routeType === 'ALTERNATIVE') {
        color = '#06b6d4' // Cyan (Alternative)
        dashArray = '6, 6'
        weight = 5
        opacity = 0.85
      }

      const popupContent = createRoutePopupHtml(route)

      const existing = this.polylines.get(id)
      if (existing) {
        existing.setLatLngs(latLngs)
        existing.setStyle({ color, weight, opacity, dashArray })
        existing.setPopupContent(popupContent)
      } else {
        const polyline = LRef.polyline(latLngs, {
          color,
          weight,
          opacity,
          dashArray,
          lineJoin: 'round',
          lineCap: 'round',
        })

        polyline.bindPopup(popupContent)

        if (onSelectRoute) {
          polyline.on('click', () => onSelectRoute(route.routeId))
        }

        polyline.addTo(this.layerGroup)
        this.polylines.set(id, polyline)

        // Add origin, emergency scene & destination pin markers for selected / active route
        const markers: L.Marker[] = []
        if (route.origin?.coordinates) {
          const originIcon = LRef.divIcon({
            className: 'swiftcare-route-origin',
            html: `
              <div style="background:#2563eb;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid white;font-size:12px;">
                🚩
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })
          const origMarker = LRef.marker(toLatLng(route.origin.coordinates), { icon: originIcon }).addTo(
            this.layerGroup
          )
          origMarker.bindPopup(`<b>Dispatch Origin</b><br>Route: ${route.routeId}`)
          markers.push(origMarker)
        }

        // Emergency Scene intermediate marker if available
        if (route.emergencyLocation?.coordinates) {
          const emergIcon = LRef.divIcon({
            className: 'swiftcare-route-emerg',
            html: `
              <div style="background:#dc2626;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(220,38,38,0.5);border:2px solid white;font-size:13px;">
                🚨
              </div>
            `,
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
            html: `
              <div style="background:#10b981;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid white;font-size:14px;">
                🏥
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          const destMarker = LRef.marker(toLatLng(route.destination.coordinates), { icon: destIcon }).addTo(
            this.layerGroup
          )
          destMarker.bindPopup(`<b>Destination Hospital</b><br>Target: ${route.routeId}`)
          markers.push(destMarker)
        }

        this.endpointMarkers.set(id, markers)
      }
    }

    // Clean up removed routes
    for (const [id, polyline] of this.polylines.entries()) {
      if (!seenIds.has(id)) {
        this.layerGroup.removeLayer(polyline)
        this.polylines.delete(id)
        const ep = this.endpointMarkers.get(id)
        if (ep) {
          ep.forEach((m) => this.layerGroup.removeLayer(m))
          this.endpointMarkers.delete(id)
        }
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
    this.endpointMarkers.clear()
  }
}
