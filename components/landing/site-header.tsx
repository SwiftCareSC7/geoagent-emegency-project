'use client'

import { HelpCircle, LogIn, Phone } from 'lucide-react'
import Link from 'next/link'

import { BrandLogo } from '@/components/brand-logo'

interface SiteHeaderProps {
  onHelp: () => void
  onContact: () => void
}

export function SiteHeader({ onHelp, onContact }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: dashboard label */}
        <p className="hidden text-sm font-medium text-muted-foreground sm:block">
          Driver Dashboard
        </p>

        {/* Center: brand */}
        <Link
          href="/"
          className="flex items-center sm:absolute sm:left-1/2 sm:-translate-x-1/2"
          aria-label="SwiftCare Ambulance Services home"
        >
          <BrandLogo
            height={36}
            priority
            fallbackClassName="whitespace-nowrap font-display text-base font-bold text-primary"
          />
        </Link>

        {/* Right: nav */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-1 sm:gap-2"
        >
          <button
            type="button"
            onClick={onContact}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="size-4" />
            <span className="hidden sm:inline">Contact</span>
          </button>
          <button
            type="button"
            onClick={onHelp}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <HelpCircle className="size-4" />
            <span className="hidden sm:inline">Help</span>
          </button>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <LogIn className="size-4" />
            <span>Login</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
