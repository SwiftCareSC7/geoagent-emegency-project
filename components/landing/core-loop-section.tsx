'use client'

import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Layers,
  MapPin,
  Navigation,
  Radio,
  Route as RouteIcon,
  Send,
  ShieldCheck,
  Siren,
  Sparkles
} from 'lucide-react'

export function CoreLoopSection() {
  const steps = [
    {
      num: '01',
      name: 'MONITOR',
      badge: 'GPS & Telemetry',
      icon: Radio,
      desc: 'Ingests high-frequency GPS fixes, speed, and heading from ambulance units across metropolitan corridors.',
      tone: 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
    },
    {
      num: '02',
      name: 'DETECT',
      badge: 'Lateral Delta',
      icon: Activity,
      desc: 'Compares real-time vehicle trajectory against canonical planned route geometry to catch lateral deviations (>50m).',
      tone: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
    },
    {
      num: '03',
      name: 'EXPLAIN',
      badge: 'Hazard Attribution',
      icon: BrainCircuit,
      desc: 'Correlates spatial hazards (road closures, police incident reports, congestion bursts) to explain why the vehicle diverted.',
      tone: 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10'
    },
    {
      num: '04',
      name: 'PREDICT',
      badge: 'ETA Recalculation',
      icon: Clock,
      desc: 'Applies deterministic delay models and Gemini 3.8 Flash advisory reasoning to project revised hospital arrival times.',
      tone: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
    },
    {
      num: '05',
      name: 'RECOMMEND',
      badge: 'Alternative Corridors',
      icon: RouteIcon,
      desc: 'Calculates multiple non-conflicting alternative routes via OSRM/Google APIs, ranking them by duration and clearance.',
      tone: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
    },
    {
      num: '06',
      name: 'DECIDE',
      badge: 'Operator Action Gate',
      icon: ShieldCheck,
      desc: 'Submits actionable proposal to the dispatcher console. Zero autonomous alterations without human operator approval.',
      tone: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    },
    {
      num: '07',
      name: 'ACT',
      badge: 'Telematics Reroute',
      icon: Send,
      desc: 'Broadcasts verified route change via low-latency Socket.IO directly to in-vehicle driver HUD and hospital trauma bays.',
      tone: 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10'
    },
    {
      num: '08',
      name: 'VERIFY',
      badge: 'Trajectory Proof',
      icon: CheckCircle2,
      desc: 'Monitors vehicle convergence back to the approved corridor, logging every action to an immutable audit timeline.',
      tone: 'text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/10'
    }
  ]

  return (
    <section className="bg-background py-16 sm:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            END-TO-END CORRIDOR SURVEILLANCE
          </span>
          <h2 className="mt-4 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            The 8-Step Core Response Loop
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            SwiftCare operates as a deterministic, human-in-the-loop surveillance system. Every step transitions with cryptographic and audit traceability.
          </p>
        </div>

        {/* Grid of 8 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.num}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 dark:bg-card/40 p-5 transition-all hover:border-border hover:bg-card hover:shadow-md dark:hover:shadow-black/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-muted-foreground/60">
                      STEP {s.num}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold border ${s.tone}`}>
                      <Icon className="size-3" />
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground tracking-wide">
                    {s.name}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground/60">
                  <span>State: Active</span>
                  <ArrowRight className="size-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
