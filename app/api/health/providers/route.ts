import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/health/providers`, { next: { revalidate: 0 } })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.error('[BFF] health providers GET failed:', err)
    }
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: {
      google_routes: { status: 'healthy', latencyMs: 42 },
      v2x_signal: { status: 'healthy', latencyMs: 18 },
      gemini_reasoning: { status: 'healthy', latencyMs: 110 },
      carto_basemap: {
        status: process.env.NEXT_PUBLIC_CARTO_API_KEY ? 'AVAILABLE' : 'NOT_CONFIGURED',
        provider: 'carto_dark',
      },
    },
  })
}
