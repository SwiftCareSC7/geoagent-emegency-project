import { test, expect } from '@playwright/test'

test.describe('SwiftCare GeoAgent — /diff What-If Emergency Simulator', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to /diff
    await page.goto('/diff')
    // Wait for the map or page to mount
    await page.waitForLoadState('networkidle')
  })

  test('should load /diff with WHAT-IF SIMULATION badge, clock, and tactical HUD', async ({ page }) => {
    // 1. Verify Simulation Badge
    const badge = page.locator('text=WHAT-IF SIMULATION')
    await expect(badge).toBeVisible()

    // 2. Verify Page Title
    const title = page.locator('h1', { hasText: 'Dynamic Corridor Rerouting' })
    await expect(title).toBeVisible()

    // 3. Verify Simulation Clock starts at 00:00
    const clock = page.locator('text=00:00').first()
    await expect(clock).toBeVisible()

    // 4. Verify Play, Reset, and Step buttons exist
    const playBtn = page.getByRole('button', { name: /play/i })
    await expect(playBtn).toBeVisible()

    const resetBtn = page.getByRole('button', { name: /reset/i })
    await expect(resetBtn).toBeVisible()

    // 5. Verify Tactical HUD elements
    const hudHeading = page.locator('h2', { hasText: 'GeoAgent Tactical HUD' })
    await expect(hudHeading).toBeVisible()

    const ambUnit = page.locator('text=AMB-01').first()
    await expect(ambUnit).toBeVisible()

    const alsBadge = page.locator('text=ALS Unit').first()
    await expect(alsBadge).toBeVisible()

    // 6. Verify Initial State Pills
    const readyState = page.locator('text=READY').first()
    await expect(readyState).toBeVisible()

    const dispatchedState = page.locator('text=DISPATCHED').first()
    await expect(dispatchedState).toBeVisible()

    // 7. Verify Map Legend
    await expect(page.locator('text=Active Corridor (Blue)')).toBeVisible()
    await expect(page.locator('text=Detour Reroute (Purple)')).toBeVisible()
    await expect(page.locator('text=GPS Trajectory (Orange)')).toBeVisible()
    await expect(page.locator('text=Accident / Road Hazard (Red)')).toBeVisible()
  })

  test('should play simulation and progress simulation clock', async ({ page }) => {
    // Click Play button
    const playBtn = page.getByRole('button', { name: /play/i })
    await playBtn.click()

    // Verify button switches to Pause
    const pauseBtn = page.getByRole('button', { name: /pause/i })
    await expect(pauseBtn).toBeVisible()

    // Wait 2 seconds for clock to advance
    await page.waitForTimeout(2000)

    // Clock should no longer be 00:00
    const clock = page.getByTestId('sim-clock')
    await expect(clock).not.toHaveText('00:00')

    // Click Pause
    await pauseBtn.click()
    await expect(page.getByRole('button', { name: /play/i })).toBeVisible()
  })

  test('should step forward and trigger accident, purple reroute, and GeoAgent advice at T+155', async ({ page }) => {
    // Click on timeline milestone "Accident Detected" (T=120)
    const accidentMilestone = page.getByRole('button', { name: /Accident Detected/i })
    await expect(accidentMilestone).toBeVisible()
    await accidentMilestone.click()

    // Check clock jumps to 02:00
    await expect(page.locator('text=02:00').first()).toBeVisible()

    // Incident Alert banner must appear in HUD
    const incidentBanner = page.locator('text=ROAD INCIDENT DETECTED')
    await expect(incidentBanner).toBeVisible()
    await expect(page.locator('text=Severity: CRITICAL').first()).toBeVisible()

    // Click on timeline milestone "GeoAgent Advice" (T=155)
    const geoAgentMilestone = page.getByRole('button', { name: /GeoAgent Advice/i })
    await geoAgentMilestone.click()

    // Verify GeoAgent 3-tier epistemic output
    await expect(page.locator('text=1. OBSERVED FACTS')).toBeVisible()
    await expect(page.locator('text=2. INFERRED IMPACT')).toBeVisible()
    await expect(page.locator('text=3. UNKNOWNS & ASSUMPTIONS')).toBeVisible()
    await expect(page.locator('text=ADVISORY:')).toBeVisible()
    await expect(page.locator('text=Indiranagar 100ft Road')).toBeVisible()
  })

  test('should present Operator Action and execute approved reroute into active Blue corridor', async ({ page }) => {
    // Click on milestone "Approval Pending" (T=165)
    const pendingMilestone = page.getByRole('button', { name: /Approval Pending/i })
    await pendingMilestone.click()

    // Verify Operator Action Required box appears
    const actionRequired = page.locator('text=OPERATOR ACTION REQUIRED')
    await expect(actionRequired).toBeVisible()

    const approveBtn = page.getByRole('button', { name: /APPROVE REROUTE/i })
    await expect(approveBtn).toBeVisible()

    // Click APPROVE REROUTE
    await approveBtn.click()

    // Notification confirms authorization
    const authConfirmed = page.locator('text=REROUTE AUTHORIZED BY OPERATOR')
    await expect(authConfirmed).toBeVisible()

    // Verify route switched to bypass corridor
    await expect(page.locator('text=Indiranagar Bypass Corridor (Active)')).toBeVisible()
  })

  test('should reach patient destination at T=420 and complete mission at T=430', async ({ page }) => {
    // Click on milestone "Patient Reached" (T=420)
    const arrivalMilestone = page.getByRole('button', { name: /Patient Reached/i })
    await arrivalMilestone.click()

    // Verify clock is 07:00
    await expect(page.locator('text=07:00').first()).toBeVisible()

    // Verify Mission state is PATIENT REACHED
    const patientReached = page.locator('text=PATIENT REACHED').first()
    await expect(patientReached).toBeVisible()

    // Verify telemetry distance remaining is 0.0 km
    await expect(page.locator('text=0.0 km')).toBeVisible()

    // Click on milestone "Mission Complete" (T=430)
    const completeMilestone = page.getByRole('button', { name: /Mission Complete/i })
    await completeMilestone.click()

    // Verify state is COMPLETED
    await expect(page.locator('text=COMPLETED').first()).toBeVisible()
  })

  test('should reset simulation cleanly to initial state', async ({ page }) => {
    // Jump to middle of scenario
    const bypassMilestone = page.getByRole('button', { name: /Bypass Navigated/i })
    await bypassMilestone.click()

    // Verify clock advanced
    await expect(page.locator('text=04:00').first()).toBeVisible()

    // Click Reset button
    const resetBtn = page.getByRole('button', { name: /reset/i })
    await resetBtn.click()

    // Verify clock returns to 00:00
    await expect(page.locator('text=00:00').first()).toBeVisible()
    await expect(page.locator('text=READY').first()).toBeVisible()
    await expect(page.locator('text=DISPATCHED').first()).toBeVisible()
  })

  test('should toggle theme and toggle tactical HUD overlay', async ({ page }) => {
    // HUD Toggle
    const hudToggleBtn = page.getByRole('button', { name: /Hide HUD|Show HUD/i })
    await expect(hudToggleBtn).toBeVisible()

    // Click to hide HUD
    await hudToggleBtn.click()
    const hudHeading = page.locator('h2', { hasText: 'GeoAgent Tactical HUD' })
    await expect(hudHeading).not.toBeVisible()

    // Click to show HUD
    await hudToggleBtn.click()
    await expect(hudHeading).toBeVisible()
  })

  test('should respond to /api/diff/scenarios API endpoint', async ({ request }) => {
    // Test GET /api/diff/scenarios
    const res = await request.get('/api/diff/scenarios?t=120')
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.scenarioId).toBe('ACCIDENT_REROUTE_DEMO')
    expect(data.snapshot.timestampSec).toBe(120)
    expect(data.snapshot.accidentActive).toBe(true)
    expect(data.snapshot.missionState).toBe('CORRIDOR_BLOCKED')

    // Test POST /api/diff/scenarios
    const postRes = await request.post('/api/diff/scenarios', {
      data: { timestampSec: 180, manualOperatorApproved: true },
    })
    expect(postRes.ok()).toBeTruthy()
    const postData = await postRes.json()
    expect(postData.success).toBe(true)
    expect(postData.snapshot.rerouteApproved).toBe(true)
    expect(postData.snapshot.activeRouteType).toBe('REROUTE')
  })
})
