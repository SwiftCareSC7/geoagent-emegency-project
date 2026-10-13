import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'
// Analysis can take a while (route alternatives + AI); default proxy limit is too short.
export const maxDuration = 60

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend('POST', `/api/routes/${encodeURIComponent(id)}/reroute`, await req.json().catch(() => ({})), 50_000)
}
