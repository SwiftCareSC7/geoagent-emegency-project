import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const ARTIFACT_DIR = '/Users/priyanshu/.gemini/antigravity-ide/brain/bda5645c-885e-414f-8ada-87c8be247570'

async function run() {
  console.log('--- LAUNCHING PLAYWRIGHT FOR HIGH-RES VISUAL CAPTURE ---')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 950 },
    deviceScaleFactor: 2, // Retina resolution
  })
  const page = await context.newPage()

  console.log('Navigating to http://localhost:3000/diff...')
  await page.goto('http://localhost:3000/diff', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 1. Initial State (T=00:00)
  console.log('Capturing Stage 1: Initial Mission Ready (00:00)...')
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'diff_stage1_initial_00_00.png'),
    fullPage: false,
  })

  // 2. Play simulation & capture en-route (T=01:00)
  console.log('Playing simulation...')
  const playBtn = page.getByRole('button', { name: /play/i })
  await playBtn.click()
  await page.waitForTimeout(3000)
  const pauseBtn = page.getByRole('button', { name: /pause/i })
  await pauseBtn.click()

  // Jump to 01:00 milestone
  const movingMilestone = page.getByRole('button', { name: /Ambulance Moving/i })
  if (await movingMilestone.isVisible()) {
    await movingMilestone.click()
    await page.waitForTimeout(800)
    console.log('Capturing Stage 2: En Route with Trajectory Trail (01:00)...')
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'diff_stage2_en_route_01_00.png'),
      fullPage: false,
    })
  }

  // 3. Accident Detected (T=02:00)
  console.log('Jumping to Accident Detected (02:00)...')
  const accidentMilestone = page.getByRole('button', { name: /Accident Detected/i })
  await accidentMilestone.click()
  await page.waitForTimeout(1000)
  console.log('Capturing Stage 3: Accident Detected & Road Blocked (02:00)...')
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'diff_stage3_accident_02_00.png'),
    fullPage: false,
  })

  // 4. Alternatives Found (T=02:25)
  console.log('Jumping to Alternatives Found (02:25)...')
  const altMilestone = page.getByRole('button', { name: /Alternatives Found/i })
  await altMilestone.click()
  await page.waitForTimeout(1000)
  console.log('Capturing Stage 4: Purple Recommended Detour (02:25)...')
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'diff_stage4_purple_detour_02_25.png'),
    fullPage: false,
  })

  // 5. Operator Approval Pending (T=02:45)
  console.log('Jumping to Approval Pending (02:45)...')
  const pendingMilestone = page.getByRole('button', { name: /Approval Pending/i })
  await pendingMilestone.click()
  await page.waitForTimeout(1000)
  console.log('Capturing Stage 5: Operator Action Required & GeoAgent Analysis (02:45)...')
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'diff_stage5_operator_pending_02_45.png'),
    fullPage: false,
  })

  // 6. Click APPROVE REROUTE
  console.log('Clicking APPROVE REROUTE button...')
  const approveBtn = page.getByRole('button', { name: /APPROVE REROUTE/i })
  if (await approveBtn.isVisible()) {
    await approveBtn.click()
    await page.waitForTimeout(1000)
    console.log('Capturing Stage 6: Reroute Approved -> New Blue Corridor (03:00)...')
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'diff_stage6_reroute_approved_03_00.png'),
      fullPage: false,
    })
  }

  // 7. Patient Reached (T=07:00)
  console.log('Jumping to Patient Reached (07:00)...')
  const arrivalMilestone = page.getByRole('button', { name: /Patient Reached/i })
  await arrivalMilestone.click()
  await page.waitForTimeout(1000)
  console.log('Capturing Stage 7: Patient Reached at Manipal Hospital HAL (07:00)...')
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'diff_stage7_patient_reached_07_00.png'),
    fullPage: false,
  })

  // 8. Toggle Light Mode
  console.log('Toggling to Light Mode...')
  const themeToggle = page.locator('button[aria-label*="theme" i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first()
  if (await themeToggle.isVisible()) {
    await themeToggle.click()
    await page.waitForTimeout(1200)
    console.log('Capturing Stage 8: Light Mode Viewport...')
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'diff_stage8_light_mode.png'),
      fullPage: false,
    })
  }

  await browser.close()
  console.log('✓ ALL 8 SCENARIO STAGE SCREENSHOTS CAPTURED SUCCESSFULLY!')
}

run().catch((err) => {
  console.error('Visual capture error:', err)
  process.exit(1)
})
