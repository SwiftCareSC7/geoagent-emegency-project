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
  primaryAction: string;
  severity: string;
  status: string;
  reasonCodes?: string[];
  updatedAt?: string;
}

/**
 * Hook to track Socket.IO connection status
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setStatus('DISCONNECTED');
      return;
    }

    const onConnect = () => {
      setIsConnected(true);
      setStatus('CONNECTED');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setStatus('DISCONNECTED');
    };

    const onError = () => {
      setStatus('DISCONNECTED');
    };

    if (socket.connected) {
      setIsConnected(true);
      setStatus('CONNECTED');
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

  return { isConnected, status };
}

/**
 * Hook to monitor an active emergency corridor in real-time
 */
export function useRealtimeEmergency(emergencyId: string, vehicleId?: string) {
  const { isConnected, status: connectionStatus } = useSocketStatus();

  const [liveLocation, setLiveLocation] = useState<RealtimeLocationUpdate | null>(null);
  const [liveDeviation, setLiveDeviation] = useState<RealtimeDeviationUpdate | null>(null);
  const [livePrediction, setLivePrediction] = useState<RealtimePredictionUpdate | null>(null);
  const [liveDecision, setLiveDecision] = useState<RealtimeDecisionUpdate | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [freshness, setFreshness] = useState<DataFreshness>('UNKNOWN');

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

  // Subscribe to real-time events
  useEffect(() => {
    const unsubLocation = subscribeEvent<RealtimeLocationUpdate>(
      REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED,
      (data) => {
        if (!vehicleId || data.vehicleId === vehicleId) {
          setLiveLocation(data);
          setLastEventTime(new Date());
        }
      }
    );

    const unsubDeviation = subscribeEvent<RealtimeDeviationUpdate>(
      REALTIME_EVENTS.ROUTE_DEVIATION_DETECTED,
      (data) => {
        if (!vehicleId || data.vehicleId === vehicleId) {
          setLiveDeviation(data);
          setLastEventTime(new Date());
        }
      }
    );

    const unsubPrediction = subscribeEvent<RealtimePredictionUpdate>(
      REALTIME_EVENTS.PREDICTION_UPDATED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLivePrediction(data);
          setLastEventTime(new Date());
        }
      }
    );

    const unsubDecisionCreated = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_CREATED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision(data);
          setLastEventTime(new Date());
        }
      }
    );

    const unsubDecisionApproved = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_APPROVED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision((prev) => (prev ? { ...prev, status: 'APPROVED' } : data));
          setLastEventTime(new Date());
        }
      }
    );

    const unsubDecisionRejected = subscribeEvent<RealtimeDecisionUpdate>(
      REALTIME_EVENTS.DECISION_REJECTED,
      (data) => {
        if (!emergencyId || !data.emergencyId || data.emergencyId === emergencyId) {
          setLiveDecision((prev) => (prev ? { ...prev, status: 'REJECTED' } : data));
          setLastEventTime(new Date());
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
    };
  }, [emergencyId, vehicleId]);

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
    liveLocation,
    liveDeviation,
    livePrediction,
    liveDecision,
    lastEventTime,
    freshness,
    getAgeString
  };
}
