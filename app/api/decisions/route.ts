import { NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

// The backend lists decisions per emergency (GET /api/emergencies/:id/decisions).
export async function GET(req: Request) {
  const emergencyId = new URL(req.url).searchParams.get('emergencyId')
  if (!emergencyId) return NextResponse.json({ success: false, message: 'emergencyId is required' }, { status: 400 })
  return proxyToBackend('GET', `/api/emergencies/${encodeURIComponent(emergencyId)}/decisions`)
}
