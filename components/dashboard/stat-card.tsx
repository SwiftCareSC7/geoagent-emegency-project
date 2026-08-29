import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type Tone = 'default' | 'critical' | 'warning' | 'success' | 'planned' | 'recommended'

const toneClasses: Record<Tone, { icon: string; value?: string }> = {
  default: { icon: 'bg-primary/10 text-primary' },
  critical: { icon: 'bg-critical/10 text-critical', value: 'text-critical' },
  warning: { icon: 'bg-warning/10 text-warning', value: 'text-warning' },
  success: { icon: 'bg-success/10 text-success', value: 'text-success' },
  planned: { icon: 'bg-route-planned/10 text-route-planned' },
  recommended: {
    icon: 'bg-route-recommended/10 text-route-recommended',
    value: 'text-route-recommended',
  },
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: Tone
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: StatCardProps) {
  const t = toneClasses[tone]
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            t.icon,
          )}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-3 font-display text-xl font-bold text-card-foreground',
          t.value,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </article>
  )
}
