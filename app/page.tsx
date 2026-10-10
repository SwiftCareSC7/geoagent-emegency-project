'use client'

import { useState } from 'react'

import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { FeatureCards } from '@/components/landing/feature-cards'
import { ContactSection } from '@/components/landing/contact-section'
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
    <div className="flex min-h-svh flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <SiteHeader onHelp={() => setHelpOpen(true)} onContact={scrollToContact} />

      <main className="flex-1">
        <Hero />
        <FeatureCards />
        <ContactSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs font-mono text-muted-foreground sm:px-6 lg:px-8">
          SwiftCare GeoAgent — Prototype UI. No real medical data, GPS, or accounts are used.
        </div>
      </footer>

      {/* Help Modal */}
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="SwiftCare GeoAgent System Architecture"
        description="Operational guide for dispatchers and field crew."
        footer={
          <Button onClick={() => setHelpOpen(false)}>Close Guide</Button>
        }
      >
        <ul className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="font-bold text-foreground font-mono">1. Control Room:</span>
            <span>Live metropolitan corridor surveillance, sub-100m deviation detection, and one-click operator reroute approval.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-foreground font-mono">2. Driver HUD:</span>
            <span>Turn-by-turn navigation with zero visual distraction, speed tracking, and real-time updates.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-foreground font-mono">3. Paramedic Triage:</span>
            <span>Pre-hospital clinical handoff, trauma vitals monitoring, and hospital destination readiness.</span>
          </li>
        </ul>
      </Modal>
    </div>
  )
}
