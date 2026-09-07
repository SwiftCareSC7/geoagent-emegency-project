'use client'

import type { MapMarker } from '@/lib/mock-data'
import { RealInteractiveMap } from './real-interactive-map'

interface MapPlaceholderProps {
  markers?: MapMarker[]
  showRecommended?: boolean
}

export function MapPlaceholder({ showRecommended = true }: MapPlaceholderProps) {
  return <RealInteractiveMap showRecommended={showRecommended} />
}
