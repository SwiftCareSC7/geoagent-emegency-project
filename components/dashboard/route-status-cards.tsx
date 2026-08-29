import {
  Navigation,
  Route,
  ShieldCheck,
  Timer,
  TimerReset,
  TrafficCone,
  TrendingDown,
  TriangleAlert,
} from 'lucide-react'

import type { DashboardData } from '@/lib/mock-data'
import { StatCard } from './stat-card'

export function RouteStatusCards({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-display text-sm font-bold text-foreground">
          Deviation &amp; Benefit Analysis
        </h3>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Demo data
        </span>
      </div>

      <StatCard
        icon={Navigation}
        label="Route Status"
        value={data.routeStatusLabel}
        hint={`En route to ${data.destination}`}
        tone="warning"
      />
      <StatCard
        icon={TriangleAlert}
        label="Likely Cause"
        value={data.cause}
        tone="critical"
      />
      <StatCard
        icon={Timer}
        label="Original ETA"
        value={`${data.originalEtaMin} min`}
        hint="Estimated"
      />
      <StatCard
        icon={TrafficCone}
        label="Current Route ETA"
        value={`${data.currentRouteEtaMin} min`}
        hint="Estimated"
        tone="warning"
      />
      <StatCard
        icon={TimerReset}
        label="Alternative Route B ETA"
        value={`${data.newEtaMin} min`}
        hint="Estimated"
        tone="success"
      />
      <StatCard
        icon={TrendingDown}
        label="Estimated Time Saved by Rerouting"
        value={`${data.timeSavedMin} min`}
        tone="success"
      />
      <StatCard
        icon={ShieldCheck}
        label="Backup Ambulance"
        value={data.backupAmbulance}
        tone="success"
      />
      <StatCard
        icon={Route}
        label="Recommendation"
        value={data.recommendation}
        tone="recommended"
      />
    </div>
  )
}
