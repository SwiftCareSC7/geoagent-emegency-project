/**
 * SwiftCare GeoAgent — Trajectory Layer Manager
 *
 * Renders bounded recent GPS trajectory breadcrumb trails from backend Trajectory records.
 * Does not extrapolate or fabricate GPS points.
 */

import type L from 'leaflet'
import type { MapTrajectory } from '../types'
import { toLatLng } from '../types'

export class TrajectoryLayerManager {
  private layerGroup: L.LayerGroup
  private polylines = new Map<string, L.Polyline>()
  private breadcrumbs = new Map<string, L.CircleMarker[]>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  public updateTrajectories(trajectories: MapTrajectory[]) {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    const seenIds = new Set<string>()

    for (const traj of trajectories) {
      if (!traj.points || traj.points.length < 2) continue

      const id = traj.vehicleId
      seenIds.add(id)
      const latLngs = traj.points.map((p) => toLatLng(p.coordinates))

      // 1. Trail polyline
      const existingLine = this.polylines.get(id)
      if (existingLine) {
        existingLine.setLatLngs(latLngs)
      } else {
        const polyline = LRef.polyline(latLngs, {
          color: '#06b6d4',
          weight: 3,
          opacity: 0.75,
          dashArray: '3, 4',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(this.layerGroup)
        polyline.bindPopup(`<b>Actual GPS Breadcrumb Trail</b><br>Vehicle: ${traj.vehicleId}<br>Fixes: ${traj.points.length}`)
        this.polylines.set(id, polyline)
      }

      // 2. Breadcrumb dots (capped to last 15 points for performance)
      const existingDots = this.breadcrumbs.get(id)
      if (existingDots) {
        existingDots.forEach((dot) => this.layerGroup.removeLayer(dot))
      }

      const dots: L.CircleMarker[] = []
      const recentPoints = traj.points.slice(-15)
      for (const pt of recentPoints) {
        const dot = LRef.circleMarker(toLatLng(pt.coordinates), {
          radius: 3.5,
          color: '#0891b2',
          fillColor: '#22d3ee',
          fillOpacity: 0.8,
          weight: 1,
        }).addTo(this.layerGroup)

        dot.bindPopup(`
          <div style="font-size:11px;font-family:monospace;">
            <b>GPS Fix</b><br>
            Speed: ${Math.round(pt.speed)} km/h<br>
            Time: ${new Date(pt.timestamp).toLocaleTimeString()}
          </div>
        `)
        dots.push(dot)
      }
      this.breadcrumbs.set(id, dots)
    }

    // Clean up removed trajectories
    for (const [id, polyline] of this.polylines.entries()) {
      if (!seenIds.has(id)) {
        this.layerGroup.removeLayer(polyline)
        this.polylines.delete(id)
        const dots = this.breadcrumbs.get(id)
        if (dots) {
          dots.forEach((d) => this.layerGroup.removeLayer(d))
          this.breadcrumbs.delete(id)
        }
      }
    }
  }

  public clear() {
    this.layerGroup.clearLayers()
    this.polylines.clear()
    this.breadcrumbs.clear()
  }
}
