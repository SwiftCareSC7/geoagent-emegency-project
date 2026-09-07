'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertOctagon,
  FileCheck2,
  Lock
} from 'lucide-react';
import { decisionApi } from '@/lib/api/decisions';
import type { Decision } from '@/lib/api/types';
import type { RealtimeDecisionUpdate } from '@/lib/socket/useRealtime';

interface DecisionApprovalCardProps {
  decision: Decision | null;
  liveDecision?: RealtimeDecisionUpdate | null;
  emergencyId: string;
  onDecisionUpdated?: (updated: Decision) => void;
}

export function DecisionApprovalCard({
  decision,
  liveDecision,
  emergencyId,
  onDecisionUpdated
}: DecisionApprovalCardProps) {
  const [isActing, setIsActing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active decision state merges baseline with live socket push
  const currentStatus = liveDecision?.status || decision?.status || 'PENDING_OPERATOR_ACTION';
  const decisionId = liveDecision?.decisionId || decision?.decisionId || 'DEC-PENDING';
  const action = liveDecision?.primaryAction || decision?.primaryAction || 'REROUTE';
  const severity = liveDecision?.severity || decision?.severity || 'WARNING';
  const reasonCodes = liveDecision?.reasonCodes || decision?.reasonCodes || ['CORRIDOR_CONGESTION_PENALTY', 'TRAFFIC_DELAY_EXCEEDS_THRESHOLD'];

  const handleApprove = async () => {
    if (!decisionId || decisionId === 'DEC-PENDING') return;
    setIsActing(true);
    setFeedback(null);
    try {
      const res = await decisionApi.approve(decisionId, 'Operator approved corridor reroute via dispatch console');
      setFeedback({ type: 'success', message: 'Decision approved! Route update dispatched to ambulance navigation system.' });
      if (onDecisionUpdated && res.data) {
        onDecisionUpdated(res.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve decision' });
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!decisionId || decisionId === 'DEC-PENDING') return;
    setIsActing(true);
    setFeedback(null);
    try {
      const res = await decisionApi.reject(decisionId, 'Operator rejected recommendation; maintain current corridor');
      setFeedback({ type: 'success', message: 'Decision rejected. Vehicle will remain on existing route corridor.' });
      if (onDecisionUpdated && res.data) {
        onDecisionUpdated(res.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject decision' });
    } finally {
      setIsActing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'REJECTED':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'EXECUTED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PENDING_OPERATOR_ACTION':
      default:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse';
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-100">Authoritative Decision Engine</h3>
              <span className="text-xs font-mono text-zinc-500">{decisionId}</span>
            </div>
            <p className="text-xs text-zinc-400">
              Deterministic safety rules + Human-in-the-loop operational authorization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full border ${getStatusBadge(currentStatus)}`}>
            {currentStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Decision Summary */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Proposed Action</div>
          <div className="mt-1 text-base font-bold text-amber-400">{action}</div>
          <div className="text-[11px] text-zinc-500">Corridor redirection</div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Operational Severity</div>
          <div className="mt-1 text-base font-bold text-zinc-200">{severity}</div>
          <div className="text-[11px] text-zinc-500">Policy tier</div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
          <div className="text-xs font-medium text-zinc-400">Operator Mandate</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Approval Required</span>
          </div>
          <div className="text-[11px] text-zinc-500">Safety state machine rule</div>
        </div>
      </div>

      {/* Reason Codes */}
      {reasonCodes && reasonCodes.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Safety Trigger Reason Codes
          </div>
          <div className="flex flex-wrap gap-1.5">
            {reasonCodes.map((code, idx) => (
              <span
                key={idx}
                className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[11px] font-mono text-zinc-300"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mt-4 rounded-lg border p-3 text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertOctagon className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Operator Action Buttons */}
      {currentStatus === 'PENDING_OPERATOR_ACTION' ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/60 pt-4">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-zinc-400" />
            <span>Awaiting manual confirmation by Control Room dispatcher</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReject}
              disabled={isActing}
              className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
            >
              Reject Proposal
            </button>
            <button
              onClick={handleApprove}
              disabled={isActing}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-all disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Approve & Dispatch Reroute</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
          <span>Decision status transitioned to <strong className="text-zinc-300">{currentStatus}</strong></span>
          <span className="text-[11px]">Audit log recorded</span>
        </div>
      )}
    </div>
  );
}
