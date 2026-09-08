/**
 * SwiftCare GeoAgent — Vehicle Layer Manager
 *
 * Manages Leaflet markers for emergency fleet vehicles with:
 * - Dynamic heading orientation
 * - Real-time position updates (setLatLng without marker recreation)
 * - Live/Stale/Offline visual indicators based on actual timestamps
 * - Accessible popups
 */

import type L from 'leaflet'
import type { MapVehicle } from '../types'
import { toLatLng } from '../types'
import { createVehiclePopupHtml } from '../popup-content'

export class VehicleLayerManager {
  private layerGroup: L.LayerGroup
  private markers = new Map<string, L.Marker>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  /** Build custom SVG/HTML divIcon for vehicle */
  private createVehicleIcon(vehicle: MapVehicle, isSelected = false): L.DivIcon {
    const LRef = (window as unknown as { L: typeof L }).L
    const emoji = vehicle.type === 'FIRE_ENGINE' ? '🚒' : vehicle.type === 'POLICE' ? '🚓' : '🚑'
    const heading = typeof vehicle.heading === 'number' ? vehicle.heading : 0

    // Freshness styling
    const ringColor =
      vehicle.freshness === 'LIVE'
        ? '#10b981'
        : vehicle.freshness === 'STALE'
        ? '#f59e0b'
        : '#94a3b8'

    const pulseClass = vehicle.freshness === 'LIVE' ? 'animate-ping' : ''

    const html = `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <!-- Pulsing halo for live fixes -->
        ${
          vehicle.freshness === 'LIVE'
            ? `<div style="position:absolute;inset:2px;border-radius:50%;background:${ringColor};opacity:0.25;" class="${pulseClass}"></div>`
            : ''
        }
        <!-- Marker circle -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0f172a;
          border: ${isSelected ? '3px solid #38bdf8' : `2px solid ${ringColor}`};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          font-size: 16px;
          position: relative;
        ">
          <span>${emoji}</span>
          <!-- Heading direction pointer -->
          ${
            typeof vehicle.heading === 'number'
              ? `<div style="
                  position: absolute;
                  top: -6px;
                  left: 50%;
                  width: 0;
                  height: 0;
                  border-left: 4px solid transparent;
                  border-right: 4px solid transparent;
                  border-bottom: 7px solid ${ringColor};
                  transform: translateX(-50%) rotate(${heading}deg);
                  transform-origin: 50% 22px;
                "></div>`
              : ''
          }
        </div>
        <!-- Unit badge -->
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #f8fafc;
          font-size: 9px;
          font-weight: 700;
          font-family: monospace;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        ">
          ${vehicle.vehicleId}
        </div>
      </div>
    `

    return LRef.divIcon({
      className: 'swiftcare-vehicle-marker',
      html,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })
  }

  /** Synchronize markers with latest vehicle list */
  public updateVehicles(
    vehicles: MapVehicle[],
    selectedVehicleId: string | null = null,
    predictions: Record<string, number> = {},
    onSelectVehicle?: (vehicleId: string) => void
  ) {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    const seenIds = new Set<string>()

    for (const vehicle of vehicles) {
      if (!vehicle.location?.coordinates) continue

      const id = vehicle.vehicleId
      seenIds.add(id)
      const latLng = toLatLng(vehicle.location.coordinates)
      const isSelected = selectedVehicleId === id
      const icon = this.createVehicleIcon(vehicle, isSelected)
      const popupContent = createVehiclePopupHtml(vehicle, predictions[id])

      const existing = this.markers.get(id)
      if (existing) {
        // Update existing marker smoothly without recreating
        existing.setLatLng(latLng)
        existing.setIcon(icon)
        existing.setPopupContent(popupContent)
        existing.setZIndexOffset(isSelected ? 2000 : 1000)
      } else {
        // Create new marker
        const marker = LRef.marker(latLng, {
          icon,
          zIndexOffset: isSelected ? 2000 : 1000,
        })

        marker.bindPopup(popupContent)

        if (onSelectVehicle) {
          marker.on('click', () => onSelectVehicle(vehicle.vehicleId))
        }

        marker.addTo(this.layerGroup)
        this.markers.set(id, marker)
      }
    }

    // Clean up markers no longer in fleet
    for (const [id, marker] of this.markers.entries()) {
      if (!seenIds.has(id)) {
        this.layerGroup.removeLayer(marker)
        this.markers.delete(id)
      }
    }
  }

  /** Focus / pan to a specific vehicle marker */
  public focusVehicle(vehicleId: string, map: L.Map) {
    const marker = this.markers.get(vehicleId)
    if (marker) {
      map.panTo(marker.getLatLng(), { animate: true, duration: 0.6 })
      marker.openPopup()
    }
  }

  /** Clear all markers */
  public clear() {
    this.layerGroup.clearLayers()
    this.markers.clear()
  }
}
