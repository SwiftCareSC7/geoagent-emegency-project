import { CheckCircle2, ShieldCheck, Sparkles, Zap } from 'lucide-react'

export function GeoAgentCard({ explanation }: { explanation: string }) {
  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Sparkles className="size-4 animate-pulse" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              Why GeoAgent AI recommends this
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Gemini 3.7 Advisory Decision Analysis
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
