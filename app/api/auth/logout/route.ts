import { NextRequest, NextResponse } from 'next/server'

import { getBackendUrl } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl()

  try {
    if (!backendUrl) throw new Error('BACKEND_URL not configured')
    await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
        authorization: request.headers.get('authorization') || '',
      },
    })
  } catch (err) {
    // Non-fatal if backend is down; clear client cookie anyway
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })

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
