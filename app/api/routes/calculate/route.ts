import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'
  try {
    const body = await request.json().catch(() => ({}))

    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { success: false, message: 'Origin and destination GeoJSON Points are required' },
        { status: 400 }
      )
    }

    const cookieHeader = request.headers.get('cookie') || ''
    const authHeader = request.headers.get('authorization') || ''

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (cookieHeader) headers['cookie'] = cookieHeader
    if (authHeader) headers['authorization'] = authHeader

    const res = await fetch(`${backendUrl}/api/routes/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3500),
    }).catch(() => null)

    if (res && res.ok) {
      const data = await res.json().catch(() => null)
      if (data && data.success) {
        return NextResponse.json(data, { status: res.status })
      }
    }

    // Resilient Fallback 1: Call public OSRM routing engine directly
    const [origLng, origLat] = body.origin.coordinates
    const [destLng, destLat] = body.destination.coordinates

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true`
      const osrmRes = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'SwiftCare-GeoAgent-Emergency/1.0' },
        signal: AbortSignal.timeout(4000),
      })
      if (osrmRes.ok) {
        const osrmData = await osrmRes.json()
        if (osrmData.code === 'Ok' && Array.isArray(osrmData.routes) && osrmData.routes.length > 0) {
          const primary = osrmData.routes[0]
          const steps = (primary.legs?.[0]?.steps || []).map((s: any) => {
            const mType = s.maneuver?.type || ''
            const mMod = s.maneuver?.modifier || ''
            let maneuver = 'CONTINUE'
            if (mType === 'depart') maneuver = 'DEPART'
            else if (mType === 'arrive') maneuver = 'ARRIVE'
            else if (mMod.includes('left')) maneuver = 'TURN_LEFT'
            else if (mMod.includes('right')) maneuver = 'TURN_RIGHT'
            else if (mMod.includes('uturn')) maneuver = 'U_TURN'

            const name = s.name || ''
            let instruction = name ? `Follow ${name}` : 'Continue on current road'
            if (maneuver === 'DEPART') instruction = name ? `Head onto ${name}` : 'Depart towards route'
            else if (maneuver === 'TURN_LEFT') instruction = name ? `Turn left onto ${name}` : 'Turn left'
            else if (maneuver === 'TURN_RIGHT') instruction = name ? `Turn right onto ${name}` : 'Turn right'
            else if (maneuver === 'ARRIVE') instruction = 'Arrive at destination'

            return {
              maneuver,
              instruction,
              distance: Math.round(s.distance || 0),
              duration: Math.round(s.duration || 0),
              startLocation: s.maneuver?.location || undefined,
            }
          })

          let alternative = null
          if (osrmData.routes.length > 1) {
            const alt = osrmData.routes[1]
            alternative = {
              geometry: alt.geometry,
              distanceMeters: Math.round(alt.distance || 0),
              durationSeconds: Math.round(alt.duration || 0),
              preference: 'SHORTEST',
              description: 'Alternative arterial corridor',
              steps: (alt.legs?.[0]?.steps || []).map((s: any) => ({
                maneuver: s.maneuver?.type === 'arrive' ? 'ARRIVE' : 'CONTINUE',
                instruction: s.name ? `Proceed along ${s.name}` : 'Continue along bypass',
                distance: Math.round(s.distance || 0),
                duration: Math.round(s.duration || 0),
              })),
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Route plan calculated successfully via OSRM fallback',
            data: {
              geometry: primary.geometry,
              distanceMeters: Math.round(primary.distance || 0),
              durationSeconds: Math.round(primary.duration || 0),
              preference: body.preference || 'FASTEST',
              description: 'Real road network corridor',
              provider: 'OSRM_OPENSTREETMAP',
              steps: steps.length > 0 ? steps : [
                { maneuver: 'DEPART', instruction: 'Depart origin facility', distance: 300, duration: 45 },
                { maneuver: 'CONTINUE', instruction: 'Follow priority emergency corridor', distance: Math.round(primary.distance * 0.8), duration: Math.round(primary.duration * 0.8) },
                { maneuver: 'ARRIVE', instruction: 'Arrive at emergency destination', distance: 200, duration: 30 },
              ],
              alternative,
              calculatedAt: new Date().toISOString(),
            },
          })
        }
      }
    } catch (osrmErr) {
      console.warn('[BFF] OSRM public route fetch failed:', osrmErr)
    }

    // Google and OSRM were both unreachable or returned no driving path.
    // As required by PART 50: Never draw straight lines across buildings.
    return NextResponse.json(
      {
        success: false,
        code: 'ROUTE_UNAVAILABLE',
        message: 'Unable to calculate a driving route on the road network. Please retry.',
      },
      { status: 503 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[BFF] /api/routes/calculate POST failed:', err)
    return NextResponse.json(
      {
        success: false,
        message: `Route calculation service unavailable: ${message}`,
      },
      { status: 500 }
    )
  }
}
