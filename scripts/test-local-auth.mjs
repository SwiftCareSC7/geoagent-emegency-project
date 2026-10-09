/**
 * Integration test for the local SQLite auth API. Use an ISOLATED DB:
 *   AUTH_DB_PATH=/tmp/sc-test.db TEST_ADMIN_EMAIL=.. TEST_ADMIN_PASSWORD=.. (admin made via scripts/create-admin.mjs)
 *   BASE_URL=http://localhost:3000 node scripts/test-local-auth.mjs
 */
import assert from 'node:assert/strict'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const { TEST_ADMIN_EMAIL: AE, TEST_ADMIN_PASSWORD: AP } = process.env
if (!AE || !AP) throw new Error('Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD (admin created in the isolated test DB)')

const call = async (method, path, { body, cookie } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  const set = res.headers.get('set-cookie') || ''
  return { status: res.status, json: await res.json().catch(() => ({})), cookie: set.split(';')[0], setCookie: set }
}
let n = 0
const ok = (cond, msg) => { assert.ok(cond, msg); console.log(`  ✓ ${msg}`); n++ }

const stamp = Date.now()
const strong = `Aa1-${stamp}-xyz`
const mk = (tag, extra = {}) => ({ name: `Test ${tag}`, email: `t.${tag}.${stamp}@example.test`, password: strong, ...extra })

// registration
const drv = mk('driver', { role: 'DRIVER' })
let r = await call('POST', '/api/auth/register', { body: drv })
ok(r.status === 201 && r.json.user.status === 'PENDING' && r.json.user.role === 'DRIVER', 'valid signup → 201 PENDING')
ok(!JSON.stringify(r.json).match(/password|hash/i), 'signup response leaks no password/hash')
r = await call('POST', '/api/auth/register', { body: drv })
ok(r.status === 409, 'duplicate email → 409')
r = await call('POST', '/api/auth/register', { body: { ...mk('weak'), password: 'abc' } })
ok(r.status === 400, 'weak password → 400')
const adm = mk('adminreq', { role: 'ADMIN', status: 'APPROVED', permittedWorkspaces: ['ADMIN'] })
r = await call('POST', '/api/auth/register', { body: adm })
ok(r.status === 201 && r.json.user.role !== 'ADMIN' && r.json.user.status === 'PENDING' && r.json.user.requestedRole === 'ADMIN', 'ADMIN request + forged status/workspaces → still PENDING, not ADMIN')

// login gates
r = await call('POST', '/api/auth/login', { body: { email: drv.email, password: strong } })
ok(r.status === 403, 'pending account cannot log in (403)')
r = await call('POST', '/api/auth/login', { body: { email: drv.email, password: 'Wrong-pass1' } })
ok(r.status === 401, 'wrong password → 401')
r = await call('POST', '/api/auth/login', { body: { email: `nobody.${stamp}@example.test`, password: strong } })
ok(r.status === 401, 'unknown email → 401')

// unauthorised admin API
r = await call('GET', '/api/admin/users')
ok(r.status === 401, 'unauthenticated GET /api/admin/users → 401')
r = await call('GET', '/api/auth/me')
ok(r.status === 401, 'no session → /api/auth/me 401')

// admin
r = await call('POST', '/api/auth/login', { body: { email: AE, password: AP } })
ok(r.status === 200 && r.json.user.role === 'ADMIN', 'admin login → 200 ADMIN')
ok(/HttpOnly/i.test(r.setCookie) && /SameSite=lax/i.test(r.setCookie), 'session cookie is HttpOnly + SameSite=Lax')
const adminCookie = r.cookie
r = await call('GET', '/api/admin/users?limit=100', { cookie: adminCookie })
ok(r.status === 200 && Array.isArray(r.json.data), 'admin lists users')
ok(!JSON.stringify(r.json).match(/password|hash/i), 'admin user list leaks no password/hash')
const drvId = r.json.data.find((u) => u.email === drv.email).id
const admReqId = r.json.data.find((u) => u.email === adm.email).id

r = await call('PATCH', `/api/admin/users/${drvId}/approve`, { cookie: adminCookie, body: {} })
ok(r.status === 200 && r.json.data.status === 'APPROVED', 'admin approves driver')
r = await call('PATCH', `/api/admin/users/${admReqId}/approve`, { cookie: adminCookie, body: {} })
ok(r.json.data.role !== 'ADMIN', 'approving an ADMIN request without explicit role does not grant ADMIN')

// approved driver
r = await call('POST', '/api/auth/login', { body: { email: drv.email, password: strong } })
ok(r.status === 200 && r.json.user.role === 'DRIVER', 'approved driver logs in')
const drvCookie = r.cookie
r = await call('GET', '/api/auth/me', { cookie: drvCookie })
ok(r.status === 200 && r.json.user.email === drv.email, '/api/auth/me returns the session user')
r = await call('GET', '/api/admin/users', { cookie: drvCookie })
ok(r.status === 403, 'driver session → admin API 403')
r = await call('PATCH', `/api/admin/users/${drvId}/role`, { cookie: drvCookie, body: { role: 'ADMIN' } })
ok(r.status === 403, 'driver cannot elevate self via admin API (403)')
r = await call('GET', '/api/auth/me', { cookie: 'sc_session=forged-token' })
ok(r.status === 401, 'forged session cookie → 401')

// admin self-protection + suspend invalidates sessions
const me = (await call('GET', '/api/auth/me', { cookie: adminCookie })).json.user
r = await call('PATCH', `/api/admin/users/${me.id}/suspend`, { cookie: adminCookie })
ok(r.status === 400, 'admin cannot suspend self')
r = await call('PATCH', `/api/admin/users/${drvId}/suspend`, { cookie: adminCookie })
r = await call('GET', '/api/auth/me', { cookie: drvCookie })
ok(r.status === 401, 'suspending a user kills their live session')

// logout invalidation
r = await call('POST', '/api/auth/logout', { cookie: adminCookie })
ok(r.status === 200 && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(r.setCookie), 'logout clears cookie')
r = await call('GET', '/api/auth/me', { cookie: adminCookie })
ok(r.status === 401, 'old session token rejected after logout (server-side invalidation)')

console.log(`\nlocal auth OK (${n} checks)`)
