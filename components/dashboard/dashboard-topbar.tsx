'use client'

import { LogOut, Navigation, Shield, Siren, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { BrandLogo } from '@/components/brand-logo'
import { useAuth } from '@/lib/auth/context'

interface DashboardTopbarProps {
  ambulanceId?: string
  driverName?: string
  emergencyActive?: boolean
  lastRefreshed?: string
}

export function DashboardTopbar({
  ambulanceId = 'HQ-01',
  driverName = 'Officer',
  emergencyActive = false,
  lastRefreshed = '',
}: DashboardTopbarProps = {}) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch {
      router.push('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  const displayName = user?.name || driverName
  const userRole = user?.role || 'DRIVER'

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
              Ambulance {ambulanceId} · Operator {displayName}
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

          {/* Authenticated user & role badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-3 pr-2 text-sm">
            <UserRound className="size-4" />
            <span className="font-medium">{displayName}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tracking-wide">
              <Shield className="size-3" />
              {userRole}
            </span>
          </div>

          {/* Navigation Mode Switchers */}
          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
            <Link
              href="/driver/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/15 active:scale-95"
            >
              <Navigation className="size-3.5 text-cyan-300" />
              <span>Navigation</span>
            </Link>
            <Link
              href="/control-room"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/15 active:scale-95"
            >
              <Shield className="size-3.5 text-emerald-300" />
              <span>Control Room</span>
            </Link>
          </div>

          {/* Admin Console shortcut for ADMIN role */}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25 active:scale-95"
            >
              <Shield className="size-3.5 text-amber-300" />
              <span>Admin Console</span>
            </Link>
          )}

          <span className="text-xs text-primary-foreground/70">
            {lastRefreshed}
          </span>

          {/* Real Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-50"
            aria-label="Log out"
          >
            <LogOut className="size-3.5" />
            <span>{loggingOut ? 'Exiting...' : 'Log out'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
