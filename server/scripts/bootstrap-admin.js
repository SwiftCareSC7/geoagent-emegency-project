/**
 * One-time production admin bootstrap.
 *
 *   MONGO_URI=... ADMIN_BOOTSTRAP_EMAIL=... ADMIN_BOOTSTRAP_PASSWORD=... node server/scripts/bootstrap-admin.js
 *
 * Runs only from a trusted shell (proof of authorization = holding the DB URI). No network endpoint.
 * - Refuses if any ADMIN already exists (one-time, idempotent) or the email belongs to another user (no elevation).
 * - Password is read from the environment, hashed with bcrypt(12), and never printed.
 * - Concurrent runs are serialized by inserting a fixed-_id lock doc (unique _id => exactly one winner).
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import User from '../modules/auth/user.model.js';

dotenv.config();

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export async function bootstrapAdmin({ mongoUri, email, password }) {
  if (!mongoUri) throw new Error('MONGO_URI must be set explicitly');
  const normalized = (email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email');
  if (!PASSWORD_RE.test(password || '')) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be 12+ chars with upper, lower and a digit');
  }

  await mongoose.connect(mongoUri);
  const lock = mongoose.connection.collection('bootstrap_locks');
  let locked = false;
  try {
    if (await User.exists({ role: 'ADMIN' })) return 'SKIPPED_ADMIN_EXISTS';
    try { await lock.insertOne({ _id: 'admin-bootstrap', at: new Date() }); locked = true; }
    catch (e) { if (e.code === 11000) return 'SKIPPED_CONCURRENT_BOOTSTRAP'; throw e; }
    if (await User.exists({ role: 'ADMIN' })) return 'SKIPPED_ADMIN_EXISTS';
    if (await User.exists({ email: normalized })) throw new Error('Email already belongs to a non-admin account; refusing to elevate');

    await User.create({
      name: 'Administrator',
      email: normalized,
      password: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      status: 'APPROVED',
      permittedWorkspaces: ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'],
    });
    return 'CREATED';
  } finally {
    if (locked) await lock.deleteOne({ _id: 'admin-bootstrap' }); // lock only serializes; the ADMIN-exists check is the durable guard
    await mongoose.disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrapAdmin({
    mongoUri: process.env.MONGO_URI,
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  })
    .then((r) => { console.log(`[Bootstrap] ${r}`); process.exit(0); })
    .catch((e) => { console.error(`[Bootstrap ERROR] ${e.message}`); process.exit(1); });
}
