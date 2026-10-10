/**
 * SwiftCare GeoAgent — Route Deviation Layer Manager
 *
 * Renders visual deviation warning overlays only when authoritative backend analysis
 * reports DEVIATED or CRITICAL_DEVIATION.
 */

import type L from 'leaflet'
import type { MapDeviation } from '../types'
import { createDeviationPopupHtml } from '../popup-content'

export class DeviationLayerManager {
  private layerGroup: L.LayerGroup
  private overlays = new Map<string, L.Layer[]>()

  constructor(layerGroup: L.LayerGroup) {
    this.layerGroup = layerGroup
  }

  public updateDeviations(
    deviations: MapDeviation[],
    vehiclePositions: Map<string, [number, number]>
  ) {
    const LRef = (window as unknown as { L: typeof L }).L
    if (!LRef) return

    const seenIds = new Set<string>()

    for (const dev of deviations) {
      if (dev.status !== 'DEVIATED' && dev.status !== 'CRITICAL_DEVIATION') continue

      const id = dev.vehicleId
      seenIds.add(id)
      const vehiclePos = vehiclePositions.get(id)
      if (!vehiclePos) continue

      // Clean up previous overlay for this vehicle
      const prevLayers = this.overlays.get(id)
      if (prevLayers) {
        prevLayers.forEach((layer) => this.layerGroup.removeLayer(layer))
      }

      const layers: L.Layer[] = []

      // 1. Pulsing deviation warning circle around vehicle
      const circle = LRef.circle(vehiclePos, {
        radius: Math.max(dev.crossTrackDistanceMeters, 40),
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(this.layerGroup)

      const popupContent = createDeviationPopupHtml(dev)
      circle.bindPopup(popupContent)
      layers.push(circle)

      this.overlays.set(id, layers)
    }

    // Clean up cleared deviations
    for (const [id, layers] of this.overlays.entries()) {
      if (!seenIds.has(id)) {
        layers.forEach((l) => this.layerGroup.removeLayer(l))
        this.overlays.delete(id)
      }
    }
  }

  public clear() {
    this.layerGroup.clearLayers()
    this.overlays.clear()
  }
}
