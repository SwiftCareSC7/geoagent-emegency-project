'use client'

import React from 'react'
import type { ManeuverType } from '@/lib/navigation/types'
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  RotateCcw,
  GitMerge,
  GitFork,
  Compass,
  MapPin
} from 'lucide-react'

interface ManeuverIconProps {
  maneuver?: ManeuverType | string
  className?: string
}

export function ManeuverIcon({ maneuver, className = 'size-6 text-white' }: ManeuverIconProps) {
  switch (maneuver) {
    case 'TURN_LEFT':
      return <CornerUpLeft className={className} />
    case 'TURN_RIGHT':
      return <CornerUpRight className={className} />
    case 'SLIGHT_LEFT':
    case 'KEEP_LEFT':
      return <ArrowUpLeft className={className} />
    case 'SLIGHT_RIGHT':
    case 'KEEP_RIGHT':
      return <ArrowUpRight className={className} />
    case 'SHARP_LEFT':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7 10 2 15 7 20" />
          <path d="M22 4v7a4 4 0 0 1-4 4H2" />
        </svg>
      )
    case 'SHARP_RIGHT':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 10 22 15 17 20" />
          <path d="M2 4v7a4 4 0 0 0 4 4h16" />
        </svg>
      )
    case 'U_TURN':
      return <RotateCcw className={className} />
    case 'MERGE':
      return <GitMerge className={className} />
    case 'FORK_LEFT':
    case 'FORK_RIGHT':
      return <GitFork className={className} />
    case 'ROUNDABOUT':
    case 'EXIT_ROUNDABOUT':
      return <Compass className={className} />
    case 'ARRIVE':
      return <MapPin className={className} />
    case 'DEPART':
    case 'STRAIGHT':
    case 'CONTINUE':
    default:
      return <ArrowUp className={className} />
  }
}

/**
 * Returns raw inline SVG string suitable for Leaflet L.divIcon HTML strings
 */
export function getManeuverSvgString(maneuver?: ManeuverType | string): string {
  switch (maneuver) {
    case 'TURN_LEFT':
    case 'SLIGHT_LEFT':
      return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>`
    case 'TURN_RIGHT':
    case 'SLIGHT_RIGHT':
      return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>`
    case 'U_TURN':
      return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`
    case 'ARRIVE':
      return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
    case 'DEPART':
    case 'STRAIGHT':
    case 'CONTINUE':
    default:
      return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`
  }
}
