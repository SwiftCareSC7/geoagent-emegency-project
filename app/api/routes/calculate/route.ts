import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'
  try {
    const body = await request.json().catch(() => ({}))

    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { success: false, message: 'Origin and destination GeoJSON Points are required' },
        { status: 400 }
      )
    }

    const cookieHeader = request.headers.get('cookie') || ''
    const authHeader = request.headers.get('authorization') || ''

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (cookieHeader) headers['cookie'] = cookieHeader
    if (authHeader) headers['authorization'] = authHeader

    const res = await fetch(`${backendUrl}/api/routes/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[BFF] /api/routes/calculate POST failed:', err)
    return NextResponse.json(
      {
        success: false,
        message: `Route calculation service unavailable: ${message}`,
      },
      { status: 502 }
    )
  }
}
