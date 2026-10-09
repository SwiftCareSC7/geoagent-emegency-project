import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'
import { getUserBySession, toPublic } from '@/lib/auth/db'
import { sessionToken, unavailable } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl()
  const cookieToken = request.cookies.get('token')?.value || request.cookies.get('sc_session')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const token = cookieToken || bearerToken

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  // 1. Authoritative Express backend when configured
  if (backendUrl) {
    try {
      const headers: Record<string, string> = {}
      if (request.headers.get('cookie')) {
        headers['cookie'] = request.headers.get('cookie')!
      } else {
        headers['cookie'] = `token=${token}`
      }
      if (authHeader) {
        headers['authorization'] = authHeader
      } else {
        headers['authorization'] = `Bearer ${token}`
      }

      const backendRes = await fetch(`${backendUrl}/api/auth/me`, {
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        headers,
        next: { revalidate: 0 },
      })
      const data = await backendRes.json()
      return NextResponse.json(data, { status: backendRes.status })
    } catch (err) {
      console.error('[BFF] me: backend call failed:', err instanceof Error ? err.message : 'error')
      return NextResponse.json(
        { success: false, error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      )
    }
  }

  // 2. Production fail-closed guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Authentication service temporarily unavailable' },
      { status: 503 }
    )
  }

  // 3. Local offline test fallback (non-production only)
  try {
    const sToken = sessionToken(request) || token
    const user = getUserBySession(sToken)
    if (!user) return NextResponse.json({ success: false, error: 'Session expired or invalid' }, { status: 401 })
    return NextResponse.json({ success: true, user: toPublic(user) })
  } catch (err) {
    return unavailable(err)
  }
}
