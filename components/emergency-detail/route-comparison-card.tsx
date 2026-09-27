'use client';

import React from 'react';
import {
  Split,
  HelpCircle,
  Clock,
  ArrowRight,
  Route as RouteIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { Route } from '@/lib/api/types';

interface RouteComparisonCardProps {
  currentRoute: Route | null;
  alternatives?: any[];
  whyRouteChanged?: string[];
  whatIfDoNothing?: {
    estimatedDelayMinutes?: number;
    riskLevel?: string;
    operationalRisk?: string;
    summary?: string;
    [key: string]: any;
  };
  currentEtaMinutes?: number | null;
  plannedEtaMinutes?: number | null;
}

export function RouteComparisonCard({
  currentRoute,
  alternatives = [],
  whyRouteChanged = [],
  whatIfDoNothing,
  currentEtaMinutes,
  plannedEtaMinutes
}: RouteComparisonCardProps) {
  // Normalize candidate alternatives
  const candidateAlts = Array.isArray(alternatives) ? alternatives : [];
  const primaryAlt = candidateAlts.length > 0 ? candidateAlts[0] : null;

  // Real backend calculations
  const currentDistanceM = currentRoute ? (currentRoute.distanceMeters || currentRoute.distance || 0) : 0;
  const currentEta = currentEtaMinutes ?? (currentRoute ? Math.round((currentRoute.durationSeconds || currentRoute.duration || 0) / 60) : 0);
  const plannedEta = plannedEtaMinutes ?? currentEta;
  const currentDelay = Math.max(0, currentEta - plannedEta);

  const primaryAltEta = primaryAlt ? (primaryAlt.etaMinutes ?? Math.round((primaryAlt.durationSeconds || primaryAlt.duration || 0) / 60)) : currentEta;
  const primaryAltDistanceM = primaryAlt ? (primaryAlt.distanceMeters || primaryAlt.distance || 0) : currentDistanceM;
  const timeSaved = primaryAlt ? Math.max(0, currentEta - primaryAltEta) : 0;
  const distanceDeltaM = primaryAltDistanceM - currentDistanceM;

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-xl text-card-foreground transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Split className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Candidate Route Comparison &amp; What-If Analysis</h3>
            <p className="text-xs text-muted-foreground">
              Authoritative multi-corridor evaluation evaluated by backend RouteComparisonService
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground border border-border font-mono">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Authoritative Backend Comparison</span>
        </div>
      </div>

      {/* WHAT-IF OPERATIONAL VIEW (IF WE CONTINUE vs IF WE REROUTE) */}
      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-amber-500" />
          <span>What-If Operational Projection: Continue vs Reroute</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scenario A: 🔵 If We Continue (Planned / Active Corridor) */}
          <div className="rounded-xl border-2 border-blue-500/40 bg-blue-500/5 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600 inline-block" />
                Scenario A: If We Continue
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                ACTIVE CORRIDOR
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Projected ETA</span>
                <span className="text-sm font-bold text-foreground">~{currentEta}m</span>
              </div>
              <div className="p-2 rounded bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Corridor Delay</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">+{currentDelay}m</span>
              </div>
              <div className="p-2 rounded bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Risk Tier</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{whatIfDoNothing?.operationalRisk || (currentDelay > 5 ? 'HIGH' : 'ELEVATED')}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {whatIfDoNothing?.summary || 'Continuing along the congested corridor will accumulate traffic penalties and delay emergency arrival.'}
            </p>
          </div>

          {/* Scenario B: 🟣 If We Reroute (Recommended Alternative Detour) */}
          <div className="rounded-xl border-2 border-purple-500/50 bg-purple-500/5 p-4 space-y-3 shadow-md shadow-purple-500/10">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-purple-600 inline-block" />
                Scenario B: If We Reroute
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                RECOMMENDED ALTERNATIVE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Projected ETA</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">~{primaryAltEta}m</span>
              </div>
              <div className="p-2 rounded bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Time Saved</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{timeSaved > 0 ? `-${timeSaved}m` : '0m'}</span>
              </div>
              <div className="p-2 rounded bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Distance Delta</span>
                <span className="text-sm font-bold text-foreground">
                  {distanceDeltaM > 0 ? `+${(distanceDeltaM / 1000).toFixed(1)}km` : `${(distanceDeltaM / 1000).toFixed(1)}km`}
                </span>
              </div>
            </div>

            <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
              {timeSaved > 0
                ? `Rerouting via the alternative corridor bypasses congestion, saving ${timeSaved} minutes in critical arrival time.`
                : 'Alternative corridor provides comparable transit time with lower incident exposure risk.'}
            </p>
          </div>
        </div>
      </div>

      {/* Rationale: "Why Did the Route Change?" */}
      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span>Causal Evidence &amp; Trigger Rationale</span>
        </div>

        {whyRouteChanged && whyRouteChanged.length > 0 ? (
          <div className="space-y-1.5 text-xs">
            {whyRouteChanged.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-foreground">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Corridor conditions evaluated within nominal limits. No critical disruption triggers detected.
          </div>
        )}
      </div>

      {/* Candidate Corridors Matrix Table (CURRENT ROUTE, ALTERNATIVE 1, ALTERNATIVE 2) */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Corridor Candidate</th>
              <th className="py-2.5 px-4 font-semibold">Provider</th>
              <th className="py-2.5 px-4 font-semibold">ETA</th>
              <th className="py-2.5 px-4 font-semibold">Distance</th>
              <th className="py-2.5 px-4 font-semibold">Traffic Delay</th>
              <th className="py-2.5 px-4 font-semibold">Time Saved</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono">
            {/* 🔵 PLANNED / ACTIVE CORRIDOR */}
            <tr className="hover:bg-muted/40 bg-blue-500/5">
              <td className="py-3 px-4 font-sans font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {currentRoute?.description || (currentRoute?.routeId ? `Current (${currentRoute.routeId})` : 'Planned / Active Corridor')}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground">{currentRoute?.provider || 'GOOGLE'}</td>
              <td className="py-3 px-4 font-bold text-blue-700 dark:text-blue-300">~{currentEta}m</td>
              <td className="py-3 px-4 text-foreground">{(currentDistanceM / 1000).toFixed(2)} km</td>
              <td className="py-3 px-4 text-rose-600 dark:text-rose-400">+{currentDelay}m</td>
              <td className="py-3 px-4 text-muted-foreground">Baseline</td>
              <td className="py-3 px-4 font-sans">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  ACTIVE CORRIDOR
                </span>
              </td>
            </tr>

            {/* 🟣 ALTERNATIVES */}
            {candidateAlts.length > 0 ? (
              candidateAlts.map((alt, idx) => {
                const altDuration = alt.durationSeconds || alt.duration || 0;
                const altEta = alt.etaMinutes ?? Math.max(1, Math.round(altDuration / 60));
                const altDistM = alt.distanceMeters || alt.distance || 0;
                const altTimeSaved = Math.max(0, currentEta - altEta);
                const altTrafficSec = alt.trafficDelaySeconds || 0;
                const isRecommended = alt.isRecommended || idx === 0;

                return (
                  <tr key={idx} className={isRecommended ? 'bg-purple-500/5 hover:bg-purple-500/10' : 'hover:bg-muted/40'}>
                    <td className="py-3 px-4 font-sans font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isRecommended ? 'bg-purple-600 animate-pulse' : 'bg-slate-400'}`} />
                        <span className={isRecommended ? 'font-bold text-purple-700 dark:text-purple-300' : 'text-muted-foreground'}>
                          {alt.name || alt.description || (isRecommended ? 'Recommended Alternative Detour' : `Alternative Route ${idx + 1}`)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{alt.provider || 'GOOGLE'}</td>
                    <td className={`py-3 px-4 font-bold ${isRecommended ? 'text-purple-700 dark:text-purple-300' : 'text-foreground'}`}>~{altEta}m</td>
                    <td className="py-3 px-4 text-foreground">{(altDistM / 1000).toFixed(2)} km</td>
                    <td className="py-3 px-4 text-muted-foreground">+{Math.round(altTrafficSec / 60)}m</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {altTimeSaved > 0 ? `saves ${altTimeSaved}m` : '0m'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {isRecommended ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                          RECOMMENDED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                          OTHER ALTERNATIVE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-4 px-4 text-center text-muted-foreground italic">
                  No alternative route candidates returned by routing service for this destination.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
