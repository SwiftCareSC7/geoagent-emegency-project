import { NextRequest, NextResponse } from 'next/server'

import { getBackendUrl } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return NextResponse.json({ success: false, error: 'Admin providers service temporarily unavailable' }, { status: 503 })
  }

  try {
    const res = await fetch(`${backendUrl}/api/admin/providers`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
        authorization: request.headers.get('authorization') || '',
      },
      next: { revalidate: 0 },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[BFF] admin/providers proxy failed:', err instanceof Error ? err.name : 'error')
    return NextResponse.json({ success: false, error: 'Admin providers service temporarily unavailable' }, { status: 503 })
  }
}
