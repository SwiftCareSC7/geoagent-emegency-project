/**
 * Local SQLite user + session store (Node's built-in `node:sqlite`, no extra dependency).
 * Relative imports only, so scripts/create-admin.ts can import it directly.
 *
 * shortcut: single-file local DB. Vercel's filesystem is read-only/ephemeral, so on Vercel this refuses to open
 * unless AUTH_DB_PATH points at persistent storage. Upgrade to a hosted DB for shared production use.
 */
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export type Role = 'ADMIN' | 'CONTROL_ROOM' | 'DRIVER' | 'PARAMEDIC'
export type Status = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED'
export const ROLES: Role[] = ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC']
export const STATUSES: Status[] = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']

export const SESSION_COOKIE = 'sc_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  role: Role
  requested_role: Role
  status: Status
  requested_workspaces: string
  permitted_workspaces: string
  assigned_vehicle_id: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

const g = globalThis as unknown as { __scAuthDb?: DatabaseSync }

export function getDb(): DatabaseSync {
  if (g.__scAuthDb) return g.__scAuthDb
  if (process.env.VERCEL && !process.env.AUTH_DB_PATH) {
    throw new Error('Local SQLite auth is disabled on Vercel (no persistent filesystem)')
  }
  const file = resolve(/*turbopackIgnore: true*/ process.env.AUTH_DB_PATH || 'data/swiftcare-auth.db')
  mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','CONTROL_ROOM','DRIVER','PARAMEDIC')),
      requested_role TEXT NOT NULL CHECK (requested_role IN ('ADMIN','CONTROL_ROOM','DRIVER','PARAMEDIC')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','SUSPENDED','REJECTED')),
      requested_workspaces TEXT NOT NULL DEFAULT '[]',
      permitted_workspaces TEXT NOT NULL DEFAULT '[]',
      assigned_vehicle_id TEXT,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `)
  g.__scAuthDb = db
  return db
}

// ── passwords (scrypt, per-user salt) ──────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`
}

const DUMMY_HASH = hashPassword(randomBytes(8).toString('hex'))

/** Always does one scrypt, so unknown emails cost the same as wrong passwords. */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  const [, saltHex, hashHex] = (stored ?? DUMMY_HASH).split('$')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected) && stored !== undefined
}

// ── users ──────────────────────────────────────────────────────────────────
export function toPublic(r: UserRow) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    requestedRole: r.requested_role,
    requestedWorkspaces: JSON.parse(r.requested_workspaces) as Role[],
    permittedWorkspaces: JSON.parse(r.permitted_workspaces) as Role[],
    assignedVehicleId: r.assigned_vehicle_id,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export type PublicUser = ReturnType<typeof toPublic>

export const getUserByEmail = (email: string) =>
  getDb().prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as UserRow | undefined
export const getUserById = (id: string) =>
  getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
export const countAdmins = () =>
  (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND status = 'APPROVED'").get() as { n: number }).n

export class DuplicateEmailError extends Error {}

export function createUser(u: {
  name: string
  email: string
  password: string
  role: Role
  requestedRole: Role
  status: Status
  requestedWorkspaces?: Role[]
  permittedWorkspaces?: Role[]
  assignedVehicleId?: string | null
}): UserRow {
  const now = new Date().toISOString()
  const id = randomUUID()
  try {
    getDb()
      .prepare(
        `INSERT INTO users (id,name,email,password_hash,role,requested_role,status,requested_workspaces,permitted_workspaces,assigned_vehicle_id,approved_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        id, u.name, u.email.trim().toLowerCase(), hashPassword(u.password), u.role, u.requestedRole, u.status,
        JSON.stringify(u.requestedWorkspaces ?? []), JSON.stringify(u.permittedWorkspaces ?? []),
        u.assignedVehicleId ?? null, u.status === 'APPROVED' ? now : null, now, now
      )
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) throw new DuplicateEmailError('Email is already registered')
    throw e
  }
  return getUserById(id)!
}

export function listUsers(page: number, limit: number) {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n
  const rows = db
    .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, (page - 1) * limit) as unknown as UserRow[]
  return { rows, total }
}

export function updateUser(
  id: string,
  p: Partial<{ role: Role; status: Status; permittedWorkspaces: Role[]; assignedVehicleId: string | null; approvedBy: string | null; approvedAt: string | null }>
): UserRow | undefined {
  const sets: string[] = []
  const vals: (string | null)[] = []
  const add = (col: string, v: string | null | undefined) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v) } }
  add('role', p.role)
  add('status', p.status)
  add('permitted_workspaces', p.permittedWorkspaces && JSON.stringify(p.permittedWorkspaces))
  add('assigned_vehicle_id', p.assignedVehicleId)
  add('approved_by', p.approvedBy)
  add('approved_at', p.approvedAt)
  sets.push('updated_at = ?'); vals.push(new Date().toISOString())
  getDb().prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
  // Any privilege/status change invalidates existing sessions.
  if (p.role !== undefined || p.status !== undefined) deleteUserSessions(id)
  return getUserById(id)
}

// ── sessions (opaque random token; only its SHA-256 is stored) ─────────────
const sha = (t: string) => createHash('sha256').update(t).digest('hex')

export function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + SESSION_TTL_MS
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(sha(token), userId, expiresAt)
  return { token, expiresAt }
}

export function getUserBySession(token: string | undefined): UserRow | undefined {
  if (!token) return undefined
  const row = getDb()
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .get(sha(token), Date.now()) as UserRow | undefined
  return row && row.status === 'APPROVED' ? row : undefined
}

export const deleteSession = (token: string) => getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
export const deleteUserSessions = (userId: string) => getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
