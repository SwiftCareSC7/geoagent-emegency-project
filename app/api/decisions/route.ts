import { NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

// The backend lists decisions per emergency (GET /api/emergencies/:id/decisions).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const emergencyId = url.searchParams.get('emergencyId')
  if (!emergencyId) return proxyToBackend('GET', `/api/admin/decisions${url.search}`)
  return proxyToBackend('GET', `/api/emergencies/${encodeURIComponent(emergencyId)}/decisions`)
}
