import assert from 'node:assert/strict';
import { resolveMongoUri } from './config/db.js';

const good = 'mongodb+srv://user:pw@cluster0.example.net/geoagent-emergency?retryWrites=true';
assert.equal(resolveMongoUri(`\n${good}`), good, 'leading newline is trimmed');
assert.equal(resolveMongoUri(`  ${good}\r\n`), good, 'surrounding whitespace is trimmed');
assert.equal(resolveMongoUri('mongodb://127.0.0.1:27017/x'), 'mongodb://127.0.0.1:27017/x');

for (const bad of [undefined, '', '   ', `"${good}"`, 'http://x', 'mongodb+srv://user:<PASSWORD>@h/db', 'mongodb+srv://u:p@h/d b']) {
  assert.throws(() => resolveMongoUri(bad), (e) => !e.message.includes('pw') && !e.message.includes('user:'), `rejects ${JSON.stringify(bad)} without echoing it`);
}
console.log('db uri validation: all assertions passed');
