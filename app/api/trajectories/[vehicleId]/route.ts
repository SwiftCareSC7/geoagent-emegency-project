import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params
  const qs = new URL(req.url).search
  return proxyToBackend('GET', `/api/trajectories/${encodeURIComponent(vehicleId)}${qs}`)
}
