import { NextRequest, NextResponse } from 'next/server'
import {
  findUserByEmail,
  verifyUserPassword,
  createToken,
  toSafeUser,
} from '@/lib/auth/server-store'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL
  const body = await request.json().catch(() => ({}))
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // 1. If backend URL is provided (e.g. deployed container/Express API), try proxying
  if (backendUrl && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
    try {
      const backendRes = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await backendRes.json()
      const response = NextResponse.json(data, { status: backendRes.status })

      // Forward Set-Cookie headers
      const setCookie = backendRes.headers.get('set-cookie')
      if (setCookie) {
        response.headers.set('set-cookie', setCookie)
      }
      return response
    } catch (err) {
      console.warn('[BFF] External backend login proxy failed, using serverless fallback:', err)
    }
  }

  // 2. Direct serverless authentication
  const user = findUserByEmail(email)
  if (!user || !verifyUserPassword(user, password)) {
    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  const token = createToken(user.id, user.role)
  const safeUser = toSafeUser(user)

  const response = NextResponse.json({
    success: true,
    message: 'Login successful',
    user: safeUser,
  })

  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return response
}
