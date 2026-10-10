import { test, expect, type Page } from '@playwright/test'

/**
 * Auth + role matrix through the real UI, BFF and Express backend.
 * Needs pre-provisioned accounts (server/scripts/provision-users.js) and their passwords in env:
 *   ADMIN_PASSWORD OPERATOR_PASSWORD DRIVER_PASSWORD PARAMEDIC_PASSWORD
 * Run against a test backend only; it registers one throwaway pending account.
 */
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100'

const ACCOUNTS = {
  ADMIN: { email: 'admin@swiftcare.local', password: process.env.ADMIN_PASSWORD },
  CONTROL_ROOM: { email: 'operator@swiftcare.local', password: process.env.OPERATOR_PASSWORD },
  DRIVER: { email: 'driver@swiftcare.local', password: process.env.DRIVER_PASSWORD },
  PARAMEDIC: { email: 'paramedic@swiftcare.local', password: process.env.PARAMEDIC_PASSWORD },
} as const

const PAGES = ['/admin', '/control-room', '/driver/dashboard', '/paramedic', '/diff', '/emergency-lab'] as const

// The access matrix requested for SwiftCare: Admin all, Control Room all but Admin, Driver/Paramedic own page only.
const ALLOWED: Record<keyof typeof ACCOUNTS, readonly string[]> = {
  ADMIN: PAGES,
  CONTROL_ROOM: ['/control-room', '/driver/dashboard', '/paramedic', '/diff', '/emergency-lab'],
  DRIVER: ['/driver/dashboard'],
  PARAMEDIC: ['/paramedic'],
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
}

test.describe.configure({ mode: 'serial' })

test('homepage renders and links to sign in', async ({ page }) => {
  await page.goto(`${BASE}/`)
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
})

test('protected page redirects anonymous visitors to /login', async ({ page }) => {
  await page.goto(`${BASE}/control-room`)
  await expect(page).toHaveURL(/\/login/)
})

test('invalid credentials show an error and stay on /login', async ({ page }) => {
  await login(page, 'nobody@swiftcare.local', 'WrongPassword123!')
  await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('public registration cannot request ADMIN', async ({ request }) => {
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: { name: 'Escalation Attempt', email: `esc_${Date.now()}@example.com`, password: 'StrongPass123!', role: 'ADMIN' },
  })
  expect(res.status()).toBe(400)
})

test('registration creates a pending account that cannot sign in; duplicate is rejected', async ({ page, request }) => {
  const email = `e2e_driver_${Date.now()}@example.com`
  const body = { name: 'E2E Driver', email, password: 'StrongPass123!', role: 'DRIVER', assignedVehicleId: 'AMB-01' }
  const first = await request.post(`${BASE}/api/auth/register`, { data: body })
  expect(first.status()).toBe(201)
  expect((await first.json()).user.status).toBe('PENDING')
  expect((await request.post(`${BASE}/api/auth/register`, { data: body })).status()).toBe(409)

  await login(page, email, body.password)
  await expect(page.getByText(/pending administrator approval/i)).toBeVisible()
})

for (const role of Object.keys(ACCOUNTS) as (keyof typeof ACCOUNTS)[]) {
  test(`${role} sees exactly its permitted pages`, async ({ page }) => {
    const { email, password } = ACCOUNTS[role]
    test.skip(!password, `${role} password env var not set`)
    await login(page, email, password!)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })

    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`)
      const denied = page.getByText('Access Restricted')
      // Wait for ProtectedRoute to finish its session check before judging access.
      await expect(page.getByText('Verifying SwiftCare session...')).toHaveCount(0, { timeout: 20_000 })
      if (ALLOWED[role].includes(path)) {
        await expect(denied, `${role} should reach ${path}`).toHaveCount(0, { timeout: 15_000 })
        await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
      } else {
        await expect(denied, `${role} must be blocked from ${path}`).toBeVisible({ timeout: 15_000 })
      }
    }

    // Backend enforces the same boundary, independent of the UI.
    const adminApi = await page.request.get(`${BASE}/api/admin/users`)
    expect(adminApi.status()).toBe(role === 'ADMIN' ? 200 : 403)

    // Refresh keeps the session; logout ends it.
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/)
    await page.request.post(`${BASE}/api/auth/logout`)
    expect((await page.request.get(`${BASE}/api/auth/me`)).status()).toBe(401)
  })
}
