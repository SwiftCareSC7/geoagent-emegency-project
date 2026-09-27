/**
 * SwiftCare GeoAgent — Server-Side Auth Store & Token Manager
 *
 * Provides self-contained authentication, session token signing,
 * user registry, and role verification for Next.js App Router route handlers.
 * Used on Vercel deployments and local Next.js serverless functions.
 */

import crypto from 'crypto'
import type { User, UserRole } from '@/lib/api/types'

export interface ServerUser {
  id: string
  name: string
  email: string
  role: UserRole
  passwordHash: string
  passwords?: string[]
  createdAt: string
  updatedAt: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'swiftcare_geoagent_secure_token_secret_key_2026'

// Hash password with salt using standard Node crypto PBKDF2
export function hashPassword(password: string, salt = 'swiftcare_salt_v1'): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
}

// Generate signed token
export function createToken(userId: string, role: string): string {
  const payload = JSON.stringify({ userId, role, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  const base64Payload = Buffer.from(payload).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url')
  return `${base64Payload}.${signature}`
}

// Verify signed token
export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [base64Payload, signature] = parts
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url')
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
  const map = new Map<string, ServerUser>()

  const adminPass = process.env.ADMIN_PASSWORD || 'FzhexDCVDMj7AFb'
  const adminFallbacks = ['FzhexDCVDMj7AFb', 'AdminPassword123!', adminPass].filter(Boolean)

  const defaultAccounts: Array<{
    id: string
    name: string
    email: string
    role: UserRole
    passwords: string[]
  }> = [
    {
      id: 'usr_admin_spec',
      name: 'Priyanshu (Admin)',
      email: 'spec.priyanshu@gmail.com',
      role: 'ADMIN',
      passwords: adminFallbacks,
    },
    {
      id: 'usr_admin_01',
      name: 'Chief Systems Administrator',
      email: 'admin@swiftcare.local',
      role: 'ADMIN',
      passwords: ['AdminPassword123!', adminPass],
    },
    {
      id: 'usr_operator_01',
      name: 'Central Control Operator',
      email: 'operator@swiftcare.local',
      role: 'CONTROL_ROOM',
      passwords: ['Operator123!', process.env.OPERATOR_PASSWORD || 'Operator123!'],
    },
    {
      id: 'usr_driver_01',
      name: 'Ambulance Officer Ramesh',
      email: 'driver@swiftcare.local',
      role: 'DRIVER',
      passwords: ['DriverPassword123!', process.env.DRIVER_PASSWORD || 'DriverPassword123!'],
    },
    {
      id: 'usr_paramedic_01',
      name: 'Field Paramedic Officer',
      email: 'paramedic@swiftcare.local',
      role: 'PARAMEDIC',
      passwords: ['Paramedic123!', process.env.PARAMEDIC_PASSWORD || 'Paramedic123!'],
    },
  ]

  for (const acc of defaultAccounts) {
    const emailKey = acc.email.toLowerCase()
    map.set(emailKey, {
      id: acc.id,
      name: acc.name,
      email: acc.email,
      role: acc.role,
      passwordHash: hashPassword(acc.passwords[0]),
      passwords: acc.passwords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  return map
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
  if (user.passwords && user.passwords.includes(candidatePass)) {
    return true
  }
  const candidateHash = hashPassword(candidatePass)
  return user.passwordHash === candidateHash
}

export function toSafeUser(user: ServerUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
