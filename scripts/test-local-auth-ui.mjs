/**
 * Browser E2E for local SQLite auth: register form → admin approval → login form → role redirect → route guard.
 * Isolated DB only: BASE_URL=http://localhost:3100 TEST_ADMIN_EMAIL=.. TEST_ADMIN_PASSWORD=.. node scripts/test-local-auth-ui.mjs
 */
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const { TEST_ADMIN_EMAIL: AE, TEST_ADMIN_PASSWORD: AP } = process.env
if (!AE || !AP) throw new Error('Set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD (admin in the isolated test DB)')
const stamp = Date.now(), email = `ui.${stamp}@example.test`, password = `Aa1-${stamp}-ui`
let n = 0
const ok = (c, m) => { assert.ok(c, m); console.log(`  ✓ ${m}`); n++ }

const browser = await chromium.launch()
const page = await browser.newPage()
const apiHosts = []
page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/auth') || u.pathname.startsWith('/api/admin/users')) apiHosts.push(u.origin) })

await page.goto(`${BASE}/register`)
await page.fill('#name', 'UI Test Driver')
await page.fill('#email', email)
await page.fill('#password', password)
await page.fill('#confirmPassword', password)
await page.getByRole('button', { name: /Ambulance/ }).click()
await page.locator('button[type=submit]').click()
await page.getByText(/pending|approval/i).first().waitFor({ timeout: 15000 })
ok(true, 'register form submits and shows pending-approval notice')

await page.goto(`${BASE}/login`)
await page.fill('#email', email)
await page.fill('#password', password)
await page.locator('button[type=submit]').click()
await page.getByText(/pending|approval/i).first().waitFor({ timeout: 15000 })
ok(new URL(page.url()).pathname === '/login', 'pending account stays on /login with notice')

// admin approves (API, as the admin dashboard would)
const api = page.context().request
let r = await api.post(`${BASE}/api/auth/login`, { data: { email: AE, password: AP } })
ok(r.ok(), 'admin API login')
const users = (await (await api.get(`${BASE}/api/admin/users?limit=100`)).json()).data
r = await api.patch(`${BASE}/api/admin/users/${users.find((u) => u.email === email).id}/approve`, { data: {} })
ok(r.ok(), 'admin approves the new driver')
await api.post(`${BASE}/api/auth/logout`)
await page.context().clearCookies()

await page.goto(`${BASE}/login`)
await page.fill('#email', email)
await page.fill('#password', password)
await Promise.all([page.waitForURL(/driver/, { timeout: 20000 }), page.locator('button[type=submit]').click()])
ok(new URL(page.url()).pathname.startsWith('/driver'), 'approved driver login redirects to the driver dashboard')

await page.goto(`${BASE}/admin`)
await page.waitForTimeout(2500)
ok(new URL(page.url()).pathname !== '/admin', 'driver cannot stay on /admin (route guard)')

ok(apiHosts.length > 0 && apiHosts.every((h) => h === new URL(BASE).origin), 'all auth API calls are same-origin (never straight to Express)')

await page.context().clearCookies()
await page.goto(`${BASE}/driver/dashboard`)
await page.waitForURL(/login/, { timeout: 15000 })
ok(true, 'logged-out visit to a protected page redirects to /login')

await browser.close()
console.log(`\nlocal auth UI OK (${n} checks)`)
