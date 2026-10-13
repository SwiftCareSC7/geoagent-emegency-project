import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend('POST', `/api/decisions/${encodeURIComponent(id)}/execute`, await req.json().catch(() => ({})))
}
