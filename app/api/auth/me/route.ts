import { NextRequest, NextResponse } from 'next/server'

import { getBackendUrl } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl()
  const cookieToken = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const token = cookieToken || bearerToken

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Authoritative backend /auth/me session verification
  try {
    if (!backendUrl) throw new Error('BACKEND_URL not configured')
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
      headers,
      next: { revalidate: 0 },
    })
    const data = await backendRes.json()
    return NextResponse.json(data, { status: backendRes.status })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Authentication service temporarily unavailable' },
      { status: 503 }
    )
  }
}
