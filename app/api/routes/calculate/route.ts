import { NextResponse, NextRequest } from 'next/server'
import { CANONICAL_ROAD_CORRIDORS } from '@/lib/canonical-road-corridors'
import { haversineDistance, validateRouteGeometry } from '@/lib/route-validator'

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
    const parseCoords = (pt: any): [number, number] | null => {
      if (!pt) return null
      if (Array.isArray(pt) && pt.length >= 2) return [Number(pt[0]), Number(pt[1])]
      if (Array.isArray(pt.coordinates) && pt.coordinates.length >= 2) return [Number(pt.coordinates[0]), Number(pt.coordinates[1])]
      if (pt.lng !== undefined && pt.lat !== undefined) return [Number(pt.lng), Number(pt.lat)]
      if (pt.longitude !== undefined && pt.latitude !== undefined) return [Number(pt.longitude), Number(pt.latitude)]
      return null
    }

    const orig = parseCoords(body.origin)
    const dest = parseCoords(body.destination)

    if (!orig || !dest) {
      return NextResponse.json(
        { success: false, message: 'Invalid origin or destination coordinates' },
        { status: 400 }
      )
    }

    const [origLng, origLat] = orig
    const [destLng, destLat] = dest

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

    // Resilient Fallback 2: Check canonical road network corridors
    for (const [key, corridor] of Object.entries(CANONICAL_ROAD_CORRIDORS)) {
      const coords = corridor.primary.coordinates as unknown as [number, number][]
      if (!coords || coords.length < 2) continue
      const startPt = coords[0]
      const endPt = coords[coords.length - 1]
      const dStart = haversineDistance(orig, startPt)
      const dEnd = haversineDistance(dest, endPt)
      if (dStart < 3500 && dEnd < 3500) {
        let altData = null
        if (corridor.alternative && corridor.alternative.coordinates?.length > 1) {
          altData = {
            geometry: {
              type: 'LineString',
              coordinates: corridor.alternative.coordinates,
            },
            distanceMeters: corridor.alternative.distance || 5000,
            durationSeconds: corridor.alternative.duration || 600,
            preference: 'SHORTEST',
            description: 'Alternative arterial corridor detour',
          }
        }
        return NextResponse.json({
          success: true,
          message: 'Route plan calculated successfully via canonical road network corridor',
          data: {
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
            distanceMeters: corridor.primary.distance || 4500,
            durationSeconds: corridor.primary.duration || 540,
            preference: body.preference || 'FASTEST',
            description: `Authoritative road network corridor (${key})`,
            provider: 'CANONICAL_ROAD_NETWORK',
            steps: [
              { maneuver: 'DEPART', instruction: 'Depart origin along designated emergency lane', distance: 350, duration: 45 },
              { maneuver: 'CONTINUE', instruction: 'Follow priority emergency corridor', distance: Math.round((corridor.primary.distance || 4500) * 0.8), duration: Math.round((corridor.primary.duration || 540) * 0.8) },
              { maneuver: 'ARRIVE', instruction: 'Arrive at destination facility', distance: 200, duration: 30 },
            ],
            alternative: altData,
            calculatedAt: new Date().toISOString(),
          },
        })
      }
    }

    // Both OSRM and canonical corridors were unreachable or did not match coordinates.
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
