'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  LogIn,
  Menu,
  Phone,
  UserPlus,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggleCompact } from '@/components/theme-toggle'

interface SiteHeaderProps {
  onHelp?: () => void
  onContact?: () => void
}

export function SiteHeader({ onHelp, onContact }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Status */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="SwiftCare GeoAgent Emergency Response"
          >
            <BrandLogo
              height={28}
              fallbackClassName="font-display text-sm font-bold text-foreground tracking-tight"
            />
          </Link>
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-border">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              CORRIDOR NETWORK ACTIVE
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-2">
          {onContact && (
            <button
              type="button"
              onClick={onContact}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Phone className="size-3.5" />
              <span>Contact</span>
            </button>
          )}
          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="size-3.5" />
              <span>Help</span>
            </button>
          )}

          <div className="h-4 w-px bg-border mx-1" />

          <ThemeToggleCompact />

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogIn className="size-3.5" />
            <span>Sign In</span>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-500"
          >
            <UserPlus className="size-3.5" />
            <span>Register</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggleCompact />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center size-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-background px-4 py-3 space-y-2">
          {onContact && (
            <button
              type="button"
              onClick={() => {
                onContact()
                setMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 rounded-lg bg-card border border-border p-2.5 text-xs font-medium text-foreground text-left"
            >
              <Phone className="size-4 text-emerald-500" />
              Contact Support
            </button>
          )}
          {onHelp && (
            <button
              type="button"
              onClick={() => {
                onHelp()
                setMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 rounded-lg bg-card border border-border p-2.5 text-xs font-medium text-foreground text-left"
            >
              <HelpCircle className="size-4 text-cyan-500" />
              Operational Guide
            </button>
          )}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center rounded-lg border border-border bg-card py-2 text-xs font-semibold text-muted-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
