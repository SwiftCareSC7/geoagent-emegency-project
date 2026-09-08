import { NextResponse, NextRequest } from 'next/server'
import { DEMO_PREDICTION } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/analysis/vehicle/${encodeURIComponent(vehicleId)}/prediction`, {
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

  return NextResponse.json({
    success: true,
    message: 'Prediction retrieved',
    data: DEMO_PREDICTION,
  })
}
