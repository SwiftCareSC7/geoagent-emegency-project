import { NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

// Proxies the Express readiness probe (DB-aware). Never fabricates a healthy state; `reason` is a safe code, no URLs/secrets.
export async function GET() {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return NextResponse.json({ status: 'unavailable', reason: 'backend_not_configured' }, { status: 503 })
  }
  try {
    const res = await fetch(`${backendUrl}/api/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    })
    if (!res.ok) {
      return NextResponse.json({ status: 'unavailable', reason: `backend_http_${res.status}` }, { status: 503 })
    }
    return NextResponse.json({ status: 'ok', backend: 'ready' })
  } catch (err) {
    console.error('[BFF] health: backend unreachable:', err instanceof Error ? err.name : 'error')
    return NextResponse.json({ status: 'unavailable', reason: 'backend_unreachable' }, { status: 503 })
  }
}
