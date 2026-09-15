'use client'

import { HelpCircle, LogIn, Phone, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { BrandLogo } from '@/components/brand-logo'

interface SiteHeaderProps {
  onHelp: () => void
  onContact: () => void
}

export function SiteHeader({ onHelp, onContact }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Quick links (Desktop) */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
          <Link
            href="/driver/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Driver Navigation
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/control-room"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Control Room
          </Link>
        </div>

        {/* Center: brand */}
        <Link
          href="/"
          className="flex items-center sm:absolute sm:left-1/2 sm:-translate-x-1/2"
          aria-label="SwiftCare Ambulance Services home"
        >
          <BrandLogo
            height={32}
            priority
            fallbackClassName="whitespace-nowrap font-display text-base font-bold text-primary"
          />
        </Link>

        {/* Right: nav (Desktop) */}
        <nav
          aria-label="Primary"
          className="hidden sm:flex items-center gap-1"
        >
          <button
            type="button"
            onClick={onContact}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="size-4" />
            <span>Contact</span>
          </button>
          <button
            type="button"
            onClick={onHelp}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <HelpCircle className="size-4" />
            <span>Help</span>
          </button>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <LogIn className="size-4" />
            <span>Login</span>
          </Link>
        </nav>

        {/* Mobile: Hamburger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden flex items-center justify-center size-9 rounded-lg hover:bg-muted text-foreground"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-background/98 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/driver/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Driver Navigation
            </Link>
            <Link
              href="/control-room"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Control Room
            </Link>
            <button
              type="button"
              onClick={() => { onContact(); setMobileMenuOpen(false) }}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted text-left"
            >
              <Phone className="size-4" />
              Contact
            </button>
            <button
              type="button"
              onClick={() => { onHelp(); setMobileMenuOpen(false) }}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted text-left"
            >
              <HelpCircle className="size-4" />
              Help
            </button>
            <div className="pt-1 border-t border-border">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
              >
                <LogIn className="size-4" />
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
