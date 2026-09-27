/**
 * SwiftCare GeoAgent — Centralized Route Semantics & Style Tokens
 *
 * SINGLE SOURCE OF TRUTH across the entire application for:
 * - Map polyline rendering (ControlRoomMap, DriverNavigationMap, RouteLayers)
 * - Map legends & UI badges
 * - Card headers, status pills, and comparison panels
 *
 * STRICT SEMANTIC DEFINITIONS:
 * 1. 🔵 BLUE = "Planned / Active Corridor"
 *    The primary route/corridor currently being used or planned for the emergency vehicle.
 *    Operational route from vehicle toward hospital/destination.
 *
 * 2. 🟣 PURPLE = "Recommended Alternative"
 *    Secondary route suggested by the AI/routing system when the active corridor has congestion,
 *    an incident, closure, or delay. ONLY represents the alternative/detour route.
 *    NEVER used for the active/planned route.
 *
 * 3. ⚪ GRAY = "Other Alternative Routes"
 *    Secondary viable detour routes evaluated but not currently ranked #1.
 *
 * 4. 🔴 RED = "Road Hazard / Incident"
 *    Accidents, road closures, construction, or congestion bursts.
 *
 * 5. 🟠 ORANGE = "Actual GPS Trajectory"
 *    Physical telemetry breadcrumbs from vehicle GPS fixes.
 */

export interface RouteSemanticDefinition {
  id: string
  color: string
  darkColor: string
  label: string
  shortLabel: string
  description: string
  badgeClass: string
  dotClass: string
  borderClass: string
  textClass: string
  weight?: number
  dashArray?: string
  opacity?: number
}

export const ROUTE_SEMANTICS = {
  activeCorridor: {
    id: 'active_corridor',
    color: '#2563eb', // Blue-600
    darkColor: '#3b82f6', // Blue-500
    label: 'Planned / Active Corridor',
    shortLabel: 'Active Corridor',
    description: 'Vehicle currently using this corridor',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-600 dark:bg-blue-500',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    weight: 6,
    dashArray: undefined,
    opacity: 0.95,
  },
  recommendedAlternative: {
    id: 'recommended_alternative',
    color: '#8b5cf6', // Violet/Purple-500
    darkColor: '#a78bfa', // Purple-400
    label: 'Recommended Alternative',
    shortLabel: 'Detour Bypass',
    description: 'AI/routing suggested detour around hazards',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    dotClass: 'bg-purple-600 dark:bg-purple-400',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-600 dark:text-purple-400',
    weight: 5,
    dashArray: '6, 6',
    opacity: 0.95,
  },
  otherAlternative: {
    id: 'other_alternative',
    color: '#64748b', // Slate Gray-500
    darkColor: '#94a3b8', // Slate-400
    label: 'Other Alternative Routes',
    shortLabel: 'Secondary Alt',
    description: 'Secondary possible route',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    dotClass: 'bg-slate-500',
    borderClass: 'border-slate-400',
    textClass: 'text-slate-600 dark:text-slate-400',
    weight: 4,
    dashArray: '4, 6',
    opacity: 0.75,
  },
  incident: {
    id: 'incident',
    color: '#ef4444', // Red-500
    darkColor: '#f87171', // Red-400
    label: 'Road Hazard / Incident',
    shortLabel: 'Hazard',
    description: 'Road accident or blocked section',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
    dotClass: 'bg-red-500',
    borderClass: 'border-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
  gpsTrajectory: {
    id: 'gps_trajectory',
    color: '#f97316', // Orange-500
    darkColor: '#fb923c', // Orange-400
    label: 'Actual GPS Trajectory',
    shortLabel: 'GPS Breadcrumbs',
    description: 'Actual vehicle movement',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    dotClass: 'bg-orange-500',
    borderClass: 'border-orange-500',
    textClass: 'text-orange-600 dark:text-orange-400',
    weight: 3,
    dashArray: '3, 6',
    opacity: 0.85,
  },
} as const

/**
 * Deterministically resolves route semantics from a Route record
 * Eliminates any possibility of confusing active corridor with alternatives
 */
export function getRouteSemanticStyle(route: {
  routeType?: string
  status?: string
  isRecommended?: boolean
}): RouteSemanticDefinition {
  const isAlternative =
    route.routeType === 'ALTERNATIVE' ||
    (route.routeType as string) === 'RECOMMENDED' ||
    (route.routeType as string) === 'DETOUR'

  if (isAlternative) {
    if (route.isRecommended || (route.routeType as string) === 'RECOMMENDED') {
      return ROUTE_SEMANTICS.recommendedAlternative
    }
    return ROUTE_SEMANTICS.otherAlternative
  }

  // Otherwise, strictly Planned or Active Corridor
  return ROUTE_SEMANTICS.activeCorridor
}
