import { NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'

/** Forward one request to the Express backend and relay its status and JSON body (real status, no fake success). */
export async function proxyToBackend(method: 'GET' | 'POST', path: string, body?: unknown) {
  const backend = getBackendUrl()
  if (!backend) return NextResponse.json({ success: false, message: 'Backend is not configured' }, { status: 503 })
  try {
    const res = await fetch(`${backend}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid backend response' }))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error(`[BFF] ${method} ${path} failed:`, err)
    return NextResponse.json({ success: false, message: 'Backend request failed' }, { status: 502 })
  }
}
