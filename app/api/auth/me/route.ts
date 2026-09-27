import { NextRequest, NextResponse } from 'next/server'
import {
  verifyToken,
  findUserById,
  toSafeUser,
} from '@/lib/auth/server-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL
  const cookieToken = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const token = cookieToken || bearerToken

  // 1. Try proxying to external backend if configured
  if (backendUrl && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
    try {
      const headers: Record<string, string> = {}
      if (request.headers.get('cookie')) {
        headers['cookie'] = request.headers.get('cookie')!
      }
      if (authHeader) {
        headers['authorization'] = authHeader
      }

      const backendRes = await fetch(`${backendUrl}/api/auth/me`, {
        headers,
        next: { revalidate: 0 },
      })
      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.warn('[BFF] External backend /auth/me proxy failed, using serverless fallback:', err)
    }
  }

  // 2. Direct serverless token validation
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired authentication session' },
      { status: 401 }
    )
  }

  const user = findUserById(decoded.userId)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User account no longer found' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    user: toSafeUser(user),
  })
}
