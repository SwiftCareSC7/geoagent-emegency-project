import { test, expect } from '@playwright/test'

// The app has no authentication: every page opens directly, with no login redirect.
test('homepage opens the control-room dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/control-room$/)
})

for (const path of ['/control-room', '/driver/dashboard', '/paramedic', '/admin', '/diff', '/emergency-lab']) {
  test(`${path} loads without login and without runtime errors`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.goto(path)
    await page.waitForTimeout(1500)
    expect(new URL(page.url()).pathname).toBe(path)
    expect(pageErrors).toEqual([])
  })
}

for (const path of ['/login', '/signup', '/register', '/registration']) {
  test(`${path} no longer exists`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(404)
  })
}

test('auth API routes are gone', async ({ request }) => {
  for (const path of ['/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/admin/users']) {
    const res = await request.get(path)
    expect(res.status(), path).toBe(404)
  }
})
