'use client';

/**
 * SwiftCare GeoAgent — Real-Time Operational Hooks
 *
 * Provides reactive React hooks for Socket.IO event streams, room subscription,
 * telemetry updates, and evidence-based freshness badges.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  getSocket,
  joinRoom,
  leaveRoom,
  subscribeEvent,
  REALTIME_EVENTS
} from './client';

export type DataFreshness = 'LIVE' | 'STALE' | 'OFFLINE' | 'UNKNOWN';

export interface RealtimeLocationUpdate {
  vehicleId: string;
  location: { type: string; coordinates: [number, number] };
  speed: number;
  heading: number;
  timestamp: string;
}

export interface RealtimeDeviationUpdate {
  vehicleId: string;
  emergencyId?: string;
  status: string;
  crossTrackDistanceMeters?: number;
  bearingDifferenceDegrees?: number;
  stability?: string;
  timestamp: string;
}

export interface RealtimePredictionUpdate {
  vehicleId: string;
  emergencyId?: string;
  predictedEta: string;
  baselineEta: string;
  predictedDelayMinutes: number;
  predictedDelaySeconds: number;
  delayRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  routeRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  confidenceScore?: number;
  rerouteAdvised?: boolean;
  rerouteUrgency?: string;
  factors?: Array<{ factor: string; impact: string; epistemicType: string }>;
  baselineDurationMinutes?: number;
  baselineDurationSeconds?: number;
  predictedDurationMinutes?: number;
  predictedDurationSeconds?: number;
  modelVersion?: string;
  trafficSource?: string;
  predictedAt: string;
}

export interface RealtimeDecisionUpdate {
  decisionId: string;
  emergencyId?: string;
  vehicleId?: string;
  primaryAction?: string;
  action?: string;
  severity?: string;
  status: string;
  reasonCodes?: string[];
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  executedAt?: string;
  executionSummary?: string;
  timestamp?: string;
  updatedAt?: string;
}

export interface PredictionChangeDelta {
  previousEtaIso?: string;
  newEtaIso: string;
  previousDurationMinutes?: number;
  newDurationMinutes: number;
  durationDeltaMinutes: number;
  previousDelayMinutes?: number;
  newDelayMinutes: number;
  delayDeltaMinutes: number;
  previousDelayRisk?: string;
  newDelayRisk: string;
  previousRouteRisk?: string;
  newRouteRisk: string;
  reasons: string[];
}

export interface LiveTimelineEvent {
  id: string;
  type: string;
  label: string;
  detail: string;
  time: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

/**
 * Hook to track Socket.IO connection status
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');
  const [reconnected, setReconnected] = useState(false);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setStatus('DISCONNECTED');
      return;
    }

    const onConnect = () => {
      setIsConnected(true);
      setStatus('CONNECTED');
      if (wasConnectedRef.current) {
        setReconnected(true);
      }
      wasConnectedRef.current = true;
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setStatus('DISCONNECTED');
      setReconnected(false);
    };

    const onError = () => {
      setStatus('DISCONNECTED');
    };

    if (socket.connected) {
      setIsConnected(true);
      setStatus('CONNECTED');
      wasConnectedRef.current = true;
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, []);

  const acknowledgeReconnect = useCallback(() => {
    setReconnected(false);
  }, []);

  return { isConnected, status, reconnected, acknowledgeReconnect };
}

/**
 * Hook to monitor an active emergency corridor in real-time
 */
