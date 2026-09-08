import { NextResponse, NextRequest } from 'next/server'
import { DEMO_ROUTES } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params as { id: string }
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/emergencies/${encodeURIComponent(id)}/routes`, {
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.error('[BFF] emergency routes GET failed:', err)
    }
  }

  const routes = DEMO_ROUTES[id] || DEMO_ROUTES['E-DEMO-001'] || []
  return NextResponse.json({ success: true, count: routes.length, data: routes })
}
