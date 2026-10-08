'use client'

import Link from 'next/link'
import {
  ArrowRight,
  HeartPulse,
  Navigation,
  Shield,
  Sliders,
  Truck,
  Users
} from 'lucide-react'

export function RoleCards() {
  const roles = [
    {
      title: 'Control Room Dispatcher',
      href: '/control-room',
      roleCode: 'CONTROL_ROOM',
      desc: 'Monitors metropolitan fleet movements, inspects route deviation alerts, evaluates GeoAgent alternative suggestions, and approves corridor reroutes.',
      icon: Shield,
      features: ['Corridor deviation alerts', '5-Question canonical CAD', 'Human-in-the-loop action gate'],
      accent: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
    },
    {
      title: 'Ambulance Driver',
      href: '/driver/dashboard',
      roleCode: 'DRIVER',
      desc: 'Glanceable, high-contrast in-vehicle navigation HUD showing turn-by-turn maneuvers, current corridor speed, and verified reroutes directly on dash.',
      icon: Navigation,
      features: ['Turn-by-turn maneuver HUD', 'Zero-distraction layout', 'Automated reroute updates'],
      accent: 'border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
    },
    {
      title: 'Paramedic & Triage Clinician',
      href: '/paramedic',
      roleCode: 'PARAMEDIC',
      desc: 'Pre-hospital patient assessment interface, telemetry synchronization, vitals logging, and trauma bay destination readiness monitoring.',
      icon: HeartPulse,
      features: ['Patient condition monitoring', 'Hospital trauma bay handoff', 'Real-time ETA sync'],
      accent: 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10'
    },
    {
      title: 'System Administrator',
      href: '/admin',
      roleCode: 'ADMIN',
      desc: 'Fleet registration, vehicle maintenance schedules, provider API health checks (OSRM, Google, Gemini), error logs, and cryptographic audit security.',
      icon: Sliders,
      features: ['Fleet lifecycle management', 'Provider health diagnostics', 'Audit trail inspection'],
      accent: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
    }
  ]

  return (
    <section className="bg-muted/30 py-16 sm:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            ROLE-BASED WORKSPACES
          </span>
          <h2 className="mt-4 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Designed for Every Stakeholder in the Emergency Chain
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            From the high-density dispatcher console to the zero-distraction driver HUD, each interface is tailored for operational speed and cognitive calm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.title}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card/50 p-6 transition-all hover:bg-card hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border p-2 ${r.accent}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-wider">
                      {r.roleCode}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {r.desc}
                  </p>
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-[11px] text-foreground/80">
                    {r.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-muted-foreground/40" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-end">
                  <Link
                    href={r.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
