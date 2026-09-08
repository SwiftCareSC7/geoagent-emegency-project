/**
 * SwiftCare GeoAgent — Real-Time Socket.IO Client
 *
 * Provides a managed singleton connection to the Socket.IO server:
 * - Cookie session authentication (withCredentials: true)
 * - Automatic reconnection with exponential backoff
 * - Event envelope unwrapping
 * - Room subscription management
 */

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

export const REALTIME_EVENTS = {
  VEHICLE_LOCATION_UPDATED: 'vehicle.location.updated',
  VEHICLE_STATUS_UPDATED: 'vehicle.status.updated',
  TRAJECTORY_CREATED: 'trajectory.created',
  EMERGENCY_CREATED: 'emergency.created',
  EMERGENCY_UPDATED: 'emergency.updated',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_UPDATED: 'incident.updated',
  ROUTE_UPDATED: 'route.updated',
  ROUTE_DEVIATION_DETECTED: 'route.deviation.detected',
  TRAFFIC_UPDATED: 'traffic.updated',
  ETA_UPDATED: 'eta.updated',
  PREDICTION_UPDATED: 'prediction.updated',
  GEOAGENT_ANALYSIS_CREATED: 'geoagent.analysis.created',
  DECISION_CREATED: 'decision.created',
  DECISION_APPROVED: 'decision.approved',
  DECISION_REJECTED: 'decision.rejected',
  DECISION_EXECUTED: 'decision.executed',
  V2X_GREEN_WAVE_UPDATED: 'v2x.green_wave.updated',
  ORCHESTRATION_COMPLETED: 'orchestration.completed'
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/**
 * Initializes or returns the singleton Socket.IO connection
 */
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // Server-side rendering stub
    return null as unknown as Socket;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket.IO] Connected to ${SOCKET_URL} (id: ${socketInstance?.id})`);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn(`[Socket.IO] Connection error: ${err.message}`);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${reason}`);
    });
  }

  return socketInstance;
}

/**
 * Join an isolated channel room
 * Supports control-room, emergency:{id}, and vehicle:{id}
 */
export function joinRoom(room: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('room:join', { room });
    // Also emit command-style for backward compatibility
    if (room === 'control-room') socket.emit('join.control_room');
    else if (room.startsWith('emergency:')) socket.emit('join.emergency', { emergencyId: room.replace('emergency:', '') });
    else if (room.startsWith('vehicle:')) socket.emit('join.vehicle', { vehicleId: room.replace('vehicle:', '') });
  }
}

/**
 * Leave an isolated channel room
 */
export function leaveRoom(room: string): void {
  const socket = getSocket();
  if (socket) {
    socket.emit('room:leave', { room });
  }
}

/**
 * Subscribe to an authoritative server event with envelope unwrapping
 */
export function subscribeEvent<T = any>(
  eventName: string,
  callback: (payload: T, envelope?: any) => void
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  const handler = (raw: any) => {
    // Backend emits envelope: { event: string, payload: any, timestamp: string }
    if (raw && typeof raw === 'object' && 'payload' in raw) {
      callback(raw.payload, raw);
    } else {
      callback(raw);
    }
  };

  socket.on(eventName, handler);
  return () => {
    socket.off(eventName, handler);
  };
}
