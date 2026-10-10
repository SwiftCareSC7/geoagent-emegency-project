// Isolated test DB only: drops geoagent-bootstrap-test.
import assert from 'assert'; import mongoose from 'mongoose';
import { bootstrapAdmin } from './scripts/bootstrap-admin.js';
import User from './modules/auth/user.model.js';
const m = 'mongodb://127.0.0.1:27017/geoagent-bootstrap-test', pw = 'Str0ngBootstrapPw1';
await mongoose.connect(m); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
await assert.rejects(bootstrapAdmin({ mongoUri: m, email: 'a@x.io', password: 'weak' }));
// Separate processes (like real concurrent runs): mongoose's connection is process-global.
import { execFile } from 'child_process'; import { fileURLToPath } from 'url';
const script = fileURLToPath(new URL('./scripts/bootstrap-admin.js', import.meta.url));
const out = await Promise.all([1,2,3].map(i => new Promise(res => execFile('node', [script], { env: { ...process.env, MONGO_URI: m, ADMIN_BOOTSTRAP_EMAIL: `r${i}@x.io`, ADMIN_BOOTSTRAP_PASSWORD: pw } }, (e, so) => res(so)))));
assert.equal(out.filter(o => o.includes('] CREATED')).length, 1, 'exactly one concurrent winner');
await mongoose.connect(m); assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
assert.equal(await bootstrapAdmin({ mongoUri: m, email: 'A@x.io', password: pw }), 'CREATED');
assert.equal(await bootstrapAdmin({ mongoUri: m, email: 'b@x.io', password: pw }), 'SKIPPED_ADMIN_EXISTS');
await mongoose.connect(m);
const a = await User.findOne({ email: 'a@x.io' }); assert(a.role==='ADMIN' && a.status==='APPROVED' && a.password!==pw);
assert.equal(await User.countDocuments({ role: 'ADMIN' }), 1);
await User.deleteMany({ role: 'ADMIN' }); await User.create({ name:'u', email:'u@x.io', password:'h', role:'DRIVER', status:'PENDING' });
await mongoose.disconnect();
await assert.rejects(bootstrapAdmin({ mongoUri: m, email: 'u@x.io', password: pw }), /refusing to elevate/);
await mongoose.connect(m); assert.equal((await User.findOne({email:'u@x.io'})).role,'DRIVER'); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
console.log('bootstrap OK');
