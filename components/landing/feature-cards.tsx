'use client'

import { Activity, Route, TimerReset } from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Real-time monitoring',
    description:
      'Track ambulance position, route status, and live traffic conditions the moment they change.',
    tone: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: TimerReset,
    title: 'Delay prediction',
    description:
      'Anticipate hold-ups from accidents and congestion, with clear ETA and delay estimates.',
    tone: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Route,
    title: 'Smart rerouting',
    description:
      'Get recommended alternative routes that recover lost time and keep response within safe limits.',
    tone: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
]

export function FeatureCards() {
  return (
    <section className="bg-background py-16 sm:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description, tone }) => (
            <article
              key={title}
              className="group rounded-2xl border border-border bg-card/60 dark:bg-card/40 p-6 sm:p-8 shadow-sm transition-all duration-200 hover:bg-card hover:shadow-lg dark:hover:shadow-black/20 hover:-translate-y-0.5"
            >
              <span className={`inline-flex size-12 items-center justify-center rounded-xl border ${tone} transition-transform duration-200 group-hover:scale-105`}>
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                {title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
