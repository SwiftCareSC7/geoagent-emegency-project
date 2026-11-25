import { NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS, backendAuthHeaders } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

const EMPTY_DECISIONS = {
  success: true,
  data: [],
  meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
}

// Forward GET /api/decisions (with optional ?emergencyId=...) to the Express backend.
export async function GET(req: Request) {
  const backend = getBackendUrl()
  if (!backend) {
    return NextResponse.json({ success: false, message: 'Backend is not configured' }, { status: 503 })
  }

  const url = new URL(req.url)
  const emergencyId = url.searchParams.get('emergencyId')?.trim()
  const targetPath = emergencyId
    ? `/api/emergencies/${encodeURIComponent(emergencyId)}/decisions`
    : `/api/decisions${url.search}`

  try {
    const res = await fetch(`${backend}${targetPath}`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...(await backendAuthHeaders()) },
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      next: { revalidate: 0 },
    })

    // Unknown/demo emergency IDs or unscoped list requests should return an empty list cleanly instead of 400/404 noise.
    if (res.status === 404 || res.status === 400) {
      return NextResponse.json(EMPTY_DECISIONS, { status: 200 })
    }

    const data = await res.json().catch(() => EMPTY_DECISIONS)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error(`[BFF] GET ${targetPath} failed:`, err)
    return NextResponse.json({ success: false, message: 'Backend request failed' }, { status: 502 })
  }
}
