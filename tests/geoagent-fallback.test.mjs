import test from 'node:test';
import assert from 'node:assert/strict';
import GeoAgentService from '../server/modules/geoagents/geoAgent.service.js';

const situation = (over = {}) => ({
  vehicleId: 'AMB-01',
  emergencyId: 'E-OTHER',
  deviation: { status: 'DEVIATED', distanceFromRouteMeters: 420 },
  eta: { currentMinutes: 22, originalMinutes: 8 },
  delay: { delayMinutes: 14 },
  traffic: { level: 'HEAVY' },
  incidents: [],
  ...over
});

test('fallback uses situation.delay (no "undefined" text) and recommends backup at >=10 min delay', () => {
  const r = GeoAgentService.generateFallbackResponse(situation(), 'test');
  assert.doesNotMatch(JSON.stringify(r), /undefined/);
  assert.match(r.reasoning, /14 minutes/);
  assert.equal(r.backup.recommended, true);
});

test('fallback with no delay data degrades to 0 and stays valid', () => {
  const r = GeoAgentService.generateFallbackResponse(situation({ delay: undefined }), 'test');
  assert.doesNotMatch(JSON.stringify(r), /undefined/);
  assert.equal(r.backup.recommended, false);
});
