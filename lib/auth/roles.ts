/**
 * SwiftCare GeoAgent — Role Configuration and Navigation Utilities
 *
 * Authoritative role boundaries:
 * - ADMIN: Full systems observability, user administration, and access to all operational dashboards
 * - CONTROL_ROOM: Central emergency dispatching, incident management, and permitted driver views
 * - DRIVER: Confined strictly to assigned vehicle navigation & status reporting
 * - PARAMEDIC: Confined strictly to clinical vitals and pre-hospital triage
 */

import type { UserRole, Workspace, User } from '@/lib/api/types'

export const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string
    description: string
    defaultDashboard: string
    allowedPages: string[]
  }
> = {
  ADMIN: {
    label: 'Systems Administrator',
    description: 'System administration, telemetry, user approvals and complete access',
    defaultDashboard: '/admin',
    allowedPages: ['/admin', '/control-room', '/driver/dashboard', '/paramedic', '/emergencies', '/emergency-lab', '/diff']
  },
  CONTROL_ROOM: {
    label: 'Control Room Dispatcher',
    description: 'Central corridor dispatch, incident management, and vehicle monitoring',
    defaultDashboard: '/control-room',
    allowedPages: ['/control-room', '/driver/dashboard', '/emergencies', '/emergency-lab', '/diff']
  },
  DRIVER: {
    label: 'Ambulance Driver',
    description: 'Emergency vehicle navigation HUD and active route guidance',
    defaultDashboard: '/driver/dashboard',
    allowedPages: ['/driver/dashboard']
  },
  PARAMEDIC: {
    label: 'Field Paramedic Officer',
    description: 'Patient vital signs, triage reporting, and hospital handoff readiness',
    defaultDashboard: '/paramedic',
    allowedPages: ['/paramedic']
  }
}

/**
 * Get primary dashboard destination for an authenticated role
 */
export function getRoleDashboard(role?: UserRole | null): string {
  if (!role) return '/control-room'
  return ROLE_CONFIG[role]?.defaultDashboard || '/control-room'
}

/**
 * Resolve effective permitted workspaces for a user.
 * Honors explicit backend permittedWorkspaces, falling back to authoritative role defaults.
 */
export function getEffectiveWorkspaces(user: User | null): Workspace[] {
  if (!user) return []
  if (user.role === 'ADMIN') return ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC']
  if (user.permittedWorkspaces && Array.isArray(user.permittedWorkspaces) && user.permittedWorkspaces.length > 0) {
    // Ensure the primary role's core workspace is always included
    const set = new Set<Workspace>(user.permittedWorkspaces)
    if (user.role === 'CONTROL_ROOM') set.add('CONTROL_ROOM')
    if (user.role === 'DRIVER') set.add('DRIVER')
    if (user.role === 'PARAMEDIC') set.add('PARAMEDIC')
    return Array.from(set)
  }
  // Role defaults
  if (user.role === 'CONTROL_ROOM') return ['CONTROL_ROOM', 'DRIVER']
  if (user.role === 'DRIVER') return ['DRIVER']
  if (user.role === 'PARAMEDIC') return ['PARAMEDIC']
  return []
}

/**
 * Check if a specific workspace is permitted for a user
 */
export function isWorkspacePermitted(user: User | null, workspace: Workspace): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  const workspaces = getEffectiveWorkspaces(user)
  return workspaces.includes(workspace)
}

/**
 * Check if a route is allowed for a user considering both role and permitted workspaces
 */
export function isRouteAllowedForUser(user: User | null, pathname: string): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true

  // Check role-based allowed pages first
  const config = ROLE_CONFIG[user.role]
  if (config && config.allowedPages.some(allowed => pathname.startsWith(allowed))) {
    return true
  }

  // Check permitted workspaces
  const workspaces = getEffectiveWorkspaces(user)
  for (const ws of workspaces) {
    if (ws === 'ADMIN' && pathname.startsWith('/admin')) return true
    if (ws === 'CONTROL_ROOM' && (pathname.startsWith('/control-room') || pathname.startsWith('/diff') || pathname.startsWith('/emergency-lab') || pathname.startsWith('/emergencies'))) return true
    if (ws === 'DRIVER' && pathname.startsWith('/driver')) return true
    if (ws === 'PARAMEDIC' && pathname.startsWith('/paramedic')) return true
  }

  return false
}

/**
 * Legacy check: Check if a role is permitted to access a given path
 */
export function isRouteAllowedForRole(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false
  if (role === 'ADMIN') return true

  const config = ROLE_CONFIG[role]
  if (!config) return false

  return config.allowedPages.some(allowed => pathname.startsWith(allowed))
}

export interface NavItemConfig {
  href: string
  label: string
  mobileLabel: string
  requiredWorkspace: Workspace
  iconType: 'control-room' | 'driver' | 'paramedic' | 'diff' | 'admin'
  matchPrefix: string
}

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  {
    href: '/control-room',
    label: 'Control Room',
    mobileLabel: 'Control Room',
    requiredWorkspace: 'CONTROL_ROOM',
    iconType: 'control-room',
    matchPrefix: '/control-room'
  },
  {
    href: '/driver/dashboard',
    label: 'Driver',
    mobileLabel: 'Driver',
    requiredWorkspace: 'DRIVER',
    iconType: 'driver',
    matchPrefix: '/driver'
  },
  {
    href: '/paramedic',
    label: 'Paramedic',
    mobileLabel: 'Paramedic',
    requiredWorkspace: 'PARAMEDIC',
    iconType: 'paramedic',
    matchPrefix: '/paramedic'
  },
  {
    href: '/diff',
    label: 'What-If Diff',
    mobileLabel: 'What-If Diff',
    requiredWorkspace: 'CONTROL_ROOM',
    iconType: 'diff',
    matchPrefix: '/diff'
  },
  {
    href: '/admin',
    label: 'Admin',
    mobileLabel: 'Admin Console',
    requiredWorkspace: 'ADMIN',
    iconType: 'admin',
    matchPrefix: '/admin'
  }
]

/**
 * Returns strictly the navigation items authorized for the given user.
 * Hides links to unauthorized dashboards.
 */
export function getAuthorizedNavItems(user: User | null): NavItemConfig[] {
  if (!user) return []
  if (user.role === 'ADMIN') return ALL_NAV_ITEMS
  const workspaces = getEffectiveWorkspaces(user)
  return ALL_NAV_ITEMS.filter(item => workspaces.includes(item.requiredWorkspace))
}
