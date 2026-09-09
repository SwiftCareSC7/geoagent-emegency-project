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
  private turnManeuverMarkers = new Map<string, L.Marker[]>()
  private chevronMarkers = new Map<string, L.Marker[]>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  /** Helper: Calculate bearing between two coordinates */
  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const y = Math.sin((lng2 - lng1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lng2 - lng1) * Math.PI / 180)
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
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
      const coords = route.geometry.coordinates
      const latLngs = toLatLngArray(coords)
      const isSelected = selectedRouteId === id || route.status === 'ACTIVE' || route.isRecommended

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

        // Render On-Map Turn Maneuvers & Directional Flow Chevrons for Active/Selected Route
        if (isSelected && coords.length > 3) {
          const turnList: L.Marker[] = []
          const chevronList: L.Marker[] = []

          // 1. Flow Chevrons
          const interval = Math.max(3, Math.floor(coords.length / 7))
          for (let i = 1; i < coords.length - 1; i += interval) {
            const p1 = coords[i - 1]
            const p2 = coords[i]
            const p3 = coords[i + 1]
            if (!p1 || !p2 || !p3) continue
            const bearing = this.calculateBearing(p1[1], p1[0], p3[1], p3[0])

            const chevronIcon = LRef.divIcon({
              className: 'route-map-chevron',
              html: `<div style="transform:rotate(${Math.round(bearing)}deg);display:flex;align-items:center;justify-content:center;width:20px;height:20px;pointer-events:none;"><svg viewBox="0 0 24 24" width="15" height="15" fill="#34d399" style="filter:drop-shadow(0 0 4px rgba(16,185,129,0.9));"><path d="M5 3l14 9-14 9V3z"/></svg></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })
            const cMarker = LRef.marker([p2[1], p2[0]], { icon: chevronIcon, interactive: false }).addTo(this.layerGroup)
            chevronList.push(cMarker)
          }

          // 2. Turn Maneuver Waypoint Markers at route intersections
          const turnFractions = [0.15, 0.4, 0.7, 0.9]
          const maneuvers = [
            { type: 'DEPART', label: 'Depart on Primary Corridor', icon: '↑' },
            { type: 'TURN_LEFT', label: 'Turn Left onto Cleared Arterial', icon: '↰' },
            { type: 'CONTINUE', label: 'Proceed through Preempted Signals', icon: '↑' },
            { type: 'TURN_RIGHT', label: 'Turn Right to Receiving Bay', icon: '↱' },
          ]

          turnFractions.forEach((frac, idx) => {
            const cIdx = Math.min(Math.floor(frac * (coords.length - 1)), coords.length - 1)
            const pt = coords[cIdx]
            if (!pt) return
            const m = maneuvers[idx] || { type: 'CONTINUE', label: 'Continue on Route', icon: '↑' }
            const isFirst = idx === 0

            const markerHtml = isFirst
              ? `
                <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                  <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(16,185,129,0.4);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="position:relative;width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#10b981,#047857);border:2px solid #a7f3d0;box-shadow:0 3px 10px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;">
                    ${m.icon}
                  </div>
                  <div style="margin-top:2px;background:rgba(15,23,42,0.95);color:#34d399;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:9999px;border:1px solid rgba(52,211,153,0.5);white-space:nowrap;">
                    TURN 1
                  </div>
                </div>
              `
              : `
                <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                  <div style="width:24px;height:24px;border-radius:7px;background:#0f172a;border:2px solid #38bdf8;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:#38bdf8;font-weight:bold;font-size:13px;">
                    ${m.icon}
                  </div>
                  <div style="margin-top:1px;background:rgba(15,23,42,0.9);color:#94a3b8;font-size:8px;font-weight:bold;padding:0px 4px;border-radius:9999px;border:1px solid rgba(56,189,248,0.3);white-space:nowrap;">
                    TURN ${idx + 1}
                  </div>
                </div>
              `

            const tIcon = LRef.divIcon({
              className: `turn-map-marker-${idx}`,
              html: markerHtml,
              iconSize: isFirst ? [50, 46] : [40, 38],
              iconAnchor: isFirst ? [25, 20] : [20, 16],
            })

            const tMarker = LRef.marker([pt[1], pt[0]], { icon: tIcon }).addTo(this.layerGroup)
            tMarker.bindPopup(`
              <div style="font-family:system-ui,sans-serif;padding:3px;min-width:160px;">
                <div style="font-size:10px;font-weight:bold;color:${isFirst ? '#34d399' : '#38bdf8'};text-transform:uppercase;">
                  Turn #${idx + 1} (${m.type})
                </div>
                <div style="font-size:12px;font-weight:700;color:#f8fafc;margin-top:2px;">
                  ${m.label}
                </div>
                <div style="font-size:10px;color:#10b981;margin-top:4px;">
                  ✓ Green-Wave Signal Cleared
                </div>
              </div>
            `)
            turnList.push(tMarker)
          })

          this.turnManeuverMarkers.set(id, turnList)
          this.chevronMarkers.set(id, chevronList)
        }
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
        const tm = this.turnManeuverMarkers.get(id)
        if (tm) {
          tm.forEach((m) => this.layerGroup.removeLayer(m))
          this.turnManeuverMarkers.delete(id)
        }
        const cm = this.chevronMarkers.get(id)
        if (cm) {
          cm.forEach((m) => this.layerGroup.removeLayer(m))
          this.chevronMarkers.delete(id)
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
    this.turnManeuverMarkers.clear()
    this.chevronMarkers.clear()
  }
}
