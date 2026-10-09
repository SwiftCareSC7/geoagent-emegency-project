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
      // x-render-routing=no-server means the Render service has no live deploy (e.g. failed build / bad MONGO_URI).
      const hint = res.headers.get('x-render-routing') ?? undefined
      return NextResponse.json({ status: 'unavailable', reason: `backend_http_${res.status}`, hint }, { status: 503 })
    }
    return NextResponse.json({ status: 'ok', backend: 'ready' })
  } catch (err) {
    console.error('[BFF] health: backend unreachable:', err instanceof Error ? err.name : 'error')
    return NextResponse.json({ status: 'unavailable', reason: 'backend_unreachable' }, { status: 503 })
  }
}
