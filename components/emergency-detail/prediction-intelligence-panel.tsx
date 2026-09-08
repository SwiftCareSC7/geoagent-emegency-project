'use client';

import React from 'react';
import {
  TrendingDown,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Activity,
  Gauge
} from 'lucide-react';
import type { PredictionResult } from '@/lib/api/types';
import type { RealtimePredictionUpdate, PredictionChangeDelta } from '@/lib/socket/useRealtime';

interface PredictionIntelligencePanelProps {
  prediction: PredictionResult | null;
  livePrediction?: RealtimePredictionUpdate | null;
  predictionDelta?: PredictionChangeDelta | null;
  isLoading?: boolean;
}

export function PredictionIntelligencePanel({
  prediction,
  livePrediction,
  predictionDelta,
  isLoading = false
}: PredictionIntelligencePanelProps) {
  // Merge REST baseline with live socket push if available
  const activePrediction = livePrediction || prediction;

  if (isLoading && !activePrediction) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Computing arrival prediction from telemetry trend...</p>
        </div>
      </div>
    );
  }

  if (!activePrediction) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="h-5 w-5 text-zinc-500" />
          <h3 className="font-semibold text-zinc-200">Real-Time Arrival & Delay Prediction</h3>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Insufficient telemetry recorded. Minimum 2 vehicle GPS fixes required to establish speed trend and project arrival variance.
        </p>
      </div>
    );
  }

  const delayMinutes = activePrediction.predictedDelayMinutes;
  const delayRisk = activePrediction.delayRisk || 'LOW';
  const routeRisk = activePrediction.routeRisk || 'LOW';
  const confidence = activePrediction.confidence || 'UNKNOWN';
  const confidenceScore = activePrediction.confidenceScore !== undefined
    ? Math.round(activePrediction.confidenceScore * 100)
    : null;

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'HIGH':
        return 'text-emerald-400';
      case 'MEDIUM':
        return 'text-amber-400';
      case 'LOW':
      case 'UNKNOWN':
      default:
        return 'text-zinc-400';
    }
  };

  const formatIsoTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-100">ETA & Delay Prediction Engine</h3>
              {livePrediction && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Feed
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Quantitative exponential smoothing + Google traffic-aware blend
            </p>
          </div>
        </div>

        {/* Reroute Advisability Pill */}
        {activePrediction.rerouteAdvised ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span>REROUTE ADVISED ({activePrediction.rerouteUrgency || 'HIGH'})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>CONTINUE PLANNED CORRIDOR</span>
          </div>
        )}
      </div>

      {/* Prediction Change Visualization (when prediction changed from previous fix) */}
      {predictionDelta && (
        <div className="mt-4 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <TrendingDown className="h-4 w-4 text-indigo-400" />
              <span>Prediction Shift Detected</span>
            </div>
            <span className="font-mono text-[11px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">
              Updated Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-zinc-950/40 border border-indigo-500/20">
              <span className="text-zinc-400 block text-[10px]">Predicted Transit:</span>
              <span className="font-bold text-zinc-100">
                {predictionDelta.previousDurationMinutes !== undefined ? `${predictionDelta.previousDurationMinutes}m` : '—'} → {predictionDelta.newDurationMinutes}m
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-950/40 border border-indigo-500/20">
              <span className="text-zinc-400 block text-[10px]">Accumulated Delay:</span>
              <span className={`font-bold ${predictionDelta.delayDeltaMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {predictionDelta.delayDeltaMinutes > 0 ? `+${predictionDelta.delayDeltaMinutes} min` : `${predictionDelta.delayDeltaMinutes} min`}
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-950/40 border border-indigo-500/20">
              <span className="text-zinc-400 block text-[10px]">Risk Tier Shift:</span>
              <span className="font-bold text-zinc-200">
                {predictionDelta.previousDelayRisk || 'LOW'} → <strong className="text-amber-400">{predictionDelta.newDelayRisk}</strong>
              </span>
            </div>
          </div>

          {predictionDelta.reasons.length > 0 && (
            <div className="text-[11px] text-zinc-300 pt-1 flex items-start gap-1.5">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Causal Trigger: {predictionDelta.reasons.join('; ')}</span>
            </div>
          )}
        </div>
      )}

      {/* User-Friendly Takeaway Callout Box */}
      <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-emerald-400">
          <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Executive Takeaway: {delayMinutes > 0 ? `+${delayMinutes} min Delay Expected` : 'On Schedule'}</span>
        </div>
        <p className="text-emerald-100/90 leading-relaxed">
          {delayMinutes > 0
            ? `Current traffic conditions add +${delayMinutes} minutes to Route A. The system recommends switching to Route B to arrive on time.`
            : 'Vehicle is moving smoothly along the corridor with no significant delays.'}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Baseline Planned ETA</div>
          <div className="mt-1 text-lg font-bold text-zinc-200">
            {formatIsoTime(activePrediction.baselineEta)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {activePrediction.baselineDurationMinutes ?? (activePrediction.baselineDurationSeconds ? Math.round(activePrediction.baselineDurationSeconds / 60) : 10)} min baseline
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Predicted Arrival</div>
          <div className="mt-1 text-lg font-bold text-emerald-400">
            {formatIsoTime(activePrediction.predictedEta)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {activePrediction.predictedDurationMinutes ?? (activePrediction.predictedDurationSeconds ? Math.round(activePrediction.predictedDurationSeconds / 60) : 12)} min projected
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Predicted Delay</div>
          <div className={`mt-1 text-lg font-bold ${delayMinutes > 2 ? 'text-amber-400' : 'text-zinc-200'}`}>
            {delayMinutes > 0 ? `+${delayMinutes} min` : 'On Schedule'}
          </div>
          <div className="mt-1">
            <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getRiskBadge(delayRisk)}`}>
              {delayRisk} RISK
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Model Confidence</div>
          <div className={`mt-1 text-lg font-bold ${getConfidenceColor(confidence)}`}>
            {confidence}
            {confidenceScore !== null && <span className="text-xs text-zinc-400 ml-1">({confidenceScore}%)</span>}
          </div>
          <div className="mt-1">
            <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getRiskBadge(routeRisk)}`}>
              ROUTE: {routeRisk}
            </span>
          </div>
        </div>
      </div>

      {/* Structured Prediction Factors */}
      {activePrediction.factors && activePrediction.factors.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            Quantified Decision Factors
          </div>
          <div className="space-y-2">
            {activePrediction.factors.map((f, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2.5 text-xs"
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span className="text-zinc-300">{f.factor}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
                    {f.impact}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      f.epistemicType === 'OBSERVED'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : f.epistemicType === 'DERIVED'
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {f.epistemicType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Attribution Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between text-[11px] text-zinc-500">
        <span>Model Version: {activePrediction.modelVersion || 'v1.2-exponential-traffic-blend'}</span>
        <span>Source: {activePrediction.trafficSource || 'Google Routes + Telemetry'}</span>
        <span>Predicted: {formatIsoTime(activePrediction.predictedAt)}</span>
      </div>
    </div>
  );
}
