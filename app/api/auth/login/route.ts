import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'
import { createSession, getUserByEmail, toPublic, verifyPassword } from '@/lib/auth/db'
import { setSessionCookie, unavailable } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const fail = (status: number, error: string) =>
  NextResponse.json({ success: false, error, message: error }, { status })

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { email, password } = body
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return fail(400, 'Email and password are required')
  }

  // 1. Authoritative Express backend when configured
  const backendUrl = getBackendUrl()
  if (backendUrl) {
    try {
      const backendRes = await fetch(`${backendUrl}/api/auth/login`, {
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await backendRes.json()
      const response = NextResponse.json(data, { status: backendRes.status })
      const setCookie = backendRes.headers.get('set-cookie')
      if (setCookie) {
        response.headers.set('set-cookie', setCookie)
      }
      return response
    } catch (err) {
      console.error('[BFF] login: backend call failed:', err instanceof Error ? err.message : 'error')
      return fail(503, 'Authentication service temporarily unavailable. Please try again later.')
    }
  }

  // 2. Production fail-closed guard
  if (process.env.NODE_ENV === 'production') {
    return fail(503, 'Authentication service temporarily unavailable. Please try again later.')
  }

  // 3. Local offline test fallback (non-production only)
  try {
    const user = getUserByEmail(email)
    const ok = verifyPassword(password, user?.password_hash)
    if (!user || !ok) return fail(401, 'Invalid email or password')
    if (user.status === 'PENDING') return fail(403, 'Account registration is pending administrator approval')
    if (user.status !== 'APPROVED') return fail(403, `Account is ${user.status.toLowerCase()}. Contact an administrator.`)

    const { token, expiresAt } = createSession(user.id)
    const res = NextResponse.json({ success: true, message: 'Login successful', user: toPublic(user) })
    setSessionCookie(res, token, expiresAt)
    return res
  } catch (err) {
    return unavailable(err)
  }
}
