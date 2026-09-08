import { NextResponse, NextRequest } from 'next/server'
import { DEMO_TRAJECTORIES } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/trajectories/${encodeURIComponent(vehicleId)}/latest`, {
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

  const list = DEMO_TRAJECTORIES[vehicleId] || DEMO_TRAJECTORIES['AMB-DEMO-01'] || []
  const latest = list[list.length - 1] || list[0]
  return NextResponse.json({ success: true, data: latest })
}
