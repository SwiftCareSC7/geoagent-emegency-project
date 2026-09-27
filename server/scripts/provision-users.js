/**
 * SwiftCare GeoAgent — User Provisioning & Account Repair Script
 *
 * Securely provisions and repairs accounts for all four operational roles
 * (CONTROL_ROOM, DRIVER, PARAMEDIC, ADMIN) as well as the primary administrator
 * account for spec.priyanshu@gmail.com.
 *
 * Security compliance:
 * - Passwords are securely hashed with bcrypt (work factor 12)
 * - Plaintext passwords are never logged, printed, or exposed in output
 * - Case-insensitive email normalization
 * - Guarantees email uniqueness (no duplicates)
 *
 * Usage:
 *   node server/scripts/provision-users.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../modules/auth/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent-emergency-test';

const SALT_ROUNDS = 12;

// Accounts to provision/repair
const ACCOUNTS_SPEC = [
  {
    email: 'spec.priyanshu@gmail.com',
    name: 'Priyanshu (Admin)',
    role: 'ADMIN',
    pass: process.env.ADMIN_PASSWORD || 'AdminPassword123!'
  },
  {
    email: 'admin@swiftcare.local',
    name: 'Chief Systems Administrator',
    role: 'ADMIN',
    pass: process.env.ADMIN_PASSWORD || 'AdminPassword123!'
  },
  {
    email: 'operator@swiftcare.local',
    name: 'Central Control Operator',
    role: 'CONTROL_ROOM',
    pass: process.env.OPERATOR_PASSWORD || 'Operator123!'
  },
  {
    email: 'driver@swiftcare.local',
    name: 'Ambulance Officer Ramesh',
    role: 'DRIVER',
    pass: process.env.DRIVER_PASSWORD || 'DriverPassword123!'
  },
  {
    email: 'paramedic@swiftcare.local',
    name: 'Field Paramedic Officer',
    role: 'PARAMEDIC',
    pass: process.env.PARAMEDIC_PASSWORD || 'Paramedic123!'
  }
];

export async function provisionUsers() {
  console.log(`[Provision] Connecting to database: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);
  await mongoose.connect(MONGO_URI);

  const results = [];

  for (const acc of ACCOUNTS_SPEC) {
    const normalizedEmail = acc.email.trim().toLowerCase();
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(acc.pass, salt);

    // Find all matching users for this email to eliminate any duplicates
    const existingUsers = await User.find({ email: normalizedEmail });

    if (existingUsers.length > 0) {
      // Primary user to update
      const primaryUser = existingUsers[0];
      primaryUser.name = acc.name;
      primaryUser.role = acc.role;
      primaryUser.password = hashedPassword;
      await primaryUser.save();

      // Remove any lingering duplicates if any exist
      if (existingUsers.length > 1) {
        const duplicateIds = existingUsers.slice(1).map((u) => u._id);
        await User.deleteMany({ _id: { $in: duplicateIds } });
        console.log(`[Provision] Cleaned up ${duplicateIds.length} duplicate record(s) for ${normalizedEmail}`);
      }

      console.log(`[Provision] Repaired account: ${normalizedEmail} -> Role: ${acc.role}`);
      results.push({ email: normalizedEmail, role: acc.role, status: 'REPAIRED' });
    } else {
      // Create fresh user
      const created = await User.create({
        name: acc.name,
        email: normalizedEmail,
        role: acc.role,
        password: hashedPassword
      });

      console.log(`[Provision] Created account: ${normalizedEmail} -> Role: ${acc.role}`);
      results.push({ email: normalizedEmail, role: acc.role, status: 'CREATED' });
    }
  }

  // Verification audit query
  const allUsers = await User.find({}, { name: 1, email: 1, role: 1, createdAt: 1 }).lean();
  console.log('\n[Provision Audit] Verified accounts currently registered:');
  for (const u of allUsers) {
    console.log(`  - ${u.email.padEnd(32)} | Role: ${u.role.padEnd(14)} | Name: ${u.name}`);
  }

  return results;
}

// Execute if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  provisionUsers()
    .then(async () => {
      console.log('\n[Provision] All operational accounts successfully provisioned/repaired.');
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Provision ERROR]:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
