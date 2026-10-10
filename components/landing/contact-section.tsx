'use client'

import { Ambulance, Mail, MapPin, Phone } from 'lucide-react'

import { SITE_CONTACT } from '@/lib/mock-data'

export function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-20 border-t border-border bg-muted/40 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              OPERATIONAL SUPPORT
            </span>
            <h2
              id="contact-heading"
              className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground"
            >
              SwiftCare Bengaluru Support
            </h2>
            <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground">
              Reach the Bengaluru control room for dispatch coordination,
              onboarding support, or questions about the GeoAgent prototype.
            </p>
            <dl className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Phone className="size-5" />
                </span>
                <div>
                  <dt className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Control room
                  </dt>
                  <dd className="text-sm font-bold text-foreground">
                    <a href={`tel:${SITE_CONTACT.phone.replace(/\s+/g, '')}`} className="hover:underline">
                      {SITE_CONTACT.phone}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Mail className="size-5" />
                </span>
                <div>
                  <dt className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Email
                  </dt>
                  <dd className="text-sm font-bold text-foreground">
                    <a href={`mailto:${SITE_CONTACT.email}`} className="hover:underline">
                      {SITE_CONTACT.email}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <dt className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Base
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {SITE_CONTACT.base}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="flex items-center justify-center rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 to-teal-700 p-8 sm:p-10 text-white shadow-xl shadow-emerald-950/30">
            <div className="text-center max-w-sm">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-inner">
                <Ambulance className="size-7 text-white" />
              </span>
              <p className="mt-5 font-display text-2xl font-bold tracking-tight">
                Available 24 / 7
              </p>
              <p className="mt-3 text-sm text-white/90 leading-relaxed">
                Emergency coordination never sleeps. SwiftCare GeoAgent keeps
                every crew informed, every second of every shift.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
