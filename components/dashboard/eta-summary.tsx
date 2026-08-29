import { Clock, MapPin } from 'lucide-react'

import type { DashboardData } from '@/lib/mock-data'

export function EtaSummary({ data }: { data: DashboardData }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-card-foreground">
          <Clock className="size-4 text-success" />
          Estimated Arrival
        </h3>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Demo data
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="font-display text-5xl font-extrabold leading-none text-success">
            {data.newEtaMin}
            <span className="ml-1.5 text-lg font-semibold text-muted-foreground">
              min
            </span>
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            Arrives by {data.arriveBy}
          </p>
        </div>
        <div className="pb-1">
          <p className="text-sm text-muted-foreground line-through">
            {data.originalEtaMin} min original
          </p>
          <p className="text-sm font-semibold text-success">
            Est. {data.timeSavedMin} min saved via {data.recommendedRoute}
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
