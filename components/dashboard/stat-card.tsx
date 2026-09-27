import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type Tone = 'default' | 'critical' | 'warning' | 'success' | 'planned' | 'recommended'

const toneClasses: Record<Tone, { icon: string; value?: string; border?: string; badgeDot?: string }> = {
  default: { icon: 'bg-primary/10 text-primary', border: 'border-border' },
  critical: {
    icon: 'bg-red-500/15 text-red-600 dark:text-red-400',
    value: 'text-red-600 dark:text-red-400',
    border: 'border-l-4 border-l-red-500 border-border/90',
    badgeDot: 'bg-red-500',
  },
  warning: {
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    value: 'text-amber-600 dark:text-amber-400',
    border: 'border-l-4 border-l-amber-500 border-border/90',
    badgeDot: 'bg-amber-500',
  },
  success: {
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-l-4 border-l-emerald-500 border-border/90',
    badgeDot: 'bg-emerald-500',
  },
  planned: {
    icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    value: 'text-blue-600 dark:text-blue-400',
    border: 'border-l-4 border-l-blue-600 border-border/90',
    badgeDot: 'bg-blue-600',
  },
  recommended: {
    icon: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    value: 'text-purple-600 dark:text-purple-400',
    border: 'border-l-4 border-l-purple-600 border-border/90',
    badgeDot: 'bg-purple-600',
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
    <article
      className={cn(
        'flex flex-col rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden',
        t.border || 'border-border'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-lg shadow-2xs',
              t.icon,
            )}
          >
            <Icon className="size-4" />
          </span>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
        {t.badgeDot ? (
          <span className={cn('size-2 rounded-full shrink-0', t.badgeDot)} />
        ) : null}
      </div>
      <p
        className={cn(
          'mt-3 font-display text-xl font-black text-card-foreground tracking-tight',
          t.value,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground font-medium">{hint}</p>
      ) : null}
    </article>
  )
}
