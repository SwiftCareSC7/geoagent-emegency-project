import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/backend-url'
import { deleteSession } from '@/lib/auth/db'
import { clearSessionCookie, sessionToken } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (backendUrl) {
    try {
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          cookie: request.headers.get('cookie') || '',
          authorization: request.headers.get('authorization') || '',
        },
      })
    } catch (err) {
      console.error('[BFF] logout backend call failed:', err instanceof Error ? err.message : 'error')
    }
  } else if (process.env.NODE_ENV !== 'production') {
    const token = sessionToken(request)
    if (token) {
      try {
        deleteSession(token)
      } catch {}
    }
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  clearSessionCookie(response)
  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
