import { Clock, MapPin } from 'lucide-react'

import type { DashboardData } from '@/lib/mock-data'

export function EtaSummary({ data }: { data: DashboardData }) {
  return (
    <section className="rounded-2xl border-2 border-border bg-card p-6 shadow-md hover:shadow-lg transition-all text-card-foreground">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-card-foreground">
          <Clock className="size-5 text-emerald-500" />
          Estimated Arrival Monitor
        </h3>
        <span className="rounded-full bg-secondary/80 border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          Real-time Engine
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="font-display text-5xl font-extrabold leading-none text-emerald-600 dark:text-emerald-400">
            {data.newEtaMin}
            <span className="ml-1.5 text-lg font-semibold text-muted-foreground">
              min
            </span>
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            Arrives by {data.arriveBy}
          </p>
        </div>
        <div className="pb-1">
          <p className="text-xs text-muted-foreground line-through font-mono">
            {data.originalEtaMin} min original corridor
          </p>
          <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
            <span>🟣</span>
            <span>Est. {data.timeSavedMin} min saved via {data.recommendedRoute} (Recommended Alternative)</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Destination
          </p>
          <p className="text-sm font-semibold text-foreground">
            {data.destination}
          </p>
        </div>
      </div>
    </section>
  )
}
