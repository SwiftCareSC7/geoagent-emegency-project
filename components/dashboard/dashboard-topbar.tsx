'use client'

import { LogOut, Navigation, Shield, Siren, UserRound, Menu, X } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center shrink-0"
              aria-label="SwiftCare Ambulance Services home"
            >
              <BrandLogo
                height={28}
                fallbackClassName="whitespace-nowrap font-display text-sm font-bold text-white"
              />
            </Link>

            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <p className="text-sm font-bold leading-tight text-white">
                GeoAgent
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Ambulance {ambulanceId}
              </p>
            </div>

            {/* Status Badge */}
            <div className="hidden md:flex items-center gap-2 ml-1">
              {emergencyActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-400 border border-red-500/30">
                  <Siren className="size-3" />
                  Emergency Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Standby
                </span>
              )}
            </div>
          </div>

          {/* Right: Desktop nav + User */}
          <div className="hidden md:flex items-center gap-2">
            {/* Navigation Links */}
            <nav className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-0.5">
              <Link
                href="/driver/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:text-white hover:bg-slate-700"
              >
                <Navigation className="size-3 text-cyan-400" />
                <span>Navigation</span>
              </Link>
              <Link
                href="/control-room"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:text-white hover:bg-slate-700"
              >
                <Shield className="size-3 text-emerald-400" />
                <span>Control Room</span>
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:text-white hover:bg-slate-700"
                >
                  <Shield className="size-3 text-amber-400" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="flex items-center gap-1.5 text-[11px]">
                <UserRound className="size-3.5 text-slate-400" />
                <span className="text-slate-300 font-medium">{displayName}</span>
                <span className="inline-flex items-center gap-0.5 rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                  <Shield className="size-2.5" />
                  {userRole}
                </span>
              </div>
            </div>

            {/* Last Refreshed */}
            {lastRefreshed && (
              <span className="text-[10px] font-mono text-slate-500">
                {lastRefreshed}
              </span>
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
              aria-label="Log out"
            >
              <LogOut className="size-3" />
              <span>{loggingOut ? 'Exiting...' : 'Log out'}</span>
            </button>
          </div>

          {/* Mobile: Hamburger Menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center size-9 rounded-lg hover:bg-slate-800 text-slate-300"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-2">
            {/* User Info Mobile */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60">
              <UserRound className="size-4 text-slate-400" />
              <span className="text-sm font-medium text-white">{displayName}</span>
              <span className="inline-flex items-center gap-0.5 rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 uppercase">
                {userRole}
              </span>
              {emergencyActive ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                  <Siren className="size-2.5" />
                  ACTIVE
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  STANDBY
                </span>
              )}
            </div>

            {/* Mobile Nav Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/driver/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                <Navigation className="size-4 text-cyan-400" />
                Navigation
              </Link>
              <Link
                href="/control-room"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                <Shield className="size-4 text-emerald-400" />
                Control Room
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  <Shield className="size-4 text-amber-400" />
                  Admin Console
                </Link>
              )}
            </div>

            {/* Mobile Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <LogOut className="size-4" />
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
