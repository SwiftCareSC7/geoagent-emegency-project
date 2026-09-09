import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { emergencyId } = await params as { emergencyId: string }
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'

  try {
    const body = await request.json().catch(() => ({}))
    const cookieHeader = request.headers.get('cookie') || ''
    const authHeader = request.headers.get('authorization') || ''

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (cookieHeader) headers['cookie'] = cookieHeader
    if (authHeader) headers['authorization'] = authHeader

    const res = await fetch(`${backendUrl}/api/emergencies/${encodeURIComponent(emergencyId)}/send-status-sms`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[BFF] /api/emergencies/[emergencyId]/send-status-sms POST failed:', err)
    return NextResponse.json(
      { success: false, message: `Failed to dispatch SMS: ${message}` },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { emergencyId } = await params as { emergencyId: string }
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'

  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const authHeader = request.headers.get('authorization') || ''

    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    if (cookieHeader) headers['cookie'] = cookieHeader
    if (authHeader) headers['authorization'] = authHeader

    const res = await fetch(`${backendUrl}/api/emergencies/${encodeURIComponent(emergencyId)}/send-status-sms`, {
      method: 'GET',
      headers,
      next: { revalidate: 0 },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[BFF] /api/emergencies/[emergencyId]/send-status-sms GET failed:', err)
    return NextResponse.json(
      { success: false, message: `Failed to fetch SMS status: ${message}` },
      { status: 502 }
    )
  }
}
