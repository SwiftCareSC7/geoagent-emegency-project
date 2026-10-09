import { NextRequest, NextResponse } from 'next/server'

import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl()
  const body = await request.json().catch(() => ({}))
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Authoritative backend authentication
  try {
    if (!backendUrl) throw new Error('BACKEND_URL not configured')
    const backendRes = await fetch(`${backendUrl}/api/auth/login`, {
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await backendRes.json()
    const response = NextResponse.json(data, { status: backendRes.status })

    // Forward Set-Cookie headers from authoritative backend
    const setCookie = backendRes.headers.get('set-cookie')
    if (setCookie) {
      response.headers.set('set-cookie', setCookie)
    }
    return response
  } catch (err) {
    console.error('[BFF] login: backend call failed:', err instanceof Error ? err.message : 'error')
    // Fail closed: Never authenticate against local demo accounts when backend fails
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication service temporarily unavailable. Please try again later.',
      },
      { status: 503 }
    )
  }
}
