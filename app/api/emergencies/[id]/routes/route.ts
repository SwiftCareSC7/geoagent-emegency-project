import { NextResponse, NextRequest } from 'next/server'
import { DEMO_ROUTES } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    } catch {
      // Fall through
    }
  }

  const routes = DEMO_ROUTES[id] || DEMO_ROUTES['E-DEMO-001'] || []
  return NextResponse.json({ success: true, count: routes.length, data: routes })
}
