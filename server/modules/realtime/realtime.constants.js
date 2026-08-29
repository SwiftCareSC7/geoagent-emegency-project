/**
 * Centralized Real-Time Event Names, Client Commands, and Room Names
 */

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
  GEOAGENT_ANALYSIS_CREATED: 'geoagent.analysis.created',
  DECISION_CREATED: 'decision.created',
  DECISION_APPROVED: 'decision.approved',
  DECISION_REJECTED: 'decision.rejected',
  DECISION_EXECUTED: 'decision.executed'
};

export const CLIENT_COMMANDS = {
  JOIN_CONTROL_ROOM: 'join.control_room',
  LEAVE_CONTROL_ROOM: 'leave.control_room',
  JOIN_EMERGENCY: 'join.emergency',
  LEAVE_EMERGENCY: 'leave.emergency',
  JOIN_VEHICLE: 'join.vehicle',
  LEAVE_VEHICLE: 'leave.vehicle'
};

export const REALTIME_ROOMS = {
  CONTROL_ROOM: 'control-room',
  emergency: (emergencyId) => `emergency:${emergencyId}`,
  vehicle: (vehicleId) => `vehicle:${vehicleId}`
};

export default {
  REALTIME_EVENTS,
  CLIENT_COMMANDS,
  REALTIME_ROOMS
};
