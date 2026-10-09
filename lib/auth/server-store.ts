/**
 * SwiftCare GeoAgent — Server-Side Auth Store & Token Manager
 *
 * Provides session token signing, verification, and user type helpers.
 * In accordance with SwiftCare security architecture, the Express/MongoDB backend
 * is the single authoritative source for accounts, credentials, and authentication.
 *
 * Security compliance:
 * - No preset demo credentials or hardcoded fallback accounts.
 * - No hardcoded fallback JWT secrets (fails closed if unconfigured).
 * - No plaintext passwords stored in memory or persisted.
 * - Constant-time comparison for password hash verification.
 */

import crypto from 'crypto'
import type { User, UserRole, Workspace, UserStatus } from '@/lib/api/types'

export interface ServerUser {
  id: string
  name: string
  email: string
  role: UserRole
  status?: UserStatus
  requestedRole?: UserRole
  requestedWorkspaces?: Workspace[]
  permittedWorkspaces?: Workspace[]
  assignedVehicleId?: string | null
  passwordHash: string
  createdAt: string
  updatedAt: string
}

/**
 * Retrieves the JWT secret securely.
 * Fails closed without falling back to hardcoded secrets.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured')
  }
  return secret
}

// Hash password with salt using standard Node crypto PBKDF2
export function hashPassword(password: string, salt = 'swiftcare_salt_v1'): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
}

// Generate signed token using configured secret
export function createToken(userId: string, role: string): string {
  const secret = getJwtSecret()
  const payload = JSON.stringify({ userId, role, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  const base64Payload = Buffer.from(payload).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(base64Payload).digest('base64url')
  return `${base64Payload}.${signature}`
}

// Verify signed token
export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const secret = getJwtSecret()
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [base64Payload, signature] = parts
    const expectedSignature = crypto.createHmac('sha256', secret).update(base64Payload).digest('base64url')
    if (signature !== expectedSignature) return null

    const decoded = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'))
    if (!decoded.exp || Date.now() > decoded.exp) return null
    return { userId: decoded.userId, role: decoded.role }
  } catch {
    return null
  }
}

// Global registry singleton across HMR/Serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var __SWIFTCARE_USERS__: Map<string, ServerUser> | undefined
}

function getInitialUsers(): Map<string, ServerUser> {
  // Authoritative backend database is the single source of truth for accounts.
  // Never populate hardcoded demo credentials or plaintext passwords in memory.
  return new Map<string, ServerUser>()
}

if (!global.__SWIFTCARE_USERS__) {
  global.__SWIFTCARE_USERS__ = getInitialUsers()
}

export const usersStore = global.__SWIFTCARE_USERS__

export function findUserByEmail(email: string): ServerUser | undefined {
  return usersStore.get(email.trim().toLowerCase())
}

export function findUserById(id: string): ServerUser | undefined {
  for (const user of usersStore.values()) {
    if (user.id === id) return user
  }
  return undefined
}

export function verifyUserPassword(user: ServerUser, candidatePass: string): boolean {
  if (!user.passwordHash || !candidatePass) return false
  const candidateHash = hashPassword(candidatePass)
  const a = Buffer.from(user.passwordHash, 'hex')
  const b = Buffer.from(candidateHash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function toSafeUser(user: ServerUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'APPROVED',
    requestedRole: user.requestedRole,
    requestedWorkspaces: user.requestedWorkspaces,
    permittedWorkspaces: user.status !== 'APPROVED' ? [] : (user.permittedWorkspaces || [user.role]),
    assignedVehicleId: user.assignedVehicleId || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
