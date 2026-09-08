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
    summary?: string;
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Split className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Candidate Route Comparison & What-If Analysis</h3>
            <p className="text-xs text-zinc-400">
              Authoritative multi-corridor evaluation evaluated by backend RouteComparisonService
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-400 border border-zinc-700/50 font-mono">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Authoritative Backend Comparison</span>
        </div>
      </div>

      {/* WHAT-IF OPERATIONAL VIEW (IF WE CONTINUE vs IF WE REROUTE) */}
      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-amber-400" />
          <span>What-If Operational Projection: Continue vs Reroute</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scenario A: If We Continue */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                Scenario A: If We Continue
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                ACTIVE CORRIDOR
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Projected ETA</span>
                <span className="text-sm font-bold text-zinc-200">~{currentEta}m</span>
              </div>
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Corridor Delay</span>
                <span className="text-sm font-bold text-rose-400">+{currentDelay}m</span>
              </div>
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Risk Tier</span>
                <span className="text-sm font-bold text-amber-400">{whatIfDoNothing?.operationalRisk || (currentDelay > 5 ? 'HIGH' : 'ELEVATED')}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {whatIfDoNothing?.summary || 'Continuing along the congested corridor will accumulate traffic penalties and delay emergency arrival.'}
            </p>
          </div>

          {/* Scenario B: If We Reroute */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Scenario B: If We Reroute
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {primaryAlt?.name || 'ALTERNATIVE 1'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Projected ETA</span>
                <span className="text-sm font-bold text-emerald-400">~{primaryAltEta}m</span>
              </div>
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Time Saved</span>
                <span className="text-sm font-bold text-emerald-400">{timeSaved > 0 ? `-${timeSaved}m` : '0m'}</span>
              </div>
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block">Distance Delta</span>
                <span className="text-sm font-bold text-zinc-300">
                  {distanceDeltaM > 0 ? `+${(distanceDeltaM / 1000).toFixed(1)}km` : `${(distanceDeltaM / 1000).toFixed(1)}km`}
                </span>
              </div>
            </div>

            <p className="text-xs text-emerald-300/90 leading-relaxed">
              {timeSaved > 0
                ? `Rerouting via the alternative corridor bypasses congestion, saving ${timeSaved} minutes in critical arrival time.`
                : 'Alternative corridor provides comparable transit time with lower incident exposure risk.'}
            </p>
          </div>
        </div>
      </div>

      {/* Rationale: "Why Did the Route Change?" */}
      <div className="mt-5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
          <HelpCircle className="h-4 w-4 text-indigo-400" />
          <span>Causal Evidence & Trigger Rationale</span>
        </div>

        {whyRouteChanged && whyRouteChanged.length > 0 ? (
          <div className="space-y-1.5 text-xs">
            {whyRouteChanged.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-zinc-300">
                <span className="text-indigo-400 font-bold mt-0.5">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 italic">
            Corridor conditions evaluated within nominal limits. No critical disruption triggers detected.
          </div>
        )}
      </div>

      {/* Candidate Corridors Matrix Table (CURRENT ROUTE, ALTERNATIVE 1, ALTERNATIVE 2) */}
      <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400">
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
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {/* CURRENT ROUTE */}
            <tr className="hover:bg-zinc-900/40">
              <td className="py-3 px-4 font-sans font-medium text-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>{currentRoute?.description || (currentRoute?.routeId ? `Current (${currentRoute.routeId})` : 'Current Route')}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-zinc-400">{currentRoute?.provider || 'GOOGLE'}</td>
              <td className="py-3 px-4 font-bold text-amber-400">~{currentEta}m</td>
              <td className="py-3 px-4 text-zinc-300">{(currentDistanceM / 1000).toFixed(2)} km</td>
              <td className="py-3 px-4 text-rose-400">+{currentDelay}m</td>
              <td className="py-3 px-4 text-zinc-500">Baseline</td>
              <td className="py-3 px-4 font-sans">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  ACTIVE
                </span>
              </td>
            </tr>

            {/* ALTERNATIVES */}
            {candidateAlts.length > 0 ? (
              candidateAlts.map((alt, idx) => {
                const altDuration = alt.durationSeconds || alt.duration || 0;
                const altEta = alt.etaMinutes ?? Math.max(1, Math.round(altDuration / 60));
                const altDistM = alt.distanceMeters || alt.distance || 0;
                const altTimeSaved = Math.max(0, currentEta - altEta);
                const altTrafficSec = alt.trafficDelaySeconds || 0;
                const isRecommended = alt.isRecommended || idx === 0;

                return (
                  <tr key={idx} className={isRecommended ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-zinc-900/40'}>
                    <td className="py-3 px-4 font-sans font-medium text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isRecommended ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                        <span className={isRecommended ? 'text-emerald-300' : 'text-zinc-300'}>
                          {alt.name || alt.description || `Alternative Route ${idx + 1}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{alt.provider || 'GOOGLE'}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">~{altEta}m</td>
                    <td className="py-3 px-4 text-zinc-300">{(altDistM / 1000).toFixed(2)} km</td>
                    <td className="py-3 px-4 text-zinc-400">+{Math.round(altTrafficSec / 60)}m</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {altTimeSaved > 0 ? `saves ${altTimeSaved}m` : '0m'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {isRecommended ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          RECOMMENDED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                          EVALUATED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-4 px-4 text-center text-zinc-500 italic">
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
