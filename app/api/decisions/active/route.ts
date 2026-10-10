import { NextResponse } from 'next/server'
import { DEMO_DECISION } from '@/lib/demo-fixtures'
import { backendAuthHeaders } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/decisions/active`, { next: { revalidate: 0 }, headers: await backendAuthHeaders() })
      if (res.status === 401 || res.status === 403) return NextResponse.json(await res.json().catch(() => ({ success: false })), { status: res.status })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.error('[BFF] decisions active GET failed:', err)
    }
  }

  return NextResponse.json({
    success: true,
    count: 1,
    data: [DEMO_DECISION],
  })
}
