import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import routeService from './modules/routes/route.service.js';

// Local test DB only; this test never writes.
await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test', { serverSelectionTimeoutMS: 3000 });
for (const filters of [{ emergencyId: 'E-DEMO-001' }, { vehicleId: 'AMB-01' }]) {
  const res = await routeService.getRoutes(filters);
  assert.deepEqual(res.data, [], `unknown ${Object.keys(filters)[0]} returns an empty list, not a CastError`);
  assert.equal(res.meta.total, 0);
}
await mongoose.disconnect();
console.log('routes unknown-id handling: all assertions passed');
