import { NextResponse } from 'next/server'
import {
  computeSimulationSnapshot,
  SCENARIO_MILESTONES,
  SCENARIO_ORIGIN,
  SCENARIO_DESTINATION,
  ACCIDENT_COORDINATES,
} from '@/lib/simulation/diff-scenario-engine'
import { DEMO_VEHICLES } from '@/lib/demo-fixtures'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const timestampParam = searchParams.get('t')
  const approvedParam = searchParams.get('approved') === 'true'

  const t = timestampParam !== null ? parseFloat(timestampParam) : 0
  const snapshot = computeSimulationSnapshot(t, approvedParam)

  return NextResponse.json({
    success: true,
    scenarioId: 'ACCIDENT_REROUTE_DEMO',
    title: 'Accident Disruption & Autonomous GeoAgent Rerouting',
    subtitle: 'Live Hypothetical Emergency Scenario Simulator',
    mode: 'SIMULATION',
    source: 'SIMULATED',
    origin: SCENARIO_ORIGIN,
    destination: SCENARIO_DESTINATION,
    vehicle: DEMO_VEHICLES[0], // AMB-01
    accident: {
      location: { type: 'Point', coordinates: ACCIDENT_COORDINATES },
      severity: 'CRITICAL',
      type: 'ACCIDENT',
      description: 'Overturned commercial truck and 2-vehicle collision blocking Old Airport Road eastbound corridor near Domlur Flyover.',
    },
    milestones: SCENARIO_MILESTONES,
    snapshot,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const t = typeof body.timestampSec === 'number' ? body.timestampSec : 0
    const approved = Boolean(body.manualOperatorApproved)

    const snapshot = computeSimulationSnapshot(t, approved)

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      snapshot,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
