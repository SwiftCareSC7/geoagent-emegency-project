import { Sparkles } from 'lucide-react'

export function GeoAgentCard({ explanation }: { explanation: string }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <h3 className="font-display text-sm font-bold text-foreground">
          Why GeoAgent recommends this
        </h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        {explanation}
      </p>
    </section>
  )
}
