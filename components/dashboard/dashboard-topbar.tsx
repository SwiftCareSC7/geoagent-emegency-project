import { Siren, UserRound } from 'lucide-react'
import Link from 'next/link'

import { BrandLogo } from '@/components/brand-logo'

interface DashboardTopbarProps {
  ambulanceId: string
  driverName: string
  emergencyActive: boolean
  lastRefreshed: string
}

export function DashboardTopbar({
  ambulanceId,
  driverName,
  emergencyActive,
  lastRefreshed,
}: DashboardTopbarProps) {
  return (
    <header className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm transition-opacity hover:opacity-90"
            aria-label="SwiftCare Ambulance Services home"
          >
            <BrandLogo
              height={30}
              fallbackClassName="whitespace-nowrap font-display text-base font-bold text-primary"
            />
          </Link>
          <div className="border-l border-white/20 pl-3">
            <p className="font-display text-lg font-bold leading-tight">
              GeoAgent
            </p>
            <p className="text-sm text-primary-foreground/70">
              Ambulance {ambulanceId} · Driver {driverName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {emergencyActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-critical px-3 py-1.5 text-sm font-semibold text-white">
              <Siren className="size-4" />
              Emergency active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-sm font-semibold text-white">
              Standby
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm">
            <UserRound className="size-4" />
            {driverName}
          </span>
          <span className="text-xs text-primary-foreground/70">
            Last updated: {lastRefreshed}
          </span>
        </div>
      </div>
    </header>
  )
}
