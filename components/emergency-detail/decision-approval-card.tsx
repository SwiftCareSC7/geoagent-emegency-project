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
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Operator rejected recommendation; maintain current corridor');
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
      setFeedback({ type: 'success', message: 'Decision approved! State transitioned to APPROVED in database.' });
      if (onDecisionUpdated && res.data) {
        onDecisionUpdated(res.data);
      }
    } catch (err: any) {
      const isConflict = err?.status === 409 || err?.message?.includes('Invalid decision state transition');
      setFeedback({
        type: 'error',
        message: isConflict
          ? 'Concurrency Conflict: Another operator has already acted on this decision. State refreshed.'
          : (err.message || 'Failed to approve decision')
      });
    } finally {
      setIsActing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!decisionId || decisionId === 'DEC-PENDING') return;
    setIsActing(true);
    setFeedback(null);
    try {
      const res = await decisionApi.reject(decisionId, rejectionReason);
      setFeedback({ type: 'success', message: 'Decision rejected. Vehicle will remain on existing route corridor.' });
      setRejecting(false);
      if (onDecisionUpdated && res.data) {
        onDecisionUpdated(res.data);
      }
    } catch (err: any) {
      const isConflict = err?.status === 409 || err?.message?.includes('Invalid decision state transition');
      setFeedback({
        type: 'error',
        message: isConflict
          ? 'Concurrency Conflict: Another operator has already acted on this decision. State refreshed.'
          : (err.message || 'Failed to reject decision')
      });
    } finally {
      setIsActing(false);
    }
  };

  const handleExecute = async () => {
    if (!decisionId || decisionId === 'DEC-PENDING') return;
    setIsActing(true);
    setFeedback(null);
    try {
      const res = await decisionApi.execute(decisionId);
      setFeedback({
        type: 'success',
        message: 'Decision executed! Internal route suggestion recorded and real-time event broadcasted.'
      });
      if (onDecisionUpdated && res.data) {
        onDecisionUpdated(res.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to execute decision' });
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
            <span>{currentStatus === 'PENDING_OPERATOR_ACTION' ? 'Approval Required' : 'Authorization Recorded'}</span>
          </div>
          <div className="text-[11px] text-zinc-500">State machine transition</div>
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

      {/* Rejection Prompt Form (when rejecting is active) */}
      {rejecting && currentStatus === 'PENDING_OPERATOR_ACTION' && (
        <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-red-500/5 space-y-3">
          <div className="text-xs font-semibold text-red-300">
            Operator Rejection Rationale (Audit Trail)
          </div>
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejecting this proposal..."
            className="w-full text-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejecting(false)}
              disabled={isActing}
              className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={isActing}
              className="px-3 py-1 text-xs rounded bg-red-600 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {isActing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}

      {/* Operator Action Buttons */}
      {currentStatus === 'PENDING_OPERATOR_ACTION' && !rejecting && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/60 pt-4">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-zinc-400" />
            <span>Awaiting manual confirmation by Control Room dispatcher</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setRejecting(true)}
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
              <span>{isActing ? 'Approving...' : 'Approve Proposal'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Approved state: Execution available */}
      {currentStatus === 'APPROVED' && (
        <div className="mt-5 border-t border-zinc-800/60 pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Decision approved. Ready for controlled action execution.</span>
            </div>
            <button
              onClick={handleExecute}
              disabled={isActing}
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isActing ? 'Executing...' : 'Execute Decision'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Operational Note: Decision execution records the authoritative state transition and triggers internal routing updates. It does not physically override vehicle navigation hardware unless an external vehicle hardware integration exists.
          </p>
        </div>
      )}

      {/* Executed state */}
      {currentStatus === 'EXECUTED' && (
        <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-semibold">Decision Executed</span>
            <span className="text-[11px] font-mono text-zinc-500">State: EXECUTED</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Authoritative state transition finalized in database and broadcasted to all control room channels.
          </p>
        </div>
      )}

      {/* Rejected state */}
      {currentStatus === 'REJECTED' && (
        <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-semibold">Decision Rejected</span>
            <span className="text-[11px] font-mono text-zinc-500">State: REJECTED</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Proposal rejected by operator. Vehicle maintains current corridor trajectory.
          </p>
        </div>
      )}
    </div>
  );
}
