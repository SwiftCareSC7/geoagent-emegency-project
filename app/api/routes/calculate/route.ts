import { NextResponse, NextRequest } from 'next/server'
import { CANONICAL_ROAD_CORRIDORS } from '@/lib/canonical-road-corridors'
import { haversineDistance } from '@/lib/route-validator'
import { getBackendUrl } from '@/lib/backend-url'

export const dynamic = 'force-dynamic'

function parseCoords(pt: any): [number, number] | null {
  if (!pt) return null
  if (Array.isArray(pt) && pt.length >= 2) return [Number(pt[0]), Number(pt[1])]
  if (Array.isArray(pt.coordinates) && pt.coordinates.length >= 2) return [Number(pt.coordinates[0]), Number(pt.coordinates[1])]
  if (pt.lng !== undefined && pt.lat !== undefined) return [Number(pt.lng), Number(pt.lat)]
  if (pt.longitude !== undefined && pt.latitude !== undefined) return [Number(pt.longitude), Number(pt.latitude)]
  return null
}

function mapOsrmSteps(osrmRoute: any) {
  const steps: any[] = []
  for (const leg of osrmRoute?.legs || []) {
    for (const s of leg?.steps || []) {
      const mType = s.maneuver?.type || ''
      const mMod = s.maneuver?.modifier || ''
      let maneuver = 'CONTINUE'
      if (mType === 'depart') maneuver = 'DEPART'
      else if (mType === 'arrive') maneuver = 'ARRIVE'
      else if (mMod.includes('left')) maneuver = 'TURN_LEFT'
      else if (mMod.includes('right')) maneuver = 'TURN_RIGHT'
      else if (mMod.includes('uturn')) maneuver = 'U_TURN'

      const dist = Math.round(s.distance || 0)
      if (dist === 0 && maneuver !== 'ARRIVE') continue

      const name = s.name || ''
      let instruction = name ? `Follow ${name}` : 'Continue on current road'
      if (maneuver === 'DEPART') instruction = name ? `Head onto ${name}` : 'Depart towards route'
      else if (maneuver === 'TURN_LEFT') instruction = name ? `Turn left onto ${name}` : 'Turn left'
      else if (maneuver === 'TURN_RIGHT') instruction = name ? `Turn right onto ${name}` : 'Turn right'
      else if (maneuver === 'ARRIVE') instruction = 'Arrive at destination'

      steps.push({
        maneuver,
        instruction,
        distance: dist,
        duration: Math.round(s.duration || 0),
        startLocation: s.maneuver?.location || undefined,
      })
    }
  }
  return steps
}

function computeOverlapPercent(primary: [number, number][], alt: [number, number][]): number {
  if (!primary?.length || !alt?.length) return 100
  let closeCount = 0
  const stride = Math.max(1, Math.floor(primary.length / 60))
  const stepAlt = Math.max(1, Math.floor(alt.length / 40))
  let samples = 0
  for (let j = 0; j < alt.length; j += stepAlt) {
    samples++
    const apt = alt[j]
    let minD = Infinity
    for (let i = 0; i < primary.length; i += stride) {
      const d = haversineDistance(apt, primary[i])
      if (d < minD) minD = d
      if (minD <= 50) break
    }
    if (minD <= 50) closeCount++
  }
  return Math.round((100 * closeCount) / Math.max(1, samples))
}

