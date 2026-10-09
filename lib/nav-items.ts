/** Dashboard navigation (no access control: every workspace is open). */
export interface NavItemConfig {
  href: string
  label: string
  mobileLabel: string
  iconType: 'control-room' | 'driver' | 'paramedic' | 'diff' | 'admin'
  matchPrefix: string
}

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  { href: '/control-room', label: 'Control Room', mobileLabel: 'Control Room', iconType: 'control-room', matchPrefix: '/control-room' },
  { href: '/driver/dashboard', label: 'Driver', mobileLabel: 'Driver', iconType: 'driver', matchPrefix: '/driver' },
  { href: '/paramedic', label: 'Paramedic', mobileLabel: 'Paramedic', iconType: 'paramedic', matchPrefix: '/paramedic' },
  { href: '/diff', label: 'What-If Diff', mobileLabel: 'What-If Diff', iconType: 'diff', matchPrefix: '/diff' },
  { href: '/admin', label: 'Admin', mobileLabel: 'Admin Console', iconType: 'admin', matchPrefix: '/admin' },
]
