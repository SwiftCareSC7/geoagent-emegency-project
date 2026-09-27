/**
 * Test Next.js App Router Auth endpoints directly (port 3000)
 */

async function runTests() {
  const BASE_URL = 'http://localhost:3000/api'
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  console.log('--- 1. Login with spec.priyanshu@gmail.com ---')
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'spec.priyanshu@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'FzhexDCVDMj7AFb',
    }),
  })
  const loginData = await loginRes.json()
  assert(loginRes.status === 200, `Login returns 200 (got ${loginRes.status})`)
  assert(loginData.user?.role === 'ADMIN', `User role is ADMIN (got ${loginData.user?.role})`)
  assert(loginData.user?.email === 'spec.priyanshu@gmail.com', `User email matches`)

  const cookie = loginRes.headers.get('set-cookie')
  assert(!!cookie && cookie.includes('token='), `Received token cookie: ${cookie?.slice(0, 30)}...`)

  console.log('\n--- 2. Login with Invalid Password ---')
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'spec.priyanshu@gmail.com',
      password: 'TotallyWrongPassword123!',
    }),
  })
  assert(badLoginRes.status === 401, `Invalid login returns 401 (got ${badLoginRes.status})`)

  console.log('\n--- 3. Session Check (GET /api/auth/me) ---')
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { cookie: cookie || '' },
  })
  const meData = await meRes.json()
  assert(meRes.status === 200, `GET /api/auth/me returns 200`)
  assert(meData.user?.email === 'spec.priyanshu@gmail.com', `Session user email matches`)
  assert(meData.user?.role === 'ADMIN', `Session user role is ADMIN`)

  console.log('\n--- 4. Register with ADMIN Role ---')
  const uniqueAdminEmail = `admin.${Date.now()}@swiftcare.local`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'System Operations Admin',
      email: uniqueAdminEmail,
      password: 'SecureAdminPassword123!',
      role: 'ADMIN',
    }),
  })
  const regData = await regRes.json()
  assert(regRes.status === 201, `Registration returns 201 Created (got ${regRes.status})`)
  assert(regData.user?.role === 'ADMIN', `Registered user role is ADMIN (got ${regData.user?.role})`)

  console.log('\n--- 5. Duplicate Email Rejection ---')
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Operator',
      email: 'operator@swiftcare.local',
      password: 'SecureOperatorPassword123!',
      role: 'CONTROL_ROOM',
    }),
  })
  assert(dupRes.status === 409, `Duplicate email returns 409 Conflict (got ${dupRes.status})`)

  console.log('\n--- 6. Admin Stats Endpoint ---')
  const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { cookie: cookie || '' },
  })
  const statsData = await statsRes.json()
  assert(statsRes.status === 200, `GET /api/admin/stats returns 200`)
  assert(statsData.data?.counts?.users > 0, `Stats returns active users count: ${statsData.data?.counts?.users}`)

  console.log('\n--- 7. Logout ---')
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookie || '' },
  })
  assert(logoutRes.status === 200, `POST /api/auth/logout returns 200`)

  console.log(`\n========================================`)
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)

  if (failed > 0) process.exit(1)
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
