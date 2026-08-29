'use client'

import { useState } from 'react'

import { ContactSection } from '@/components/landing/contact-section'
import { FeatureCards } from '@/components/landing/feature-cards'
import { Hero } from '@/components/landing/hero'
import { SiteHeader } from '@/components/landing/site-header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export default function LandingPage() {
  const [helpOpen, setHelpOpen] = useState(false)

  const scrollToContact = () => {
    document
      .getElementById('contact')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader onHelp={() => setHelpOpen(true)} onContact={scrollToContact} />

      <main className="flex-1">
        <Hero />
        <FeatureCards />
        <ContactSection />
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          SwiftCare GeoAgent — Prototype UI. No real medical data, GPS, or
          accounts are used.
        </div>
      </footer>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="How SwiftCare GeoAgent helps"
        description="A quick guide to using this prototype."
        footer={
          <Button onClick={() => setHelpOpen(false)}>Got it</Button>
        }
      >
        <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Register</span> to
            create a driver or control-room profile (prototype only).
          </li>
          <li>
            <span className="font-semibold text-foreground">
              Driver Dashboard
            </span>{' '}
            shows live route status, delays, ETAs, and rerouting advice.
          </li>
          <li>
            <span className="font-semibold text-foreground">Contact</span> the
            control room any time from the navigation bar.
          </li>
        </ul>
      </Modal>
    </div>
  )
}
