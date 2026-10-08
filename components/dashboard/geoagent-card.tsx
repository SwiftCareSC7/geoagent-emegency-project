import { BrainCircuit } from 'lucide-react'

export function GeoAgentCard({ explanation }: { explanation: string }) {
  return (
    <section className="rounded-xl border border-purple-200 bg-card p-4 text-card-foreground dark:border-purple-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300">
            <BrainCircuit className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">GeoAgent recommendation</h3>
            <span className="text-[11px] text-muted-foreground">Dashboard demo summary</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground">{explanation}</p>
    </section>
  )
}