async function fetchDivergingOsrmBypass(
  orig: [number, number],
  dest: [number, number],
  primaryCoords: [number, number][]
) {
  const midLng = (orig[0] + dest[0]) / 2
  const midLat = (orig[1] + dest[1]) / 2
  const dx = dest[0] - orig[0]
  const dy = dest[1] - orig[1]
  const directMeters = Math.max(400, haversineDistance(orig, dest))

  // Perpendicular arterial offsets (left and right of corridor centerline)
  const scales = [0.28, -0.28, 0.42, -0.42]
  let bestCandidate: any = null

  for (const scale of scales) {
    const viaLng = Number((midLng - dy * scale).toFixed(6))
    const viaLat = Number((midLat + dx * scale).toFixed(6))
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${orig[0]},${orig[1]};${viaLng},${viaLat};${dest[0]},${dest[1]}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SwiftCare-GeoAgent-Emergency/1.0' },
        signal: AbortSignal.timeout(3500),
      })
      if (!res.ok) continue
      const json = await res.json()
      const r = json?.routes?.[0]
      const coords = r?.geometry?.coordinates as [number, number][] | undefined
      if (!coords || coords.length < 6) continue
      if (r.distance > directMeters * 3.0) continue

      const overlap = computeOverlapPercent(primaryCoords, coords)
      const candidate = {
        geometry: r.geometry,
        distanceMeters: Math.round(r.distance || 0),
        durationSeconds: Math.round(r.duration || 0),
        preference: 'FASTEST',
        description: 'GeoAgent Recommended Bypass Corridor',
        steps: mapOsrmSteps(r),
        overlap,
      }
      if (!bestCandidate || overlap < bestCandidate.overlap) {
        bestCandidate = candidate
      }
      if (overlap <= 45) break
    } catch {
      // Try next offset candidate
    }
  }

  if (!bestCandidate) return null
  const { overlap: _ov, ...cleanAlt } = bestCandidate
  return cleanAlt
}

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl() || 'http://localhost:5001'
  try {
    const body = await request.json().catch(() => ({}))

    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { success: false, message: 'Origin and destination GeoJSON Points are required' },
        { status: 400 }
      )
    }

    const orig = parseCoords(body.origin)
    const dest = parseCoords(body.destination)

    if (!orig || !dest) {
      return NextResponse.json(
        { success: false, message: 'Invalid origin or destination coordinates' },
        { status: 400 }
      )
    }

    const wantAlternatives = body.computeAlternatives !== false
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
      signal: AbortSignal.timeout(4000),
    }).catch(() => null)

    if (res && res.ok) {
      const payload = await res.json().catch(() => null)
      if (payload?.success && payload?.data?.geometry?.coordinates?.length >= 5) {
        const primaryCoords = payload.data.geometry.coordinates as [number, number][]
        const existingAltCoords = payload.data.alternative?.geometry?.coordinates as [number, number][] | undefined
        const needsDistinctAlt =
          wantAlternatives &&
          (!existingAltCoords ||
            existingAltCoords.length < 5 ||
            computeOverlapPercent(primaryCoords, existingAltCoords) > 65)

        if (needsDistinctAlt) {
          const divergingAlt = await fetchDivergingOsrmBypass(orig, dest, primaryCoords)
          if (divergingAlt) {
            payload.data.alternative = divergingAlt
          }
        }
        return NextResponse.json(payload, { status: res.status })
      }
    }

    // Resilient Fallback 1: Public OSRM road network + diverging GeoAgent bypass
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
          const primaryCoords = primary.geometry.coordinates as [number, number][]
          const steps = mapOsrmSteps(primary)

          let alternative: any = null
          if (wantAlternatives && osrmData.routes.length > 1) {
            const alt = osrmData.routes[1]
            if (computeOverlapPercent(primaryCoords, alt.geometry.coordinates) <= 65) {
              alternative = {
                geometry: alt.geometry,
                distanceMeters: Math.round(alt.distance || 0),
                durationSeconds: Math.round(alt.duration || 0),
                preference: 'FASTEST',
                description: 'GeoAgent Recommended Bypass Corridor',
                steps: mapOsrmSteps(alt),
              }
            }
          }

          if (wantAlternatives && !alternative) {
            alternative = await fetchDivergingOsrmBypass(orig, dest, primaryCoords)
          }

          return NextResponse.json({
            success: true,
            message: 'Route plan calculated successfully via OSRM road network',
            data: {
              geometry: primary.geometry,
              distanceMeters: Math.round(primary.distance || 0),
              durationSeconds: Math.round(primary.duration || 0),
              preference: body.preference || 'FASTEST',
              description: 'Planned road network corridor',
              provider: 'OSRM_OPENSTREETMAP',
              steps: steps.length > 0 ? steps : [
                { maneuver: 'DEPART', instruction: 'Depart origin facility', distance: 300, duration: 45, startLocation: orig },
                { maneuver: 'ARRIVE', instruction: 'Arrive at emergency destination', distance: 0, duration: 0, startLocation: dest },
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

    // Resilient Fallback 2: Canonical road network corridors (strict proximity match only)
    for (const [key, corridor] of Object.entries(CANONICAL_ROAD_CORRIDORS)) {
      const coords = corridor.primary.coordinates as unknown as [number, number][]
      if (!coords || coords.length < 2) continue
      const startPt = coords[0]
      const endPt = coords[coords.length - 1]
      const dStart = haversineDistance(orig, startPt)
      const dEnd = haversineDistance(dest, endPt)
      if (dStart < 1800 && dEnd < 1800) {
        let altData = null
        if (wantAlternatives && corridor.alternative && corridor.alternative.coordinates?.length > 1) {
          altData = {
            geometry: {
              type: 'LineString',
              coordinates: corridor.alternative.coordinates,
            },
            distanceMeters: corridor.alternative.distance || 5000,
            durationSeconds: corridor.alternative.duration || 600,
            preference: 'FASTEST',
            description: 'GeoAgent Recommended Bypass Corridor',
            steps: (corridor.alternative as any).steps || [],
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
            steps: (corridor.primary as any).steps || [
              { maneuver: 'DEPART', instruction: 'Depart origin along designated emergency lane', distance: 350, duration: 45, startLocation: startPt },
              { maneuver: 'ARRIVE', instruction: 'Arrive at destination facility', distance: 0, duration: 0, startLocation: endPt },
            ],
            alternative: altData,
            calculatedAt: new Date().toISOString(),
          },
        })
      }
    }

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
