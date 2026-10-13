import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend('PATCH', `/api/emergencies/${encodeURIComponent(id)}/assign`, await req.json().catch(() => ({})))
}