export function useRealtimeEmergency(emergencyId: string, vehicleId?: string) {
  const { isConnected, status: connectionStatus, reconnected, acknowledgeReconnect } = useSocketStatus();

  const [liveLocation, setLiveLocation] = useState<RealtimeLocationUpdate | null>(null);
  const [liveDeviation, setLiveDeviation] = useState<RealtimeDeviationUpdate | null>(null);
  const [livePrediction, setLivePrediction] = useState<RealtimePredictionUpdate | null>(null);
  const [predictionDelta, setPredictionDelta] = useState<PredictionChangeDelta | null>(null);
  const [liveDecision, setLiveDecision] = useState<RealtimeDecisionUpdate | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveTimelineEvent[]>([]);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [freshness, setFreshness] = useState<DataFreshness>('UNKNOWN');

  const prevPredictionRef = useRef<RealtimePredictionUpdate | null>(null);

  const emergencyRoom = emergencyId ? `emergency:${emergencyId}` : null;
  const vehicleRoom = vehicleId ? `vehicle:${vehicleId}` : null;

  // Manage room memberships
  useEffect(() => {
    if (!isConnected) return;

    joinRoom('control-room');
    if (emergencyRoom) joinRoom(emergencyRoom);
    if (vehicleRoom) joinRoom(vehicleRoom);

    return () => {
      if (emergencyRoom) leaveRoom(emergencyRoom);
      if (vehicleRoom) leaveRoom(vehicleRoom);
    };
  }, [isConnected, emergencyRoom, vehicleRoom]);

  const addTimelineEvent = useCallback((event: LiveTimelineEvent) => {
    setLiveEvents((prev) => {
      // Deduplicate by id
      if (prev.some((e) => e.id === event.id)) return prev;
      return [event, ...prev].slice(0, 50);
    });
  }, []);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubLocation = subscribeEvent<RealtimeLocationUpdate>(
      REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED,
      (data) => {
        if (!vehicleId || data.vehicleId === vehicleId) {
          setLiveLocation(data);
          const now = new Date();
          setLastEventTime(now);
          addTimelineEvent({
            id: `loc-${now.getTime()}`,
            type: 'TELEMETRY_UPDATE',
            label: 'Telemetry Received',
            detail: `Position fix: [${data.location?.coordinates?.[0]?.toFixed(4)}, ${data.location?.coordinates?.[1]?.toFixed(4)}], Speed: ${data.speed} km/h, Heading: ${data.heading}°`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: 'info'
          });
        }
      }
    );

    const unsubDeviation = subscribeEvent<RealtimeDeviationUpdate>(
      REALTIME_EVENTS.ROUTE_DEVIATION_DETECTED,
      (data) => {
        if (!vehicleId || data.vehicleId === vehicleId) {
          setLiveDeviation(data);
          const now = new Date();
          setLastEventTime(now);
          const isDeviated = data.status === 'DEVIATED' || data.status === 'CRITICAL_DEVIATION';
          addTimelineEvent({
            id: `dev-${now.getTime()}`,
            type: 'DEVIATION_DETECTED',
            label: isDeviated ? 'Route Deviation Detected' : 'Deviation Analysis Updated',
            detail: `Cross-track distance: ${Math.round(data.crossTrackDistanceMeters || 0)}m (${data.status}), Stability: ${data.stability || 'STABLE'}`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: isDeviated ? 'warning' : 'info'
          });
        }
      }
    );

    const unsubPrediction = subscribeEvent<RealtimePredictionUpdate>(
      REALTIME_EVENTS.PREDICTION_UPDATED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          const now = new Date();
          setLivePrediction(data);
          setLastEventTime(now);

          // Calculate change delta if previous prediction exists
          const prev = prevPredictionRef.current;
          if (prev) {
            const prevMinutes = prev.predictedDurationMinutes ?? Math.round(prev.predictedDelaySeconds / 60);
            const newMinutes = data.predictedDurationMinutes ?? Math.round(data.predictedDelaySeconds / 60);
            const prevDelay = prev.predictedDelayMinutes ?? 0;
            const newDelay = data.predictedDelayMinutes ?? 0;

            const reasons: string[] = [];
            if (newDelay > prevDelay) {
              reasons.push(`Corridor delay increased by +${Number((newDelay - prevDelay).toFixed(1))} min`);
            } else if (newDelay < prevDelay) {
              reasons.push(`Corridor delay decreased by -${Number((prevDelay - newDelay).toFixed(1))} min`);
            }
            if (prev.delayRisk !== data.delayRisk) {
              reasons.push(`Delay risk shifted from ${prev.delayRisk} to ${data.delayRisk}`);
            }
            if (prev.routeRisk !== data.routeRisk) {
              reasons.push(`Route risk shifted from ${prev.routeRisk} to ${data.routeRisk}`);
            }

            setPredictionDelta({
              previousEtaIso: prev.predictedEta,
              newEtaIso: data.predictedEta,
              previousDurationMinutes: prevMinutes,
              newDurationMinutes: newMinutes,
              durationDeltaMinutes: Number((newMinutes - prevMinutes).toFixed(1)),
              previousDelayMinutes: prevDelay,
              newDelayMinutes: newDelay,
              delayDeltaMinutes: Number((newDelay - prevDelay).toFixed(1)),
              previousDelayRisk: prev.delayRisk,
              newDelayRisk: data.delayRisk,
              previousRouteRisk: prev.routeRisk,
              newRouteRisk: data.routeRisk,
              reasons: reasons.length > 0 ? reasons : ['Periodic model recalculation from fresh GPS fixes']
            });
          }

          prevPredictionRef.current = data;

          addTimelineEvent({
            id: `pred-${now.getTime()}`,
            type: 'PREDICTION_UPDATED',
            label: 'Prediction Updated',
            detail: `Predicted arrival duration: ${data.predictedDurationMinutes ?? Math.round(data.predictedDurationSeconds ? data.predictedDurationSeconds / 60 : 0)} min (delay: +${data.predictedDelayMinutes} min, risk: ${data.delayRisk})`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: data.delayRisk === 'CRITICAL' || data.delayRisk === 'HIGH' ? 'critical' : (data.delayRisk === 'MEDIUM' ? 'warning' : 'info')
          });
        }
      }
    );

    const unsubDecisionCreated = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_CREATED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision(data);
          const now = new Date();
          setLastEventTime(now);
          addTimelineEvent({
            id: `dec-created-${data.decisionId || now.getTime()}`,
            type: 'DECISION_PROPOSED',
            label: 'Decision Proposal Generated',
            detail: `Action: ${data.primaryAction}, Severity: ${data.severity}, Status: ${data.status || 'PENDING_OPERATOR_ACTION'}`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: data.severity === 'CRITICAL' ? 'critical' : 'warning'
          });
        }
      }
    );

    const unsubDecisionApproved = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_APPROVED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision((prev) => (prev ? { ...prev, status: 'APPROVED' } : data));
          const now = new Date();
          setLastEventTime(now);
          addTimelineEvent({
            id: `dec-app-${data.decisionId || now.getTime()}`,
            type: 'OPERATOR_APPROVED',
            label: 'Decision Approved by Operator',
            detail: `Proposal ${data.decisionId || ''} approved for action: ${data.primaryAction}`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: 'success'
          });
        }
      }
    );

    const unsubDecisionRejected = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_REJECTED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision((prev) => (prev ? { ...prev, status: 'REJECTED' } : data));
          const now = new Date();
          setLastEventTime(now);
          addTimelineEvent({
            id: `dec-rej-${data.decisionId || now.getTime()}`,
            type: 'OPERATOR_REJECTED',
            label: 'Decision Rejected by Operator',
            detail: `Proposal ${data.decisionId || ''} rejected. ${data.rejectionReason ? `Rationale: ${data.rejectionReason}` : ''}`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: 'warning'
          });
        }
      }
    );

    const unsubDecisionExecuted = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_EXECUTED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision((prev) => (prev ? { ...prev, status: 'EXECUTED' } : data));
          const now = new Date();
          setLastEventTime(now);
          addTimelineEvent({
            id: `dec-exec-${data.decisionId || now.getTime()}`,
            type: 'DECISION_EXECUTED',
            label: 'Decision Executed',
            detail: `State transitioned to EXECUTED. ${data.executionSummary || ''}`,
            time: now.toLocaleTimeString(),
            timestamp: now,
            severity: 'success'
          });
        }
      }
    );

    return () => {
      unsubLocation();
      unsubDeviation();
      unsubPrediction();
      unsubDecisionCreated();
      unsubDecisionApproved();
      unsubDecisionRejected();
      unsubDecisionExecuted();
    };
  }, [emergencyId, vehicleId, addTimelineEvent]);

  // Periodic freshness evaluation (every 5 seconds)
  useEffect(() => {
    const evaluate = () => {
      if (!lastEventTime) {
        setFreshness('UNKNOWN');
        return;
      }
      const ageSec = (Date.now() - lastEventTime.getTime()) / 1000;
      if (ageSec < 15) {
        setFreshness('LIVE');
      } else if (ageSec < 60) {
        setFreshness('STALE');
      } else {
        setFreshness('OFFLINE');
      }
    };

    evaluate();
    const interval = setInterval(evaluate, 5000);
    return () => clearInterval(interval);
  }, [lastEventTime]);

  const getAgeString = useCallback(() => {
    if (!lastEventTime) return 'No live events received';
    const sec = Math.round((Date.now() - lastEventTime.getTime()) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return `${min}m ago`;
  }, [lastEventTime]);

  return {
    isConnected,
    connectionStatus,
    reconnected,
    acknowledgeReconnect,
    liveLocation,
    liveDeviation,
    livePrediction,
    predictionDelta,
    liveDecision,
    liveEvents,
    lastEventTime,
    freshness,
    getAgeString
  };
}
