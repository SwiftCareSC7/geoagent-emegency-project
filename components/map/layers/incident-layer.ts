/**
 * SwiftCare GeoAgent — Incident Layer Manager
 *
 * Renders actual road hazard and incident markers from backend Incident records.
 * Uses color-coded severity hierarchy without fabricating incidents.
 */

import type L from 'leaflet'
import type { MapIncident } from '../types'
import { toLatLng } from '../types'
import { createIncidentPopupHtml } from '../popup-content'

export class IncidentLayerManager {
  private layerGroup: L.LayerGroup
  private markers = new Map<string, L.Marker>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  private createIncidentIcon(incident: MapIncident): L.DivIcon {
    const LRef = (window as unknown as { L: typeof L }).L

    const color =
      incident.severity === 'CRITICAL'
        ? '#ef4444'
        : incident.severity === 'HIGH'
        ? '#f97316'
        : incident.severity === 'MEDIUM'
        ? '#f59e0b'
        : '#64748b'

    const html = `
      <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
        ${
          incident.severity === 'CRITICAL'
            ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;" class="animate-ping"></div>`
            : ''
        }
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          font-size: 13px;
        ">
          <span>⚠️</span>
        </div>
      </div>
    `

    return LRef.divIcon({
      className: 'swiftcare-incident-marker',
      html,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17],
    })
  }

  public updateIncidents(incidents: MapIncident[]) {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    const seenIds = new Set<string>()

    for (const inc of incidents) {
      if (!inc.location?.coordinates) continue

      const id = inc.incidentId
      seenIds.add(id)
      const latLng = toLatLng(inc.location.coordinates)
      const icon = this.createIncidentIcon(inc)
      const popupContent = createIncidentPopupHtml(inc)

      const existing = this.markers.get(id)
      if (existing) {
        existing.setLatLng(latLng)
        existing.setIcon(icon)
        existing.setPopupContent(popupContent)
      } else {
        const marker = LRef.marker(latLng, { icon }).addTo(this.layerGroup)
        marker.bindPopup(popupContent)
        this.markers.set(id, marker)
      }
    }

    for (const [id, marker] of this.markers.entries()) {
      if (!seenIds.has(id)) {
        this.layerGroup.removeLayer(marker)
        this.markers.delete(id)
      }
    }
  }

  public clear() {
    this.layerGroup.clearLayers()
    this.markers.clear()
  }
}
