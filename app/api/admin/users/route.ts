import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'
import { listUsers, toPublic } from '@/lib/auth/db'
import { requireAdmin, unavailable } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl()

  // 1. Authoritative Express backend when configured
  if (backendUrl) {
    try {
      const search = request.nextUrl.search
      const backendRes = await fetch(`${backendUrl}/api/admin/users${search}`, {
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        headers: {
          cookie: request.headers.get('cookie') || '',
          authorization: request.headers.get('authorization') || '',
        },
        next: { revalidate: 0 },
      })
      const data = await backendRes.json()
      return NextResponse.json(data, { status: backendRes.status })
    } catch (err) {
      console.error('[BFF] admin/users proxy failed:', err instanceof Error ? err.message : 'error')
      return NextResponse.json(
        { success: false, error: 'Admin service temporarily unavailable' },
        { status: 503 }
      )
    }
  }

  // 2. Production fail-closed guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Admin service temporarily unavailable' },
      { status: 503 }
    )
  }

  // 3. Local offline test fallback (non-production only)
  try {
    const gate = requireAdmin(request)
    if (gate.error) return gate.error
    const q = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(q.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(q.get('limit') || '20', 10) || 20))
    const { rows, total } = listUsers(page, limit)
    return NextResponse.json({
      success: true,
      data: rows.map(toPublic),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    return unavailable(err)
  }
}

