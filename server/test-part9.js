import http from 'http';
import { io as ioClient } from 'socket.io-client';
import express from 'express';
import realtimeService from './modules/realtime/realtime.service.js';
import { REALTIME_EVENTS, CLIENT_COMMANDS, REALTIME_ROOMS } from './modules/realtime/realtime.constants.js';

console.log('=== RUNNING PART 9 REAL-TIME & SOCKET.IO TESTS ===\n');

// 1. Setup mock test HTTP server with Socket.IO
const app = express();
const httpServer = http.createServer(app);

// Realtime service initialization
const io = realtimeService.init(httpServer, {
  clientUrl: 'http://localhost:3000'
});

// Start listening on ephemeral test port
await new Promise((resolve) => httpServer.listen(0, resolve));
const port = httpServer.address().port;
const serverUrl = `http://localhost:${port}`;

console.log(`1. Test Socket.IO server running on port ${port}`);

// 2. No login: a client with no token/cookie connects and receives the control-room feed
console.log('\n2. Testing connection without any credentials...');
const clientSocket = await new Promise((resolve, reject) => {
  const socket = ioClient(serverUrl, {
    transports: ['websocket'],
    reconnection: false
  });

  socket.on('connect', () => {
    console.log('Connected without credentials:', socket.id);
    resolve(socket);
  });

  socket.on('connect_error', (err) => {
    reject(new Error(`Unauthenticated connection failed: ${err.message}`));
  });
});

// 5. Test Event Broadcasting: vehicle.location.updated
console.log('\n5. Testing vehicle.location.updated broadcast...');
const locationPromise = new Promise((resolve) => {
  clientSocket.on(REALTIME_EVENTS.VEHICLE_LOCATION_UPDATED, (envelope) => {
    console.log('Received event envelope:', envelope.event, 'version:', envelope.version);
    console.log('Vehicle data:', envelope.data);
    if (envelope.version !== 1 || envelope.data.vehicleId !== 'AMB-001') {
      throw new Error('Malformed vehicle.location.updated event');
    }
    resolve();
  });
});

realtimeService.emitVehicleLocationUpdated('AMB-001', {
  vehicleId: 'AMB-001',
  location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  speedKmh: 45,
  heading: 90,
  recordedAt: new Date().toISOString()
});

await locationPromise;

// 6. Test Event Broadcasting: route.deviation.detected
console.log('\n6. Testing route.deviation.detected broadcast...');
const devPromise = new Promise((resolve) => {
  clientSocket.on(REALTIME_EVENTS.ROUTE_DEVIATION_DETECTED, (envelope) => {
    console.log('Received deviation event:', envelope.data);
    if (envelope.data.status !== 'DEVIATED' || envelope.data.distanceFromRouteMeters !== 180) {
      throw new Error('Malformed route.deviation.detected event');
    }
    resolve();
  });
});

realtimeService.emitRouteDeviation('AMB-001', 'EMG-0001', {
  vehicleId: 'AMB-001',
  routeId: 'ROUTE-0001',
  emergencyId: 'EMG-0001',
  status: 'DEVIATED',
  distanceFromRouteMeters: 180,
  bearingDifferenceDegrees: 75,
  gpsStability: 'STABLE',
  confidence: 'HIGH'
});

await devPromise;

// 7. Test Event Broadcasting: geoagent.analysis.created
console.log('\n7. Testing geoagent.analysis.created broadcast...');
const geoPromise = new Promise((resolve) => {
  clientSocket.on(REALTIME_EVENTS.GEOAGENT_ANALYSIS_CREATED, (envelope) => {
    console.log('Received GeoAgent analysis event:', envelope.data.recommendation);
    if (envelope.data.recommendation.action !== 'REROUTE') {
      throw new Error('Malformed geoagent.analysis.created event');
    }
    resolve();
  });
});

realtimeService.emitGeoAgentAnalysis('EMG-0001', 'AMB-001', {
  status: 'ANALYZED',
  vehicleId: 'AMB-001',
  emergencyId: 'EMG-0001',
  assessment: { routeStatus: 'DEVIATED', likelyCause: 'ACCIDENT_INDUCED_CONGESTION' },
  recommendation: { action: 'REROUTE', summary: 'Reroute via express bypass' }
});

await geoPromise;

// 8. Cleanup & Disconnect
console.log('\n8. Cleaning up client socket and HTTP test server...');
clientSocket.disconnect();
await new Promise((resolve) => httpServer.close(resolve));

console.log('\n=== ALL PART 9 REAL-TIME & SOCKET.IO TESTS PASSED SUCCESSFULLY! ===');
