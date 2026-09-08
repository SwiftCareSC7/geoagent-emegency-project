import { NextResponse, NextRequest } from 'next/server'
import { DEMO_EMERGENCIES } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/emergencies/${encodeURIComponent(id)}`, {
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

  const found = DEMO_EMERGENCIES.find(
    (e) => e.emergencyId === id || e.id === id
  ) || DEMO_EMERGENCIES[0]

  return NextResponse.json({ success: true, data: found })
}
