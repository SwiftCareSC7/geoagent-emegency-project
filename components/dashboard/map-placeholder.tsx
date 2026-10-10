'use client'

/**
 * SwiftCare GeoAgent — Map Placeholder Component Wrapper
 *
 * Preserves the component boundary while delegating to the production-grade
 * ControlRoomMap backed by actual MongoDB records and real-time Socket.IO events.
 */

import type { Emergency, Vehicle, Incident } from '@/lib/api/types'
import type { MapMarker } from '@/lib/mock-data'
import { ControlRoomMap } from '@/components/map'

interface MapPlaceholderProps {
  markers?: MapMarker[]
  showRecommended?: boolean
  selectedEmergencyId?: string | null
  onSelectEmergency?: (emergencyId: string) => void
  emergencies?: Emergency[]
  vehicles?: Vehicle[]
  incidents?: Incident[]
  height?: string
  className?: string
}

export function MapPlaceholder({
  showRecommended = true,
  selectedEmergencyId,
  onSelectEmergency,
  emergencies,
  vehicles,
  incidents,
  height = '520px',
  className = '',
}: MapPlaceholderProps) {
  return (
    <ControlRoomMap
      showRecommended={showRecommended}
      selectedEmergencyId={selectedEmergencyId}
      onSelectEmergency={onSelectEmergency}
      initialEmergencies={emergencies}
      initialVehicles={vehicles}
      initialIncidents={incidents}
      height={height}
      className={className}
    />
  )
}
