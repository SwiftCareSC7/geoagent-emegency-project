import { NextRequest, NextResponse } from 'next/server'
import { usersStore, toSafeUser } from '@/lib/auth/server-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL

  if (backendUrl && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
    try {
      const res = await fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          cookie: request.headers.get('cookie') || '',
          authorization: request.headers.get('authorization') || '',
        },
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.warn('[BFF] External backend /admin/users proxy failed, using serverless fallback:', err)
    }
  }

  const safeUsers = Array.from(usersStore.values()).map(toSafeUser)
  return NextResponse.json({
    success: true,
    data: safeUsers,
    pagination: {
      page: 1,
      limit: 50,
      total: safeUsers.length,
      totalPages: 1,
    },
  })
}
