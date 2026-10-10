import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params
  return proxyToBackend('POST', `/api/clearance/vehicle/${encodeURIComponent(vehicleId)}/cycle`, {})
}
