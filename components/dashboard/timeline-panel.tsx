import type { Severity, TimelineEvent } from '@/lib/mock-data'

const dotColor: Record<Severity, string> = {
  critical: 'bg-critical',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-route-planned',
}

export function TimelinePanel({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-display text-sm font-bold text-card-foreground">
        Evidence & Timeline
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        How GeoAgent reached its recommendation.
      </p>

      <ol className="mt-4">
        {events.map((event, i) => (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* connector line */}
            {i < events.length - 1 ? (
              <span
                className="absolute left-[5px] top-4 h-full w-px bg-border"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={`mt-1 size-2.5 shrink-0 rounded-full ${dotColor[event.severity]}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-card-foreground">
                  {event.label}
                </p>
                <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {event.time}
                </time>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {event.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
