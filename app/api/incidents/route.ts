import { NextResponse, NextRequest } from 'next/server'
import { DEMO_INCIDENTS } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const { searchParams } = new URL(request.url)
      const res = await fetch(`${backendUrl}/api/incidents?${searchParams.toString()}`, {
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
    count: DEMO_INCIDENTS.length,
    data: DEMO_INCIDENTS,
  })
}
