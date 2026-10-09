/**
 * Test Database Safety Guard
 */
import assert from 'assert';
import { isSafeDevelopmentDatabase, assertSafeDatabaseTarget } from './shared/utils/dbSafety.js';

console.log('Testing Database Safety Guard...');

// 1. Safe local URIs
assert.strictEqual(isSafeDevelopmentDatabase('mongodb://127.0.0.1:27017/geoagent-emergency-test'), true);
assert.strictEqual(isSafeDevelopmentDatabase('mongodb://localhost:27017/test'), true);
assert.strictEqual(isSafeDevelopmentDatabase('mongodb://localhost:27017/geoagent_dev'), true);

// 2. Dangerous production URIs
assert.strictEqual(isSafeDevelopmentDatabase('mongodb+srv://admin:pass@cluster0.abc.mongodb.net/production'), false);
assert.strictEqual(isSafeDevelopmentDatabase('mongodb://prod-db.internal:27017/emergency_live'), false);
assert.strictEqual(isSafeDevelopmentDatabase('mongodb://db.swiftcare.com:27017/production'), false);

// 3. assertSafeDatabaseTarget throws on unsafe URI
let errorThrown = false;
try {
  assertSafeDatabaseTarget('test_clean', 'mongodb+srv://admin:secret@cluster0.mongodb.net/production');
} catch (e) {
  errorThrown = true;
  assert.ok(e.message.includes('DB SAFETY VIOLATION'));
}
assert.strictEqual(errorThrown, true, 'Should throw error on unsafe production target');

// 4. assertSafeDatabaseTarget succeeds on safe URI
assert.doesNotThrow(() => {
  assertSafeDatabaseTarget('test_clean', 'mongodb://127.0.0.1:27017/geoagent-emergency-test');
});

console.log('✓ All DB Safety Guard checks passed!');
