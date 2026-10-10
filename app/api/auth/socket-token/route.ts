import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * The session cookie is HttpOnly on the frontend origin, so a Socket.IO connection to the Render origin cannot send it.
 * Hand the same token to same-origin JS for the handshake only; Express re-verifies it and the user's role on connect.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
  return NextResponse.json({ success: true, token }, { headers: { 'Cache-Control': 'no-store' } })
}
