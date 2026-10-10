import { NextRequest, NextResponse } from 'next/server'
import { getUserBySession, SESSION_COOKIE } from './db'

const cookieBase = { name: SESSION_COOKIE, httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' }

export const sessionToken = (req: NextRequest) => req.cookies.get(SESSION_COOKIE)?.value

export function setSessionCookie(res: NextResponse, token: string, expiresAt: number) {
  res.cookies.set({ ...cookieBase, value: token, expires: new Date(expiresAt) })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({ ...cookieBase, value: '', maxAge: 0 })
}

export function unavailable(err: unknown) {
  console.error('[auth] storage error:', err instanceof Error ? err.message : 'error')
  return NextResponse.json({ success: false, error: 'Authentication storage is unavailable' }, { status: 503 })
}

/** Server-side admin gate for every /api/admin/users* handler (independent of any UI visibility). */
export function requireAdmin(req: NextRequest) {
  const user = getUserBySession(sessionToken(req))
  if (!user) return { error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) }
  if (user.role !== 'ADMIN') return { error: NextResponse.json({ success: false, error: 'Administrator access required' }, { status: 403 }) }
  return { user }
}
