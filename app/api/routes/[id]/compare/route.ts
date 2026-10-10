import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'
// Route alternatives come from OSRM and take 12-15s; the default 10s proxy limit is too short.
export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend('GET', `/api/routes/${encodeURIComponent(id)}/compare`, undefined, 50_000)
}
