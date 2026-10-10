import { proxyToBackend } from '@/lib/bff-proxy'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params
  return proxyToBackend('GET', `/api/clearance/vehicle/${encodeURIComponent(vehicleId)}`)
}
