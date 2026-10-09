/**
 * Unit Test for Telemetry Retention TTL Index Configuration
 */
import assert from 'assert';
import Trajectory from './modules/trajectories/trajectory.model.js';

console.log('Testing Trajectory TTL retention index configuration...');

const indexes = Trajectory.schema.indexes();
const ttlIndex = indexes.find(([fields, options]) => fields.timestamp === 1 && options && options.expireAfterSeconds);

assert.ok(ttlIndex, 'Trajectory schema should define a TTL index on timestamp');
assert.strictEqual(ttlIndex[1].expireAfterSeconds, 90 * 24 * 60 * 60, 'Default TTL should be 90 days in seconds');
assert.deepStrictEqual(ttlIndex[1].partialFilterExpression, { source: { $in: ['SIMULATOR', 'DEVICE', 'API'] } }, 'TTL should use partialFilterExpression to guard non-routine records');

console.log('✓ Trajectory TTL retention index verified successfully!');
