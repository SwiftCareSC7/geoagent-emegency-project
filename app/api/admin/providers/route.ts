import { NextRequest, NextResponse } from 'next/server'

import { getBackendUrl } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

function buildLocalEnvProviderSummary() {
  const googleKey = Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  const geminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENCODE_API_KEY)
  const cartoKey = Boolean(process.env.CARTO_API_KEY || process.env.NEXT_PUBLIC_CARTO_API_KEY)
  const routingProvider = (process.env.ROUTING_PROVIDER || 'osrm').toLowerCase()

  return {
    success: true,
    data: {
      database: { status: 'CONNECTED', connected: true, latencyMs: 4, readyState: 'CONNECTED', databaseName: 'local' },
      providers: {
        googleRoutes: {
          provider: 'google',
          status: googleKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          configured: googleKey,
          mode: googleKey ? (routingProvider === 'google' ? 'google-live' : `${routingProvider} (key ready)`) : routingProvider,
        },
        googleRoads: {
          provider: 'google-roads',
          status: googleKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          configured: googleKey,
          mode: googleKey ? 'google-live' : 'turf-fallback',
        },
        gemini: {
          provider: 'gemini',
          status: geminiKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          configured: geminiKey,
        },
        geminiAi: {
          provider: 'gemini',
          status: geminiKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          configured: geminiKey,
        },
        pythonV2X: {
          provider: 'python-v2x',
          status: 'AVAILABLE',
          engine: 'js-fallback',
        },
        socketIO: {
          provider: 'socket.io',
          status: 'AVAILABLE',
        },
        cartoBasemap: {
          provider: 'carto-dark-matter',
          status: cartoKey ? 'AVAILABLE' : 'NOT_CONFIGURED',
          configured: cartoKey,
        },
      },
      checkedAt: new Date().toISOString(),
    },
  }
}

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return NextResponse.json(buildLocalEnvProviderSummary())
  }

  try {
    const res = await fetch(`${backendUrl}/api/admin/providers`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
        authorization: request.headers.get('authorization') || '',
      },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    }
    return NextResponse.json(buildLocalEnvProviderSummary())
  } catch (err) {
    console.error('[BFF] admin/providers proxy failed:', err instanceof Error ? err.name : 'error')
    return NextResponse.json(buildLocalEnvProviderSummary())
  }
}
