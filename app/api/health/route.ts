import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

export async function GET() {
  const backendUrl = getBackendUrl()
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/health`, { next: { revalidate: 0 } })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.error('[BFF] health GET failed:', err)
    }
  }

  // Production must not report a fabricated healthy state when the backend is unreachable.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ status: 'unavailable', error: 'backend unreachable' }, { status: 503 })
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.floor(process.uptime()) : 3600,
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    mode: 'simulation_operational',
    services: {
      mongodb: 'healthy',
      redis: 'healthy',
      socketio: 'healthy',
    },
  })
}
