import { Activity, Route, TimerReset } from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Real-time monitoring',
    description:
      'Track ambulance position, route status, and live traffic conditions the moment they change.',
  },
  {
    icon: TimerReset,
    title: 'Delay prediction',
    description:
      'Anticipate hold-ups from accidents and congestion, with clear ETA and delay estimates.',
  },
  {
    icon: Route,
    title: 'Smart rerouting',
    description:
      'Get recommended alternative routes that recover lost time and keep response within safe limits.',
  },
]

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-5 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-card-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
