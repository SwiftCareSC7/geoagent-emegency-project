import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

// Read-only Database Explorer lists. Express enforces ADMIN; unknown resources stay 404.
const RESOURCES = new Set([
  'vehicles', 'emergencies', 'incidents', 'routes', 'trajectories', 'predictions', 'decisions', 'prediction-analytics',
])

export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!RESOURCES.has(resource)) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  return proxyToBackend('GET', `/api/admin/${resource}${req.nextUrl.search}`)
}
