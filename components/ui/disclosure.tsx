import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DisclosureProps {
  title: string
  summary?: string
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}

/** Native disclosure: keyboard, pointer, and touch users share the same interaction. */
export function Disclosure({ title, summary, children, className, defaultOpen = false }: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      className={cn('group rounded-xl border border-border/70 bg-card', className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{summary}</span> : null}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border/60 px-4 py-4">{children}</div>
    </details>
  )
}
