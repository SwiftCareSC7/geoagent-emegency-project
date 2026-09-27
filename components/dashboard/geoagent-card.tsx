import { CheckCircle2, ShieldCheck, Sparkles, Zap } from 'lucide-react'

export function GeoAgentCard({ explanation }: { explanation: string }) {
  return (
    <section className="rounded-2xl border-2 border-border bg-card p-6 shadow-md hover:shadow-lg transition-all text-card-foreground space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
            <Sparkles className="size-4 animate-pulse" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              Why GeoAgent AI recommends Alternative Route B
            </h3>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
              🟣 Recommended Alternative Detour
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="size-3.5" />
          94.8% Confirmed
        </span>
      </div>

      <div className="rounded-xl border border-primary/15 bg-background/60 p-3.5 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
          <Zap className="size-3.5 shrink-0" />
          <span>User-Friendly Recommendation:</span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/90 font-medium">
          {explanation}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span>Traffic Incident Verified</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span>V2X Signals Synchronized</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span>5.0 Min Saved</span>
        </span>
      </div>
    </section>
  )
}
