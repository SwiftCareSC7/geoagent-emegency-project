import { NextResponse, NextRequest } from 'next/server'
import { DEMO_EMERGENCIES } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL
  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const { searchParams } = new URL(request.url)
      const res = await fetch(`${backendUrl}/api/emergencies?${searchParams.toString()}`, {
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch {
      // Fall through to demo fixtures
    }
  }

  return NextResponse.json({
    success: true,
    count: DEMO_EMERGENCIES.length,
    data: DEMO_EMERGENCIES,
  })
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL
  const body = await request.json().catch(() => ({}))

  if (backendUrl && !backendUrl.includes('localhost')) {
    try {
      const res = await fetch(`${backendUrl}/api/emergencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data, { status: 201 })
      }
    } catch {
      // Fall through
    }
  }

  const newEmergency = {
    id: `emg-${Date.now()}`,
    emergencyId: `EMG-${Date.now().toString().slice(-4)}`,
    type: body.type || 'MEDICAL',
    priority: body.priority || 'HIGH',
    status: 'PENDING_DISPATCH',
    description: body.description || 'Emergency reported via dispatch console',
    location: body.location || { type: 'Point', coordinates: [77.6030, 12.9730] },
    destination: body.destination || { type: 'Point', coordinates: [77.6483, 12.9582] },
    callerName: body.callerName || 'Dispatcher',
    callerContact: body.callerContact || '+91 99999 00000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json({ success: true, data: newEmergency }, { status: 201 })
}
