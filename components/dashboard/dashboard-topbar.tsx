'use client'

import { Navigation, Shield, Siren, UserRound, Menu, X, HeartPulse, GitCompare } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { ALL_NAV_ITEMS } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

interface DashboardTopbarProps {
  ambulanceId?: string
  driverName?: string
  emergencyActive?: boolean
  lastRefreshed?: string
  driverMode?: boolean
}

export function DashboardTopbar({
  ambulanceId = 'HQ-01',
  driverName = 'Officer',
  emergencyActive = false,
  lastRefreshed = '',
  driverMode = false,
}: DashboardTopbarProps = {}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const displayName = driverName
  const navItems = ALL_NAV_ITEMS

  return (
    <header className="border-b border-border bg-card/95 text-foreground backdrop-blur-md transition-colors">
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
                fallbackClassName="whitespace-nowrap font-display text-sm font-bold text-foreground"
              />
            </Link>

            <div className={cn('hidden sm:block border-l border-border pl-3', driverMode && 'lg:hidden')}>
              <p className="text-sm font-bold leading-tight text-foreground">
                GeoAgent
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Ambulance {ambulanceId}
              </p>
            </div>

            {/* Status Badge */}
            <div className={cn('hidden md:flex items-center gap-2 ml-1', driverMode && 'flex')}>
              {emergencyActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 border border-red-500/30">
                  <Siren className="size-3" />
                  Emergency Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Standby
                </span>
              )}
            </div>
          </div>

          {/* Right: Desktop nav + Theme Switcher + User */}
          <div className={cn('hidden lg:flex items-center gap-2', driverMode && 'lg:hidden')}>
            {/* Navigation Links */}
            {navItems.length > 0 && (
              <nav className="flex items-center gap-1 rounded-lg bg-muted/60 border border-border p-0.5">
                {navItems.map((item) => {
                  const Icon =
                    item.iconType === 'control-room'
                      ? Shield
                      : item.iconType === 'driver'
                      ? Navigation
                      : item.iconType === 'paramedic'
                      ? HeartPulse
                      : item.iconType === 'diff'
                      ? GitCompare
                      : Shield
                  const iconColor =
                    item.iconType === 'control-room'
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : item.iconType === 'driver'
                      ? 'text-cyan-500 dark:text-cyan-400'
                      : item.iconType === 'paramedic'
                      ? 'text-rose-500 dark:text-rose-400'
                      : item.iconType === 'diff'
                      ? 'text-indigo-500 dark:text-indigo-400'
                      : 'text-amber-500 dark:text-amber-400'
                  const isActive =
                    pathname === item.href ||
                    (item.matchPrefix !== '/' && pathname.startsWith(item.matchPrefix))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                        isActive
                          ? 'bg-card text-foreground shadow-xs border border-border'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className={cn('size-3', iconColor)} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}

            {/* Global Theme Toggle */}
            <div className="pl-1">
              <ThemeToggleCompact />
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="flex items-center gap-1.5 text-[11px]">
                <UserRound className="size-3.5 text-muted-foreground" />
                <span suppressHydrationWarning className="text-foreground font-medium">{displayName}</span>
              </div>
            </div>

            {/* Last Refreshed */}
            {lastRefreshed && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {lastRefreshed}
              </span>
            )}
          </div>

          {/* Mobile: Theme Toggle + Hamburger Menu */}
          <div className={cn('flex lg:hidden items-center gap-2', driverMode && 'lg:flex')}>
            <ThemeToggleCompact />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center size-9 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={cn('border-t border-border bg-card/98 text-foreground backdrop-blur-xl', !driverMode && 'lg:hidden')}>
          <div className="px-4 py-3 space-y-2">
            {/* User Info Mobile */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border">
              <UserRound className="size-4 text-muted-foreground" />
              <span suppressHydrationWarning className="text-sm font-medium text-foreground">{displayName}</span>
              {emergencyActive ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/30">
                  <Siren className="size-2.5" />
                  ACTIVE
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  STANDBY
                </span>
              )}
            </div>

            {/* Mobile Nav Links */}
            {navItems.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const Icon =
                    item.iconType === 'control-room'
                      ? Shield
                      : item.iconType === 'driver'
                      ? Navigation
                      : item.iconType === 'paramedic'
                      ? HeartPulse
                      : item.iconType === 'diff'
                      ? GitCompare
                      : Shield
                  const iconColor =
                    item.iconType === 'control-room'
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : item.iconType === 'driver'
                      ? 'text-cyan-500 dark:text-cyan-400'
                      : item.iconType === 'paramedic'
                      ? 'text-rose-500 dark:text-rose-400'
                      : item.iconType === 'diff'
                      ? 'text-indigo-500 dark:text-indigo-400'
                      : 'text-amber-500 dark:text-amber-400'
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border/50 px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Icon className={cn('size-4', iconColor)} />
                      {item.mobileLabel}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
