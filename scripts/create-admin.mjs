/**
 * One-time first administrator, created locally from terminal input (nothing is stored in env or Git).
 *   npm run create-admin
 * Refuses if an approved ADMIN already exists; further admins come from the admin dashboard.
 */
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { text } from 'node:stream/consumers'
import { countAdmins, createUser, DuplicateEmailError } from '../lib/auth/db.ts'

let muted = false
const out = new Writable({ write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb() } })
const rl = createInterface({ input: process.stdin, output: out, terminal: !!process.stdin.isTTY })
// Non-interactive (piped) input is read up front, for tests only.
const piped = process.stdin.isTTY ? null : (await text(process.stdin)).split('\n')
const ask = async (q, secret = false) => {
  if (piped) return (piped.shift() ?? '').trim()
  process.stdout.write(q)
  muted = secret
  const a = await rl.question('')
  muted = false
  if (secret) process.stdout.write('\n')
  return a.trim()
}

try {
  if (countAdmins() > 0) throw new Error('An administrator already exists. Approve further admins from the admin dashboard.')
  const name = (await ask('Full name: ')) || 'Administrator'
  const email = await ask('Email: ')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address')
  const password = await ask('Password (min 8, upper+lower+digit): ', true)
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) throw new Error('Password too weak')
  if (password !== (await ask('Confirm password: ', true))) throw new Error('Passwords do not match')
  createUser({ name, email, password, role: 'ADMIN', requestedRole: 'ADMIN', status: 'APPROVED', permittedWorkspaces: ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'] })
  console.log(`Administrator created: ${email.toLowerCase()}`)
} catch (e) {
  console.error(`Error: ${e instanceof DuplicateEmailError ? 'Email is already registered' : e.message}`)
  process.exitCode = 1
} finally {
  rl.close()
}
